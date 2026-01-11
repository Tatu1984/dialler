import {
  format,
  formatDistance,
  formatDuration,
  intervalToDuration,
  parseISO,
  isValid,
  addSeconds,
  differenceInSeconds,
} from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

/**
 * Format date to ISO string
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * Parse ISO string to Date
 */
export function fromISOString(isoString: string): Date {
  return parseISO(isoString);
}

/**
 * Check if date string is valid
 */
export function isValidDate(dateString: string): boolean {
  return isValid(parseISO(dateString));
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string, formatStr: string = 'PPP'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
}

/**
 * Format date in specific timezone
 */
export function formatDateInTimezone(
  date: Date | string,
  timezone: string,
  formatStr: string = 'PPP p'
): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(d, timezone, formatStr);
}

/**
 * Get date in specific timezone
 */
export function getDateInTimezone(date: Date, timezone: string): Date {
  return toZonedTime(date, timezone);
}

/**
 * Format relative time (e.g., "5 minutes ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistance(d, new Date(), { addSuffix: true });
}

/**
 * Format duration in seconds to human readable
 */
export function formatDurationFromSeconds(seconds: number): string {
  const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
  return formatDuration(duration, {
    format: ['hours', 'minutes', 'seconds'],
    zero: true,
    delimiter: ':',
  });
}

/**
 * Format duration as MM:SS or HH:MM:SS
 */
export function formatCallDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Add seconds to date
 */
export function addSecondsToDate(date: Date, seconds: number): Date {
  return addSeconds(date, seconds);
}

/**
 * Get difference in seconds between two dates
 */
export function getSecondsBetween(start: Date | string, end: Date | string): number {
  const startDate = typeof start === 'string' ? parseISO(start) : start;
  const endDate = typeof end === 'string' ? parseISO(end) : end;
  return differenceInSeconds(endDate, startDate);
}

/**
 * Check if current time is within business hours
 */
export function isWithinBusinessHours(
  timezone: string,
  schedule: { start: string; end: string } | null
): boolean {
  if (!schedule) return false;

  const now = getDateInTimezone(new Date(), timezone);
  const currentTime = format(now, 'HH:mm');

  return currentTime >= schedule.start && currentTime <= schedule.end;
}
