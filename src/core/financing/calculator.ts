import { Decimal } from 'decimal.js';
import { FinancingQuoteParams, FinancingScheduleResult, ScheduleItem, CalculationMethod } from './types';

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
  const maxDaysInMonth = new Date(Date.UTC(targetYear, normalizedMonthIndex + 1, 0)).getUTCDate();
  
  // Use requested targetDay or initial day, clamped to maximum days in that month
  const desiredDay = targetDay ?? day;
  const finalDay = Math.min(desiredDay, maxDaysInMonth);

  const finalDate = new Date(Date.UTC(targetYear, normalizedMonthIndex, finalDay));
  return finalDate.toISOString().split('T')[0];
}

/**
 * Calculate difference in calendar days between two ISO date strings (YYYY-MM-DD)
 */
export function getDaysBetweenDates(fromStr: string, toStr: string): number {
  const d1 = new Date(fromStr + 'T00:00:00Z').getTime();
  const d2 = new Date(toStr + 'T00:00:00Z').getTime();
  const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

/**
 * Clean presentation label for each calculation method
 */
export function getCalcMethodLabel(method: CalculationMethod | string): string {
  switch (method) {
    case 'FLAT_R78':
    case 'FLAT_RATE':
      return 'Hire Purchase (R78)';
    case 'FLAT_STRAIGHT':
      return 'Straight Flat Rate';
    case 'REDUCING_MONTHLY':
    case 'REDUCING_BALANCE':
      return 'Monthly Reducing';
    case 'REDUCING_DAILY':
      return 'Daily Reducing';
    default:
      return String(method || '').replace(/_/g, ' ');
  }
}

/**
 * 1. Hire Purchase (Rule of 78 / Sum of Digits)
 * 
 * Standard under the Malaysian Hire Purchase Act 1967.
 * 
 * Total profit = Principal * (Rate / 100) * (Tenor / 12)
 * Total Payable = Principal + Total Profit
 * Monthly Installment = Total Payable / Tenor
 * 
 * Profit recognition:
 * Sum of digits S = Tenor * (Tenor + 1) / 2
 * For month i: Weight W_i = Tenor - i + 1
 * Month i Profit = Total Profit * (W_i / S)
 * Month i Principal = Monthly Installment - Month i Profit
 */
export function calculateR78Schedule(params: FinancingQuoteParams): FinancingScheduleResult {
  const principal = new Decimal(params.principalAmount);
  const rateAnnual = new Decimal(params.profitRatePA).dividedBy(100);
  const tenor = new Decimal(params.tenorMonths);
  const n = params.tenorMonths;
  const years = tenor.dividedBy(12);

  const totalProfit = principal.times(rateAnnual).times(years).toDecimalPlaces(2);
  const totalPayable = principal.plus(totalProfit);
  const regularMonthly = totalPayable.dividedBy(tenor).toDecimalPlaces(2);

  // Sum of digits: n * (n + 1) / 2
  const sumOfDigits = new Decimal(n * (n + 1) / 2);

  const schedule: ScheduleItem[] = [];
  let remainingPrincipal = principal;
  let cumulativePrincipalPaid = new Decimal(0);
  let cumulativeProfitPaid = new Decimal(0);

  for (let i = 1; i <= n; i++) {
    const dueDate = addMonths(params.startDate, i, params.repaymentDayOfMonth);

    let profitDue: Decimal;
    let principalDue: Decimal;
    let totalDue: Decimal;

    if (i === n) {
      // Last month absorbs rounding differences
      principalDue = principal.minus(cumulativePrincipalPaid);
      profitDue = totalProfit.minus(cumulativeProfitPaid);
      totalDue = principalDue.plus(profitDue);
      remainingPrincipal = new Decimal(0);
    } else {
      // Weight for month i is (n - i + 1)
      const weight = new Decimal(n - i + 1);
      profitDue = totalProfit.times(weight).dividedBy(sumOfDigits).toDecimalPlaces(2);
      totalDue = regularMonthly;
      principalDue = totalDue.minus(profitDue);
      remainingPrincipal = remainingPrincipal.minus(principalDue);

      cumulativePrincipalPaid = cumulativePrincipalPaid.plus(principalDue);
      cumulativeProfitPaid = cumulativeProfitPaid.plus(profitDue);
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
 * 2. Straight Flat Rate (Equal Monthly Principal & Profit)
 * 
 * Commonly used in micro-financing and basic personal loans.
 * Both principal and profit are amortized in strictly equal monthly proportions.
 */
export function calculateStraightFlatSchedule(params: FinancingQuoteParams): FinancingScheduleResult {
  const principal = new Decimal(params.principalAmount);
  const rateAnnual = new Decimal(params.profitRatePA).dividedBy(100);
  const tenor = new Decimal(params.tenorMonths);
  const n = params.tenorMonths;
  const years = tenor.dividedBy(12);

  const totalProfit = principal.times(rateAnnual).times(years).toDecimalPlaces(2);
  const totalPayable = principal.plus(totalProfit);

  const regularMonthly = totalPayable.dividedBy(tenor).toDecimalPlaces(2);
  const regularPrincipal = principal.dividedBy(tenor).toDecimalPlaces(2);
  const regularProfit = regularMonthly.minus(regularPrincipal);

  const schedule: ScheduleItem[] = [];
  let remainingPrincipal = principal;
  let cumulativePrincipalPaid = new Decimal(0);
  let cumulativeTotalPaid = new Decimal(0);

  for (let i = 1; i <= n; i++) {
    const dueDate = addMonths(params.startDate, i, params.repaymentDayOfMonth);

    let principalDue: Decimal;
    let profitDue: Decimal;
    let totalDue: Decimal;

    if (i === n) {
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
 * 3. Monthly Reducing Balance (Amortized Monthly Rest)
 * 
 * Standard banking amortization formula.
 * Profit is calculated once a month based on the starting principal balance of that month.
 */
export function calculateMonthlyReducingSchedule(params: FinancingQuoteParams): FinancingScheduleResult {
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
 * 4. Daily Reducing Balance (Accrued Daily Rest)
 * 
 * Commonly used in modern banking flexi-loans and commercial facilities.
 * Profit is calculated on exact calendar days between installment dates based on 365 days a year.
 */
export function calculateDailyReducingSchedule(params: FinancingQuoteParams): FinancingScheduleResult {
  const principal = new Decimal(params.principalAmount);
  const annualRate = new Decimal(params.profitRatePA).dividedBy(100);
  const dailyRate = annualRate.dividedBy(365);
  const n = params.tenorMonths;

  // Base installment from standard amortization
  const monthlyRate = annualRate.dividedBy(12);
  let baseMonthly: Decimal;
  if (monthlyRate.isZero()) {
    baseMonthly = principal.dividedBy(n).toDecimalPlaces(2);
  } else {
    const onePlusRToN = monthlyRate.plus(1).pow(n);
    const numerator = monthlyRate.times(onePlusRToN);
    const denominator = onePlusRToN.minus(1);
    baseMonthly = principal.times(numerator.dividedBy(denominator)).toDecimalPlaces(2);
  }

  const schedule: ScheduleItem[] = [];
  let currentBalance = principal;
  let totalProfitAccrued = new Decimal(0);
  let prevDate = params.startDate;

  for (let i = 1; i <= n; i++) {
    const dueDate = addMonths(params.startDate, i, params.repaymentDayOfMonth);
    const daysInPeriod = getDaysBetweenDates(prevDate, dueDate);
    prevDate = dueDate;

    let profitDue: Decimal;
    let principalDue: Decimal;
    let totalDue: Decimal;

    if (i === n) {
      profitDue = currentBalance.times(dailyRate).times(daysInPeriod).toDecimalPlaces(2);
      principalDue = currentBalance;
      totalDue = principalDue.plus(profitDue);
      currentBalance = new Decimal(0);
    } else {
      profitDue = currentBalance.times(dailyRate).times(daysInPeriod).toDecimalPlaces(2);
      principalDue = baseMonthly.minus(profitDue);
      totalDue = baseMonthly;
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
    monthlyInstallment: baseMonthly.toNumber(),
    schedule,
  };
}

/**
 * Universal calculation entry point with support for all 4 models + legacy aliases
 */
export function calculateFinancingSchedule(params: FinancingQuoteParams): FinancingScheduleResult {
  switch (params.calcMethod) {
    case 'FLAT_STRAIGHT':
      return calculateStraightFlatSchedule(params);
    case 'REDUCING_DAILY':
      return calculateDailyReducingSchedule(params);
    case 'REDUCING_MONTHLY':
    case 'REDUCING_BALANCE':
      return calculateMonthlyReducingSchedule(params);
    case 'FLAT_R78':
    case 'FLAT_RATE':
    default:
      return calculateR78Schedule(params);
  }
}
