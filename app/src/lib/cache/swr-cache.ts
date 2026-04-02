/**
 * Lightweight SWR (Stale-While-Revalidate) in-memory cache for client-side.
 * Reduces Firestore reads by caching frequently-accessed data with TTL.
 *
 * Enhanced (A5): LRU eviction, batch reads, warmup support, size limits.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
  lastAccessed: number; // for LRU eviction
}

const MAX_CACHE_SIZE = 500;

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

    // If cache is fresh, return immediately and update LRU
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      cached.lastAccessed = Date.now();
      return cached.data;
    }

    // Deduplicate in-flight requests
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    // Fetch fresh data
    const request = fetcher().then((data) => {
      this.set(key, data, ttlMs);
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

  /**
   * Batch get multiple cache entries at once.
   * Missing keys are fetched using the provided fetcher.
   */
  async getMany<T>(
    keys: string[],
    fetcher: (key: string) => Promise<T>,
    ttlMs: number = 60_000
  ): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    const missing: string[] = [];

    for (const key of keys) {
      const cached = this.store.get(key) as CacheEntry<T> | undefined;
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        cached.lastAccessed = Date.now();
        result.set(key, cached.data);
      } else {
        missing.push(key);
      }
    }

    // Fetch missing entries in parallel
    if (missing.length > 0) {
      const fetched = await Promise.allSettled(
        missing.map(async (key) => {
          const data = await fetcher(key);
          this.set(key, data, ttlMs);
          return { key, data };
        })
      );

      for (const r of fetched) {
        if (r.status === 'fulfilled') {
          result.set(r.value.key, r.value.data);
        }
      }
    }

    return result;
  }

  /**
   * Pre-populate cache with data (e.g., on app load).
   */
  warmup<T>(entries: { key: string; data: T; ttlMs?: number }[]): void {
    for (const { key, data, ttlMs = TTL.MEDIUM } of entries) {
      this.set(key, data, ttlMs);
    }
  }

  /** Set a cache entry directly */
  private set<T>(key: string, data: T, ttlMs: number): void {
    // Enforce size limit with LRU eviction
    if (this.store.size >= MAX_CACHE_SIZE && !this.store.has(key)) {
      this.evictLRU();
    }

    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
      lastAccessed: Date.now(),
    });
  }

  /** Evict the least recently used entry */
  private evictLRU(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.store) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldest = key;
      }
    }

    if (oldest) {
      this.store.delete(oldest);
    }
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

  /** Remove expired entries */
  prune() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now - entry.timestamp >= entry.ttl) {
        this.store.delete(key);
      }
    }
  }

  /** Get cache stats for debugging */
  stats() {
    const now = Date.now();
    let fresh = 0;
    let stale = 0;

    for (const entry of this.store.values()) {
      if (now - entry.timestamp < entry.ttl) fresh++;
      else stale++;
    }

    return {
      size: this.store.size,
      maxSize: MAX_CACHE_SIZE,
      fresh,
      stale,
      pendingRequests: this.pendingRequests.size,
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
