import { NextRequest } from 'next/server';
import { pgDb } from '@/core/store/db-store';
import { calculateFinancingSchedule } from '@/core/financing/calculator';
import { evaluateRealTimeAccountStatus } from '@/core/financing/due-tracker';
import { generateUltronAccountNo, getTenantInstituteCode } from '@/core/financing/account-number';
import { getTenantIdFromRequest, apiSuccess, apiError } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  const tenantId = getTenantIdFromRequest(req);
  const accounts = await pgDb.getAccounts(tenantId);
  const customers = await pgDb.getCustomers(tenantId);
  const customerMap = new Map(customers.map(c => [c.id, c]));

  // Augment each account with its dynamic real-time status
  const accountsWithRealtimeStatus = accounts.map(acc => {
    const customer = customerMap.get(acc.customerId);
    const realtimeStatus = evaluateRealTimeAccountStatus(acc.schedule, acc.lateFeeRatePA);
    return {
      ...acc,
      customerName: customer ? customer.fullName : 'Unknown',
      customerIdNumber: customer ? customer.idNumber : '',
      realtimeStatus,
    };
  });

  return apiSuccess(accountsWithRealtimeStatus);
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const body = await req.json();

    if (!body.customerId || !body.principalAmount || !body.profitRatePA || !body.tenorMonths || !body.startDate) {
      return apiError('Missing required fields');
    }

    // Verify customer exists under current tenant
    const customer = await pgDb.getCustomerById(tenantId, body.customerId);
    if (!customer) {
      return apiError('Customer not found in your institute');
    }

    const calcResult = calculateFinancingSchedule({
      principalAmount: Number(body.principalAmount),
      profitRatePA: Number(body.profitRatePA),
      tenorMonths: Number(body.tenorMonths),
      startDate: body.startDate,
      calcMethod: body.calcMethod || 'FLAT_RATE',
      repaymentDayOfMonth: body.repaymentDayOfMonth ? Number(body.repaymentDayOfMonth) : undefined,
    });

    const tenant = await pgDb.getTenantById(tenantId);
    const instituteCode = getTenantInstituteCode(tenant ? tenant.code : tenantId);
    const productCode = body.productCode || (body.calcMethod === 'FLAT_R78' ? '20' : '10');
    const nextSeq = await pgDb.getNextAccountSequence(tenantId);
    const { formattedAccountNo: accountNo } = generateUltronAccountNo({
      instituteCode,
      productCode,
      sequenceNo: nextSeq,
    });

    const newAccount = await pgDb.addAccount(tenantId, {
      customerId: body.customerId,
      accountNo,
      calcMethod: body.calcMethod || 'FLAT_RATE',
      principalAmount: calcResult.principalAmount,
      profitRatePA: Number(body.profitRatePA),
      tenorMonths: Number(body.tenorMonths),
      totalProfit: calcResult.totalProfit,
      totalPayable: calcResult.totalPayable,
      monthlyInstallment: calcResult.monthlyInstallment,
      lateFeeRatePA: body.lateFeeRatePA ? Number(body.lateFeeRatePA) : 1.0,
      processingFee: body.processingFee ? Number(body.processingFee) : 0,
      stampDutyFee: body.stampDutyFee ? Number(body.stampDutyFee) : 0,
      status: 'PENDING_APPROVAL',
      schedule: calcResult.schedule,
    });

    return apiSuccess(newAccount, 201);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to create financing facility';
    return apiError(errorMessage, 500);
  }
}
