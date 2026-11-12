import { Decimal } from 'decimal.js';
import { ScheduleItem, RealTimeAccountStatus } from './types';
import { roundCurrency } from './calculator';

/**
 * Calculates calendar days between two YYYY-MM-DD date strings
 */
export function getDaysDifference(fromDateStr: string, toDateStr: string): number {
  const from = new Date(fromDateStr);
  const to = new Date(toDateStr);
  const diffTime = to.getTime() - from.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Real-Time Account Due & Delinquency Evaluator (Zero-Batch Engine)
 * 
 * In legacy core banking systems, an overnight batch job runs every midnight
 * to update overdue flags, compute daily late charges, and update arrears.
 * 
 * Here, we evaluate all due states dynamically whenever an inquiry, statement,
 * payment, or report is requested. No batch locks, zero overnight latency.
 * 
 * @param schedule List of all installment schedule items for this loan
 * @param lateFeeRatePA Annual late payment penalty rate (e.g. 1% or 8% p.a., default 1%)
 * @param asOfDate Evaluation date (defaults to current server date in YYYY-MM-DD)
 */
export function evaluateRealTimeAccountStatus(
  schedule: ScheduleItem[],
  lateFeeRatePA: number = 1.0,
  asOfDate?: string,
  paidLateFee: number = 0
): RealTimeAccountStatus {
  const today = asOfDate ?? new Date().toISOString().split('T')[0];

  let overdueInstallmentsCount = 0;
  let overduePrincipal = new Decimal(0);
  let overdueProfit = new Decimal(0);
  let maxDaysPastDue = 0;
  let totalAccruedLateFee = new Decimal(0);
  let totalOutstandingPrincipal = new Decimal(0);

  let nextDueInstallment: ScheduleItem | undefined = undefined;
  let allInstallmentsPaid = true;

  for (const item of schedule) {
    const isPastDue = item.dueDate < today;
    const isDueToday = item.dueDate === today;
    const unpaidPrincipal = new Decimal(item.principalDue).minus(item.principalPaid);
    const unpaidProfit = new Decimal(item.profitDue).minus(item.profitPaid);
    const unpaidTotal = unpaidPrincipal.plus(unpaidProfit);

    // Track total principal remaining across entire loan
    if (unpaidPrincipal.greaterThan(0)) {
      totalOutstandingPrincipal = totalOutstandingPrincipal.plus(unpaidPrincipal);
    }

    if (item.status !== 'PAID') {
      allInstallmentsPaid = false;

      // Identify the very next upcoming installment
      if (!nextDueInstallment && item.dueDate >= today) {
        nextDueInstallment = item;
      }
    }

    // Overdue Condition: due date has passed AND balance remains unpaid
    if (isPastDue && unpaidTotal.greaterThan(0)) {
      overdueInstallmentsCount++;
      overduePrincipal = overduePrincipal.plus(unpaidPrincipal);
      overdueProfit = overdueProfit.plus(unpaidProfit);

      const daysOverdue = getDaysDifference(item.dueDate, today);
      if (daysOverdue > maxDaysPastDue) {
        maxDaysPastDue = daysOverdue;
      }

      // Dynamic Late Payment Charge (Ta'widh / Penalty)
      // Formula: Unpaid Amount * (LateRatePA / 100) * (DaysOverdue / 365)
      if (lateFeeRatePA > 0 && daysOverdue > 0) {
        const dailyRate = new Decimal(lateFeeRatePA).dividedBy(100).dividedBy(365);
        const itemLateFee = unpaidTotal.times(dailyRate).times(daysOverdue);
        totalAccruedLateFee = totalAccruedLateFee.plus(itemLateFee);
      }
    }
  }

  const totalArrearsDue = overduePrincipal.plus(overdueProfit);
  const netAccruedLateFee = Decimal.max(0, new Decimal(roundCurrency(totalAccruedLateFee)).minus(paidLateFee));

  // Determine overall status
  let accountStatus: 'CURRENT' | 'DUE' | 'OVERDUE' | 'SETTLED' = 'CURRENT';
  if (allInstallmentsPaid && netAccruedLateFee.lessThanOrEqualTo(0)) {
    accountStatus = 'SETTLED';
  } else if (overdueInstallmentsCount > 0) {
    accountStatus = 'OVERDUE';
  } else if (netAccruedLateFee.greaterThan(0) || schedule.some(s => s.dueDate === today && s.status !== 'PAID')) {
    accountStatus = 'DUE';
  }

  return {
    asOfDate: today,
    accountStatus,
    daysPastDue: maxDaysPastDue,
    overdueInstallmentsCount,
    overduePrincipal: roundCurrency(overduePrincipal),
    overdueProfit: roundCurrency(overdueProfit),
    totalArrearsDue: roundCurrency(totalArrearsDue),
    accruedLateFee: roundCurrency(netAccruedLateFee),
    nextDueInstallment,
    totalOutstandingBalance: roundCurrency(totalOutstandingPrincipal),
  };
}
