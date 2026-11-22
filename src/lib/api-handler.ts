import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { authenticateRequest } from '@/lib/auth-guard';
import { logAudit } from '@/services/audit.service';
import type { User, UserRole } from '@/types';

export interface RouteContext<T = Record<string, any>> {
  params?: Promise<T> | T;
}

export interface AuthenticatedContext<T = Record<string, any>> {
  user: User;
  params?: T;
}

export interface WithAuthOptions {
  roles?: UserRole[];
  audit?: {
    action: string;
    entityType: string;
    getEntityId?: (req: NextRequest, params?: Record<string, any>) => string;
    details?: string;
  };
}

type AuthenticatedHandler<T = Record<string, any>> = (
  req: NextRequest,
  context: AuthenticatedContext<T>
) => Promise<NextResponse | Response>;

/**
 * Universal route handler wrapper:
 * 1. Authenticates session or API token
 * 2. Enforces Role-Based Access Control (RBAC)
 * 3. Injects authenticated user into handler
 * 4. Shields error responses (no raw SQL/path leakage)
 * 5. Automates audit logging for compliance
 */
export function withAuth<T = Record<string, any>>(
  handler: AuthenticatedHandler<T>,
  options: WithAuthOptions = {}
) {
  return async (req: NextRequest, ...args: any[]): Promise<NextResponse | Response> => {
    const rawContext = args[0] as RouteContext<T> | undefined;
    const requestId = crypto.randomUUID();

    try {
      // 1. Authenticate caller
      const authResult = await authenticateRequest(req);
      if ('errorResponse' in authResult) {
        return authResult.errorResponse;
      }
      const user = authResult.user;

      // 2. Authorize roles if restricted (expanding clinical role aliases)
      if (options.roles && options.roles.length > 0) {
        const allowedRoles = new Set<UserRole>(options.roles);
        if (allowedRoles.has('radiologist')) allowedRoles.add('consultant');
        if (allowedRoles.has('consultant')) allowedRoles.add('radiologist');
        if (allowedRoles.has('resident')) allowedRoles.add('pgr');
        if (allowedRoles.has('pgr')) allowedRoles.add('resident');

        if (!allowedRoles.has(user.role)) {
          return NextResponse.json(
            {
              success: false,
              error: `Forbidden. Role '${user.role}' is not authorized for this operation.`,
              requestId,
            },
            { status: 403 }
          );
        }
      }

      // Resolve params if promise
      let resolvedParams: T | undefined = undefined;
      if (rawContext?.params) {
        resolvedParams = (rawContext.params instanceof Promise)
          ? await rawContext.params
          : rawContext.params;
      }

      // 3. Execute domain controller handler
      const response = await handler(req, { user, params: resolvedParams });

      // 4. Log audit trail for audited actions if response succeeded (2xx)
      if (options.audit && response.status >= 200 && response.status < 300) {
        const paramsRecord = resolvedParams as Record<string, any> | undefined;
        const entityId = options.audit.getEntityId
          ? options.audit.getEntityId(req, paramsRecord)
          : paramsRecord?.id || paramsRecord?.accession || '';

        await logAudit({
          userId: user.id,
          userName: user.name,
          action: options.audit.action,
          entityType: options.audit.entityType,
          entityId,
          details: options.audit.details || `Executed ${req.method} ${req.nextUrl.pathname}`,
          ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
          userAgent: req.headers.get('user-agent') || 'Unknown',
        });
      }

      return response;
    } catch (err: unknown) {
      // 5. Error Shielding: Log full internal details server-side with requestId, return clean message to client
      console.error(`[API_ERROR] [Req: ${requestId}] ${req.method} ${req.nextUrl.pathname}:`, err);

      return NextResponse.json(
        {
          success: false,
          error: 'An internal server error occurred while processing your request.',
          requestId,
        },
        { status: 500 }
      );
    }
  };
}
