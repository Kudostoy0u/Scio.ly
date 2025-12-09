import api from "@/app/api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchQuestionsForParams } from "./fetchQuestions";

describe("fetchQuestionsForParams", () => {
	const fakeBaseQuestions = Array.from({ length: 20 }).map((_, i) => ({
		id: `q${i}`,
		question: `Base Q ${i}`,
		options: ["A", "B", "C", "D"],
		answers: [0],
		difficulty: 0.5,
		event: "Water Quality",
		subtopics: [],
	}));

	const fakeIdRows = Array.from({ length: 20 }).map((_, i) => ({
		id: `id${i}`,
		question: `Identify specimen ${i}`,
		options: ["Alpha", "Beta", "Gamma", "Delta"],
		answers: [0],
		difficulty: 0.5,
		event: "Water Quality",
		subtopics: [],
		images: ["/img/sample.png"],
	}));

	beforeEach(() => {
		vi.resetAllMocks();
		const fetchMock = vi.fn((input: unknown) => {
			const url = typeof input === "string" ? input : input?.toString?.() || "";
			if (url.startsWith(api.idQuestions)) {
				return Promise.resolve({
					ok: true,
					json: async () => ({ data: fakeIdRows }),
				});
			}
			if (url.startsWith(api.questions)) {
				return Promise.resolve({
					ok: true,
					json: async () => ({ data: fakeBaseQuestions }),
				});
			}
			return Promise.resolve({ ok: false, json: async () => ({}) });
		});
		global.fetch = fetchMock as unknown as typeof global.fetch;
		(global as { navigator: { onLine: boolean } }).navigator = { onLine: true };
	});

	it("uses ID endpoint when idPercentage is 100", async () => {
		const routerParams = {
			eventName: "Water Quality - Freshwater",
			idPercentage: 100,
			types: "multiple-choice",
		} as {
			eventName: string;
			idPercentage: number;
			types: string;
		};
		const total = 10;
		const result = await fetchQuestionsForParams(routerParams, total);
		expect(result.length).toBe(total);
		const calls = (
			global.fetch as unknown as { mock: { calls: unknown[][] } }
		).mock.calls.map((c) => (c[0] as string).toString());
		expect(calls.some((u: string) => u.startsWith(api.idQuestions))).toBe(true);
		expect(calls.some((u: string) => u.startsWith(api.questions))).toBe(false);
	});

	it("uses base questions endpoint when idPercentage is 0", async () => {
		const routerParams = {
			eventName: "Water Quality - Freshwater",
			idPercentage: 0,
			types: "multiple-choice",
		} as {
			eventName: string;
			idPercentage: number;
			types: string;
		};
		const total = 5;
		const result = await fetchQuestionsForParams(routerParams, total);
		expect(result.length).toBe(total);
		const calls = (
			global.fetch as unknown as { mock: { calls: unknown[][] } }
		).mock.calls.map((c) => (c[0] as string).toString());
		expect(calls.some((u: string) => u.startsWith(api.questions))).toBe(true);
		expect(calls.some((u: string) => u.startsWith(api.idQuestions))).toBe(
			false,
		);
	});
});
