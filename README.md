# Credix: Cloud Multi-Tenant Lending Platform

A modern, cloud-native Lending & Financing SaaS designed specifically for small financial institutions (micro-lenders, credit companies, cooperatives, and SME financiers).

Unlike legacy core banking platforms that rely on cumbersome overnight batch runs, **Credix operates completely batch-free** with dynamic, on-demand real-time calculations.

🌐 **Live Cloud Deployment (Vercel):** [https://credix-psi.vercel.app](https://credix-psi.vercel.app)

---

## Live Cloud Access (Vercel + Neon PostgreSQL)

Credix is hosted live on **Vercel** with a shared **Neon PostgreSQL** database and institute-level workspace isolation.

1. Open [https://credix-psi.vercel.app/login](https://credix-psi.vercel.app/login) in your browser.
2. Sign in using either staff credentials or the **Quick Test Sign In** buttons on the login screen:
   * **Apex Credit Capital Sdn Bhd (Tenant 1)**: `officer@apex.com` / `password123`
   * **Metro Micro-Financing Ltd (Tenant 2)**: `officer@metro.com` / `password123`
3. Log out and sign in as the other institution to see live multi-tenant data isolation in action.

---

## Key Architectural Principles

### 1. Zero Nightly Batch Run
* **Traditional Core Banking**: A midnight batch job runs for hours to calculate daily interest accrual, flip overdue status flags, assess late payment fees, and update ledger balances.
* **Credix Approach**:
  * **Dynamic Status Evaluation**: Delinquency state and Days Past Due (DPD) are computed dynamically in Malaysia Time (`MYT`) at query time (`due_date < today AND unpaid > 0`).
  * **On-the-Fly Late Charges & Crystallization**: Daily late charges (`1% p.a.`) are calculated on demand and crystallized per installment up to the payment date before partial repayments reduce the balance.
  * **Zero Latency**: Officers always see the real-time financial state without waiting for midnight.

### 2. Multi-Tenant Shared Database with Strict Data Isolation
* All subscribed institutions share the same PostgreSQL database infrastructure to minimize operating costs.
* Every business record contains a `tenant_id` foreign key and authenticated API routes scope all reads/writes to the signed-in user's institute.
* **Database-Level Protection (PostgreSQL Row-Level Security / RLS)**:
  ```sql
  CREATE POLICY tenant_isolation_accounts ON financing_accounts
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
  ```
  Institution A can never view or modify Institution B's customers, loans, or ledger transactions.

### 3. Simplified Financing Life Cycle (Extracted from Banking IF Module)
Complex core-banking regulatory overhead (BNM statutory reporting, CCRIS/CTOS, AMLA screening, branch clearing) is stripped out, keeping the essential lending operations:
1. **Borrower Information (CIF Lite)**: Customer profile, identification, contact, employment/income, and bank account details.
2. **4 Calculation Models & Simulator**:
   * **Hire Purchase (R78)**: Rule of 78 / Sum of Digits front-loaded profit allocation.
   * **Straight Flat Rate**: Equal monthly principal and profit.
   * **Monthly Reducing**: Amortized monthly rest.
   * **Daily Reducing**: Accrued daily rest (365-day basis).
3. **ULTRON Account Numbering**: Numeric `XXX-XX-XXXXXX-X` format (Institute Code + Product Code + Sequence + ULTRON check digit).
4. **Full Loan Lifecycle & Disbursement**: Application $\to$ Approval / Rejection $\to$ Letter of Offer Acceptance $\to$ Net Disbursement (with upfront Processing Fee & Stamp Duty ledger entries) on a monthly Anniversary Date schedule.
5. **Repayment Allocation & Payment Channels**: Supports **Standard Waterfall** (Late Fee $\to$ Profit $\to$ Principal), **Late Fee Only**, and **Installment Only** modes across selectable payment channels (Bank Transfer, JomPay, FPX Online Banking, DuitNow, Cash, Cheque).
6. **Early Settlement & Rebate (Ibra')**: Real-time payoff quotation and settlement execution as of any selected date.

---

## Project Structure

```text
Credix/
├── src/
│   ├── core/
│   │   ├── financing/
│   │   │   ├── types.ts            # Clean TypeScript domain interfaces
│   │   │   ├── account-number.ts   # Numeric XXX-XX-XXXXXX-X & ULTRON check digit generator
│   │   │   ├── calculator.ts       # R78, Straight Flat, Monthly & Daily Reducing math (Decimal.js)
│   │   │   ├── due-tracker.ts      # Zero-batch MYT overdue evaluation & late fee crystallization
│   │   │   ├── waterfall.ts        # Targeted & waterfall repayment allocation rules
│   │   │   ├── settlement.ts       # Early settlement rebate (Ibra') quotation engine
│   │   │   └── index.ts            # Unified export
│   │   └── store/
│   │       ├── db-store.ts         # Production Neon PostgreSQL data access layer
│   │       └── memory-store.ts     # Domain interfaces & reference seed structures
│   ├── database/
│   │   └── schema.sql              # PostgreSQL schema with Row-Level Security policies
│   ├── lib/
│   │   └── api-helpers.ts          # Auth/tenant session helpers and JSON responses
│   ├── components/layout/
│   │   └── DashboardLayout.tsx     # Authenticated sidebar navigation & tenant workspace shell
│   └── app/
│       ├── api/v1/                 # REST API routes (auth, tenants, customers, financing, admin)
│       ├── login/page.tsx          # Institute staff login & quick-test workspace selector
│       ├── customers/              # Customer directory, onboarding & profile pages
│       ├── financing/              # Loan portfolio, origination, workflow & ledger management
│       ├── calculator/page.tsx     # Standalone repayment & schedule simulator
│       ├── settlement/page.tsx     # Early settlement & rebate lookup
│       └── page.tsx                # Executive Dashboard
├── scripts/
│   ├── init-db.ts                  # Database schema setup & seed script
│   └── test-engine.ts              # Direct CLI verification for financial formulas
├── package.json
└── tsconfig.json
```

---

## Optional: Running Locally for Development

### 1. Run the Financial Engine Test
To run the standalone CLI check for the core financial formulas, zero-batch due tracking, and settlement math:
```bash
npx tsx scripts/test-engine.ts
```

### 2. Run the Local Next.js Server
Make sure `.env.local` has your PostgreSQL `DATABASE_URL` configured (or run `npx tsx scripts/init-db.ts` once to seed a fresh database), then start the dev server:
```bash
npm run dev
```
Open [http://localhost:3000/login](http://localhost:3000/login) in your browser and sign in with `officer@apex.com` or `officer@metro.com` (`password123`).
