/**
 * Multi-Tenant Data Store with Strict Isolation
 * 
 * Expanded Customer Information File (CIF) containing demographic, address,
 * employment, income affordability, and emergency contact details
 * needed for financing underwriting and collection.
 */

import { ScheduleItem, FinancingStatus } from '../financing/types';

export interface Tenant {
  id: string;
  code: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  password: string;
  fullName: string;
  role: 'ADMIN' | 'MANAGER' | 'OFFICER';
}

export interface Customer {
  id: string;
  tenantId: string;
  
  // 1. Primary & Identity Information
  idType: 'NRIC' | 'PASSPORT' | 'POLICE_ARMY' | 'BRN';
  idNumber: string;
  fullName: string;
  title?: string; // Mr, Mrs, Ms, Dato, Dr
  dob: string; // YYYY-MM-DD
  gender: 'MALE' | 'FEMALE';
  maritalStatus: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
  race?: string; // Malay, Chinese, Indian, Others
  religion?: string; // Islam, Buddha, Hindu, Christian, Others
  mothersMaidenName?: string; // Security verification

  // 2. Contact & Address Information
  phone: string; // Mobile
  homePhone?: string;
  officePhone?: string;
  email: string;
  residentialAddress: string;
  postcode?: string;
  city?: string;
  state?: string;
  residenceOwnership: 'OWN' | 'RENTED' | 'FAMILY' | 'MORTGAGED';
  lengthOfStayYears?: number;
  correspondenceAddress?: string;

  // 3. Employment & Income Assessment
  employerName: string;
  occupation: string;
  employmentType: 'PERMANENT' | 'CONTRACT' | 'SELF_EMPLOYED' | 'GOVERNMENT';
  employmentSector?: string;
  employmentDate?: string; // Date joined
  monthlyGrossIncome: number;
  monthlyNetIncome: number;
  monthlyCommitments: number; // Existing bank loans, car, credit cards
  monthlyExpenses?: number;

  // 4. Emergency Contact / Next of Kin
  emergencyContactName: string;
  emergencyContactRelationship: string; // Spouse, Parent, Sibling, Friend
  emergencyContactPhone: string;

  // 5. Disbursement & Repayment Bank Details
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
  approvedAt?: string;
  approvedBy?: string;
  acceptedAt?: string;
  rejectionReason?: string;
  status: FinancingStatus;
  schedule: ScheduleItem[];
  createdAt: string;
}

export interface FinancingTransaction {
  id: string;
  tenantId: string;
  financingId: string;
  txType: 'DISBURSEMENT' | 'FEE_CHARGE' | 'INSTALLMENT_BILLED' | 'REPAYMENT' | 'LATE_FEE' | 'SETTLEMENT';
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

  public users: User[] = [
    {
      id: 'usr-1',
      tenantId: '11111111-1111-1111-1111-111111111111',
      email: 'officer@apex.com',
      password: 'password123',
      fullName: 'Sarah Tan (Senior Credit Officer)',
      role: 'OFFICER',
    },
    {
      id: 'usr-2',
      tenantId: '22222222-2222-2222-2222-222222222222',
      email: 'officer@metro.com',
      password: 'password123',
      fullName: 'Kamal Hassan (Financing Manager)',
      role: 'MANAGER',
    },
  ];

  public customers: Customer[] = [
    {
      id: 'cust-101',
      tenantId: '11111111-1111-1111-1111-111111111111', // Apex Credit
      idType: 'NRIC',
      idNumber: '880101-14-5555',
      fullName: 'Ahmad bin Razak',
      title: 'Mr',
      dob: '1988-01-01',
      gender: 'MALE',
      maritalStatus: 'MARRIED',
      race: 'Malay',
      religion: 'Islam',
      mothersMaidenName: 'Fatimah binti Hassan',
      phone: '+6012-3456789',
      homePhone: '+603-77889900',
      officePhone: '+603-21665544',
      email: 'ahmad.razak@example.com',
      residentialAddress: 'No 15, Jalan Melati 3, Taman Melati',
      postcode: '50480',
      city: 'Kuala Lumpur',
      state: 'Wilayah Persekutuan',
      residenceOwnership: 'OWN',
      lengthOfStayYears: 6,
      correspondenceAddress: 'Same as residential',
      employerName: 'Petronas Dagangan Berhad',
      occupation: 'Senior Logistics Specialist',
      employmentType: 'PERMANENT',
      employmentSector: 'Oil & Gas',
      employmentDate: '2016-04-01',
      monthlyGrossIncome: 6500,
      monthlyNetIncome: 5200,
      monthlyCommitments: 1600, // Housing & car loan
      monthlyExpenses: 1800,
      emergencyContactName: 'Nurul Huda (Spouse)',
      emergencyContactRelationship: 'Spouse',
      emergencyContactPhone: '+6012-9988776',
      bankName: 'Maybank',
      bankAccountNo: '114012345678',
      createdAt: '2026-01-01T08:00:00Z',
    },
    {
      id: 'cust-102',
      tenantId: '11111111-1111-1111-1111-111111111111', // Apex Credit
      idType: 'NRIC',
      idNumber: '951120-10-6721',
      fullName: 'Lim Mei Ling',
      title: 'Ms',
      dob: '1995-11-20',
      gender: 'FEMALE',
      maritalStatus: 'SINGLE',
      race: 'Chinese',
      religion: 'Buddha',
      mothersMaidenName: 'Tan Siew Lan',
      phone: '+6016-8877665',
      email: 'meiling.lim@example.com',
      residentialAddress: '22A, Lorong Helang, Damansara Utama',
      postcode: '47301',
      city: 'Petaling Jaya',
      state: 'Selangor',
      residenceOwnership: 'RENTED',
      lengthOfStayYears: 3,
      employerName: 'Shopee Malaysia Sdn Bhd',
      occupation: 'Digital Marketing Lead',
      employmentType: 'PERMANENT',
      employmentSector: 'E-Commerce / Tech',
      employmentDate: '2020-08-15',
      monthlyGrossIncome: 5800,
      monthlyNetIncome: 4800,
      monthlyCommitments: 1200,
      monthlyExpenses: 1500,
      emergencyContactName: 'Lim Chee Keong (Father)',
      emergencyContactRelationship: 'Parent',
      emergencyContactPhone: '+6016-2233445',
      bankName: 'Public Bank',
      bankAccountNo: '3190887722',
      createdAt: '2026-02-10T11:00:00Z',
    },
    {
      id: 'cust-201',
      tenantId: '22222222-2222-2222-2222-222222222222', // Metro Micro
      idType: 'NRIC',
      idNumber: '920315-10-8888',
      fullName: 'Tan Wei Ming',
      title: 'Mr',
      dob: '1992-03-15',
      gender: 'MALE',
      maritalStatus: 'MARRIED',
      race: 'Chinese',
      phone: '+6017-9876543',
      email: 'tan.wm@example.com',
      residentialAddress: 'Lot 45, Jalan Tun Razak, Johor Bahru',
      postcode: '80000',
      city: 'Johor Bahru',
      state: 'Johor',
      residenceOwnership: 'MORTGAGED',
      employerName: 'TWM Global Trading',
      occupation: 'Sole Proprietor',
      employmentType: 'SELF_EMPLOYED',
      monthlyGrossIncome: 9000,
      monthlyNetIncome: 7500,
      monthlyCommitments: 2500,
      emergencyContactName: 'Alice Tan (Spouse)',
      emergencyContactRelationship: 'Spouse',
      emergencyContactPhone: '+6017-5544332',
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
      tenantId: '11111111-1111-1111-1111-111111111111',
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

    const metroSchedule: ScheduleItem[] = [
      {
        installmentNo: 1,
        dueDate: '2026-03-01',
        principalDue: 1000,
        profitDue: 100,
        totalDue: 1100,
        endingBalance: 9000,
        principalPaid: 1000,
        profitPaid: 100,
        status: 'PAID',
        paidAt: '2026-03-01T10:00:00Z',
      },
      {
        installmentNo: 2,
        dueDate: '2026-04-01',
        principalDue: 1000,
        profitDue: 100,
        totalDue: 1100,
        endingBalance: 8000,
        principalPaid: 0,
        profitPaid: 0,
        status: 'UNPAID',
      },
      {
        installmentNo: 3,
        dueDate: '2026-05-01',
        principalDue: 1000,
        profitDue: 100,
        totalDue: 1100,
        endingBalance: 7000,
        principalPaid: 0,
        profitPaid: 0,
        status: 'UNPAID',
      },
    ];

    this.accounts.push({
      id: 'acc-201',
      tenantId: '22222222-2222-2222-2222-222222222222',
      customerId: 'cust-201',
      accountNo: 'MM-2026-0001',
      calcMethod: 'FLAT_RATE',
      principalAmount: 10000,
      profitRatePA: 12,
      tenorMonths: 3,
      totalProfit: 300,
      totalPayable: 10300,
      monthlyInstallment: 1100,
      lateFeeRatePA: 1.0,
      processingFee: 200,
      stampDutyFee: 50,
      disbursedAmount: 9750,
      disbursedAt: '2026-02-01T10:00:00Z',
      payoutRef: 'TRF-MM-4401',
      status: 'ACTIVE',
      schedule: metroSchedule,
      createdAt: '2026-02-01T09:30:00Z',
    });

    // Seed comprehensive ledger history for Ahmad's facility (acc-101)
    this.transactions.push(
      {
        id: 'tx-101-1',
        tenantId: '11111111-1111-1111-1111-111111111111',
        financingId: 'acc-101',
        txType: 'FEE_CHARGE',
        amount: 150.00,
        allocatedLateFee: 0,
        allocatedProfit: 0,
        allocatedPrincipal: 0,
        excessAmount: 0,
        paymentMethod: 'DEDUCTION',
        referenceNo: 'FEE-PROC-88912',
        remarks: 'Documentation & Loan Processing Fee (Deducted upfront)',
        transactedAt: '2026-01-01T08:50:00Z',
      },
      {
        id: 'tx-101-2',
        tenantId: '11111111-1111-1111-1111-111111111111',
        financingId: 'acc-101',
        txType: 'FEE_CHARGE',
        amount: 50.00,
        allocatedLateFee: 0,
        allocatedProfit: 0,
        allocatedPrincipal: 0,
        excessAmount: 0,
        paymentMethod: 'DEDUCTION',
        referenceNo: 'FEE-STAMP-88912',
        remarks: 'Inland Revenue Board Stamp Duty (Deducted upfront)',
        transactedAt: '2026-01-01T08:52:00Z',
      },
      {
        id: 'tx-101-3',
        tenantId: '11111111-1111-1111-1111-111111111111',
        financingId: 'acc-101',
        txType: 'DISBURSEMENT',
        amount: 4800.00,
        allocatedLateFee: 0,
        allocatedProfit: 0,
        allocatedPrincipal: 4800.00,
        excessAmount: 0,
        paymentMethod: 'BANK_TRANSFER',
        referenceNo: 'TRF-APX-88912',
        remarks: 'Net Loan Capital Drawdown disbursed to Maybank 114012345678 (Gross RM 5,000 minus RM 200 fees)',
        transactedAt: '2026-01-01T09:00:00Z',
      },
      {
        id: 'tx-101-4',
        tenantId: '11111111-1111-1111-1111-111111111111',
        financingId: 'acc-101',
        txType: 'REPAYMENT',
        amount: 916.67,
        allocatedLateFee: 0,
        allocatedProfit: 83.34,
        allocatedPrincipal: 833.33,
        excessAmount: 0,
        paymentMethod: 'FPX_ONLINE',
        referenceNo: 'FPX-20260206-8812',
        remarks: 'Installment #1 Repayment via JomPay FPX (Principal: RM 833.33, Profit: RM 83.34)',
        transactedAt: '2026-02-06T14:32:00Z',
      }
    );

    // Seed ledger history for Metro Micro facility (acc-201)
    this.transactions.push(
      {
        id: 'tx-201-1',
        tenantId: '22222222-2222-2222-2222-222222222222',
        financingId: 'acc-201',
        txType: 'FEE_CHARGE',
        amount: 200.00,
        allocatedLateFee: 0,
        allocatedProfit: 0,
        allocatedPrincipal: 0,
        excessAmount: 0,
        paymentMethod: 'DEDUCTION',
        referenceNo: 'FEE-MM-4401',
        remarks: 'Documentation Processing Fee (Deducted upfront)',
        transactedAt: '2026-02-01T09:50:00Z',
      },
      {
        id: 'tx-201-2',
        tenantId: '22222222-2222-2222-2222-222222222222',
        financingId: 'acc-201',
        txType: 'FEE_CHARGE',
        amount: 50.00,
        allocatedLateFee: 0,
        allocatedProfit: 0,
        allocatedPrincipal: 0,
        excessAmount: 0,
        paymentMethod: 'DEDUCTION',
        referenceNo: 'FEE-STAMP-4401',
        remarks: 'Stamp Duty Fee',
        transactedAt: '2026-02-01T09:55:00Z',
      },
      {
        id: 'tx-201-3',
        tenantId: '22222222-2222-2222-2222-222222222222',
        financingId: 'acc-201',
        txType: 'DISBURSEMENT',
        amount: 9750.00,
        allocatedLateFee: 0,
        allocatedProfit: 0,
        allocatedPrincipal: 9750.00,
        excessAmount: 0,
        paymentMethod: 'BANK_TRANSFER',
        referenceNo: 'TRF-MM-4401',
        remarks: 'Disbursed Net RM 9,750 (Gross RM 10,000 minus RM 250 fees)',
        transactedAt: '2026-02-01T10:00:00Z',
      },
      {
        id: 'tx-201-4',
        tenantId: '22222222-2222-2222-2222-222222222222',
        financingId: 'acc-201',
        txType: 'REPAYMENT',
        amount: 1100.00,
        allocatedLateFee: 0,
        allocatedProfit: 100.00,
        allocatedPrincipal: 1000.00,
        excessAmount: 0,
        paymentMethod: 'BANK_TRANSFER',
        referenceNo: 'PAY-MM-001',
        remarks: 'Installment #1 Repayment (Principal: RM 1,000.00, Profit: RM 100.00)',
        transactedAt: '2026-03-01T10:00:00Z',
      }
    );
  }

  // Strict Tenant Isolated Operations

  public findUserByEmail(email: string): User | undefined {
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getTenantById(id: string): Tenant | undefined {
    return this.tenants.find(t => t.id === id);
  }

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

  public getAccountsByCustomer(tenantId: string, customerId: string): FinancingAccount[] {
    return this.accounts.filter(a => a.tenantId === tenantId && a.customerId === customerId);
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
