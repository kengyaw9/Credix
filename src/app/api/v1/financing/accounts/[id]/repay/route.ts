import { NextRequest } from 'next/server';
import { db } from '@/core/store/memory-store';
import { evaluateRealTimeAccountStatus } from '@/core/financing/due-tracker';
import { applyPaymentWaterfall } from '@/core/financing/waterfall';
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

    if (account.status !== 'ACTIVE') {
      return apiError(`Cannot accept repayment for account with status: ${account.status}`);
    }

    const body = await req.json();
    const amount = Number(body.amount);

    if (!amount || amount <= 0) {
      return apiError('Payment amount must be greater than 0');
    }

    const paymentDate = body.paymentDate || new Date().toISOString();
    const referenceNo = body.referenceNo || `PAY-${Date.now()}`;
    const paymentMethod = body.paymentMethod || 'BANK_TRANSFER';

    // 1. Evaluate real-time accrued late fee as of payment date
    const realtimeStatus = evaluateRealTimeAccountStatus(account.schedule, account.lateFeeRatePA, paymentDate.split('T')[0]);

    // 2. Apply Payment Allocation Waterfall
    const waterfallResult = applyPaymentWaterfall(
      account.schedule,
      amount,
      realtimeStatus.accruedLateFee,
      paymentDate
    );

    // 3. Check if all installments are fully settled
    const isFullyPaid = waterfallResult.updatedSchedule.every(item => item.status === 'PAID');
    const newStatus = isFullyPaid ? 'SETTLED' : 'ACTIVE';

    // 4. Update account with new schedule and status
    const updatedAccount = db.updateAccount(tenantId, id, {
      schedule: waterfallResult.updatedSchedule,
      status: newStatus,
    });

    // 5. Record repayment audit transaction
    db.addTransaction(tenantId, {
      financingId: id,
      txType: 'REPAYMENT',
      amount,
      allocatedLateFee: waterfallResult.allocatedToLateFee,
      allocatedProfit: waterfallResult.allocatedToProfit,
      allocatedPrincipal: waterfallResult.allocatedToPrincipal,
      excessAmount: waterfallResult.excessAmount,
      paymentMethod,
      referenceNo,
      remarks: body.remarks || `Repayment of RM ${amount.toFixed(2)} received`,
    });

    return apiSuccess({
      waterfallResult,
      account: updatedAccount,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Repayment processing failed';
    return apiError(errorMessage, 500);
  }
}
