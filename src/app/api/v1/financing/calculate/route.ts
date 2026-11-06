import { NextRequest } from 'next/server';
import { calculateFinancingSchedule } from '@/core/financing/calculator';
import { FinancingQuoteParams } from '@/core/financing/types';
import { apiSuccess, apiError } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  try {
    const body: FinancingQuoteParams = await req.json();

    if (!body.principalAmount || !body.profitRatePA || !body.tenorMonths || !body.startDate) {
      return apiError('Missing required parameters: principalAmount, profitRatePA, tenorMonths, startDate');
    }

    const result = calculateFinancingSchedule(body);
    return apiSuccess(result);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Calculation error';
    return apiError(errorMessage, 500);
  }
}
