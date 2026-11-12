import { NextRequest } from 'next/server';
import { pgDb } from '@/core/store/db-store';
import { evaluateRealTimeAccountStatus } from '@/core/financing/due-tracker';
import { getTenantIdFromRequest, apiSuccess, apiError } from '@/lib/api-helpers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenantId = getTenantIdFromRequest(req);
  const account = await pgDb.getAccountById(tenantId, id);

  if (!account) {
    return apiError('Financing account not found', 404);
  }

  const customer = await pgDb.getCustomerById(tenantId, account.customerId);
  const transactions = await pgDb.getTransactions(tenantId, account.id);
  const paidLateFee = transactions.reduce((sum, tx) => sum + (tx.allocatedLateFee || 0), 0);
  const realtimeStatus = evaluateRealTimeAccountStatus(account.schedule, account.lateFeeRatePA, undefined, paidLateFee);

  return apiSuccess({
    ...account,
    customer,
    transactions,
    realtimeStatus,
  });
}
