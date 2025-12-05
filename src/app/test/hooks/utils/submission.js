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
exports.computeMcqTotals = computeMcqTotals;
const questionUtils_1 = require("@/app/utils/questionUtils");
function computeMcqTotals(
	data,
	userAnswers,
	gradingResults,
	isAssignmentMode = false,
) {
	// Use the passed assignment mode parameter
	let mcqScore = 0;
	let mcqTotal = 0;
	const frqsToGrade = [];
	const newGrading = __assign({}, gradingResults);
	for (let i = 0; i < data.length; i++) {
		const question = data[i];
		const answer = userAnswers[i] || [];
		// If already graded, use existing score
		if (typeof newGrading[i] === "number") {
			const scoreVal = newGrading[i];
			mcqTotal += 1; // Count all questions in assignment mode
			mcqScore += Math.max(0, Math.min(1, scoreVal));
			continue;
		}
		// Handle unanswered questions
		if (!(answer.length > 0 && answer[0])) {
			if (isAssignmentMode) {
				newGrading[i] = 0;
				mcqTotal += 1; // Count all questions in assignment mode
				mcqScore += 0;
			} else {
				continue;
			}
			continue;
		}
		// Process MCQ questions
		if (!question) {
			continue;
		}
		if (question.options && question.options.length > 0) {
			mcqTotal += 1; // Count all answered questions
			const frac = (0, questionUtils_1.calculateMCQScore)(question, answer);
			mcqScore += Math.max(0, Math.min(1, frac));
			newGrading[i] = frac;
		} else if (answer[0] !== null) {
			const hasValidFrqAnswers =
				question.answers &&
				question.answers.length > 0 &&
				question.answers[0] !== "" &&
				question.answers[0] !== null;
			if (hasValidFrqAnswers) {
				frqsToGrade.push({
					index: i,
					question: question.question,
					correctAnswers: question.answers,
					studentAnswer: answer[0],
				});
			} else {
				newGrading[i] = 0.5;
				mcqTotal += 1;
				mcqScore += 0.5;
			}
		}
	}
	return { mcqTotal, mcqScore, frqsToGrade, newGrading };
}
