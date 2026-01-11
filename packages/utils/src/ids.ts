import { nanoid } from 'nanoid';

/**
 * Generate a unique ID with optional prefix
 */
export function generateId(prefix?: string): string {
  const id = nanoid(21);
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * Generate a short ID (10 characters)
 */
export function generateShortId(): string {
  return nanoid(10);
}

/**
 * Generate agent number (6 digits)
 */
export function generateAgentNumber(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate extension (4 digits)
 */
export function generateExtension(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Validate UUID format
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
