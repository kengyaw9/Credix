import { neon } from '@neondatabase/serverless';
import { Customer, FinancingAccount, FinancingTransaction, Tenant, User } from './memory-store';

const getSql = () => {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.STORAGE_DATABASE_URL ||
    process.env.STORAGE_POSTGRES_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL or POSTGRES_URL is not set');
  }
  return neon(connectionString);
};

// Row mappers to map snake_case SQL columns to camelCase TypeScript models
function mapCustomerRow(row: any): Customer {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    idType: row.id_type,
    idNumber: row.id_number,
    fullName: row.full_name,
    title: row.title || undefined,
    dob: row.dob ? new Date(row.dob).toISOString().split('T')[0] : '',
    gender: row.gender || 'MALE',
    maritalStatus: row.marital_status || 'SINGLE',
    race: row.race || undefined,
    religion: row.religion || undefined,
    mothersMaidenName: row.mothers_maiden_name || undefined,
    phone: row.phone,
    homePhone: row.home_phone || undefined,
    officePhone: row.office_phone || undefined,
    email: row.email || undefined,
    residentialAddress: row.residential_address,
    postcode: row.postcode || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
    residenceOwnership: row.residence_ownership || 'RENTED',
    lengthOfStayYears: row.length_of_stay_years ? Number(row.length_of_stay_years) : 1,
    correspondenceAddress: row.correspondence_address || undefined,
    employerName: row.employer_name || '',
    occupation: row.occupation || '',
    employmentType: row.employment_type || 'PERMANENT',
    employmentSector: row.employment_sector || undefined,
    employmentDate: row.employment_date ? new Date(row.employment_date).toISOString().split('T')[0] : undefined,
    monthlyGrossIncome: Number(row.monthly_gross_income) || 0,
    monthlyNetIncome: Number(row.monthly_net_income) || 0,
    monthlyCommitments: Number(row.monthly_commitments) || 0,
    monthlyExpenses: Number(row.monthly_expenses) || 0,
    emergencyContactName: row.emergency_contact_name || '',
    emergencyContactRelationship: row.emergency_contact_relationship || '',
    emergencyContactPhone: row.emergency_contact_phone || '',
    bankName: row.bank_name || '',
    bankAccountNo: row.bank_account_no || '',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

function mapAccountRow(row: any): FinancingAccount {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    customerId: row.customer_id,
    accountNo: row.account_no,
    calcMethod: row.calc_method,
    principalAmount: Number(row.principal_amount),
    profitRatePA: Number(row.profit_rate_pa),
    tenorMonths: Number(row.tenor_months),
    totalProfit: Number(row.total_profit),
    totalPayable: Number(row.total_payable),
    monthlyInstallment: Number(row.monthly_installment),
    lateFeeRatePA: Number(row.late_fee_rate_pa || 1.0),
    processingFee: Number(row.processing_fee || 0),
    stampDutyFee: Number(row.stamp_duty_fee || 0),
    disbursedAmount: row.disbursed_amount ? Number(row.disbursed_amount) : undefined,
    disbursedAt: row.disbursed_at ? new Date(row.disbursed_at).toISOString() : undefined,
    payoutRef: row.payout_ref || undefined,
    status: row.status,
    schedule: typeof row.schedule === 'string' ? JSON.parse(row.schedule) : (row.schedule || []),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

function mapTransactionRow(row: any): FinancingTransaction {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    financingId: row.financing_id,
    txType: row.tx_type,
    amount: Number(row.amount),
    allocatedLateFee: Number(row.allocated_late_fee || 0),
    allocatedProfit: Number(row.allocated_profit || 0),
    allocatedPrincipal: Number(row.allocated_principal || 0),
    excessAmount: Number(row.excess_amount || 0),
    paymentMethod: row.payment_method || 'BANK_TRANSFER',
    referenceNo: row.reference_no,
    remarks: row.remarks || undefined,
    transactedAt: row.transacted_at ? new Date(row.transacted_at).toISOString() : new Date().toISOString(),
  };
}

// PostgreSQL Serverless Store for Credix
export class PostgresStore {
  public async getTenants(): Promise<Tenant[]> {
    const sql = getSql();
    const rows = await sql`SELECT * FROM tenants WHERE status = 'ACTIVE'`;
    return rows.map((r: any) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      status: r.status,
    }));
  }

  public async getTenantById(id: string): Promise<Tenant | undefined> {
    const sql = getSql();
    const rows = await sql`SELECT * FROM tenants WHERE id = ${id}`;
    if (rows.length === 0) return undefined;
    const r = rows[0];
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      status: r.status,
    };
  }

  public async findUserByEmail(email: string): Promise<User | undefined> {
    const sql = getSql();
    const rows = await sql`SELECT * FROM users WHERE LOWER(email) = LOWER(${email.trim()})`;
    if (rows.length === 0) return undefined;
    const r = rows[0];
    return {
      id: r.id,
      tenantId: r.tenant_id,
      email: r.email,
      password: r.password_hash,
      fullName: r.full_name,
      role: r.role,
    };
  }

  public async getCustomers(tenantId: string): Promise<Customer[]> {
    const sql = getSql();
    const rows = await sql`
      SELECT * FROM customers 
      WHERE tenant_id = ${tenantId} 
      ORDER BY created_at DESC
    `;
    return rows.map(mapCustomerRow);
  }

  public async getCustomerById(tenantId: string, id: string): Promise<Customer | undefined> {
    const sql = getSql();
    const rows = await sql`
      SELECT * FROM customers 
      WHERE tenant_id = ${tenantId} AND id = ${id}
    `;
    if (rows.length === 0) return undefined;
    return mapCustomerRow(rows[0]);
  }

  public async getCustomerByIdNumber(tenantId: string, idNumber: string): Promise<Customer | undefined> {
    const sql = getSql();
    const rows = await sql`
      SELECT * FROM customers 
      WHERE tenant_id = ${tenantId} AND id_number = ${idNumber.trim()}
    `;
    if (rows.length === 0) return undefined;
    return mapCustomerRow(rows[0]);
  }

  public async addCustomer(
    tenantId: string, 
    c: Omit<Customer, 'id' | 'tenantId' | 'createdAt'>
  ): Promise<Customer> {
    const sql = getSql();
    const rows = await sql`
      INSERT INTO customers (
        tenant_id, id_type, id_number, full_name, title, dob, gender, marital_status,
        race, religion, mothers_maiden_name, phone, home_phone, office_phone, email,
        residential_address, postcode, city, state, residence_ownership, length_of_stay_years,
        correspondence_address, employer_name, occupation, employment_type, employment_sector,
        employment_date, monthly_gross_income, monthly_net_income, monthly_commitments, monthly_expenses,
        emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
        bank_name, bank_account_no
      )
      VALUES (
        ${tenantId}, ${c.idType}, ${c.idNumber}, ${c.fullName}, ${c.title || null}, 
        ${c.dob ? c.dob : null}, ${c.gender}, ${c.maritalStatus}, ${c.race || null}, 
        ${c.religion || null}, ${c.mothersMaidenName || null}, ${c.phone}, ${c.homePhone || null}, 
        ${c.officePhone || null}, ${c.email || null}, ${c.residentialAddress}, ${c.postcode || null}, 
        ${c.city || null}, ${c.state || null}, ${c.residenceOwnership}, ${c.lengthOfStayYears || 1}, 
        ${c.correspondenceAddress || null}, ${c.employerName}, ${c.occupation}, ${c.employmentType}, 
        ${c.employmentSector || null}, ${c.employmentDate ? c.employmentDate : null}, 
        ${c.monthlyGrossIncome || 0}, ${c.monthlyNetIncome || 0}, ${c.monthlyCommitments || 0}, 
        ${c.monthlyExpenses || 0}, ${c.emergencyContactName}, ${c.emergencyContactRelationship}, 
        ${c.emergencyContactPhone}, ${c.bankName}, ${c.bankAccountNo}
      )
      RETURNING *
    `;
    return mapCustomerRow(rows[0]);
  }

  public async getAccounts(tenantId: string): Promise<FinancingAccount[]> {
    const sql = getSql();
    const rows = await sql`
      SELECT * FROM financing_accounts 
      WHERE tenant_id = ${tenantId} 
      ORDER BY created_at DESC
    `;
    return rows.map(mapAccountRow);
  }

  public async getAccountById(tenantId: string, id: string): Promise<FinancingAccount | undefined> {
    const sql = getSql();
    const rows = await sql`
      SELECT * FROM financing_accounts 
      WHERE tenant_id = ${tenantId} AND id = ${id}
    `;
    if (rows.length === 0) return undefined;
    return mapAccountRow(rows[0]);
  }

  public async getAccountsByCustomer(tenantId: string, customerId: string): Promise<FinancingAccount[]> {
    const sql = getSql();
    const rows = await sql`
      SELECT * FROM financing_accounts 
      WHERE tenant_id = ${tenantId} AND customer_id = ${customerId}
      ORDER BY created_at DESC
    `;
    return rows.map(mapAccountRow);
  }

  public async addAccount(
    tenantId: string, 
    acc: Omit<FinancingAccount, 'id' | 'tenantId' | 'createdAt'>
  ): Promise<FinancingAccount> {
    const sql = getSql();
    const rows = await sql`
      INSERT INTO financing_accounts (
        tenant_id, customer_id, account_no, calc_method, principal_amount,
        profit_rate_pa, tenor_months, total_profit, total_payable, monthly_installment,
        late_fee_rate_pa, processing_fee, stamp_duty_fee, disbursed_amount, disbursed_at,
        payout_ref, status, schedule
      )
      VALUES (
        ${tenantId}, ${acc.customerId}, ${acc.accountNo}, ${acc.calcMethod}, ${acc.principalAmount},
        ${acc.profitRatePA}, ${acc.tenorMonths}, ${acc.totalProfit}, ${acc.totalPayable}, ${acc.monthlyInstallment},
        ${acc.lateFeeRatePA || 1.0}, ${acc.processingFee || 0}, ${acc.stampDutyFee || 0}, 
        ${acc.disbursedAmount || null}, ${acc.disbursedAt ? new Date(acc.disbursedAt) : null}, 
        ${acc.payoutRef || null}, ${acc.status}, ${JSON.stringify(acc.schedule)}::jsonb
      )
      RETURNING *
    `;
    return mapAccountRow(rows[0]);
  }

  public async updateAccount(
    tenantId: string, 
    id: string, 
    updates: Partial<FinancingAccount>
  ): Promise<FinancingAccount | undefined> {
    const sql = getSql();
    
    // Fetch existing
    const existing = await this.getAccountById(tenantId, id);
    if (!existing) return undefined;

    const merged = { ...existing, ...updates };

    const rows = await sql`
      UPDATE financing_accounts SET
        status = ${merged.status},
        disbursed_amount = ${merged.disbursedAmount ?? null},
        disbursed_at = ${merged.disbursedAt ? new Date(merged.disbursedAt) : null},
        payout_ref = ${merged.payoutRef ?? null},
        schedule = ${JSON.stringify(merged.schedule)}::jsonb,
        updated_at = NOW()
      WHERE tenant_id = ${tenantId} AND id = ${id}
      RETURNING *
    `;

    if (rows.length === 0) return undefined;
    return mapAccountRow(rows[0]);
  }

  public async addTransaction(
    tenantId: string, 
    tx: Omit<FinancingTransaction, 'id' | 'tenantId' | 'transactedAt'>
  ): Promise<FinancingTransaction> {
    const sql = getSql();
    const rows = await sql`
      INSERT INTO financing_transactions (
        tenant_id, financing_id, tx_type, amount, allocated_late_fee,
        allocated_profit, allocated_principal, excess_amount, payment_method,
        reference_no, remarks, transacted_at
      )
      VALUES (
        ${tenantId}, ${tx.financingId}, ${tx.txType}, ${tx.amount}, ${tx.allocatedLateFee || 0},
        ${tx.allocatedProfit || 0}, ${tx.allocatedPrincipal || 0}, ${tx.excessAmount || 0}, ${tx.paymentMethod},
        ${tx.referenceNo}, ${tx.remarks || null}, NOW()
      )
      RETURNING *
    `;
    return mapTransactionRow(rows[0]);
  }

  public async getTransactions(tenantId: string, financingId?: string): Promise<FinancingTransaction[]> {
    const sql = getSql();
    const rows = financingId 
      ? await sql`
          SELECT * FROM financing_transactions 
          WHERE tenant_id = ${tenantId} AND financing_id = ${financingId} 
          ORDER BY transacted_at DESC
        `
      : await sql`
          SELECT * FROM financing_transactions 
          WHERE tenant_id = ${tenantId} 
          ORDER BY transacted_at DESC
        `;
    return rows.map(mapTransactionRow);
  }
}

export const pgDb = new PostgresStore();
