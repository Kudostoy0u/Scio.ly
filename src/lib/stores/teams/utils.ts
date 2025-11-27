/**
 * Team Store Utilities
 */

const inflightRequests = new Map<string, Promise<unknown>>();

export async function fetchWithDeduplication<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const existing = inflightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = fetcher().finally(() => {
    inflightRequests.delete(key);
  });

  inflightRequests.set(key, promise);
  return promise;
}

export function handleApiError(error: unknown, _context: string): string {
  if (error && typeof error === "object") {
    if ("data" in error) {
      const dataError = error as { data?: { message?: string } };
      if (dataError.data?.message) {
        return dataError.data.message;
      }
    }
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message) || "An unexpected error occurred";
  }
  return "An unexpected error occurred";
}
