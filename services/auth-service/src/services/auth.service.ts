import * as argon2 from 'argon2';
import { eq, and } from 'drizzle-orm';
import { getDb, users, tenants, agentProfiles } from '@nexusdialer/database';
import {
  AuthenticationError,
  ValidationError,
  NotFoundError,
  ConflictError,
} from '@nexusdialer/utils';
import type { UserRole } from '@nexusdialer/types';

export interface RegisterInput {
  tenantId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface TokenPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: UserRole;
}

export interface UserWithTenant {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
}

class AuthService {
  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<UserWithTenant> {
    const db = getDb();

    // Verify tenant exists
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, input.tenantId),
    });

    if (!tenant) {
      throw new NotFoundError('Tenant', input.tenantId);
    }

    // Check if email already exists in tenant
    const existingUser = await db.query.users.findFirst({
      where: and(eq(users.tenantId, input.tenantId), eq(users.email, input.email.toLowerCase())),
    });

    if (existingUser) {
      throw new ConflictError('A user with this email already exists');
    }

    // Hash password
    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        tenantId: input.tenantId,
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role || 'agent',
        status: 'active',
      })
      .returning();

    return {
      id: newUser.id,
      tenantId: newUser.tenantId,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role as UserRole,
      status: newUser.status,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
    };
  }

  /**
   * Authenticate user with email and password
   */
  async login(input: LoginInput): Promise<UserWithTenant> {
    const db = getDb();

    // Build query conditions
    let user;

    if (input.tenantSlug) {
      // Find tenant first
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.slug, input.tenantSlug),
      });

      if (!tenant) {
        throw new AuthenticationError('Invalid credentials');
      }

      user = await db.query.users.findFirst({
        where: and(
          eq(users.tenantId, tenant.id),
          eq(users.email, input.email.toLowerCase())
        ),
      });
    } else {
      // Find user by email only (for single-tenant mode)
      user = await db.query.users.findFirst({
        where: eq(users.email, input.email.toLowerCase()),
      });
    }

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new AuthenticationError('Account is not active');
    }

    if (!user.passwordHash) {
      throw new AuthenticationError('Password login not available for this account');
    }

    // Verify password
    const validPassword = await argon2.verify(user.passwordHash, input.password);

    if (!validPassword) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Get tenant info
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, user.tenantId),
    });

    if (!tenant) {
      throw new AuthenticationError('Tenant not found');
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as UserRole,
      status: user.status,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
    };
  }

  /**
   * Get user by ID with tenant info
   */
  async getUserById(userId: string): Promise<UserWithTenant | null> {
    const db = getDb();

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return null;
    }

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, user.tenantId),
    });

    if (!tenant) {
      return null;
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as UserRole,
      status: user.status,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
    };
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const db = getDb();

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    if (!user.passwordHash) {
      throw new ValidationError('Cannot change password for this account type');
    }

    // Verify current password
    const validPassword = await argon2.verify(user.passwordHash, currentPassword);

    if (!validPassword) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Update password
    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  /**
   * Create token payload for JWT
   */
  createTokenPayload(user: UserWithTenant): TokenPayload {
    return {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    };
  }
}

export const authService = new AuthService();
