/**
 * Multi-Tenant Data Store with Strict Isolation
 * 
 * Implements the core business entities in memory so the application can run 
 * instantly without external database setup, while perfectly enforcing the same
 * tenant isolation rules as the PostgreSQL Row-Level Security (RLS) schema.
 */

import { ScheduleItem } from '../financing/types';

export interface Tenant {
  id: string;
  code: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface Customer {
  id: string;
  tenantId: string;
  idType: 'NRIC' | 'PASSPORT' | 'BRN';
  idNumber: string;
  fullName: string;
  phone: string;
  email: string;
  bankName: string;
  bankAccountNo: string;
  createdAt: string;
}

export interface FinancingAccount {
  id: string;
  tenantId: string;
  customerId: string;
  accountNo: string;
  calcMethod: 'FLAT_RATE' | 'REDUCING_BALANCE';
  principalAmount: number;
  profitRatePA: number;
  tenorMonths: number;
  totalProfit: number;
  totalPayable: number;
  monthlyInstallment: number;
  lateFeeRatePA: number;
  processingFee: number;
  stampDutyFee: number;
  disbursedAmount?: number;
  disbursedAt?: string;
  payoutRef?: string;
  status: 'DRAFT' | 'ACTIVE' | 'SETTLED' | 'WRITTEN_OFF';
  schedule: ScheduleItem[];
  createdAt: string;
}

export interface FinancingTransaction {
  id: string;
  tenantId: string;
  financingId: string;
  txType: 'DISBURSEMENT' | 'REPAYMENT' | 'LATE_FEE' | 'SETTLEMENT';
  amount: number;
  allocatedLateFee: number;
  allocatedProfit: number;
  allocatedPrincipal: number;
  excessAmount: number;
  paymentMethod: string;
  referenceNo: string;
  remarks?: string;
  transactedAt: string;
}

// In-Memory Database Tables
class MultiTenantDatabase {
  public tenants: Tenant[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      code: 'APEX_CREDIT',
      name: 'Apex Credit Capital Sdn Bhd',
      status: 'ACTIVE',
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      code: 'METRO_MICRO',
      name: 'Metro Micro-Financing Ltd',
      status: 'ACTIVE',
    },
  ];

  public customers: Customer[] = [
    {
      id: 'cust-101',
      tenantId: '11111111-1111-1111-1111-111111111111', // Belongs to Apex Credit
      idType: 'NRIC',
      idNumber: '880101-14-5555',
      fullName: 'Ahmad bin Razak',
      phone: '+6012-3456789',
      email: 'ahmad.razak@example.com',
      bankName: 'Maybank',
      bankAccountNo: '114012345678',
      createdAt: '2026-01-01T08:00:00Z',
    },
    {
      id: 'cust-201',
      tenantId: '22222222-2222-2222-2222-222222222222', // Belongs to Metro Micro
      idType: 'NRIC',
      idNumber: '920315-10-8888',
      fullName: 'Tan Wei Ming',
      phone: '+6017-9876543',
      email: 'tan.wm@example.com',
      bankName: 'CIMB Bank',
      bankAccountNo: '8001234567',
      createdAt: '2026-02-01T09:00:00Z',
    },
  ];

  public accounts: FinancingAccount[] = [];
  public transactions: FinancingTransaction[] = [];

  constructor() {
    this.seedInitialLoans();
  }

  private seedInitialLoans() {
    // Initial loan for Ahmad under Apex Credit
    const ahmadSchedule: ScheduleItem[] = [
      {
        installmentNo: 1,
        dueDate: '2026-02-01',
        principalDue: 833.33,
        profitDue: 83.33,
        totalDue: 916.66,
        endingBalance: 9166.67,
        principalPaid: 833.33,
        profitPaid: 83.33,
        status: 'PAID',
        paidAt: '2026-01-30T10:00:00Z',
      },
      {
        installmentNo: 2,
        dueDate: '2026-03-01',
        principalDue: 833.33,
        profitDue: 83.33,
        totalDue: 916.66,
        endingBalance: 8333.34,
        principalPaid: 833.33,
        profitPaid: 83.33,
        status: 'PAID',
        paidAt: '2026-02-28T14:00:00Z',
      },
      {
        installmentNo: 3,
        dueDate: '2026-04-01',
        principalDue: 833.33,
        profitDue: 83.33,
        totalDue: 916.66,
        endingBalance: 7500.01,
        principalPaid: 0,
        profitPaid: 0,
        status: 'UNPAID',
      },
      {
        installmentNo: 4,
        dueDate: '2026-05-01',
        principalDue: 833.33,
        profitDue: 83.33,
        totalDue: 916.66,
        endingBalance: 6666.68,
        principalPaid: 0,
        profitPaid: 0,
        status: 'UNPAID',
      },
      {
        installmentNo: 5,
        dueDate: '2026-06-01',
        principalDue: 833.33,
        profitDue: 83.33,
        totalDue: 916.66,
        endingBalance: 5833.35,
        principalPaid: 0,
        profitPaid: 0,
        status: 'UNPAID',
      },
      {
        installmentNo: 6,
        dueDate: '2026-07-01',
        principalDue: 833.35,
        profitDue: 83.35,
        totalDue: 916.70,
        endingBalance: 0,
        principalPaid: 0,
        profitPaid: 0,
        status: 'UNPAID',
      },
    ];

    this.accounts.push({
      id: 'acc-101',
      tenantId: '11111111-1111-1111-1111-111111111111', // Apex
      customerId: 'cust-101',
      accountNo: 'APX-2026-0001',
      calcMethod: 'FLAT_RATE',
      principalAmount: 5000,
      profitRatePA: 10,
      tenorMonths: 6,
      totalProfit: 500,
      totalPayable: 5500,
      monthlyInstallment: 916.67,
      lateFeeRatePA: 1.0,
      processingFee: 150,
      stampDutyFee: 50,
      disbursedAmount: 4800,
      disbursedAt: '2026-01-01T09:00:00Z',
      payoutRef: 'TRF-APX-88912',
      status: 'ACTIVE',
      schedule: ahmadSchedule,
      createdAt: '2026-01-01T08:30:00Z',
    });
  }

  // Strict Tenant Isolated Operations

  public getCustomers(tenantId: string): Customer[] {
    return this.customers.filter(c => c.tenantId === tenantId);
  }

  public getCustomerById(tenantId: string, id: string): Customer | undefined {
    return this.customers.find(c => c.tenantId === tenantId && c.id === id);
  }

  public addCustomer(tenantId: string, customerData: Omit<Customer, 'id' | 'tenantId' | 'createdAt'>): Customer {
    const customer: Customer = {
      id: `cust-${Date.now()}`,
      tenantId,
      ...customerData,
      createdAt: new Date().toISOString(),
    };
    this.customers.push(customer);
    return customer;
  }

  public getAccounts(tenantId: string): FinancingAccount[] {
    return this.accounts.filter(a => a.tenantId === tenantId);
  }

  public getAccountById(tenantId: string, id: string): FinancingAccount | undefined {
    return this.accounts.find(a => a.tenantId === tenantId && a.id === id);
  }

  public addAccount(tenantId: string, accountData: Omit<FinancingAccount, 'id' | 'tenantId' | 'createdAt'>): FinancingAccount {
    const account: FinancingAccount = {
      id: `acc-${Date.now()}`,
      tenantId,
      ...accountData,
      createdAt: new Date().toISOString(),
    };
    this.accounts.push(account);
    return account;
  }

  public updateAccount(tenantId: string, id: string, updates: Partial<FinancingAccount>): FinancingAccount | undefined {
    const account = this.getAccountById(tenantId, id);
    if (!account) return undefined;
    Object.assign(account, updates);
    return account;
  }

  public addTransaction(tenantId: string, txData: Omit<FinancingTransaction, 'id' | 'tenantId' | 'transactedAt'>): FinancingTransaction {
    const tx: FinancingTransaction = {
      id: `tx-${Date.now()}`,
      tenantId,
      ...txData,
      transactedAt: new Date().toISOString(),
    };
    this.transactions.push(tx);
    return tx;
  }

  public getTransactions(tenantId: string, financingId?: string): FinancingTransaction[] {
    return this.transactions.filter(
      t => t.tenantId === tenantId && (!financingId || t.financingId === financingId)
    );
  }
}

// Global Singleton Instance
export const db = new MultiTenantDatabase();
