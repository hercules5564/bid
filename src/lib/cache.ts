// Tiny in-process TTL cache. The custom server is a single long-lived process,
// so this meaningfully cuts round-trips to a distant database for read-heavy,
// slow-changing data (rails, categories, leaderboards, the Showdown hero).

type Entry = { value: unknown; expires: number };
const store = new Map<string, Entry>();

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.value as T;
  const value = await fn();
  store.set(key, { value, expires: now + ttlMs });
  return value;
}

/** Drop every cache entry whose key starts with any of the given prefixes. */
export function invalidate(...prefixes: string[]) {
  for (const k of store.keys()) {
    if (prefixes.some((p) => k.startsWith(p))) store.delete(k);
  }
}
