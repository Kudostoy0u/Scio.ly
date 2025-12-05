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
exports.handleQuestionRemoved = handleQuestionRemoved;
exports.handleEditSubmit = handleEditSubmit;
const logger_1 = require("@/lib/utils/logger");
const questionMaintenance_1 = require("../hooks/utils/questionMaintenance");
const replacement_1 = require("../hooks/utils/replacement");
async function handleQuestionRemoved(
	questionIndex,
	data,
	routerData,
	userAnswers,
	gradingResults,
	explanations,
	loadingExplanation,
	callbacks,
) {
	const {
		setData,
		setUserAnswers,
		setGradingResults,
		setExplanations,
		setLoadingExplanation,
		setSubmittedReports,
		setSubmittedEdits,
	} = callbacks;
	const fetchReplacement = async () =>
		(0, replacement_1.fetchReplacementQuestion)(routerData, data);
	const replacement = await fetchReplacement();
	if (replacement) {
		setData((prevData) => {
			const newData = [...prevData];
			newData[questionIndex] = replacement;
			setTimeout(() => {
				localStorage.setItem("testQuestions", JSON.stringify(newData));
			}, 0);
			return newData;
		});
		setUserAnswers((prev) =>
			__assign(__assign({}, prev), { [questionIndex]: null }),
		);
		setGradingResults((prev) =>
			__assign(__assign({}, prev), { [questionIndex]: 0 }),
		);
		setExplanations((prev) => {
			const c = __assign({}, prev);
			delete c[questionIndex];
			return c;
		});
		setLoadingExplanation((prev) => {
			const c = __assign({}, prev);
			delete c[questionIndex];
			return c;
		});
		setSubmittedReports((prev) => {
			const c = __assign({}, prev);
			delete c[questionIndex];
			return c;
		});
		setSubmittedEdits((prev) => {
			const c = __assign({}, prev);
			delete c[questionIndex];
			return c;
		});
	} else {
		const { newData, newAnswers, newResults, newExplanations, newLoading } = (0,
		questionMaintenance_1.removeQuestionAtIndex)(
			data,
			questionIndex,
			userAnswers,
			gradingResults,
			explanations,
			loadingExplanation,
		);
		setData(newData);
		setUserAnswers(newAnswers);
		setGradingResults(newResults);
		setExplanations(newExplanations);
		setLoadingExplanation(newLoading);
		setTimeout(() => {
			localStorage.setItem("testQuestions", JSON.stringify(newData));
			localStorage.setItem("testUserAnswers", JSON.stringify(newAnswers));
		}, 0);
	}
}
async function handleEditSubmit(
	editedQuestion,
	reason,
	originalQuestion,
	data,
	editingQuestion,
	routerData,
	callbacks,
	aiBypass,
	aiSuggestion,
) {
	try {
		logger_1.default.log(
			"🔍 [TEST] Edit submit with aiBypass:",
			aiBypass,
			"aiSuggestion:",
			aiSuggestion,
		);
		const apiModule = await Promise.resolve().then(() => require("@/app/api"));
		const api = apiModule.default;
		const response = await fetch(api.reportEdit, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				originalQuestion: originalQuestion,
				editedQuestion: editedQuestion,
				reason: reason,
				event: routerData.eventName,
				bypass: !!aiBypass,
				aiSuggestion,
			}),
		});
		const result = await response.json();
		if (result.success) {
			if (editingQuestion) {
				const questionIndex = data.findIndex(
					(q) => q.question === editingQuestion.question,
				);
				if (questionIndex !== -1) {
					callbacks.setData((prevData) => {
						const newData = [...prevData];
						newData[questionIndex] = editedQuestion;
						return newData;
					});
					localStorage.setItem(
						"testQuestions",
						JSON.stringify(
							data.map((q, idx) =>
								idx === questionIndex ? editedQuestion : q,
							),
						),
					);
					callbacks.handleEditSubmitted(questionIndex);
				}
			}
			return {
				success: true,
				message: result.message || "Edit submitted successfully!",
				reason: result.message || "Edit submitted successfully!",
			};
		}
		return {
			success: false,
			message: result.message || "Failed to submit edit",
			reason: result.message || "Failed to submit edit",
		};
	} catch (error) {
		logger_1.default.error("Error submitting edit:", error);
		return {
			success: false,
			message: "An unexpected error occurred. Please try again.",
			reason: "An unexpected error occurred. Please try again.",
		};
	}
}
