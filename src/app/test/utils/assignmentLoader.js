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
exports.loadAssignment = loadAssignment;
exports.loadViewResultsData = loadViewResultsData;
const logger_1 = require("@/lib/utils/logger");
const normalize_1 = require("../hooks/utils/normalize");
function validateAssignmentQuestions(questions) {
	let _a;
	let _b;
	let _c;
	let _d;
	for (const [index, question] of questions.entries()) {
		const q = question;
		if (!q.answers) {
			throw new Error(
				`Assignment question ${index + 1} (${(_a = q.question) !== null && _a !== void 0 ? _a : "unknown"}) missing required answers field`,
			);
		}
		if (q.answers === undefined) {
			throw new Error(
				`Assignment question ${index + 1} (${(_b = q.question) !== null && _b !== void 0 ? _b : "unknown"}) has undefined answers field`,
			);
		}
		if (q.answers === null) {
			throw new Error(
				`Assignment question ${index + 1} (${(_c = q.question) !== null && _c !== void 0 ? _c : "unknown"}) has null answers field`,
			);
		}
		if (Array.isArray(q.answers) && q.answers.length === 0) {
			throw new Error(
				`Assignment question ${index + 1} (${(_d = q.question) !== null && _d !== void 0 ? _d : "unknown"}) has empty answers array`,
			);
		}
	}
}
function hasInvalidQuestions(questions) {
	return questions.some(
		(q) => !(q.answers && Array.isArray(q.answers)) || q.answers.length === 0,
	);
}
function clearLegacyLocalStorage(answersKey, gradesKey) {
	localStorage.removeItem("testQuestions");
	localStorage.removeItem(answersKey);
	localStorage.removeItem(gradesKey);
	localStorage.removeItem("testSubmitted");
	localStorage.removeItem("testParams");
	localStorage.removeItem("currentTestSession");
}
function clearNewLocalStorage(assignmentKey) {
	localStorage.removeItem(`${assignmentKey}_questions`);
	localStorage.removeItem(`${assignmentKey}_answers`);
	localStorage.removeItem(`${assignmentKey}_session`);
	localStorage.removeItem(`${assignmentKey}_grading`);
}
function clearTestLocalStorage() {
	localStorage.removeItem("testSubmitted");
	localStorage.removeItem("testUserAnswers");
	localStorage.removeItem("testQuestions");
	localStorage.removeItem("testParams");
	localStorage.removeItem("testGradingResults");
	localStorage.removeItem("currentTestSession");
}
function loadFromLegacyFormat(stableRouterData, callbacks) {
	const {
		setData,
		setUserAnswers,
		setGradingResults,
		setRouterData,
		setIsLoading,
		fetchCompletedRef,
	} = callbacks;
	if (
		!(
			stableRouterData.teamsAssign === "1" || stableRouterData.teamsAssign === 1
		)
	) {
		return false;
	}
	const assignmentId = stableRouterData.assignmentId;
	const storedQuestions = localStorage.getItem("testQuestions");
	const answersKey = assignmentId
		? `assignment_${assignmentId}_answers`
		: "testUserAnswers";
	const gradesKey = assignmentId
		? `assignment_${assignmentId}_grading`
		: "testGradingResults";
	if (!storedQuestions) {
		return false;
	}
	try {
		const questions = JSON.parse(storedQuestions);
		const answersStr = localStorage.getItem(answersKey);
		const answers = answersStr ? JSON.parse(answersStr) : {};
		const gradingStr = localStorage.getItem(gradesKey);
		const grading = gradingStr ? JSON.parse(gradingStr) : {};
		if (hasInvalidQuestions(questions)) {
			clearLegacyLocalStorage(answersKey, gradesKey);
			return false;
		}
		setData((0, normalize_1.normalizeQuestionsFull)(questions));
		setUserAnswers(answers);
		setGradingResults(grading);
		setRouterData(
			__assign(__assign({}, stableRouterData), {
				eventName: stableRouterData.eventName || "Assignment",
				timeLimit: stableRouterData.timeLimit || "60",
				assignmentMode: true,
			}),
		);
		setIsLoading(false);
		fetchCompletedRef.current = true;
		return true;
	} catch (_a) {
		return false;
	}
}
function loadFromNewFormat(assignmentId, stableRouterData, callbacks) {
	const {
		setData,
		setUserAnswers,
		setRouterData,
		setIsLoading,
		setTimeLeft,
		setIsSubmitted,
		fetchCompletedRef,
	} = callbacks;
	const assignmentKey = `assignment_${assignmentId}`;
	const storedQuestions = localStorage.getItem(`${assignmentKey}_questions`);
	const storedAnswers = localStorage.getItem(`${assignmentKey}_answers`);
	const storedSession = localStorage.getItem(`${assignmentKey}_session`);
	if (!(storedQuestions && storedAnswers)) {
		return false;
	}
	try {
		const questions = JSON.parse(storedQuestions);
		const answers = JSON.parse(storedAnswers);
		const session = storedSession ? JSON.parse(storedSession) : null;
		if (hasInvalidQuestions(questions)) {
			clearNewLocalStorage(assignmentKey);
			return false;
		}
		setData((0, normalize_1.normalizeQuestionsFull)(questions));
		setUserAnswers(answers);
		if (session) {
			setIsSubmitted(session.isSubmitted);
			if (session.timeLeft !== undefined) {
				setTimeLeft(session.timeLeft);
			}
		}
		setRouterData(
			__assign(__assign({}, stableRouterData), {
				eventName:
					(session === null || session === void 0
						? void 0
						: session.eventName) || "Assignment",
				timeLimit:
					(session === null || session === void 0
						? void 0
						: session.timeLimit) || "60",
				assignmentMode: true,
			}),
		);
		setIsLoading(false);
		fetchCompletedRef.current = true;
		return true;
	} catch (_a) {
		return false;
	}
}
async function loadFromApi(assignmentId, stableRouterData, callbacks) {
	const { setData, setRouterData, setIsLoading, fetchCompletedRef } = callbacks;
	clearTestLocalStorage();
	const response = await fetch(`/api/assignments/${assignmentId}`);
	if (!response.ok) {
		return false;
	}
	const data = await response.json();
	const assignment = data.assignment;
	const questions = assignment.questions;
	const normalized = (0, normalize_1.normalizeQuestionsFull)(questions);
	const assignmentKey = `assignment_${assignmentId}`;
	setData(normalized);
	setRouterData(
		__assign(__assign({}, stableRouterData), {
			eventName: assignment.title,
			timeLimit: "60",
			assignmentMode: true,
		}),
	);
	localStorage.setItem(
		`${assignmentKey}_questions`,
		JSON.stringify(normalized),
	);
	localStorage.setItem(
		`${assignmentKey}_session`,
		JSON.stringify({
			eventName: assignment.title,
			timeLimit: "60",
			assignmentMode: true,
			isSubmitted: false,
			timeLeft: 60 * 60,
		}),
	);
	setIsLoading(false);
	fetchCompletedRef.current = true;
	logger_1.default.log("loaded assignment questions", {
		count: normalized.length,
	});
	return true;
}
async function loadAssignment(stableRouterData, callbacks) {
	const {
		setUserAnswers,
		setGradingResults,
		setIsSubmitted,
		setFetchError,
		setIsLoading,
		fetchCompletedRef,
	} = callbacks;
	try {
		const assignmentId = stableRouterData.assignmentId;
		// Try loading from legacy format first
		if (loadFromLegacyFormat(stableRouterData, callbacks)) {
			return;
		}
		// Try loading from new format
		if (
			assignmentId &&
			loadFromNewFormat(assignmentId, stableRouterData, callbacks)
		) {
			return;
		}
		// Fall back to API
		if (assignmentId) {
			setIsSubmitted(false);
			setUserAnswers({});
			setGradingResults({});
			if (await loadFromApi(assignmentId, stableRouterData, callbacks)) {
				return;
			}
		}
	} catch (_error) {
		setFetchError("Failed to load assignment");
		setIsLoading(false);
		fetchCompletedRef.current = true;
	}
}
function loadViewResultsData(stableRouterData, callbacks) {
	const {
		setData,
		setUserAnswers,
		setGradingResults,
		setIsLoading,
		fetchCompletedRef,
	} = callbacks;
	if (stableRouterData.viewResults === "true") {
		const assignmentKey = `assignment_${stableRouterData.assignmentId}`;
		const storedQuestions = localStorage.getItem(`${assignmentKey}_questions`);
		const storedAnswers = localStorage.getItem(`${assignmentKey}_answers`);
		const storedGrading = localStorage.getItem(`${assignmentKey}_grading`);
		if (storedQuestions) {
			try {
				const parsedQuestions = JSON.parse(storedQuestions);
				if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
					validateAssignmentQuestions(parsedQuestions);
					setData(parsedQuestions);
					setIsLoading(false);
					fetchCompletedRef.current = true;
				}
			} catch (error) {
				if (
					error instanceof Error &&
					error.message.includes("Assignment question")
				) {
					localStorage.removeItem(`${assignmentKey}_questions`);
					localStorage.removeItem(`${assignmentKey}_answers`);
					localStorage.removeItem(`${assignmentKey}_grading`);
				}
			}
		}
		if (storedAnswers) {
			try {
				const parsedAnswers = JSON.parse(storedAnswers);
				setUserAnswers(parsedAnswers);
			} catch (_error) {
				// Ignore errors
			}
		}
		if (storedGrading) {
			try {
				const parsedGrading = JSON.parse(storedGrading);
				setGradingResults(parsedGrading);
			} catch (_error) {
				// Ignore errors
			}
		}
	}
}
