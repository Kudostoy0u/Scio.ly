/**
 * Team Store Utilities
 */

const inflightRequests = new Map<string, Promise<unknown>>();

export async function fetchWithDeduplication<T>(
	key: string,
	fetcher: () => Promise<T>,
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
		// Check for TRPC error structure (error.message is the most common)
		if (
			"message" in error &&
			typeof (error as { message: unknown }).message === "string"
		) {
			return (error as { message: string }).message;
		}
		// Check for nested data.message (some API responses)
		if ("data" in error) {
			const dataError = error as { data?: { message?: string } };
			if (dataError.data?.message) {
				return dataError.data.message;
			}
		}
		// Check for shape.message (TRPC error shape)
		if ("shape" in error) {
			const shapeError = error as { shape?: { message?: string } };
			if (shapeError.shape?.message) {
				return shapeError.shape.message;
			}
		}
	}
	if (error instanceof Error) {
		return error.message || "An unexpected error occurred";
	}
	return "An unexpected error occurred";
}
