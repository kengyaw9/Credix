/**
 * Credix Core Domain Types
 * 
 * Written for maximum readability and straightforward business logic.
 * No cryptic banking acronyms. Everything has a plain English definition.
 */

// Method used to compute loan interest / profit
export type CalculationMethod = 'FLAT_RATE' | 'REDUCING_BALANCE';

// Financing Account Lifecycle Status
export type FinancingStatus = 
  | 'DRAFT'      // Created, pending approval
  | 'APPROVED'   // Approved, ready for disbursement
  | 'ACTIVE'     // Disbursed and currently active
  | 'SETTLED'    // Fully paid off / settled
  | 'WRITTEN_OFF'; // Bad debt write-off

// Individual Installment Schedule Status
export type InstallmentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

// Transaction Types
export type TransactionType = 
  | 'DISBURSEMENT' // Money released to borrower
  | 'REPAYMENT'    // Borrower payment received
  | 'LATE_FEE'     // Late penalty assessed
  | 'SETTLEMENT'   // Final early payoff transaction
  | 'FEE_CHARGE';  // Upfront processing fee, documentation, etc.

/**
 * Input parameters required to calculate a new financing facility
 */
export interface FinancingQuoteParams {
  principalAmount: number;    // E.g., 10000.00
  profitRatePA: number;       // Annual rate as a percentage, e.g., 8.5 for 8.5% p.a.
  tenorMonths: number;        // Total duration in months, e.g., 12, 24, 36
  startDate: string;          // YYYY-MM-DD (Disbursement date / agreement date)
  calcMethod: CalculationMethod; // 'FLAT_RATE' or 'REDUCING_BALANCE'
  repaymentDayOfMonth?: number; // Optional day of month due (1-28, default: same day as startDate)
  lateFeeRatePA?: number;     // Annual late fee penalty rate, e.g., 1% p.a.
}

/**
 * A single row in the amortization / repayment schedule
 */
export interface ScheduleItem {
  installmentNo: number;      // 1, 2, 3...
  dueDate: string;            // YYYY-MM-DD
  principalDue: number;       // Portion of installment going to principal
  profitDue: number;          // Portion of installment going to interest/profit
  totalDue: number;           // principalDue + profitDue
  endingBalance: number;      // Remaining principal balance after this installment
  
  // Payment tracking fields
  principalPaid: number;      // Amount of principal paid so far (starts at 0)
  profitPaid: number;         // Amount of profit paid so far (starts at 0)
  status: InstallmentStatus;  // UNPAID, PARTIAL, PAID
  paidAt?: string;            // Timestamp when fully settled
}

/**
 * Complete financing facility calculation result
 */
export interface FinancingScheduleResult {
  principalAmount: number;    // Total loan amount
  totalProfit: number;        // Total profit/interest over full tenor
  totalPayable: number;       // principalAmount + totalProfit
  monthlyInstallment: number; // Regular monthly repayment amount
  schedule: ScheduleItem[];   // Full month-by-month repayment breakdown
}

/**
 * Real-time account status calculated ON-DEMAND (No Nightly Batch Needed!)
 */
export interface RealTimeAccountStatus {
  asOfDate: string;               // The evaluation date (usually today)
  accountStatus: 'CURRENT' | 'DUE' | 'OVERDUE' | 'SETTLED';
  daysPastDue: number;            // 0 if on time, >0 if overdue
  overdueInstallmentsCount: number; // Number of missed installments
  overduePrincipal: number;       // Missed principal amount
  overdueProfit: number;          // Missed profit amount
  totalArrearsDue: number;        // overduePrincipal + overdueProfit
  accruedLateFee: number;         // Dynamically calculated late fee for unpaid days
  nextDueInstallment?: ScheduleItem; // The upcoming installment to pay
  totalOutstandingBalance: number;// Total principal remaining
}

/**
 * Early Settlement Payoff Quotation
 */
export interface SettlementQuotation {
  asOfDate: string;
  principalOutstanding: number;   // Remaining principal
  unearnedProfitRebate: number;   // Rebate (Ibra') credited back to borrower
  unpaidLateFees: number;         // Late fees incurred to date
  netSettlementAmount: number;    // Total amount needed to close the loan today
}
