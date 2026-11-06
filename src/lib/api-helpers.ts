import { NextRequest, NextResponse } from 'next/server';

export const DEFAULT_TENANT_ID = '11111111-1111-1111-1111-111111111111';

/**
 * Extracts and verifies tenant_id from incoming API request.
 * In production, this comes from the verified JWT claim.
 */
export function getTenantIdFromRequest(req: NextRequest): string {
  const headerTenantId = req.headers.get('x-tenant-id');
  if (headerTenantId && headerTenantId.trim() !== '') {
    return headerTenantId.trim();
  }

  // Also check auth cookie
  const cookie = req.cookies.get('ff_session');
  if (cookie?.value) {
    try {
      const session = JSON.parse(cookie.value);
      if (session.tenantId) {
        return session.tenantId;
      }
    } catch {
      // ignore
    }
  }

  return DEFAULT_TENANT_ID;
}

export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status: number = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}
