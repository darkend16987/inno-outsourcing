/**
 * CSRF Utility — S6
 * Helper to include CSRF token in API requests.
 */

/**
 * Get CSRF token from cookie (set by middleware on GET).
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Fetch wrapper that automatically includes CSRF token in headers.
 * Use this for all POST/PUT/DELETE/PATCH requests to /api/ routes.
 *
 * @example
 * const res = await csrfFetch('/api/jobs', {
 *   method: 'POST',
 *   body: JSON.stringify(data),
 * });
 */
export async function csrfFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getCsrfToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('x-csrf-token', token);
  }

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin',
  });
}
