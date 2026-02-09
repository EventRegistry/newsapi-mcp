import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { LRUCache } from "../src/cache.js";

describe("LRUCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for cache miss", () => {
    const cache = new LRUCache<string>();
    expect(cache.get("nonexistent")).toBeNull();
  });

  it("stores and retrieves values", () => {
    const cache = new LRUCache<string>();
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
  });

  it("overwrites existing values", () => {
    const cache = new LRUCache<string>();
    cache.set("key1", "value1");
    cache.set("key1", "value2");
    expect(cache.get("key1")).toBe("value2");
    expect(cache.size).toBe(1);
  });

  it("tracks size correctly", () => {
    const cache = new LRUCache<string>();
    expect(cache.size).toBe(0);
    cache.set("key1", "value1");
    expect(cache.size).toBe(1);
    cache.set("key2", "value2");
    expect(cache.size).toBe(2);
  });

  it("clears all entries", () => {
    const cache = new LRUCache<string>();
    cache.set("key1", "value1");
    cache.set("key2", "value2");
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get("key1")).toBeNull();
  });

  describe("TTL expiration", () => {
    it("returns value before TTL expires", () => {
      const cache = new LRUCache<string>(1000, 24); // 24 hours
      cache.set("key1", "value1");

      // Advance 23 hours
      vi.advanceTimersByTime(23 * 60 * 60 * 1000);
      expect(cache.get("key1")).toBe("value1");
    });

    it("returns null after TTL expires", () => {
      const cache = new LRUCache<string>(1000, 24); // 24 hours
      cache.set("key1", "value1");

      // Advance 25 hours
      vi.advanceTimersByTime(25 * 60 * 60 * 1000);
      expect(cache.get("key1")).toBeNull();
    });

    it("removes expired entry from cache on access", () => {
      const cache = new LRUCache<string>(1000, 24);
      cache.set("key1", "value1");
      expect(cache.size).toBe(1);

      vi.advanceTimersByTime(25 * 60 * 60 * 1000);
      cache.get("key1"); // Access triggers removal
      expect(cache.size).toBe(0);
    });
  });

  describe("LRU eviction", () => {
    it("evicts oldest entry when at capacity", () => {
      const cache = new LRUCache<string>(3); // max 3 entries
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      // Adding 4th entry should evict key1 (oldest)
      cache.set("key4", "value4");
      expect(cache.size).toBe(3);
      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBe("value2");
      expect(cache.get("key3")).toBe("value3");
      expect(cache.get("key4")).toBe("value4");
    });

    it("updates LRU order on access", () => {
      const cache = new LRUCache<string>(3);
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      // Access key1, making it most recently used
      cache.get("key1");

      // Adding key4 should evict key2 (now oldest)
      cache.set("key4", "value4");
      expect(cache.get("key1")).toBe("value1");
      expect(cache.get("key2")).toBeNull();
      expect(cache.get("key3")).toBe("value3");
      expect(cache.get("key4")).toBe("value4");
    });

    it("updates LRU order on set of existing key", () => {
      const cache = new LRUCache<string>(3);
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      // Update key1, making it most recently used
      cache.set("key1", "updated");

      // Adding key4 should evict key2 (now oldest)
      cache.set("key4", "value4");
      expect(cache.get("key1")).toBe("updated");
      expect(cache.get("key2")).toBeNull();
    });
  });

  describe("generic type support", () => {
    it("works with object values", () => {
      const cache = new LRUCache<{ name: string; count: number }>();
      const obj = { name: "test", count: 42 };
      cache.set("key1", obj);
      expect(cache.get("key1")).toEqual(obj);
    });

    it("works with array values", () => {
      const cache = new LRUCache<string[]>();
      const arr = ["a", "b", "c"];
      cache.set("key1", arr);
      expect(cache.get("key1")).toEqual(arr);
    });
  });
});
