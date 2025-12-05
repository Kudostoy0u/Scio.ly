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
exports.normalizeQuestionsFull = normalizeQuestionsFull;
const normalizeTestText_1 = require("@/app/test/utils/normalizeTestText");
const questionMedia_1 = require("@/app/test/utils/questionMedia");
/**
 * Normalizes questions while preserving the answers field
 *
 * IMPORTANT: This function normalizes text content but NEVER modifies the answers field.
 * Questions must always have an answers field that is an array of:
 * - Numbers (0-based indices) for multiple choice questions
 * - Strings for free response questions
 *
 * @param questions - Array of questions to normalize
 * @returns Normalized questions with preserved answers field
 */
function normalizeQuestionsFull(questions) {
	if (!Array.isArray(questions)) {
		return [];
	}
	const mediaNormalized = (0, questionMedia_1.normalizeQuestionMedia)(
		questions,
	);
	return mediaNormalized.map((q, _index) => {
		let _a;
		const out = __assign({}, q);
		// Validate that answers field exists and is valid
		if (
			!(out.answers && Array.isArray(out.answers)) ||
			(Array.isArray(out.answers) && out.answers.length === 0)
		) {
			// Skip normalization if answers are invalid
		}
		// Normalize question text
		if (out.question) {
			out.question = (0, normalizeTestText_1.normalizeQuestionText)(
				out.question,
			);
		}
		// Normalize options (for MCQ)
		if (Array.isArray(out.options) && out.options.length > 0) {
			out.options = out.options.map((opt) => {
				const optRecord = opt;
				return typeof optRecord === "string"
					? (0, normalizeTestText_1.normalizeTestText)(optRecord)
					: optRecord;
			});
		}
		// CRITICAL: Preserve answers field exactly as-is
		// Do NOT modify, convert, or normalize the answers field
		// It should already be in the correct format:
		// - Array of numbers for MCQ (e.g., [0], [1, 2])
		// - Array of strings for FRQ (e.g., ["answer text"])
		// Preserve difficulty field if present (already set above)
		const outRecord = out;
		return __assign(__assign({}, outRecord), {
			question: (_a = outRecord.question) !== null && _a !== void 0 ? _a : "",
			options: Array.isArray(outRecord.options) ? outRecord.options : undefined,
			answers: Array.isArray(outRecord.answers) ? outRecord.answers : [],
			difficulty:
				typeof outRecord.difficulty === "number" ? outRecord.difficulty : 0.5,
		});
	});
}
