-- =============================================================================
-- FlexiFinancing: Multi-Tenant Cloud Database Schema with Row-Level Security (RLS)
-- Designed for PostgreSQL (AWS RDS / GCP Cloud SQL / Supabase / Neon)
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Tenants (Financial Institutions Subscribed to the System)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,       -- e.g. "APEX_CREDIT", "METRO_FINANCE"
    name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    phone VARCHAR(50),
    status VARCHAR(20) DEFAULT 'ACTIVE',    -- ACTIVE, SUSPENDED
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. Users (Officers & Admins of each Financial Institution)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'OFFICER',      -- ADMIN, MANAGER, OFFICER
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, email)
);

-- -----------------------------------------------------------------------------
-- 3. Customers (CIF Lite - Borrowers)
-- Strict Isolation: Each institute only sees their own customers.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    id_type VARCHAR(20) NOT NULL,           -- NRIC, PASSPORT, BRN
    id_number VARCHAR(50) NOT NULL,         -- e.g. "900101-14-1234"
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    bank_name VARCHAR(100),
    bank_account_no VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, id_number)           -- Same IC can borrow from multiple institutes independently
);

-- -----------------------------------------------------------------------------
-- 4. Financing Accounts (The Loans)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS financing_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    account_no VARCHAR(50) NOT NULL,
    calc_method VARCHAR(20) NOT NULL,       -- 'FLAT_RATE' or 'REDUCING_BALANCE'
    principal_amount NUMERIC(15,2) NOT NULL,
    profit_rate_pa NUMERIC(6,4) NOT NULL,   -- e.g. 0.0800 for 8.00% p.a.
    tenor_months INT NOT NULL,
    total_profit NUMERIC(15,2) NOT NULL,
    total_payable NUMERIC(15,2) NOT NULL,
    monthly_installment NUMERIC(15,2) NOT NULL,
    late_fee_rate_pa NUMERIC(6,4) DEFAULT 0.0100, -- 1.0% p.a. default late fee
    
    -- Upfront Fees
    processing_fee NUMERIC(15,2) DEFAULT 0,
    stamp_duty_fee NUMERIC(15,2) DEFAULT 0,
    
    -- Disbursement details
    disbursed_amount NUMERIC(15,2),
    disbursed_at TIMESTAMPTZ,
    payout_ref VARCHAR(100),
    
    status VARCHAR(20) DEFAULT 'DRAFT',     -- DRAFT, ACTIVE, SETTLED, WRITTEN_OFF
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
    status VARCHAR(20) DEFAULT 'UNPAID',    -- UNPAID, PARTIAL, PAID
    UNIQUE (financing_id, installment_no)
);

-- -----------------------------------------------------------------------------
-- 6. Financial Transactions (Audit Trail)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS financing_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    financing_id UUID NOT NULL REFERENCES financing_accounts(id) ON DELETE CASCADE,
    tx_type VARCHAR(30) NOT NULL,           -- DISBURSEMENT, REPAYMENT, LATE_FEE, SETTLEMENT
    amount NUMERIC(15,2) NOT NULL,
    allocated_late_fee NUMERIC(15,2) DEFAULT 0,
    allocated_profit NUMERIC(15,2) DEFAULT 0,
    allocated_principal NUMERIC(15,2) DEFAULT 0,
    excess_amount NUMERIC(15,2) DEFAULT 0,
    payment_method VARCHAR(50),             -- BANK_TRANSFER, FPX, CASH, CHEQUE
    reference_no VARCHAR(100),
    remarks TEXT,
    transacted_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- The database itself blocks any query where tenant_id != current tenant context
-- =============================================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE financing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financing_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE financing_transactions ENABLE ROW LEVEL SECURITY;

-- Dynamic tenant context policy:
-- Every API request sets: SET LOCAL app.current_tenant_id = 'tenant-uuid-here';
CREATE POLICY tenant_isolation_customers ON customers
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_accounts ON financing_accounts
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_schedules ON financing_schedules
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_transactions ON financing_transactions
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id, id_number);
CREATE INDEX IF NOT EXISTS idx_accounts_tenant ON financing_accounts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_schedules_due ON financing_schedules(tenant_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON financing_transactions(tenant_id, financing_id);
