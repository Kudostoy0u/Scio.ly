import { describe, expect, it, vi } from "vitest";
import { fetchOnce } from "./fetchOnce";

describe("fetchOnce", () => {
	it("deduplicates concurrent requests", async () => {
		const original = global.fetch;
		let calls = 0;
		global.fetch = vi.fn(() => {
			calls++;
			return Promise.resolve(
				new Response(JSON.stringify({ ok: true }), { status: 200 }),
			);
		}) as typeof global.fetch;
		try {
			const [a, b] = await Promise.all([
				fetchOnce("/api/sample"),
				fetchOnce("/api/sample"),
			]);
			expect(a).toBe(b);
			expect(calls).toBe(1);
			// After resolution, next call should trigger new fetch
			await fetchOnce("/api/sample");
			expect(calls).toBe(2);
		} finally {
			global.fetch = original;
		}
	});
});
