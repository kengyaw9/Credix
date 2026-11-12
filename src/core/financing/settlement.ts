import { Decimal } from 'decimal.js';
import { ScheduleItem, SettlementQuotation } from './types';
import { roundCurrency } from './calculator';
import { evaluateRealTimeAccountStatus, getTodayMYT } from './due-tracker';

/**
 * Early Settlement Engine (Rebate / Ibra' Computation)
 * 
 * Modeled after core banking rebate logic (Rule of 78 / Actuarial unearned profit discount).
 * When a customer settles early, future profit that has not yet accrued is waived/rebated.
 */
export function calculateEarlySettlementQuote(
  schedule: ScheduleItem[],
  lateFeeRatePA: number = 1.0,
  settlementDateStr?: string,
  paidLateFee: number = 0
): SettlementQuotation {
  const asOfDate = settlementDateStr ?? getTodayMYT();

  // 1. Get real-time status as of today
  const status = evaluateRealTimeAccountStatus(schedule, lateFeeRatePA, asOfDate, paidLateFee);

  let totalRemainingPrincipal = new Decimal(0);
  let totalUnearnedFutureProfit = new Decimal(0);

  for (const item of schedule) {
    if (item.status === 'PAID') continue;

    const unpaidPrincipal = new Decimal(item.principalDue).minus(item.principalPaid);
    totalRemainingPrincipal = totalRemainingPrincipal.plus(unpaidPrincipal);

    // If installment due date is strictly in the future, its profit has not yet been earned
    if (item.dueDate > asOfDate) {
      const futureProfit = new Decimal(item.profitDue).minus(item.profitPaid);
      if (futureProfit.greaterThan(0)) {
        totalUnearnedFutureProfit = totalUnearnedFutureProfit.plus(futureProfit);
      }
    }
  }

  // Net settlement required: Outstanding Principal + Unpaid Late Fees (future profit is discounted)
  const netSettlement = totalRemainingPrincipal.plus(status.accruedLateFee);

  return {
    asOfDate,
    principalOutstanding: roundCurrency(totalRemainingPrincipal),
    unearnedProfitRebate: roundCurrency(totalUnearnedFutureProfit),
    unpaidLateFees: roundCurrency(status.accruedLateFee),
    netSettlementAmount: roundCurrency(netSettlement),
  };
}
