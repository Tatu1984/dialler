/**
 * Phone number utilities
 */

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhoneNumber(phone: string, defaultCountry: string = 'US'): string {
  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, '');

  // If no country code, add default
  if (!normalized.startsWith('+')) {
    if (defaultCountry === 'US' || defaultCountry === 'CA') {
      // Remove leading 1 if present and re-add with +
      if (normalized.startsWith('1') && normalized.length === 11) {
        normalized = '+' + normalized;
      } else if (normalized.length === 10) {
        normalized = '+1' + normalized;
      }
    } else {
      normalized = '+' + normalized;
    }
  }

  return normalized;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const normalized = normalizePhoneNumber(phone);

  // US/Canada format: +1 (XXX) XXX-XXXX
  if (normalized.startsWith('+1') && normalized.length === 12) {
    const areaCode = normalized.slice(2, 5);
    const prefix = normalized.slice(5, 8);
    const line = normalized.slice(8, 12);
    return `+1 (${areaCode}) ${prefix}-${line}`;
  }

  // Default: just add spaces every 3-4 digits
  return normalized;
}

/**
 * Validate phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  // Basic validation: starts with + and has 10-15 digits
  return /^\+\d{10,15}$/.test(normalized);
}

/**
 * Extract country code from E.164 number
 */
export function getCountryCode(phone: string): string | null {
  const normalized = normalizePhoneNumber(phone);

  // Common country codes (simplified)
  const countryCodes: Record<string, string> = {
    '1': 'US',
    '44': 'GB',
    '91': 'IN',
    '61': 'AU',
    '49': 'DE',
    '33': 'FR',
    '81': 'JP',
    '86': 'CN',
  };

  if (!normalized.startsWith('+')) return null;

  const digits = normalized.slice(1);

  // Try matching 1, 2, or 3 digit country codes
  for (const len of [1, 2, 3]) {
    const code = digits.slice(0, len);
    if (countryCodes[code]) {
      return countryCodes[code];
    }
  }

  return null;
}

/**
 * Mask phone number for privacy (show last 4 digits)
 */
export function maskPhoneNumber(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  if (normalized.length < 4) return '****';

  const visible = normalized.slice(-4);
  const masked = '*'.repeat(normalized.length - 4);
  return masked + visible;
}

/**
 * Check if phone number is mobile (simplified US check)
 */
export function isMobileNumber(phone: string): boolean {
  // This is a simplified check - in production use a proper library
  const normalized = normalizePhoneNumber(phone);

  // US mobile typically uses certain area codes
  // This is not comprehensive - use libphonenumber for production
  return normalized.startsWith('+1');
}

/**
 * Check if phone number is on DNC list format
 */
export function formatForDNC(phone: string): string {
  // DNC lists typically use just digits without formatting
  return normalizePhoneNumber(phone).replace('+', '');
}
