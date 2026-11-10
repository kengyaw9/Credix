import { pgDb } from '@/core/store/db-store';
import { apiSuccess } from '@/lib/api-helpers';

export async function GET() {
  const tenants = await pgDb.getTenants();
  return apiSuccess(tenants);
}
