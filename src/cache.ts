/**
 * LRU cache with TTL support.
 *
 * Uses Map iteration order for LRU behavior (oldest entries first).
 * Expired entries are removed on access. Oldest entry is evicted when at capacity.
 */
export class LRUCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private maxEntries: number;
  private ttlMs: number;

  constructor(maxEntries = 1000, ttlHours = 24) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlHours * 60 * 60 * 1000;
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.ttlMs;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (this.isExpired(entry.timestamp)) {
      this.cache.delete(key);
      return null;
    }
    // LRU: move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key: string, data: T): void {
    // Remove existing entry first (to update position)
    this.cache.delete(key);
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxEntries) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
