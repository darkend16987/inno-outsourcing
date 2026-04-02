/**
 * Retry Utility — S9
 * Exponential backoff wrapper for Firestore operations.
 * Only retries on transient network errors, not auth/permission errors.
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 8000,
  backoffMultiplier: 2,
  shouldRetry: isRetryableError,
};

/**
 * Execute a function with exponential backoff retry logic.
 *
 * @example
 * const result = await withRetry(() => updatePayment(id, data));
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;
  let delay = opts.initialDelayMs;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on non-retryable errors
      if (!opts.shouldRetry(error)) {
        throw error;
      }

      // Don't retry if we've exhausted all attempts
      if (attempt >= opts.maxRetries) {
        break;
      }

      // Wait with jitter before retrying
      const jitter = Math.random() * 0.3 * delay; // ±30% jitter
      const waitTime = Math.min(delay + jitter, opts.maxDelayMs);

      console.warn(
        `[Retry] Attempt ${attempt + 1}/${opts.maxRetries} failed, retrying in ${Math.round(waitTime)}ms...`,
        error instanceof Error ? error.message : error
      );

      await sleep(waitTime);
      delay *= opts.backoffMultiplier;
    }
  }

  throw lastError;
}

/**
 * Determine if an error is transient and worth retrying.
 * Does NOT retry auth, permission, or validation errors.
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  // Don't retry these
  const nonRetryable = [
    'permission-denied',
    'unauthenticated',
    'not-found',
    'already-exists',
    'invalid-argument',
    'failed-precondition',
    'out-of-range',
    'unimplemented',
    'data-loss',
  ];

  for (const code of nonRetryable) {
    if (message.includes(code)) return false;
  }

  // Retry these
  const retryable = [
    'unavailable',
    'deadline-exceeded',
    'resource-exhausted',
    'aborted',
    'internal',
    'network',
    'timeout',
    'econnreset',
    'econnrefused',
    'fetch failed',
  ];

  for (const code of retryable) {
    if (message.includes(code)) return true;
  }

  // Default: don't retry unknown errors
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
