import { NextRequest } from 'next/server';
import { pgDb } from '@/core/store/db-store';
import { calculateFinancingSchedule } from '@/core/financing/calculator';
import { getTenantIdFromRequest, apiSuccess, apiError } from '@/lib/api-helpers';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = getTenantIdFromRequest(req);
    const account = await pgDb.getAccountById(tenantId, id);

    if (!account) {
      return apiError('Financing account not found', 404);
    }

    if (account.status === 'ACTIVE' || account.status === 'SETTLED') {
      return apiError(`Cannot disburse account with status: ${account.status}`);
    }

    // Must be at least approved or accepted
    if (account.status === 'REJECTED') {
      return apiError('Cannot disburse a rejected loan application');
    }

    const body = await req.json().catch(() => ({}));
    const payoutRef = body.payoutRef || `TRF-${Date.now().toString().slice(-6)}`;
    const paymentMethod = body.paymentMethod || 'BANK_TRANSFER';
    const rawDisbursedAt = body.disbursedAt || new Date().toISOString().split('T')[0];
    const disbursedDateStr = rawDisbursedAt.includes('T') ? rawDisbursedAt.split('T')[0] : rawDisbursedAt;

    const netDisbursed = account.principalAmount - (account.processingFee || 0) - (account.stampDutyFee || 0);

    // CRITICAL: Now that actual disbursement date is known, recalculate official repayment schedule!
    const officialScheduleResult = calculateFinancingSchedule({
      principalAmount: account.principalAmount,
      profitRatePA: account.profitRatePA,
      tenorMonths: account.tenorMonths,
      startDate: disbursedDateStr,
      calcMethod: account.calcMethod,
    });

    // Update account with ACTIVE status, official schedule, and payout timestamps
    const updated = await pgDb.updateAccount(tenantId, id, {
      status: 'ACTIVE',
      disbursedAmount: netDisbursed,
      disbursedAt: new Date(disbursedDateStr).toISOString(),
      payoutRef,
      schedule: officialScheduleResult.schedule,
    });

    // Record upfront fee charges in ledger if applicable
    if (account.processingFee && account.processingFee > 0) {
      await pgDb.addTransaction(tenantId, {
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
      await pgDb.addTransaction(tenantId, {
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
    await pgDb.addTransaction(tenantId, {
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

    return apiSuccess({
      account: updated,
      message: `Disbursement completed on ${disbursedDateStr}. Repayment schedule activated.`,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Disbursement failed';
    return apiError(errorMessage, 500);
  }
}
