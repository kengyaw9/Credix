import { NextRequest } from 'next/server';
import { pgDb } from '@/core/store/db-store';
import { apiSuccess, apiError } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return apiError('Please provide email and password');
    }

    const user = await pgDb.findUserByEmail(email);
    if (!user || user.password !== password) {
      return apiError('Invalid email or password', 401);
    }

    const tenant = await pgDb.getTenantById(user.tenantId);
    if (!tenant) {
      return apiError('Tenant organization not found', 404);
    }

    const sessionData = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tenantName: tenant.name,
      tenantCode: tenant.code,
    };

    const response = apiSuccess(sessionData);

    // Set auth cookie
    response.cookies.set('ff_session', JSON.stringify(sessionData), {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return apiError(message, 500);
  }
}
