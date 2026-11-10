import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL or POSTGRES_URL is required to run init-db');
  process.exit(1);
}

async function initDatabase() {
  console.log('Connecting to Neon PostgreSQL to initialize schema...');
  const sql = neon(databaseUrl);

  // 1. Create Tables
  console.log('Creating database tables...');
  
  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;

  await sql`
    CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      contact_email VARCHAR(255),
      phone VARCHAR(50),
      status VARCHAR(20) DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'OFFICER',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (tenant_id, email)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      id_type VARCHAR(20) NOT NULL,
      id_number VARCHAR(50) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      title VARCHAR(20),
      dob DATE,
      gender VARCHAR(10),
      marital_status VARCHAR(20),
      race VARCHAR(50),
      religion VARCHAR(50),
      mothers_maiden_name VARCHAR(255),
      phone VARCHAR(30) NOT NULL,
      home_phone VARCHAR(30),
      office_phone VARCHAR(30),
      email VARCHAR(255),
      residential_address TEXT,
      postcode VARCHAR(10),
      city VARCHAR(100),
      state VARCHAR(100),
      residence_ownership VARCHAR(20) DEFAULT 'RENTED',
      length_of_stay_years INT DEFAULT 1,
      correspondence_address TEXT,
      employer_name VARCHAR(255),
      occupation VARCHAR(255),
      employment_type VARCHAR(50) DEFAULT 'PERMANENT',
      employment_sector VARCHAR(100),
      employment_date DATE,
      monthly_gross_income NUMERIC(15,2) DEFAULT 0,
      monthly_net_income NUMERIC(15,2) DEFAULT 0,
      monthly_commitments NUMERIC(15,2) DEFAULT 0,
      monthly_expenses NUMERIC(15,2) DEFAULT 0,
      emergency_contact_name VARCHAR(255),
      emergency_contact_relationship VARCHAR(50),
      emergency_contact_phone VARCHAR(30),
      bank_name VARCHAR(100),
      bank_account_no VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (tenant_id, id_number)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS financing_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      account_no VARCHAR(50) NOT NULL,
      calc_method VARCHAR(20) NOT NULL,
      principal_amount NUMERIC(15,2) NOT NULL,
      profit_rate_pa NUMERIC(6,4) NOT NULL,
      tenor_months INT NOT NULL,
      total_profit NUMERIC(15,2) NOT NULL,
      total_payable NUMERIC(15,2) NOT NULL,
      monthly_installment NUMERIC(15,2) NOT NULL,
      late_fee_rate_pa NUMERIC(6,4) DEFAULT 0.0100,
      processing_fee NUMERIC(15,2) DEFAULT 0,
      stamp_duty_fee NUMERIC(15,2) DEFAULT 0,
      disbursed_amount NUMERIC(15,2),
      disbursed_at TIMESTAMPTZ,
      payout_ref VARCHAR(100),
      status VARCHAR(20) DEFAULT 'DRAFT',
      schedule JSONB NOT NULL DEFAULT '[]'::JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (tenant_id, account_no)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS financing_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      financing_id UUID NOT NULL REFERENCES financing_accounts(id) ON DELETE CASCADE,
      tx_type VARCHAR(30) NOT NULL,
      amount NUMERIC(15,2) NOT NULL,
      allocated_late_fee NUMERIC(15,2) DEFAULT 0,
      allocated_profit NUMERIC(15,2) DEFAULT 0,
      allocated_principal NUMERIC(15,2) DEFAULT 0,
      excess_amount NUMERIC(15,2) DEFAULT 0,
      payment_method VARCHAR(50),
      reference_no VARCHAR(100),
      remarks TEXT,
      transacted_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  console.log('Tables created successfully!');

  // 2. Seed Initial Tenants & Users
  console.log('Seeding tenants and users...');

  await sql`
    INSERT INTO tenants (id, code, name, status)
    VALUES 
      ('11111111-1111-1111-1111-111111111111', 'APEX_CREDIT', 'Apex Credit Capital Sdn Bhd', 'ACTIVE'),
      ('22222222-2222-2222-2222-222222222222', 'METRO_MICRO', 'Metro Micro-Financing Ltd', 'ACTIVE')
    ON CONFLICT (code) DO NOTHING
  `;

  await sql`
    INSERT INTO users (id, tenant_id, email, password_hash, full_name, role)
    VALUES
      ('11111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'officer@apex.com', 'password123', 'Sarah Tan (Senior Credit Officer)', 'OFFICER'),
      ('22222222-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'officer@metro.com', 'password123', 'Kamal Hassan (Financing Manager)', 'MANAGER')
    ON CONFLICT (tenant_id, email) DO NOTHING
  `;

  // 3. Seed Ahmad bin Razak
  console.log('Seeding demo borrowers and accounts...');

  await sql`
    INSERT INTO customers (
      id, tenant_id, id_type, id_number, full_name, title, dob, gender, marital_status, race, religion,
      phone, email, residential_address, postcode, city, state, residence_ownership, length_of_stay_years,
      employer_name, occupation, employment_type, employment_sector, employment_date,
      monthly_gross_income, monthly_net_income, monthly_commitments, monthly_expenses,
      emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
      bank_name, bank_account_no
    )
    VALUES (
      '11111111-1111-1111-0000-000000000001',
      '11111111-1111-1111-1111-111111111111',
      'NRIC', '880101-14-5555', 'Ahmad bin Razak', 'Mr', '1988-01-01', 'MALE', 'MARRIED', 'Malay', 'Islam',
      '+6012-3456789', 'ahmad.razak@example.com', 'No 15, Jalan Kemboja 3, Taman Bukit Indah', '68000', 'Ampang', 'Selangor', 'OWN', 5,
      'Petronas Chemicals Bhd', 'Senior Plant Supervisor', 'PERMANENT', 'Oil & Gas', '2015-06-01',
      5500.00, 4500.00, 1500.00, 1200.00,
      'Siti Nurhaliza binti Kassim', 'SPOUSE', '+6012-9876543',
      'Maybank', '114012345678'
    )
    ON CONFLICT (tenant_id, id_number) DO NOTHING
  `;

  await sql`
    INSERT INTO customers (
      id, tenant_id, id_type, id_number, full_name, title, dob, gender, marital_status, race, religion,
      phone, email, residential_address, postcode, city, state, residence_ownership, length_of_stay_years,
      employer_name, occupation, employment_type, employment_sector, employment_date,
      monthly_gross_income, monthly_net_income, monthly_commitments, monthly_expenses,
      emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
      bank_name, bank_account_no
    )
    VALUES (
      '11111111-1111-1111-0000-000000000002',
      '11111111-1111-1111-1111-111111111111',
      'NRIC', '951120-10-6721', 'Lim Mei Ling', 'Ms', '1995-11-20', 'FEMALE', 'SINGLE', 'Chinese', 'Buddha',
      '+6016-8877665', 'meiling.lim@example.com', 'B-12-08, Residensi Flora, Jalan Subang 4', '47500', 'Subang Jaya', 'Selangor', 'RENTED', 2,
      'Public Bank Berhad', 'Customer Relationship Exec', 'PERMANENT', 'Banking & Finance', '2020-03-01',
      4200.00, 3600.00, 900.00, 1000.00,
      'Lim Chong Wei', 'PARENT', '+6019-2233445',
      'Public Bank', '3190887722'
    )
    ON CONFLICT (tenant_id, id_number) DO NOTHING
  `;

  // Seed demo loan account
  const ahmadSchedule = [
    { installmentNo: 1, dueDate: '2026-02-06', principalDue: 833.33, profitDue: 83.34, totalDue: 916.67, endingBalance: 4166.67, principalPaid: 833.33, profitPaid: 83.34, status: 'PAID', paidAt: '2026-02-06T14:32:00Z' },
    { installmentNo: 2, dueDate: '2026-03-06', principalDue: 833.33, profitDue: 83.34, totalDue: 916.67, endingBalance: 3333.34, principalPaid: 0, profitPaid: 0, status: 'UNPAID' },
    { installmentNo: 3, dueDate: '2026-04-06', principalDue: 833.33, profitDue: 83.34, totalDue: 916.67, endingBalance: 2500.01, principalPaid: 0, profitPaid: 0, status: 'UNPAID' },
    { installmentNo: 4, dueDate: '2026-05-06', principalDue: 833.33, profitDue: 83.34, totalDue: 916.67, endingBalance: 1666.68, principalPaid: 0, profitPaid: 0, status: 'UNPAID' },
    { installmentNo: 5, dueDate: '2026-06-06', principalDue: 833.33, profitDue: 83.34, totalDue: 916.67, endingBalance: 833.35, principalPaid: 0, profitPaid: 0, status: 'UNPAID' },
    { installmentNo: 6, dueDate: '2026-07-06', principalDue: 833.35, profitDue: 83.32, totalDue: 916.67, endingBalance: 0.00, principalPaid: 0, profitPaid: 0, status: 'UNPAID' },
  ];

  await sql`
    INSERT INTO financing_accounts (
      id, tenant_id, customer_id, account_no, calc_method, principal_amount, profit_rate_pa, tenor_months,
      total_profit, total_payable, monthly_installment, late_fee_rate_pa, processing_fee, stamp_duty_fee,
      disbursed_amount, disbursed_at, payout_ref, status, schedule
    )
    VALUES (
      '11111111-2222-3333-4444-000000000001',
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-0000-000000000001',
      'APX-2026-0001',
      'FLAT_RATE',
      5000.00, 10.00, 6, 500.00, 5500.00, 916.67, 1.00, 150.00, 50.00,
      4800.00, '2026-01-01T09:00:00Z', 'TRF-APX-88912', 'ACTIVE',
      ${JSON.stringify(ahmadSchedule)}::jsonb
    )
    ON CONFLICT (tenant_id, account_no) DO NOTHING
  `;

  // Seed transaction audit trail
  await sql`
    INSERT INTO financing_transactions (
      id, tenant_id, financing_id, tx_type, amount, allocated_late_fee, allocated_profit, allocated_principal,
      payment_method, reference_no, remarks, transacted_at
    )
    VALUES
      ('11111111-9999-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '11111111-2222-3333-4444-000000000001', 'FEE_CHARGE', 150.00, 0, 0, 0, 'DEDUCTION', 'FEE-PROC-88912', 'Documentation & Loan Processing Fee (Deducted upfront)', '2026-01-01T08:50:00Z'),
      ('11111111-9999-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '11111111-2222-3333-4444-000000000001', 'FEE_CHARGE', 50.00, 0, 0, 0, 'DEDUCTION', 'FEE-STAMP-88912', 'Inland Revenue Board Stamp Duty (Deducted upfront)', '2026-01-01T08:52:00Z'),
      ('11111111-9999-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '11111111-2222-3333-4444-000000000001', 'DISBURSEMENT', 4800.00, 0, 0, 4800.00, 'BANK_TRANSFER', 'TRF-APX-88912', 'Net Loan Capital Drawdown disbursed to Maybank 114012345678 (Gross RM 5,000 minus RM 200 fees)', '2026-01-01T09:00:00Z'),
      ('11111111-9999-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '11111111-2222-3333-4444-000000000001', 'REPAYMENT', 916.67, 0, 83.34, 833.33, 'FPX_ONLINE', 'FPX-20260206-8812', 'Installment #1 Repayment via JomPay FPX (Principal: RM 833.33, Profit: RM 83.34)', '2026-02-06T14:32:00Z')
    ON CONFLICT (id) DO NOTHING
  `;

  console.log('Database initialization & seeding completed successfully!');
}

initDatabase().catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});
