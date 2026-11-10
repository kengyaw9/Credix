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
  const customer = await pgDb.getCustomerById(tenantId, id);

  if (!customer) {
    return apiError('Customer not found', 404);
  }

  const rawAccounts = await pgDb.getAccountsByCustomer(tenantId, id);
  const accounts = rawAccounts.map(acc => ({
    ...acc,
    realtimeStatus: evaluateRealTimeAccountStatus(acc.schedule, acc.lateFeeRatePA),
  }));

  return apiSuccess({
    customer,
    accounts,
  });
}
