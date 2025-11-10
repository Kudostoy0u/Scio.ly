/**
 * Network utilities for Science Olympiad platform
 * Provides request deduplication and efficient data fetching
 */

/** Map of in-flight requests to prevent duplicate network calls */
const inflightRequests = new Map<string, Promise<Response>>();

/**
 * Fetches a resource once, deduplicating concurrent requests
 * If the same URL is requested multiple times before the first completes,
 * all callers will receive the same promise
 * 
 * @param {string} input - URL to fetch
 * @param {RequestInit} [init] - Fetch options
 * @returns {Promise<Response>} Promise that resolves to the fetch response
 * @throws {Error} When network request fails
 * @example
 * ```typescript
 * const response = await fetchOnce('/api/data');
 * const data = await response.json();
 * ```
 */
export async function fetchOnce(input: string, init?: RequestInit): Promise<Response> {
  const key = init ? `${input}::${JSON.stringify(init)}` : input;
  const existing = inflightRequests.get(key);
  if (existing) return existing;
  const p = fetch(input, init).finally(() => {
    inflightRequests.delete(key);
  });
  inflightRequests.set(key, p);
  return p;
}

// Removed unused export: getJsonOnce


