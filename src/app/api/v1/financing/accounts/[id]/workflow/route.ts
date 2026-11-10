import { NextRequest } from 'next/server';
import { pgDb } from '@/core/store/db-store';
import { getTenantIdFromRequest, apiSuccess, apiError } from '@/lib/api-helpers';

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

    const body = await req.json();
    const { action } = body;

    if (!action) {
      return apiError('Missing action parameter');
    }

    switch (action) {
      case 'APPROVE': {
        if (account.status !== 'PENDING_APPROVAL' && account.status !== 'DRAFT') {
          return apiError(`Cannot approve loan with status: ${account.status}`);
        }
        const updated = await pgDb.updateAccount(tenantId, id, {
          status: 'APPROVED',
          approvedAt: new Date().toISOString(),
          approvedBy: body.approvedBy || 'Credit Committee',
        });
        return apiSuccess({ account: updated, message: 'Loan application approved by credit committee' });
      }

      case 'REJECT': {
        if (account.status !== 'PENDING_APPROVAL' && account.status !== 'DRAFT') {
          return apiError(`Cannot reject loan with status: ${account.status}`);
        }
        if (!body.rejectionReason) {
          return apiError('Please provide a rejection reason');
        }
        const updated = await pgDb.updateAccount(tenantId, id, {
          status: 'REJECTED',
          rejectionReason: body.rejectionReason,
        });
        return apiSuccess({ account: updated, message: 'Loan application rejected' });
      }

      case 'ACCEPT': {
        if (account.status !== 'APPROVED') {
          return apiError(`Customer can only accept an APPROVED loan. Current status: ${account.status}`);
        }
        const updated = await pgDb.updateAccount(tenantId, id, {
          status: 'ACCEPTED',
          acceptedAt: body.acceptedAt || new Date().toISOString(),
        });
        return apiSuccess({ account: updated, message: 'Letter of Offer accepted by borrower' });
      }

      case 'READY_TO_DISBURSE': {
        if (account.status !== 'ACCEPTED' && account.status !== 'APPROVED') {
          return apiError(`Facility must be accepted before setting ready to disburse`);
        }
        const updated = await pgDb.updateAccount(tenantId, id, {
          status: 'READY_TO_DISBURSE',
        });
        return apiSuccess({ account: updated, message: 'Loan facility verified and ready for disbursement' });
      }

      default:
        return apiError(`Unknown action: ${action}`);
    }
  } catch (err: any) {
    return apiError(err.message || 'Workflow transition failed', 500);
  }
}
