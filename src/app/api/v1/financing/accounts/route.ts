import { NextRequest } from 'next/server';
import { db } from '@/core/store/memory-store';
import { calculateFinancingSchedule } from '@/core/financing/calculator';
import { evaluateRealTimeAccountStatus } from '@/core/financing/due-tracker';
import { getTenantIdFromRequest, apiSuccess, apiError } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  const tenantId = getTenantIdFromRequest(req);
  const accounts = db.getAccounts(tenantId);

  // Augment each account with its dynamic real-time status
  const accountsWithRealtimeStatus = accounts.map(acc => {
    const customer = db.getCustomerById(tenantId, acc.customerId);
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
    const customer = db.getCustomerById(tenantId, body.customerId);
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

    const tenant = db.tenants.find(t => t.id === tenantId);
    const prefix = tenant ? tenant.code.substring(0, 3) : 'FIN';
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    const accountNo = `${prefix}-${new Date().getFullYear()}-${randomSeq}`;

    const newAccount = db.addAccount(tenantId, {
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
      status: 'DRAFT',
      schedule: calcResult.schedule,
    });

    return apiSuccess(newAccount, 201);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to create financing facility';
    return apiError(errorMessage, 500);
  }
}
