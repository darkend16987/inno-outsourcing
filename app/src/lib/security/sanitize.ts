/**
 * Input sanitization utilities to prevent XSS and injection attacks.
 */

/** Strip HTML tags from user input */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/** Sanitize user text input (comments, bios, etc) */
export function sanitizeText(input: string, maxLength = 5000): string {
  if (!input) return '';
  // Strip HTML, trim, limit length
  return stripHtml(input).trim().slice(0, maxLength);
}

/** Sanitize display name */
export function sanitizeDisplayName(name: string): string {
  if (!name) return '';
  // Remove control characters, excessive whitespace
  return name
    .replace(/[\x00-\x1F\x7F]/g, '') // control chars
    .replace(/\s+/g, ' ')             // collapse whitespace
    .trim()
    .slice(0, 100);
}

/** Sanitize phone number — keep digits, spaces, +, -, () */
export function sanitizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^\d\s+\-()]/g, '').trim().slice(0, 20);
}

/** Validate email format */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Sanitize URL (only allow http/https) */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.href;
  } catch {
    return '';
  }
}

/** Rate limit tracker (client-side) */
const actionTimestamps = new Map<string, number[]>();

export function isRateLimited(
  action: string,
  maxActions: number = 5,
  windowMs: number = 60_000
): boolean {
  const now = Date.now();
  const timestamps = actionTimestamps.get(action) || [];
  
  // Remove expired timestamps
  const valid = timestamps.filter(t => now - t < windowMs);
  
  if (valid.length >= maxActions) return true;
  
  valid.push(now);
  actionTimestamps.set(action, valid);
  return false;
}
