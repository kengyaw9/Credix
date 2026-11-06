# FlexiFinancing: Cloud Multi-Tenant Lending Platform

A modern, cloud-native Lending & Financing SaaS designed specifically for small financial institutions (micro-lenders, credit companies, cooperatives, and SME financiers).

Unlike legacy core banking platforms that rely on cumbersome overnight batch runs, **FlexiFinancing operates completely batch-free** with dynamic, on-demand real-time calculations.

---

## Key Architectural Principles

### 1. Zero Nightly Batch Run
* **Traditional Core Banking**: A midnight batch job runs for hours to calculate daily interest accrual, flip overdue status flags, assess late payment fees, and update ledger balances.
* **FlexiFinancing Approach**:
  * **Dynamic Status Evaluation**: Delinquency state and Days Past Due (DPD) are computed dynamically at query time (`CURRENT_DATE > due_date AND paid < due`).
  * **On-the-Fly Late Charges**: Penalty/late charges are calculated on-demand whenever an account is viewed, quoted, or paid.
  * **Zero Latency**: Officers and borrowers always see the real-time financial state without waiting for midnight.

### 2. Multi-Tenant Shared Database with Strict Data Isolation
* All subscribed institutions share the same database infrastructure to minimize operating costs.
* Every business record contains a `tenant_id` foreign key.
* **Database-Level Protection (PostgreSQL Row-Level Security / RLS)**:
  ```sql
  CREATE POLICY tenant_isolation_accounts ON financing_accounts
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
  ```
  The database itself blocks any queries across tenant boundaries. Institution A can never see Institution B's customers, loans, or transactions.

### 3. Simplified Financing Life Cycle (Extracted from Banking IF Module)
The complex banking overhead (BNM reporting, CCRIS/CTOS, AMLA screening, branch clearing) has been completely stripped out, retaining only the 5 essential operations:
1. **Borrower Information (CIF Lite)**: Basic profile (NRIC/Passport, contact, bank account).
2. **Financing Facility & Schedule Engine**: Flat rate or reducing balance amortization.
3. **Disbursement (Drawdown)**: Record net payout after upfront fee deductions.
4. **Collection & Waterfall Allocation**: Systematic distribution of repayments (Late fees $\to$ Profit $\to$ Principal).
5. **Early Settlement & Rebate (Ibra')**: Real-time calculation of unearned profit rebate and final payoff amount.

---

## Project Structure (Written for Maximum Readability)

```
FlexiFinancing/
├── src/
│   ├── core/
│   │   ├── financing/
│   │   │   ├── types.ts           # Clean TypeScript interfaces (no cryptic banking codes)
│   │   │   ├── calculator.ts      # Flat & Reducing balance amortization math (Decimal.js)
│   │   │   ├── due-tracker.ts     # Zero-batch real-time overdue & late fee engine
│   │   │   ├── waterfall.ts       # Repayment collection allocation rules
│   │   │   ├── settlement.ts      # Early settlement rebate (Ibra') calculation
│   │   │   └── index.ts           # Unified export
│   │   └── store/
│   │       └── memory-store.ts    # Multi-tenant data store enforcing tenant isolation
│   ├── database/
│   │   └── schema.sql             # Production PostgreSQL schema with Row-Level Security
│   ├── lib/
│   │   └── api-helpers.ts         # Tenant extraction and JSON response helpers
│   └── app/
│       ├── api/v1/                # Clean REST API endpoints (Web & Mobile ready)
│       │   ├── tenants/
│       │   ├── customers/
│       │   └── financing/
│       ├── globals.css            # Tailwind styling
│       ├── layout.tsx             # Root layout
│       └── page.tsx               # Full interactive Dashboard UI
├── scripts/
│   └── test-engine.ts             # Direct verification test script for financial formulas
├── package.json
└── tsconfig.json
```

---

## How to Run Locally

### 1. Run the Financial Engine Test
To test the core financial calculations, zero-batch due tracking, and settlement formulas:
```bash
npx tsx scripts/test-engine.ts
```

### 2. Run the Web Dashboard
Start the local Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

You can switch between **Apex Credit Capital** (Tenant 1) and **Metro Micro-Financing** (Tenant 2) in the top dropdown to see live multi-tenant data segregation in action!
