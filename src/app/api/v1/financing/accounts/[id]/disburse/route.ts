import { NextRequest } from 'next/server';
import { db } from '@/core/store/memory-store';
import { getTenantIdFromRequest, apiSuccess, apiError } from '@/lib/api-helpers';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = getTenantIdFromRequest(req);
    const account = db.getAccountById(tenantId, id);

    if (!account) {
      return apiError('Financing account not found', 404);
    }

    if (account.status === 'ACTIVE' || account.status === 'SETTLED') {
      return apiError(`Cannot disburse account with status: ${account.status}`);
    }

    const body = await req.json().catch(() => ({}));
    const payoutRef = body.payoutRef || `TRF-${Date.now()}`;
    const paymentMethod = body.paymentMethod || 'BANK_TRANSFER';
    const disbursedAt = body.disbursedAt || new Date().toISOString();

    const netDisbursed = account.principalAmount - (account.processingFee || 0) - (account.stampDutyFee || 0);

    // Update account
    const updated = db.updateAccount(tenantId, id, {
      status: 'ACTIVE',
      disbursedAmount: netDisbursed,
      disbursedAt,
      payoutRef,
    });

    // Record disbursement transaction
    db.addTransaction(tenantId, {
      financingId: id,
      txType: 'DISBURSEMENT',
      amount: netDisbursed,
      allocatedLateFee: 0,
      allocatedProfit: 0,
      allocatedPrincipal: netDisbursed,
      excessAmount: 0,
      paymentMethod,
      referenceNo: payoutRef,
      remarks: `Disbursed Net RM ${netDisbursed.toFixed(2)} (Principal: RM ${account.principalAmount.toFixed(2)} minus fees)`,
    });

    return apiSuccess(updated);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Disbursement failed';
    return apiError(errorMessage, 500);
  }
}
