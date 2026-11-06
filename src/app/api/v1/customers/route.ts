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

    // Check duplicate IC within same tenant
    const existing = db.getCustomers(tenantId).find(c => c.idNumber === body.idNumber);
    if (existing) {
      return apiError(`Customer with ID number ${body.idNumber} already exists in your institute.`);
    }

    const customer = db.addCustomer(tenantId, {
      idType: body.idType || 'NRIC',
      idNumber: body.idNumber,
      fullName: body.fullName,
      title: body.title || 'Mr',
      dob: body.dob || '1990-01-01',
      gender: body.gender || 'MALE',
      maritalStatus: body.maritalStatus || 'SINGLE',
      race: body.race || '',
      religion: body.religion || '',
      mothersMaidenName: body.mothersMaidenName || '',
      phone: body.phone,
      homePhone: body.homePhone || '',
      officePhone: body.officePhone || '',
      email: body.email || '',
      residentialAddress: body.residentialAddress || body.address || '',
      postcode: body.postcode || '',
      city: body.city || '',
      state: body.state || '',
      residenceOwnership: body.residenceOwnership || 'RENTED',
      lengthOfStayYears: Number(body.lengthOfStayYears) || 1,
      correspondenceAddress: body.correspondenceAddress || '',
      employerName: body.employerName || '',
      occupation: body.occupation || '',
      employmentType: body.employmentType || 'PERMANENT',
      employmentSector: body.employmentSector || '',
      employmentDate: body.employmentDate || '',
      monthlyGrossIncome: Number(body.monthlyGrossIncome) || 0,
      monthlyNetIncome: Number(body.monthlyNetIncome) || 0,
      monthlyCommitments: Number(body.monthlyCommitments) || 0,
      monthlyExpenses: Number(body.monthlyExpenses) || 0,
      emergencyContactName: body.emergencyContactName || '',
      emergencyContactRelationship: body.emergencyContactRelationship || '',
      emergencyContactPhone: body.emergencyContactPhone || '',
      bankName: body.bankName || '',
      bankAccountNo: body.bankAccountNo || '',
    });

    return apiSuccess(customer, 201);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to create customer';
    return apiError(errorMessage, 500);
  }
}
