import {
	type RouterParams,
	dedupeById,
	fetchBaseQuestions,
	fetchIdQuestions,
	finalizeQuestions,
	supportsIdEvent,
} from "@/app/test/services/questionLoader";
import type { Question } from "@/app/utils/geminiService";
import { shuffleArray } from "@/app/utils/questionUtils";
import logger from "@/lib/utils/logging/logger";

// Helper function to calculate ID percentage
function calculateIdPercentage(routerParams: RouterParams): number {
	const idPctRaw =
		"idPercentage" in routerParams ? routerParams.idPercentage : undefined;
	return typeof idPctRaw !== "undefined" && idPctRaw !== null
		? Math.max(0, Math.min(100, Number.parseInt(String(idPctRaw))))
		: 0;
}

// Helper function to fetch Anatomy & Physiology questions with subtopic rotation
async function fetchAnatomyQuestions(
	routerParams: RouterParams,
	countTarget: number,
): Promise<Question[]> {
	const perThird = Math.max(1, Math.floor(countTarget / 3));
	const extra = Math.max(0, countTarget - 3 * perThird);
	const wants = [
		perThird + (extra > 0 ? 1 : 0),
		perThird + (extra > 1 ? 1 : 0),
		perThird,
	];

	const [poolEndo, poolNerv, poolSense] = await Promise.all([
		fetchBaseQuestions(
			{ ...routerParams, eventName: "Anatomy - Endocrine" },
			perThird,
		),
		fetchBaseQuestions(
			{ ...routerParams, eventName: "Anatomy - Nervous" },
			perThird,
		),
		fetchBaseQuestions(
			{ ...routerParams, eventName: "Anatomy - Sense Organs" },
			perThird,
		),
	]);

	const seen = new Set<string>();
	const takeUniqueByText = (pool: Question[], count: number): Question[] => {
		const out: Question[] = [];
		for (const q of pool) {
			if (out.length >= count) {
				break;
			}
			const text =
				typeof q.question === "string" ? q.question.trim().toLowerCase() : "";
			if (!text || seen.has(text)) {
				continue;
			}
			seen.add(text);
			out.push(q);
		}
		return out;
	};

	const pickedEndo = takeUniqueByText(poolEndo, wants[0] ?? 0);
	const pickedNerv = takeUniqueByText(poolNerv, wants[1] ?? 0);
	const pickedSense = takeUniqueByText(poolSense, wants[2] ?? 0);
	let pickedAll = pickedEndo.concat(pickedNerv).concat(pickedSense);

	if (pickedAll.length < countTarget) {
		const deficit = countTarget - pickedAll.length;
		const leftovers = poolEndo.concat(poolNerv, poolSense).filter((q) => {
			const text =
				typeof q.question === "string" ? q.question.trim().toLowerCase() : "";
			return text && !seen.has(text);
		});
		pickedAll = pickedAll.concat(leftovers.slice(0, deficit));
	}

	return pickedAll.slice(0, countTarget);
}

// Helper function to handle Anatomy & Physiology fallback when empty
function handleAnatomyFallback(
	final: Question[],
	routerParams: RouterParams,
	total: number,
): Question[] {
	if (
		(routerParams.eventName || "") !== "Anatomy & Physiology" ||
		final.length > 0
	) {
		return final;
	}

	const thirds = Math.max(1, Math.floor(total / 3));
	const extra = total - 3 * thirds;
	const subA = "Sense Organs";
	const subB = "Nervous";
	const subC = "Endocrine";

	const tag = (q: Question) => {
		const subtopics = (q as { subtopics?: unknown }).subtopics;
		return (
			Array.isArray(subtopics) &&
			subtopics.some(
				(s: unknown) => typeof s === "string" && [subA, subB, subC].includes(s),
			)
		);
	};

	const withTags = final.filter(tag);
	const withoutTags = final.filter((q) => !tag(q));

	const pick = (pool: Question[], count: number, sub: string) => {
		const inSub = pool.filter((q) => {
			const subtopics = (q as { subtopics?: unknown }).subtopics;
			return Array.isArray(subtopics) && subtopics.includes(sub);
		});
		const taken = inSub.slice(0, count);
		return taken.length < count
			? taken.concat(withoutTags.slice(0, count - taken.length))
			: taken;
	};

	const a = pick(withTags, thirds + (extra > 0 ? 1 : 0), subA);
	const b = pick(
		withTags.filter((q) => !a.includes(q)),
		thirds + (extra > 1 ? 1 : 0),
		subB,
	);
	const c = pick(
		withTags.filter((q) => !(a.includes(q) || b.includes(q))),
		thirds,
		subC,
	);

	return a.concat(b).concat(c);
}

export async function fetchQuestionsForParams(
	routerParams: RouterParams,
	total: number,
): Promise<Question[]> {
	const idPct = calculateIdPercentage(routerParams);
	const eventName =
		typeof routerParams.eventName === "string"
			? routerParams.eventName
			: undefined;
	const idCount = supportsIdEvent(eventName)
		? Math.round((idPct / 100) * total)
		: 0;
	const baseCount = Math.max(0, total - idCount);

	let selectedQuestions: Question[] = [];

	// Special handling for Anatomy & Physiology rotating subtopics
	const isAnatomyMain =
		(routerParams.eventName || "") === "Anatomy & Physiology";
	if (isAnatomyMain) {
		const countTarget = Math.max(1, baseCount > 0 ? baseCount : total);
		selectedQuestions = await fetchAnatomyQuestions(routerParams, countTarget);
	}

	// Base questions
	if (baseCount > 0 && !isAnatomyMain) {
		const base = await fetchBaseQuestions(routerParams, baseCount);
		selectedQuestions = base.slice(0, baseCount);
	}

	// ID questions
	if (idCount > 0) {
		const ids = await fetchIdQuestions(routerParams, idCount);
		selectedQuestions = selectedQuestions.concat(ids.slice(0, idCount));
	}

	// Top up if needed (non-anatomy)
	if (selectedQuestions.length < total && baseCount > 0 && !isAnatomyMain) {
		const need = total - selectedQuestions.length;
		const extras = await fetchBaseQuestions(routerParams, need);
		selectedQuestions = selectedQuestions.concat(extras.slice(0, need));
	}

	// Deduplicate and shuffle to ensure picture-based questions are randomly distributed
	// Skip dedupeByText for pure_id questions since they all have the same text by design
	let final = dedupeById(selectedQuestions).slice(0, total);
	final = shuffleArray(final);
	final = finalizeQuestions(final).map((q, idx) => ({
		...q,
		originalIndex: idx,
	}));

	// Special thirds split fallback if Anatomy & Physiology but empty (edge case)
	final = handleAnatomyFallback(final, routerParams, total);

	logger.log("fetchQuestionsForParams finalized", {
		total,
		count: final.length,
	});
	return final;
}
