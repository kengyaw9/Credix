import { NextRequest } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { generateUltronAccountNo, getTenantInstituteCode } from '@/core/financing/account-number';
import { crystallizeLateFees, evaluateRealTimeAccountStatus } from '@/core/financing/due-tracker';
import { ScheduleItem } from '@/core/financing/types';
import { apiSuccess, apiError } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const connectionString =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.STORAGE_DATABASE_URL ||
      process.env.STORAGE_POSTGRES_URL;

    if (!connectionString) {
      return apiError('Database connection string is not set', 500);
    }

    const sql = neon(connectionString);
    const action = req.nextUrl.searchParams.get('action');

    if (action === 'repair-crystallize') {
      const targetRows = await sql`
        SELECT id, tenant_id, account_no, late_fee_rate_pa, schedule
        FROM financing_accounts
        WHERE id = '11111111-2222-3333-4444-000000000001'
           OR account_no = '101-10-000001-4'
        LIMIT 1
      `;

      if (targetRows.length === 0) {
        return apiError('Target account 101-10-000001-4 not found', 404);
      }

      const acc = targetRows[0];
      const ratePA = Number(acc.late_fee_rate_pa || 1.0);
      const schedule: ScheduleItem[] =
        typeof acc.schedule === 'string' ? JSON.parse(acc.schedule) : (acc.schedule || []);

      const txFees = await sql`
        SELECT COALESCE(SUM(allocated_late_fee), 0) AS paid_late_fee
        FROM financing_transactions
        WHERE financing_id = ${acc.id}
      `;
      const paidLateFee = Number(txFees[0]?.paid_late_fee || 0);

      const inst2 = schedule.find((s) => s.installmentNo === 2);
      if (!inst2) {
        return apiError('Installment #2 not found on account schedule', 400);
      }

      if (inst2.lastLateFeeCalcDate) {
        const currentStatus = evaluateRealTimeAccountStatus(
          schedule,
          ratePA,
          '2026-11-12',
          paidLateFee
        );
        return apiSuccess({
          alreadyRepaired: true,
          accountNo: acc.account_no,
          inst2,
          realtimeStatus: currentStatus,
        });
      }

      const repairDate = '2026-11-12';
      const origProfitPaid = inst2.profitPaid;
      const origStatus = inst2.status;
      const origPaidAt = inst2.paidAt;

      // Temporarily reverse the RM 10 profitPaid on Inst #2 so crystallization runs on pre-payment unpaid amount
      const prePaySchedule: ScheduleItem[] = schedule.map((item) => {
        if (item.installmentNo === 2 && !item.lastLateFeeCalcDate && item.profitPaid >= 10) {
          return {
            ...item,
            profitPaid: Number((item.profitPaid - 10).toFixed(2)),
          };
        }
        return item;
      });

      const crystallizedSchedule = crystallizeLateFees(prePaySchedule, ratePA, repairDate);

      // Re-apply Inst #2's RM 10 payment state while keeping crystallizedLateFee and lastLateFeeCalcDate
      const repairedSchedule: ScheduleItem[] = crystallizedSchedule.map((item) => {
        if (item.installmentNo === 2) {
          return {
            ...item,
            profitPaid: origProfitPaid,
            status: origStatus,
            ...(origPaidAt ? { paidAt: origPaidAt } : {}),
          };
        }
        return item;
      });

      await sql`
        UPDATE financing_accounts
        SET schedule = ${JSON.stringify(repairedSchedule)}::jsonb,
            updated_at = NOW()
        WHERE id = ${acc.id}
      `;

      const updatedStatus = evaluateRealTimeAccountStatus(
        repairedSchedule,
        ratePA,
        repairDate,
        paidLateFee
      );

      return apiSuccess({
        repaired: true,
        accountNo: acc.account_no,
        repairedInst2: repairedSchedule.find((s) => s.installmentNo === 2),
        realtimeStatus: updatedStatus,
      });
    }

    const accounts = await sql`
      SELECT id, tenant_id, account_no, calc_method, created_at 
      FROM financing_accounts 
      ORDER BY created_at ASC
    `;

    const migrated: Array<{ id: string; oldAccountNo: string; newAccountNo: string }> = [];
    const unchanged: Array<{ id: string; accountNo: string }> = [];

    const seqMap: Record<string, number> = {};

    for (const acc of accounts) {
      const tenantId = acc.tenant_id;
      const instCode = getTenantInstituteCode(tenantId);

      if (!seqMap[tenantId]) {
        seqMap[tenantId] = 0;
      }
      seqMap[tenantId]++;

      const isNewFormat = /^\d{3}-\d{2}-\d{6}-\d{1}$/.test(acc.account_no);
      if (isNewFormat) {
        unchanged.push({ id: acc.id, accountNo: acc.account_no });
        continue;
      }

      const productCode = acc.calc_method === 'FLAT_R78' ? '20' : '10';
      const ultronAcc = generateUltronAccountNo({
        instituteCode: instCode,
        productCode,
        sequenceNo: seqMap[tenantId],
      });

      await sql`
        UPDATE financing_accounts 
        SET account_no = ${ultronAcc.formattedAccountNo} 
        WHERE id = ${acc.id}
      `;

      migrated.push({
        id: acc.id,
        oldAccountNo: acc.account_no,
        newAccountNo: ultronAcc.formattedAccountNo,
      });
    }

    return apiSuccess({
      totalAccounts: accounts.length,
      migratedCount: migrated.length,
      migrated,
      unchanged,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Migration failed';
    return apiError(msg, 500);
  }
}
