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

    // Record upfront fee charges in ledger if applicable
    if (account.processingFee && account.processingFee > 0) {
      db.addTransaction(tenantId, {
        financingId: id,
        txType: 'FEE_CHARGE',
        amount: account.processingFee,
        allocatedLateFee: 0,
        allocatedProfit: 0,
        allocatedPrincipal: 0,
        excessAmount: 0,
        paymentMethod: 'DEDUCTION',
        referenceNo: `FEE-PROC-${Date.now().toString().slice(-6)}`,
        remarks: 'Documentation & Loan Processing Fee (Deducted upfront)',
      });
    }

    if (account.stampDutyFee && account.stampDutyFee > 0) {
      db.addTransaction(tenantId, {
        financingId: id,
        txType: 'FEE_CHARGE',
        amount: account.stampDutyFee,
        allocatedLateFee: 0,
        allocatedProfit: 0,
        allocatedPrincipal: 0,
        excessAmount: 0,
        paymentMethod: 'DEDUCTION',
        referenceNo: `FEE-STAMP-${Date.now().toString().slice(-6)}`,
        remarks: 'Inland Revenue Board Stamp Duty (Deducted upfront)',
      });
    }

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
      remarks: `Loan Capital Drawdown disbursed to customer bank account (Gross RM ${account.principalAmount.toFixed(2)} minus fees)`,
    });

    return apiSuccess(updated);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Disbursement failed';
    return apiError(errorMessage, 500);
  }
}
