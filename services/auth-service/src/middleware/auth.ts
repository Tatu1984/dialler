import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticationError, AuthorizationError } from '@nexusdialer/utils';
import type { UserRole } from '@nexusdialer/types';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string;
      tenantId: string;
      email: string;
      role: UserRole;
    };
    user: {
      userId: string;
      tenantId: string;
      email: string;
      role: UserRole;
    };
  }
}

/**
 * Middleware to verify JWT token
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    throw new AuthenticationError('Invalid or expired token');
  }
}

/**
 * Middleware to check if user has required role
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);

    const userRole = request.user.role;

    if (!allowedRoles.includes(userRole)) {
      throw new AuthorizationError(
        `Access denied. Required roles: ${allowedRoles.join(', ')}`
      );
    }
  };
}

/**
 * Middleware to ensure user belongs to the tenant
 */
export async function requireTenant(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);

  const tenantId = (request.params as Record<string, string>).tenantId;

  if (tenantId && tenantId !== request.user.tenantId) {
    throw new AuthorizationError('Access denied to this tenant');
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    // Silently continue without authentication
  }
}
