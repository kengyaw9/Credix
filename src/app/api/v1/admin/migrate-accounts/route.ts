import { NextRequest } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { generateUltronAccountNo, getTenantInstituteCode } from '@/core/financing/account-number';
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
