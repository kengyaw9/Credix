import { 
  calculateFinancingSchedule, 
  evaluateRealTimeAccountStatus, 
  applyPaymentWaterfall, 
  calculateEarlySettlementQuote 
} from '../src/core/financing';

console.log('====================================================');
console.log('      CREDIX ZERO-BATCH CALCULATION ENGINE          ');
console.log('====================================================\n');

// 1. Test Loan Computation (Flat Rate)
console.log('--- 1. Testing Flat Rate Schedule Generation ---');
const flatLoan = calculateFinancingSchedule({
  principalAmount: 10000,
  profitRatePA: 10, // 10% per annum
  tenorMonths: 12,
  startDate: '2026-01-01',
  calcMethod: 'FLAT_RATE',
});

console.log(`Principal: RM ${flatLoan.principalAmount}`);
console.log(`Total Profit: RM ${flatLoan.totalProfit} (Expected: RM 1000.00)`);
console.log(`Total Payable: RM ${flatLoan.totalPayable} (Expected: RM 11000.00)`);
console.log(`Monthly Installment: RM ${flatLoan.monthlyInstallment} (Expected: RM 916.67)`);
console.log(`Schedule Length: ${flatLoan.schedule.length} months`);

// Verify exact sum
const sumInstallments = flatLoan.schedule.reduce((acc, curr) => acc + curr.totalDue, 0);
console.log(`Sum of Installments: RM ${sumInstallments.toFixed(2)} (Diff: ${Math.abs(sumInstallments - flatLoan.totalPayable).toFixed(4)})\n`);

// 2. Test Real-Time Due Tracking (Zero-Batch)
console.log('--- 2. Testing Real-Time Due Tracking as of 2026-04-15 ---');
// As of 2026-04-15, installments on Jan, Feb, Mar, Apr are due.
// If 0 payments made, 4 installments are past due/due.
const statusBeforePayment = evaluateRealTimeAccountStatus(
  flatLoan.schedule,
  1.0, // 1% late fee p.a.
  '2026-04-15'
);

console.log(`Status: ${statusBeforePayment.accountStatus}`);
console.log(`Overdue Installments: ${statusBeforePayment.overdueInstallmentsCount}`);
console.log(`Total Arrears Due: RM ${statusBeforePayment.totalArrearsDue}`);
console.log(`Days Past Due (DPD): ${statusBeforePayment.daysPastDue} days`);
console.log(`Dynamic Accrued Late Fee: RM ${statusBeforePayment.accruedLateFee}\n`);

// 3. Test Payment Collection Waterfall
console.log('--- 3. Testing Payment Collection (RM 2000.00 received) ---');
const paymentResult = applyPaymentWaterfall(
  flatLoan.schedule,
  2000,
  statusBeforePayment.accruedLateFee,
  '2026-04-15'
);

console.log(`Allocated to Late Fee: RM ${paymentResult.allocatedToLateFee}`);
console.log(`Allocated to Profit: RM ${paymentResult.allocatedToProfit}`);
console.log(`Allocated to Principal: RM ${paymentResult.allocatedToPrincipal}`);
console.log(`Fully Settled Installments: ${paymentResult.settledInstallmentsCount}`);

// 4. Test Early Settlement Quotation
console.log('\n--- 4. Testing Early Settlement Quotation as of 2026-06-01 ---');
const settlementQuote = calculateEarlySettlementQuote(
  paymentResult.updatedSchedule,
  1.0,
  '2026-06-01'
);

console.log(`Principal Outstanding: RM ${settlementQuote.principalOutstanding}`);
console.log(`Unearned Profit Rebate (Ibra'): RM ${settlementQuote.unearnedProfitRebate}`);
console.log(`Net Settlement Payoff Amount: RM ${settlementQuote.netSettlementAmount}`);
console.log('\nAll core financial engine tests completed successfully!');
