import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authService } from '../services/auth.service.js';
import { authenticate } from '../middleware/auth.js';
import { loginSchema, passwordSchema } from '@nexusdialer/utils';

// Request schemas
const registerSchema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email(),
  password: passwordSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(['admin', 'supervisor', 'agent', 'readonly']).optional(),
});

const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export async function authRoutes(app: FastifyInstance) {
  /**
   * POST /api/v1/auth/register
   * Register a new user
   */
  app.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = registerSchema.parse(request.body);

    const user = await authService.register(body);
    const tokenPayload = authService.createTokenPayload(user);
    const token = app.jwt.sign(tokenPayload);

    // Set cookie
    reply.setCookie('token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return reply.status(201).send({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenant: user.tenant,
        },
        token,
      },
    });
  });

  /**
   * POST /api/v1/auth/login
   * Authenticate user and return JWT
   */
  app.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = loginRequestSchema.parse(request.body);

    const user = await authService.login({
      email: body.email,
      password: body.password,
      tenantSlug: body.tenantSlug,
    });

    const tokenPayload = authService.createTokenPayload(user);
    const expiresIn = body.rememberMe ? '30d' : '7d';
    const token = app.jwt.sign(tokenPayload, { expiresIn });

    // Set cookie
    const maxAge = body.rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
    reply.setCookie('token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
    });

    return reply.send({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenant: user.tenant,
        },
        token,
      },
    });
  });

  /**
   * POST /api/v1/auth/logout
   * Clear authentication cookie
   */
  app.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie('token', { path: '/' });

    return reply.send({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  });

  /**
   * GET /api/v1/auth/me
   * Get current authenticated user
   */
  app.get(
    '/me',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await authService.getUserById(request.user.userId);

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      return reply.send({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenant: user.tenant,
        },
      });
    }
  );

  /**
   * POST /api/v1/auth/refresh
   * Refresh JWT token
   */
  app.post(
    '/refresh',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await authService.getUserById(request.user.userId);

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      const tokenPayload = authService.createTokenPayload(user);
      const token = app.jwt.sign(tokenPayload);

      reply.setCookie('token', token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
      });

      return reply.send({
        success: true,
        data: { token },
      });
    }
  );

  /**
   * POST /api/v1/auth/change-password
   * Change user password
   */
  app.post(
    '/change-password',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = changePasswordSchema.parse(request.body);

      await authService.changePassword(
        request.user.userId,
        body.currentPassword,
        body.newPassword
      );

      return reply.send({
        success: true,
        data: { message: 'Password changed successfully' },
      });
    }
  );
}
