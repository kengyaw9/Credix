import { NextRequest } from 'next/server';
import { db } from '@/core/store/memory-store';
import { evaluateRealTimeAccountStatus } from '@/core/financing/due-tracker';
import { getTenantIdFromRequest, apiSuccess, apiError } from '@/lib/api-helpers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenantId = getTenantIdFromRequest(req);
  const account = db.getAccountById(tenantId, id);

  if (!account) {
    return apiError('Financing account not found', 404);
  }

  const customer = db.getCustomerById(tenantId, account.customerId);
  const transactions = db.getTransactions(tenantId, account.id);
  const realtimeStatus = evaluateRealTimeAccountStatus(account.schedule, account.lateFeeRatePA);

  return apiSuccess({
    ...account,
    customer,
    transactions,
    realtimeStatus,
  });
}
