import { db } from '@/core/store/memory-store';
import { apiSuccess } from '@/lib/api-helpers';

export async function GET() {
  return apiSuccess(db.tenants);
}
