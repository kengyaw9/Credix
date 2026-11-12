import { NextRequest } from 'next/server';
import { pgDb } from '@/core/store/db-store';
import { evaluateRealTimeAccountStatus } from '@/core/financing/due-tracker';
import { applyPaymentWaterfall, PaymentAllocationMode } from '@/core/financing/waterfall';
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
    const allocationMode: PaymentAllocationMode = body.allocationMode || 'WATERFALL';

    // 1. Evaluate real-time accrued late fee (subtracting previously paid late fees)
    const paidLateFeesMap = await pgDb.getPaidLateFeesMap(tenantId, id);
    const paidLateFee = paidLateFeesMap[id] || 0;
    const realtimeStatus = evaluateRealTimeAccountStatus(
      account.schedule,
      account.lateFeeRatePA,
      paymentDate.split('T')[0],
      paidLateFee
    );

    if (allocationMode === 'LATE_FEE_ONLY') {
      if (realtimeStatus.accruedLateFee <= 0) {
        return apiError('No unpaid late payment charges are currently due on this account.');
      }
      if (amount > realtimeStatus.accruedLateFee + 0.001) {
        return apiError(`Amount (RM ${amount.toFixed(2)}) exceeds total unpaid late charges (RM ${realtimeStatus.accruedLateFee.toFixed(2)}). Use Standard Waterfall to pay both late fees and installments.`);
      }
    }

    // 2. Apply Payment Allocation Waterfall / Targeted Mode
    const waterfallResult = applyPaymentWaterfall(
      account.schedule,
      amount,
      realtimeStatus.accruedLateFee,
      paymentDate,
      allocationMode
    );

    // 3. Check if all installments AND late fees are fully settled
    const isFullyPaid = waterfallResult.updatedSchedule.every(item => item.status === 'PAID');
    const remainingLateFee = Math.max(0, realtimeStatus.accruedLateFee - waterfallResult.allocatedToLateFee);
    const newStatus = isFullyPaid && remainingLateFee <= 0 ? 'SETTLED' : 'ACTIVE';

    // 4. Update account with new schedule and status
    const updatedAccount = await pgDb.updateAccount(tenantId, id, {
      schedule: waterfallResult.updatedSchedule,
      status: newStatus,
    });

    const defaultRemarks =
      allocationMode === 'LATE_FEE_ONLY'
        ? `Targeted Late Payment Charge settlement of RM ${amount.toFixed(2)}`
        : allocationMode === 'INSTALLMENT_ONLY'
        ? `Installment-Only Repayment of RM ${amount.toFixed(2)} (Profit: RM ${waterfallResult.allocatedToProfit.toFixed(2)}, Principal: RM ${waterfallResult.allocatedToPrincipal.toFixed(2)})`
        : `Repayment of RM ${amount.toFixed(2)} (Late Fee: RM ${waterfallResult.allocatedToLateFee.toFixed(2)}, Profit: RM ${waterfallResult.allocatedToProfit.toFixed(2)}, Principal: RM ${waterfallResult.allocatedToPrincipal.toFixed(2)})`;

    // 5. Record repayment audit transaction
    await pgDb.addTransaction(tenantId, {
      financingId: id,
      txType: 'REPAYMENT',
      amount,
      allocatedLateFee: waterfallResult.allocatedToLateFee,
      allocatedProfit: waterfallResult.allocatedToProfit,
      allocatedPrincipal: waterfallResult.allocatedToPrincipal,
      excessAmount: waterfallResult.excessAmount,
      paymentMethod,
      referenceNo,
      remarks: body.remarks || defaultRemarks,
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
