import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { getDb, users } from '@nexusdialer/database';
import { authenticate } from '../middleware/auth';
import { NotFoundError, UnauthorizedError, ValidationError } from '../middleware/error-handler';

const db = getDb();

interface RegisterBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  role?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface RefreshBody {
  refreshToken?: string;
}

/**
 * Authentication Routes
 */
export async function authRoutes(app: FastifyInstance) {
  /**
   * POST /register
   * Register a new user
   */
  app.post<{ Body: RegisterBody }>(
    '/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName', 'tenantId'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            firstName: { type: 'string', minLength: 1 },
            lastName: { type: 'string', minLength: 1 },
            tenantId: { type: 'string', format: 'uuid' },
            role: { type: 'string', enum: ['admin', 'supervisor', 'agent', 'readonly'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password, firstName, lastName, tenantId, role = 'agent' } = request.body;

      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: and(eq(users.email, email), eq(users.tenantId, tenantId)),
      });

      if (existingUser) {
        throw new ValidationError('User with this email already exists');
      }

      // Hash password
      const passwordHash = await argon2.hash(password);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          passwordHash,
          firstName,
          lastName,
          tenantId,
          role,
          status: 'active',
        })
        .returning({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          tenantId: users.tenantId,
          createdAt: users.createdAt,
        });

      return reply.status(201).send({
        success: true,
        data: {
          user: newUser,
        },
      });
    }
  );

  /**
   * POST /login
   * User login with email and password
   */
  app.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await argon2.verify(user.passwordHash, password);

    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new UnauthorizedError('Account is not active');
    }

    // Generate JWT token
    const token = app.jwt.sign({
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    });

    // Update last login timestamp
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Set cookie
    reply.setCookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return reply.send({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId,
        },
      },
    });
  });

  /**
   * POST /logout
   * Clear authentication session
   */
  app.post('/logout', { preHandler: authenticate }, async (request, reply) => {
    reply.clearCookie('token', {
      path: '/',
    });

    return reply.send({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  });

  /**
   * POST /refresh
   * Refresh JWT token
   */
  app.post<{ Body: RefreshBody }>(
    '/refresh',
    { preHandler: authenticate },
    async (request, reply) => {
      if (!request.user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Generate new token with same payload
      const newToken = app.jwt.sign({
        id: request.user.id,
        email: request.user.email,
        tenantId: request.user.tenantId,
        role: request.user.role,
      });

      // Set new cookie
      reply.setCookie('token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });

      return reply.send({
        success: true,
        data: {
          token: newToken,
        },
      });
    }
  );

  /**
   * GET /me
   * Get current authenticated user
   */
  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    if (!request.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Fetch full user details
    const user = await db.query.users.findFirst({
      where: eq(users.id, request.user.id),
      columns: {
        passwordHash: false, // Exclude password
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return reply.send({
      success: true,
      data: {
        user,
      },
    });
  });
}
