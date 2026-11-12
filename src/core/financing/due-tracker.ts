import { Decimal } from 'decimal.js';
import { ScheduleItem, RealTimeAccountStatus } from './types';
import { roundCurrency } from './calculator';

/**
 * Returns today's calendar date in Malaysia Standard Time (UTC+8) as YYYY-MM-DD
 */
export function getTodayMYT(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
}

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
 * @param asOfDate Evaluation date (defaults to current Malaysia date in YYYY-MM-DD)
 */
export function evaluateRealTimeAccountStatus(
  schedule: ScheduleItem[],
  lateFeeRatePA: number = 1.0,
  asOfDate?: string,
  paidLateFee: number = 0
): RealTimeAccountStatus {
  const today = asOfDate ?? getTodayMYT();

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

    // Always include historical crystallized late charges (ULTRON odiacc),
    // even if the installment's principal/profit was subsequently settled
    if (item.crystallizedLateFee && item.crystallizedLateFee > 0) {
      totalAccruedLateFee = totalAccruedLateFee.plus(item.crystallizedLateFee);
    }

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

      // Dynamic Late Payment Charge (Ta'widh / Penalty) from last crystallization date (ULTRON lodidate)
      // Formula: Current Unpaid Amount * (LateRatePA / 100) * (Days Since Last Calc / 365)
      const lastCalcDate = item.lastLateFeeCalcDate ?? item.dueDate;
      const daysToAccrue = Math.max(0, getDaysDifference(lastCalcDate, today));
      if (lateFeeRatePA > 0 && daysToAccrue > 0) {
        const dailyRate = new Decimal(lateFeeRatePA).dividedBy(100).dividedBy(365);
        const itemLateFee = unpaidTotal.times(dailyRate).times(daysToAccrue);
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

/**
 * Crystallizes (locks in) accrued late payment charges up to `transactionDateStr`
 * on each overdue installment before a payment reduces its unpaid balance
 * (matching ULTRON Core Banking `ls01_calc_odu` + `lodidate` + `odiacc` semantics).
 */
export function crystallizeLateFees(
  schedule: ScheduleItem[],
  lateFeeRatePA: number = 1.0,
  transactionDateStr?: string
): ScheduleItem[] {
  const txDate = (transactionDateStr || getTodayMYT()).split('T')[0];

  return schedule.map((item) => {
    const unpaidPrincipal = Decimal.max(0, new Decimal(item.principalDue).minus(item.principalPaid));
    const unpaidProfit = Decimal.max(0, new Decimal(item.profitDue).minus(item.profitPaid));
    const unpaidTotal = unpaidPrincipal.plus(unpaidProfit);

    if (item.dueDate < txDate && unpaidTotal.greaterThan(0)) {
      const lastCalcDate = item.lastLateFeeCalcDate ?? item.dueDate;
      const daysToAccrue = Math.max(0, getDaysDifference(lastCalcDate, txDate));

      let nextCrystallized = new Decimal(item.crystallizedLateFee ?? 0);
      if (daysToAccrue > 0) {
        const incrementalFee = unpaidTotal
          .times(new Decimal(lateFeeRatePA).div(100))
          .times(daysToAccrue)
          .div(365);
        nextCrystallized = nextCrystallized.plus(incrementalFee);
      }

      return {
        ...item,
        crystallizedLateFee: nextCrystallized.toDecimalPlaces(6).toNumber(),
        lastLateFeeCalcDate: txDate,
      };
    }

    return item;
  });
}
