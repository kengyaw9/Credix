import { Decimal } from 'decimal.js';
import { FinancingQuoteParams, FinancingScheduleResult, ScheduleItem } from './types';

/**
 * Configure Decimal for financial precision:
 * Standard round-half-up (Banker's or Commercial rounding) to 2 decimal places.
 */
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Helper to safely round a number or Decimal to 2 decimal places
 */
export function roundCurrency(val: number | Decimal): number {
  return new Decimal(val).toDecimalPlaces(2).toNumber();
}

/**
 * Helper to compute the next due date, incrementing by 1 month.
 * Handles month-end rollings (e.g. Jan 31 -> Feb 28).
 */
export function addMonths(dateStr: string, monthsToAdd: number, targetDay?: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Target month (0-indexed)
  const targetMonthIndex = (month - 1) + monthsToAdd;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonthIndex = ((targetMonthIndex % 12) + 12) % 12; // 0 to 11

  // Determine last day of the target month
  // (Day 0 of next month is the last day of target month)
  const maxDaysInMonth = new Date(Date.UTC(targetYear, normalizedMonthIndex + 1, 0)).getUTCDate();
  
  // Use requested targetDay or initial day, clamped to maximum days in that month
  const desiredDay = targetDay ?? day;
  const finalDay = Math.min(desiredDay, maxDaysInMonth);

  const finalDate = new Date(Date.UTC(targetYear, normalizedMonthIndex, finalDay));
  return finalDate.toISOString().split('T')[0];
}

/**
 * 1. Flat Rate Calculation Engine
 * 
 * Commonly used in micro-financing, hire purchase, and fixed personal financing.
 * 
 * Formula:
 *   Total Profit = Principal * (Rate / 100) * (TenorMonths / 12)
 *   Total Payable = Principal + Total Profit
 *   Monthly Installment = Total Payable / TenorMonths
 */
export function calculateFlatSchedule(params: FinancingQuoteParams): FinancingScheduleResult {
  const principal = new Decimal(params.principalAmount);
  const rateAnnual = new Decimal(params.profitRatePA).dividedBy(100);
  const tenor = new Decimal(params.tenorMonths);
  const years = tenor.dividedBy(12);

  // Total profit over the entire tenor
  const totalProfit = principal.times(rateAnnual).times(years).toDecimalPlaces(2);
  const totalPayable = principal.plus(totalProfit);

  // Standard regular monthly installment
  const regularMonthly = totalPayable.dividedBy(tenor).toDecimalPlaces(2);
  const regularPrincipal = principal.dividedBy(tenor).toDecimalPlaces(2);
  const regularProfit = regularMonthly.minus(regularPrincipal);

  const schedule: ScheduleItem[] = [];
  let remainingPrincipal = principal;
  let cumulativePrincipalPaid = new Decimal(0);
  let cumulativeTotalPaid = new Decimal(0);

  for (let i = 1; i <= params.tenorMonths; i++) {
    const dueDate = addMonths(params.startDate, i, params.repaymentDayOfMonth);

    let principalDue: Decimal;
    let profitDue: Decimal;
    let totalDue: Decimal;

    // Final month absorbs any rounding cents difference
    if (i === params.tenorMonths) {
      principalDue = principal.minus(cumulativePrincipalPaid);
      totalDue = totalPayable.minus(cumulativeTotalPaid);
      profitDue = totalDue.minus(principalDue);
      remainingPrincipal = new Decimal(0);
    } else {
      principalDue = regularPrincipal;
      profitDue = regularProfit;
      totalDue = regularMonthly;
      remainingPrincipal = remainingPrincipal.minus(principalDue);
      
      cumulativePrincipalPaid = cumulativePrincipalPaid.plus(principalDue);
      cumulativeTotalPaid = cumulativeTotalPaid.plus(totalDue);
    }

    schedule.push({
      installmentNo: i,
      dueDate,
      principalDue: principalDue.toNumber(),
      profitDue: profitDue.toNumber(),
      totalDue: totalDue.toNumber(),
      endingBalance: Math.max(0, remainingPrincipal.toNumber()),
      principalPaid: 0,
      profitPaid: 0,
      status: 'UNPAID',
    });
  }

  return {
    principalAmount: principal.toNumber(),
    totalProfit: totalProfit.toNumber(),
    totalPayable: totalPayable.toNumber(),
    monthlyInstallment: regularMonthly.toNumber(),
    schedule,
  };
}

/**
 * 2. Reducing Balance (Amortized) Calculation Engine
 * 
 * Standard banking amortization formula (monthly rest).
 * In each installment:
 *   Monthly Profit = Outstanding Principal * (Annual Rate / 12)
 *   Principal portion = Monthly Installment - Monthly Profit
 */
export function calculateReducingSchedule(params: FinancingQuoteParams): FinancingScheduleResult {
  const principal = new Decimal(params.principalAmount);
  const monthlyRate = new Decimal(params.profitRatePA).dividedBy(100).dividedBy(12);
  const n = params.tenorMonths;

  // Formula: A = P * [r(1+r)^n] / [(1+r)^n - 1]
  let regularMonthly: Decimal;
  if (monthlyRate.isZero()) {
    regularMonthly = principal.dividedBy(n).toDecimalPlaces(2);
  } else {
    const onePlusRToN = monthlyRate.plus(1).pow(n);
    const numerator = monthlyRate.times(onePlusRToN);
    const denominator = onePlusRToN.minus(1);
    regularMonthly = principal.times(numerator.dividedBy(denominator)).toDecimalPlaces(2);
  }

  const schedule: ScheduleItem[] = [];
  let currentBalance = principal;
  let totalProfitAccrued = new Decimal(0);

  for (let i = 1; i <= n; i++) {
    const dueDate = addMonths(params.startDate, i, params.repaymentDayOfMonth);

    let profitDue: Decimal;
    let principalDue: Decimal;
    let totalDue: Decimal;

    if (i === n) {
      // Last installment pays off the remaining principal exactly
      profitDue = currentBalance.times(monthlyRate).toDecimalPlaces(2);
      principalDue = currentBalance;
      totalDue = principalDue.plus(profitDue);
      currentBalance = new Decimal(0);
    } else {
      profitDue = currentBalance.times(monthlyRate).toDecimalPlaces(2);
      principalDue = regularMonthly.minus(profitDue);
      totalDue = regularMonthly;
      currentBalance = currentBalance.minus(principalDue);
    }

    totalProfitAccrued = totalProfitAccrued.plus(profitDue);

    schedule.push({
      installmentNo: i,
      dueDate,
      principalDue: principalDue.toNumber(),
      profitDue: profitDue.toNumber(),
      totalDue: totalDue.toNumber(),
      endingBalance: Math.max(0, currentBalance.toNumber()),
      principalPaid: 0,
      profitPaid: 0,
      status: 'UNPAID',
    });
  }

  const totalPayable = principal.plus(totalProfitAccrued);

  return {
    principalAmount: principal.toNumber(),
    totalProfit: totalProfitAccrued.toNumber(),
    totalPayable: totalPayable.toNumber(),
    monthlyInstallment: regularMonthly.toNumber(),
    schedule,
  };
}

/**
 * Universal calculation entry point
 */
export function calculateFinancingSchedule(params: FinancingQuoteParams): FinancingScheduleResult {
  if (params.calcMethod === 'REDUCING_BALANCE') {
    return calculateReducingSchedule(params);
  }
  return calculateFlatSchedule(params);
}
