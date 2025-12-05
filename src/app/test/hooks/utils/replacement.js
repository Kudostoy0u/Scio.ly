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
exports.fetchReplacementQuestion = fetchReplacementQuestion;
const api_1 = require("@/app/api");
const questionUtils_1 = require("@/app/utils/questionUtils");
const storage_1 = require("@/app/utils/storage");
// Helper function to filter questions by type
function filterQuestionsByType(questions, typesSel) {
	if (typesSel === "multiple-choice") {
		return questions.filter(
			(q) => Array.isArray(q.options) && q.options.length > 0,
		);
	}
	if (typesSel === "free-response") {
		return questions.filter(
			(q) => !Array.isArray(q.options) || q.options.length === 0,
		);
	}
	return questions;
}
// Helper function to get offline questions for an event
async function getOfflineQuestionsForEvent(eventName, typesSel) {
	const slug = eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
	const cached = await (0, storage_1.getEventOfflineQuestions)(slug);
	if (!Array.isArray(cached) || cached.length === 0) {
		return [];
	}
	const filtered = filterQuestionsByType(cached, typesSel);
	return filtered;
}
// Helper function to fetch questions from API
async function fetchQuestionsFromAPI(apiUrl) {
	try {
		const response = await fetch(apiUrl);
		if (response === null || response === void 0 ? void 0 : response.ok) {
			const j = await response.json();
			return (j === null || j === void 0 ? void 0 : j.data) || [];
		}
	} catch (_a) {
		// Ignore fetch errors
	}
	return [];
}
async function fetchReplacementQuestion(routerData, data) {
	try {
		const typesSel = routerData.types || "multiple-choice";
		const requestCount = 50;
		const params = (0, questionUtils_1.buildApiParams)(
			__assign({}, routerData),
			requestCount,
		);
		const apiUrl = `${api_1.default.questions}?${params}`;
		const existingQuestions = data.map((q) => q.question);
		const isOffline =
			typeof navigator !== "undefined" ? !navigator.onLine : false;
		let pool = [];
		if (isOffline) {
			const eventName = routerData.eventName;
			if (eventName) {
				pool = await getOfflineQuestionsForEvent(eventName, typesSel);
			}
		} else {
			pool = await fetchQuestionsFromAPI(apiUrl);
			// Fallback to offline cache if API fails
			if (pool.length === 0) {
				const eventName = routerData.eventName;
				if (eventName) {
					pool = await getOfflineQuestionsForEvent(eventName, typesSel);
				}
			}
		}
		const candidates = pool.filter(
			(q) => !existingQuestions.includes(q.question),
		);
		if (candidates.length === 0) {
			return null;
		}
		const pick = candidates[Math.floor(Math.random() * candidates.length)];
		return pick || null;
	} catch (_a) {
		return null;
	}
}
