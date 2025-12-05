let __assign =
	(this && this.__assign) ||
	function () {
		__assign =
			Object.assign ||
			((t) => {
				for (let s, i = 1, n = arguments.length; i < n; i++) {
					s = arguments[i];
					for (const p in s)
						if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
				}
				return t;
			});
		return __assign.apply(this, arguments);
	};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchQuestionsForParams = fetchQuestionsForParams;
const questionLoader_1 = require("@/app/test/services/questionLoader");
const questionUtils_1 = require("@/app/utils/questionUtils");
const logger_1 = require("@/lib/utils/logger");
// Helper function to calculate ID percentage
function calculateIdPercentage(routerParams) {
	const idPctRaw =
		"idPercentage" in routerParams ? routerParams.idPercentage : undefined;
	return typeof idPctRaw !== "undefined" && idPctRaw !== null
		? Math.max(0, Math.min(100, Number.parseInt(String(idPctRaw))))
		: 0;
}
// Helper function to fetch Anatomy & Physiology questions with subtopic rotation
async function fetchAnatomyQuestions(routerParams, countTarget) {
	let _a;
	let _b;
	let _c;
	const perThird = Math.max(1, Math.floor(countTarget / 3));
	const extra = Math.max(0, countTarget - 3 * perThird);
	const wants = [
		perThird + (extra > 0 ? 1 : 0),
		perThird + (extra > 1 ? 1 : 0),
		perThird,
	];
	const [poolEndo, poolNerv, poolSense] = await Promise.all([
		(0, questionLoader_1.fetchBaseQuestions)(
			__assign(__assign({}, routerParams), {
				eventName: "Anatomy - Endocrine",
			}),
			perThird,
		),
		(0, questionLoader_1.fetchBaseQuestions)(
			__assign(__assign({}, routerParams), { eventName: "Anatomy - Nervous" }),
			perThird,
		),
		(0, questionLoader_1.fetchBaseQuestions)(
			__assign(__assign({}, routerParams), {
				eventName: "Anatomy - Sense Organs",
			}),
			perThird,
		),
	]);
	const seen = new Set();
	const takeUniqueByText = (pool, count) => {
		const out = [];
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
	const pickedEndo = takeUniqueByText(
		poolEndo,
		(_a = wants[0]) !== null && _a !== void 0 ? _a : 0,
	);
	const pickedNerv = takeUniqueByText(
		poolNerv,
		(_b = wants[1]) !== null && _b !== void 0 ? _b : 0,
	);
	const pickedSense = takeUniqueByText(
		poolSense,
		(_c = wants[2]) !== null && _c !== void 0 ? _c : 0,
	);
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
function handleAnatomyFallback(final, routerParams, total) {
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
	const tag = (q) => {
		const subtopics = q.subtopics;
		return (
			Array.isArray(subtopics) &&
			subtopics.some(
				(s) => typeof s === "string" && [subA, subB, subC].includes(s),
			)
		);
	};
	const withTags = final.filter(tag);
	const withoutTags = final.filter((q) => !tag(q));
	const pick = (pool, count, sub) => {
		const inSub = pool.filter((q) => {
			const subtopics = q.subtopics;
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
async function fetchQuestionsForParams(routerParams, total) {
	const idPct = calculateIdPercentage(routerParams);
	const eventName =
		typeof routerParams.eventName === "string"
			? routerParams.eventName
			: undefined;
	const idCount = (0, questionLoader_1.supportsIdEvent)(eventName)
		? Math.round((idPct / 100) * total)
		: 0;
	const baseCount = Math.max(0, total - idCount);
	let selectedQuestions = [];
	// Special handling for Anatomy & Physiology rotating subtopics
	const isAnatomyMain =
		(routerParams.eventName || "") === "Anatomy & Physiology";
	if (isAnatomyMain) {
		const countTarget = Math.max(1, baseCount > 0 ? baseCount : total);
		selectedQuestions = await fetchAnatomyQuestions(routerParams, countTarget);
	}
	// Base questions
	if (baseCount > 0 && !isAnatomyMain) {
		const base = await (0, questionLoader_1.fetchBaseQuestions)(
			routerParams,
			baseCount,
		);
		selectedQuestions = base.slice(0, baseCount);
	}
	// ID questions
	if (idCount > 0) {
		const ids = await (0, questionLoader_1.fetchIdQuestions)(
			routerParams,
			idCount,
		);
		selectedQuestions = selectedQuestions.concat(ids.slice(0, idCount));
	}
	// Top up if needed (non-anatomy)
	if (selectedQuestions.length < total && baseCount > 0 && !isAnatomyMain) {
		const need = total - selectedQuestions.length;
		const extras = await (0, questionLoader_1.fetchBaseQuestions)(
			routerParams,
			need,
		);
		selectedQuestions = selectedQuestions.concat(extras.slice(0, need));
	}
	// Deduplicate and shuffle to ensure picture-based questions are randomly distributed
	// Skip dedupeByText for pure_id questions since they all have the same text by design
	let final = (0, questionLoader_1.dedupeById)(selectedQuestions).slice(
		0,
		total,
	);
	final = (0, questionUtils_1.shuffleArray)(final);
	final = (0, questionLoader_1.finalizeQuestions)(final).map((q, idx) =>
		__assign(__assign({}, q), { originalIndex: idx }),
	);
	// Special thirds split fallback if Anatomy & Physiology but empty (edge case)
	final = handleAnatomyFallback(final, routerParams, total);
	logger_1.default.log("fetchQuestionsForParams finalized", {
		total,
		count: final.length,
	});
	return final;
}
