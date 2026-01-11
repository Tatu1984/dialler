import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { z } from 'zod';

/**
 * Context passed to all tRPC procedures
 */
export interface Context {
  user?: {
    id: string;
    email: string;
    tenantId: string;
    role: 'admin' | 'supervisor' | 'agent' | 'readonly';
  };
  req?: Request;
}

/**
 * Initialize tRPC
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof z.ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Export reusable router and procedure helpers
 */
export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

/**
 * Middleware to ensure user is authenticated
 */
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(isAuthenticated);

/**
 * Middleware to check for specific roles
 */
const hasRole = (...roles: Array<'admin' | 'supervisor' | 'agent' | 'readonly'>) =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in',
      });
    }
    if (!roles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this resource',
      });
    }
    return next({
      ctx: {
        user: ctx.user,
      },
    });
  });

/**
 * Admin-only procedure
 */
export const adminProcedure = t.procedure.use(hasRole('admin'));

/**
 * Admin or supervisor procedure
 */
export const supervisorProcedure = t.procedure.use(hasRole('admin', 'supervisor'));

/**
 * Agent procedure (includes admin and supervisor)
 */
export const agentProcedure = t.procedure.use(hasRole('admin', 'supervisor', 'agent'));

export { TRPCError };
