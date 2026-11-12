import { NextRequest } from 'next/server';
import { pgDb } from '@/core/store/db-store';
import { calculateEarlySettlementQuote } from '@/core/financing/settlement';
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

  const searchParams = req.nextUrl.searchParams;
  const asOfDate = searchParams.get('asOfDate') || new Date().toISOString().split('T')[0];

  const paidLateFeesMap = await pgDb.getPaidLateFeesMap(tenantId, id);
  const quotation = calculateEarlySettlementQuote(account.schedule, account.lateFeeRatePA, asOfDate, paidLateFeesMap[id] || 0);
  const customer = await pgDb.getCustomerById(tenantId, account.customerId);

  return apiSuccess({
    accountNo: account.accountNo,
    customerName: customer?.fullName,
    quotation,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = getTenantIdFromRequest(req);
    const account = await pgDb.getAccountById(tenantId, id);

    if (!account) {
      return apiError('Financing account not found', 404);
    }

    if (account.status !== 'ACTIVE') {
      return apiError(`Cannot settle account with status: ${account.status}`);
    }

    const body = await req.json().catch(() => ({}));
    const settlementDate = body.settlementDate || new Date().toISOString().split('T')[0];
    const paidLateFeesMap = await pgDb.getPaidLateFeesMap(tenantId, id);
    const quote = calculateEarlySettlementQuote(account.schedule, account.lateFeeRatePA, settlementDate, paidLateFeesMap[id] || 0);

    // Mark all remaining installments as PAID under settlement
    const settledSchedule = account.schedule.map(item => ({
      ...item,
      principalPaid: item.principalDue,
      profitPaid: item.dueDate <= settlementDate ? item.profitDue : 0, // Unearned future profit rebated
      status: 'PAID' as const,
      paidAt: new Date().toISOString(),
    }));

    // Update account to SETTLED
    const updated = await pgDb.updateAccount(tenantId, id, {
      status: 'SETTLED',
      schedule: settledSchedule,
    });

    // Record settlement transaction
    await pgDb.addTransaction(tenantId, {
      financingId: id,
      txType: 'SETTLEMENT',
      amount: quote.netSettlementAmount,
      allocatedLateFee: quote.unpaidLateFees,
      allocatedProfit: 0,
      allocatedPrincipal: quote.principalOutstanding,
      excessAmount: 0,
      paymentMethod: body.paymentMethod || 'BANK_TRANSFER',
      referenceNo: body.referenceNo || `SETTLE-${Date.now()}`,
      remarks: `Early Full Settlement. Unearned Profit Rebate (Ibra'): RM ${quote.unearnedProfitRebate.toFixed(2)}`,
    });

    return apiSuccess({
      message: 'Account fully settled',
      quotation: quote,
      account: updated,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Settlement failed';
    return apiError(errorMessage, 500);
  }
}
