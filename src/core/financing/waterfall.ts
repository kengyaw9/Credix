import { Decimal } from 'decimal.js';
import { ScheduleItem } from './types';
import { roundCurrency } from './calculator';

export interface PaymentAllocationResult {
  paymentAmount: number;
  allocatedToLateFee: number;
  allocatedToProfit: number;
  allocatedToPrincipal: number;
  excessAmount: number;
  updatedSchedule: ScheduleItem[];
  settledInstallmentsCount: number;
}

export type PaymentAllocationMode = 'WATERFALL' | 'LATE_FEE_ONLY' | 'INSTALLMENT_ONLY';

/**
 * Payment Allocation Waterfall Engine
 * 
 * When a payment is collected, funds are systematically distributed
 * according to standard lending priority (or targeted mode):
 * 
 * 1. Accrued Late Fees / Charges
 * 2. Overdue Profit / Interest
 * 3. Overdue Principal
 * 4. Current Installment (Profit first, then Principal)
 * 5. Advance Installments / Surplus
 */
export function applyPaymentWaterfall(
  schedule: ScheduleItem[],
  paymentAmount: number,
  accruedLateFee: number = 0,
  paymentDateStr?: string,
  allocationMode: PaymentAllocationMode = 'WATERFALL'
): PaymentAllocationResult {
  let remainingMoney = new Decimal(paymentAmount);
  const updatedSchedule: ScheduleItem[] = JSON.parse(JSON.stringify(schedule));
  const paymentDate = paymentDateStr ?? new Date().toISOString();

  // Step 1: Pay accrued late fees (unless INSTALLMENT_ONLY mode skips it)
  let allocatedToLateFee = new Decimal(0);
  if (allocationMode !== 'INSTALLMENT_ONLY' && accruedLateFee > 0 && remainingMoney.greaterThan(0)) {
    const feeToPay = Decimal.min(remainingMoney, new Decimal(accruedLateFee));
    allocatedToLateFee = feeToPay;
    remainingMoney = remainingMoney.minus(feeToPay);
  }

  let allocatedToProfit = new Decimal(0);
  let allocatedToPrincipal = new Decimal(0);
  let settledInstallmentsCount = 0;

  // Step 2: Iterate through schedule chronologically to pay installments (unless LATE_FEE_ONLY mode)
  if (allocationMode !== 'LATE_FEE_ONLY') {
    for (const item of updatedSchedule) {
      if (remainingMoney.isZero()) break;
      if (item.status === 'PAID') continue;

      // Remaining profit needed for this installment
      const profitNeeded = new Decimal(item.profitDue).minus(item.profitPaid);
      if (profitNeeded.greaterThan(0) && remainingMoney.greaterThan(0)) {
        const profitPayment = Decimal.min(remainingMoney, profitNeeded);
        item.profitPaid = new Decimal(item.profitPaid).plus(profitPayment).toNumber();
        allocatedToProfit = allocatedToProfit.plus(profitPayment);
        remainingMoney = remainingMoney.minus(profitPayment);
      }

      // Remaining principal needed for this installment
      const principalNeeded = new Decimal(item.principalDue).minus(item.principalPaid);
      if (principalNeeded.greaterThan(0) && remainingMoney.greaterThan(0)) {
        const principalPayment = Decimal.min(remainingMoney, principalNeeded);
        item.principalPaid = new Decimal(item.principalPaid).plus(principalPayment).toNumber();
        allocatedToPrincipal = allocatedToPrincipal.plus(principalPayment);
        remainingMoney = remainingMoney.minus(principalPayment);
      }

      // Update item status
      const totalPaidOnItem = new Decimal(item.principalPaid).plus(item.profitPaid);
      const totalDueOnItem = new Decimal(item.totalDue);

      if (totalPaidOnItem.greaterThanOrEqualTo(totalDueOnItem)) {
        item.status = 'PAID';
        item.paidAt = paymentDate;
        settledInstallmentsCount++;
      } else if (totalPaidOnItem.greaterThan(0)) {
        item.status = 'PARTIAL';
      }
    }
  }

  return {
    paymentAmount,
    allocatedToLateFee: roundCurrency(allocatedToLateFee),
    allocatedToProfit: roundCurrency(allocatedToProfit),
    allocatedToPrincipal: roundCurrency(allocatedToPrincipal),
    excessAmount: roundCurrency(remainingMoney),
    updatedSchedule,
    settledInstallmentsCount,
  };
}
