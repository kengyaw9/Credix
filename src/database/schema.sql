-- =============================================================================
-- Credix: Multi-Tenant Cloud Database Schema with Row-Level Security (RLS)
-- Designed for PostgreSQL (AWS RDS / GCP Cloud SQL / Supabase / Neon)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Tenants (Financial Institutions Subscribed to the System)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    phone VARCHAR(50),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. Users (Staff / Officers / Managers of each Financial Institution)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'OFFICER',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, email)
);

-- -----------------------------------------------------------------------------
-- 3. Customers (CIF Profile - Expanded for Loan Underwriting & Affordability)
-- Strict Isolation: Each institute only sees their own customers.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Primary / Identity Information
    id_type VARCHAR(20) NOT NULL,           -- NRIC, PASSPORT, POLICE_ARMY, BRN
    id_number VARCHAR(50) NOT NULL,         -- e.g. "900101-14-1234"
    full_name VARCHAR(255) NOT NULL,
    title VARCHAR(20),                      -- Mr, Mrs, Ms, Dr, Dato
    dob DATE NOT NULL,                      -- Birth Date (Age eligibility)
    gender VARCHAR(10) NOT NULL,            -- MALE, FEMALE
    marital_status VARCHAR(20) NOT NULL,    -- SINGLE, MARRIED, DIVORCED, WIDOWED
    race VARCHAR(50),                       -- Malay, Chinese, Indian, Others
    religion VARCHAR(50),                   -- Islam, Buddha, Hindu, Christian, Others
    mothers_maiden_name VARCHAR(255),       -- Security verification
    
    -- Contact & Residential Address
    phone VARCHAR(30) NOT NULL,             -- Primary Mobile
    home_phone VARCHAR(30),
    office_phone VARCHAR(30),
    email VARCHAR(255),
    residential_address TEXT NOT NULL,
    postcode VARCHAR(10),
    city VARCHAR(100),
    state VARCHAR(100),
    residence_ownership VARCHAR(20) DEFAULT 'RENTED', -- OWN, RENTED, FAMILY, MORTGAGED
    length_of_stay_years INT DEFAULT 1,
    correspondence_address TEXT,
    
    -- Employment & Affordability Assessment (Underwriting)
    employer_name VARCHAR(255) NOT NULL,
    occupation VARCHAR(255) NOT NULL,
    employment_type VARCHAR(50) DEFAULT 'PERMANENT', -- PERMANENT, CONTRACT, SELF_EMPLOYED, GOVERNMENT
    employment_sector VARCHAR(100),
    employment_date DATE,
    monthly_gross_income NUMERIC(15,2) NOT NULL DEFAULT 0,
    monthly_net_income NUMERIC(15,2) NOT NULL DEFAULT 0,
    monthly_commitments NUMERIC(15,2) DEFAULT 0,    -- Existing external loans
    monthly_expenses NUMERIC(15,2) DEFAULT 0,
    
    -- Emergency Contact / Next of Kin (Recovery & Collection)
    emergency_contact_name VARCHAR(255) NOT NULL,
    emergency_contact_relationship VARCHAR(50) NOT NULL,
    emergency_contact_phone VARCHAR(30) NOT NULL,
    
    -- Disbursement Bank Account
    bank_name VARCHAR(100) NOT NULL,
    bank_account_no VARCHAR(50) NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, id_number)
);

-- -----------------------------------------------------------------------------
-- 4. Financing Accounts (Loans)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS financing_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    account_no VARCHAR(50) NOT NULL,
    calc_method VARCHAR(20) NOT NULL,       -- 'FLAT_RATE' or 'REDUCING_BALANCE'
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
    
    approved_at TIMESTAMPTZ,
    approved_by VARCHAR(255),
    accepted_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    status VARCHAR(50) DEFAULT 'PENDING_APPROVAL',     -- PENDING_APPROVAL, APPROVED, ACCEPTED, READY_TO_DISBURSE, ACTIVE, REJECTED, SETTLED, WRITTEN_OFF
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, account_no)
);

-- -----------------------------------------------------------------------------
-- 5. Repayment Schedules (Installments)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS financing_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    financing_id UUID NOT NULL REFERENCES financing_accounts(id) ON DELETE CASCADE,
    installment_no INT NOT NULL,
    due_date DATE NOT NULL,
    principal_due NUMERIC(15,2) NOT NULL,
    profit_due NUMERIC(15,2) NOT NULL,
    total_due NUMERIC(15,2) NOT NULL,
    principal_paid NUMERIC(15,2) DEFAULT 0,
    profit_paid NUMERIC(15,2) DEFAULT 0,
    paid_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'UNPAID',
    UNIQUE (financing_id, installment_no)
);

-- -----------------------------------------------------------------------------
-- 6. Financial Transactions (Audit Trail)
-- -----------------------------------------------------------------------------
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
);

-- Row-Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE financing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financing_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE financing_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_customers ON customers
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_accounts ON financing_accounts
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_schedules ON financing_schedules
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_transactions ON financing_transactions
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
