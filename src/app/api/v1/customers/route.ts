import { NextRequest } from 'next/server';
import { db } from '@/core/store/memory-store';
import { getTenantIdFromRequest, apiSuccess, apiError } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  const tenantId = getTenantIdFromRequest(req);
  const customers = db.getCustomers(tenantId);
  return apiSuccess(customers);
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const body = await req.json();

    if (!body.idNumber || !body.fullName || !body.phone) {
      return apiError('Missing required fields: idNumber, fullName, phone');
    }

    // Check duplicate within the same tenant
    const existing = db.getCustomers(tenantId).find(c => c.idNumber === body.idNumber);
    if (existing) {
      return apiError(`Customer with ID number ${body.idNumber} already exists in your institute.`);
    }

    const customer = db.addCustomer(tenantId, {
      idType: body.idType || 'NRIC',
      idNumber: body.idNumber,
      fullName: body.fullName,
      phone: body.phone,
      email: body.email || '',
      bankName: body.bankName || '',
      bankAccountNo: body.bankAccountNo || '',
    });

    return apiSuccess(customer, 201);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to create customer';
    return apiError(errorMessage, 500);
  }
}
