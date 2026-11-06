import { NextResponse } from 'next/server';
import { apiSuccess } from '@/lib/api-helpers';

export async function POST() {
  const response = apiSuccess({ message: 'Logged out successfully' });
  response.cookies.set('ff_session', '', {
    path: '/',
    maxAge: 0,
  });
  return response;
}
