import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get('ff_session');
  if (!cookie || !cookie.value) {
    return apiError('Not authenticated', 401);
  }

  try {
    const session = JSON.parse(cookie.value);
    return apiSuccess(session);
  } catch {
    return apiError('Invalid session', 401);
  }
}
