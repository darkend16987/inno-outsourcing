/**
 * Lightweight SWR (Stale-While-Revalidate) in-memory cache for client-side.
 * Reduces Firestore reads by caching frequently-accessed data with TTL.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

class SWRCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private pendingRequests = new Map<string, Promise<unknown>>();

  /**
   * Get data with SWR strategy.
   * Returns cached data immediately if fresh, else fetches and updates.
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = 60_000
  ): Promise<T> {
    const cached = this.store.get(key) as CacheEntry<T> | undefined;

    // If cache is fresh, return immediately
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    // Deduplicate in-flight requests
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    // Fetch fresh data
    const request = fetcher().then((data) => {
      this.store.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
      this.pendingRequests.delete(key);
      return data;
    }).catch((err) => {
      this.pendingRequests.delete(key);
      // Return stale data if available
      if (cached) return cached.data;
      throw err;
    });

    this.pendingRequests.set(key, request);
    return request;
  }

  /** Invalidate a specific cache key */
  invalidate(key: string) {
    this.store.delete(key);
  }

  /** Invalidate all keys matching a prefix */
  invalidatePrefix(prefix: string) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /** Clear entire cache */
  clear() {
    this.store.clear();
  }

  /** Get cache stats for debugging */
  stats() {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    };
  }
}

// Singleton instance
export const cache = new SWRCache();

// Predefined TTLs (in milliseconds)
export const TTL = {
  /** 30 seconds — user profile, current data */
  SHORT: 30_000,
  /** 2 minutes — job listings, applications */
  MEDIUM: 2 * 60_000,
  /** 10 minutes — leaderboard, stats, badges */
  LONG: 10 * 60_000,
  /** 30 minutes — system config, categories */
  VERY_LONG: 30 * 60_000,
} as const;
