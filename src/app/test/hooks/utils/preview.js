Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPreviewAutofill = buildPreviewAutofill;
// Helper function to extract answer picks from multiple choice questions
function extractAnswerPicks(question) {
	const answerList = Array.isArray(question.answers)
		? question.answers
		: [question.answers];
	const picks = [];
	for (const ans of answerList) {
		if (typeof ans === "string") {
			if (ans) {
				picks.push(ans);
			}
		} else if (
			typeof ans === "number" &&
			question.options &&
			ans >= 0 &&
			ans < question.options.length
		) {
			const val = question.options[ans];
			if (val) {
				picks.push(val);
			}
		}
	}
	return picks;
}
// Helper function to get fallback answer for multiple choice questions
function getFallbackAnswer(question, answerList) {
	let _a;
	const first =
		typeof answerList[0] === "number" && question.options
			? question.options[answerList[0]]
			: String((_a = answerList[0]) !== null && _a !== void 0 ? _a : "");
	return first;
}
// Helper function to process multiple choice questions
function processMultipleChoiceQuestion(question, index, filled, grades) {
	const picks = extractAnswerPicks(question);
	if (picks.length === 0) {
		const answerList = Array.isArray(question.answers)
			? question.answers
			: [question.answers];
		filled[index] = [getFallbackAnswer(question, answerList)];
	} else {
		filled[index] = picks;
	}
	grades[index] = 3;
}
// Helper function to process free response questions
function processFreeResponseQuestion(question, index, filled, grades) {
	let _a;
	const corrects = Array.isArray(question.answers)
		? question.answers
		: [question.answers];
	const first =
		corrects.length > 0
			? String((_a = corrects[0]) !== null && _a !== void 0 ? _a : "")
			: "";
	filled[index] = [first];
	grades[index] = 1;
}
function buildPreviewAutofill(data) {
	const filled = {};
	const grades = {};
	for (const [i, q] of data.entries()) {
		if (Array.isArray(q.options) && q.options.length > 0) {
			processMultipleChoiceQuestion(q, i, filled, grades);
		} else {
			processFreeResponseQuestion(q, i, filled, grades);
		}
	}
	return { filled, grades };
}
