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
exports.handleTestSubmission = handleTestSubmission;
const metrics_1 = require("@/app/utils/metrics");
const questionUtils_1 = require("@/app/utils/questionUtils");
const timeManagement_1 = require("@/app/utils/timeManagement");
const supabase_1 = require("@/lib/supabase");
const logger_1 = require("@/lib/utils/logger");
function markTestAsSubmittedInSession(routerData) {
	try {
		const session = (0, timeManagement_1.getCurrentTestSession)();
		if (session && !session.isSubmitted) {
			(0, timeManagement_1.markTestSubmitted)();
		} else if (!session) {
			(0, timeManagement_1.initializeTestSession)(
				routerData.eventName || "Unknown Event",
				Number.parseInt(routerData.timeLimit || "30"),
				false,
			);
			(0, timeManagement_1.markTestSubmitted)();
		}
		localStorage.setItem("testSubmitted", "true");
	} catch (_a) {
		// Ignore errors
	}
}
async function gradeFrqQuestions(
	frqsToGrade,
	finalGradingResults,
	setGradingResults,
	setGradingFrQs,
) {
	if (frqsToGrade.length === 0) {
		return;
	}
	for (const item of frqsToGrade) {
		setGradingFrQs((prev) =>
			__assign(__assign({}, prev), { [item.index]: true }),
		);
	}
	const online = typeof navigator !== "undefined" ? navigator.onLine : true;
	const { gradeFrqBatch } = await Promise.resolve().then(() =>
		require("../hooks/utils/grading"),
	);
	const scores = await gradeFrqBatch(frqsToGrade, online);
	for (const [idx, score] of scores.entries()) {
		const frqItem = frqsToGrade[idx];
		if (!frqItem) {
			continue;
		}
		const questionIndex = frqItem.index;
		finalGradingResults[questionIndex] = score;
		setGradingResults(
			__assign(__assign({}, finalGradingResults), { [questionIndex]: score }),
		);
		setGradingFrQs((prev) =>
			__assign(__assign({}, prev), { [questionIndex]: false }),
		);
	}
}
function validateMcqScores(data, userAnswers, finalGradingResults) {
	const validatedGrading = __assign({}, finalGradingResults);
	for (const [index, question] of data.entries()) {
		if (question.options && question.options.length > 0) {
			const answer = userAnswers[index] || [];
			const storedScore = validatedGrading[index];
			const computedScore = (0, questionUtils_1.calculateMCQScore)(
				question,
				answer,
			);
			if (
				storedScore === undefined ||
				Math.abs(storedScore - computedScore) > 0.01
			) {
				validatedGrading[index] = computedScore;
				if (storedScore !== undefined) {
					logger_1.default.warn(
						`Corrected score for question ${index} on submit: ${storedScore} -> ${computedScore}`,
					);
				}
			}
		}
	}
	return validatedGrading;
}
function persistGradingResults(validatedGrading, routerData) {
	try {
		(0, timeManagement_1.markTestSubmitted)();
		const hasCurrentAssignmentId = !!localStorage.getItem(
			"currentAssignmentId",
		);
		const isAssignmentMode = !!(
			routerData.assignmentId ||
			((routerData.teamsAssign === "1" || routerData.teamsAssign === 1) &&
				hasCurrentAssignmentId)
		);
		if (isAssignmentMode && routerData.assignmentId) {
			const assignmentKey = `assignment_${routerData.assignmentId}`;
			localStorage.setItem(
				`${assignmentKey}_grading`,
				JSON.stringify(validatedGrading),
			);
			localStorage.setItem(
				`${assignmentKey}_session`,
				JSON.stringify(
					__assign(
						__assign(
							{},
							JSON.parse(
								localStorage.getItem(`${assignmentKey}_session`) || "{}",
							),
						),
						{ isSubmitted: true },
					),
				),
			);
		} else {
			localStorage.setItem(
				"testGradingResults",
				JSON.stringify(validatedGrading),
			);
		}
		localStorage.removeItem("testFromBookmarks");
	} catch (_a) {
		// Ignore errors
	}
}
async function updateUserMetrics(routerData, mcqTotal, mcqScore) {
	if (!routerData.eventName) {
		return;
	}
	const {
		data: { user },
	} = await supabase_1.supabase.auth.getUser();
	(0, metrics_1.updateMetrics)(
		(user === null || user === void 0 ? void 0 : user.id) || null,
		{
			questionsAttempted: mcqTotal,
			correctAnswers: Math.round(mcqScore),
			eventName: routerData.eventName,
		},
	);
}
async function handleTestSubmission(
	data,
	userAnswers,
	gradingResults,
	routerData,
	timeLeft,
	callbacks,
) {
	let _a;
	const { setIsSubmitted, setGradingResults, setGradingFrQs } = callbacks;
	setIsSubmitted(true);
	markTestAsSubmittedInSession(routerData);
	window.scrollTo({ top: 0, behavior: "smooth" });
	const { computeMcqTotals } = await Promise.resolve().then(() =>
		require("../hooks/utils/submission"),
	);
	const { mcqTotal, mcqScore, frqsToGrade, newGrading } = computeMcqTotals(
		data,
		userAnswers,
		gradingResults,
		!!routerData.assignmentMode,
	);
	setGradingResults(newGrading);
	const finalGradingResults = __assign({}, newGrading);
	await gradeFrqQuestions(
		frqsToGrade,
		finalGradingResults,
		setGradingResults,
		setGradingFrQs,
	);
	const validatedGrading = validateMcqScores(
		data,
		userAnswers,
		finalGradingResults,
	);
	setGradingResults(validatedGrading);
	persistGradingResults(validatedGrading, routerData);
	await updateUserMetrics(routerData, mcqTotal, mcqScore);
	const {
		data: { user },
	} = await supabase_1.supabase.auth.getUser();
	await submitAssignment(
		data,
		userAnswers,
		routerData,
		timeLeft,
		mcqScore,
		mcqTotal,
		(user === null || user === void 0 ? void 0 : user.id) || null,
		((_a = user === null || user === void 0 ? void 0 : user.user_metadata) ===
			null || _a === void 0
			? void 0
			: _a.name) ||
			(user === null || user === void 0 ? void 0 : user.email) ||
			"",
	);
}
function formatAnswersForSubmission(data, userAnswers) {
	const formattedAnswers = {};
	for (const [index, question] of data.entries()) {
		const answer = userAnswers[index];
		if (answer !== null && answer !== undefined && question.id) {
			formattedAnswers[question.id] = answer;
		}
	}
	return formattedAnswers;
}
async function handleEnhancedAssignmentSubmission(
	assignmentId,
	formattedAnswers,
	routerData,
	timeLeft,
	mcqScore,
	mcqTotal,
) {
	try {
		const res = await fetch(`/api/assignments/${assignmentId}/submit`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				answers: formattedAnswers,
				score: mcqScore,
				totalPoints: mcqTotal,
				timeSpent: routerData.timeLimit
					? Number.parseInt(routerData.timeLimit) * 60 - (timeLeft || 0)
					: 0,
				submittedAt: new Date().toISOString(),
			}),
		});
		if (res.ok) {
			try {
				(
					await Promise.resolve().then(() => require("react-toastify"))
				).toast.success("Assignment submitted successfully!");
				const url = new URL(window.location.href);
				url.searchParams.delete("assignment");
				window.history.replaceState({}, "", url.pathname + url.search);
			} catch (_a) {
				// Ignore errors
			}
		} else {
			try {
				const j = await res.json().catch(() => null);
				const msg =
					(j === null || j === void 0 ? void 0 : j.error) ||
					"Failed to submit assignment";
				(
					await Promise.resolve().then(() => require("react-toastify"))
				).toast.error(msg);
			} catch (_b) {
				// Ignore errors
			}
		}
	} catch (_error) {
		try {
			(
				await Promise.resolve().then(() => require("react-toastify"))
			).toast.error("Failed to submit assignment");
		} catch (_c) {
			// Ignore errors
		}
	}
}
async function validateLegacyAssignmentId(assignmentIdStr) {
	const assignmentId = Number(assignmentIdStr);
	if (!assignmentId || Number.isNaN(assignmentId)) {
		localStorage.removeItem("currentAssignmentId");
		try {
			(
				await Promise.resolve().then(() => require("react-toastify"))
			).toast.error(
				"Invalid assignment ID detected. Test submitted as practice mode.",
			);
		} catch (_a) {
			// Ignore errors
		}
		return null;
	}
	return assignmentId;
}
async function submitLegacyAssignment(
	assignmentId,
	userId,
	userName,
	routerData,
	mcqScore,
	mcqTotal,
) {
	try {
		const res = await fetch("/api/assignments/submit", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				assignmentId: String(assignmentId),
				userId,
				name: userName,
				eventName: routerData.eventName,
				score: mcqScore,
				detail: { total: mcqTotal },
			}),
		});
		if (res.ok) {
			try {
				const selStr = localStorage.getItem("teamsSelection") || "";
				const sel = selStr ? JSON.parse(selStr) : null;
				const teamName = (sel === null || sel === void 0 ? void 0 : sel.school)
					? `${sel.school} ${sel.division || ""}`.trim()
					: null;
				if (teamName) {
					(
						await Promise.resolve().then(() => require("react-toastify"))
					).toast.success(`Sent results to ${teamName}!`);
				}
			} catch (_a) {
				// Ignore errors
			}
		} else {
			try {
				const j = await res.json().catch(() => null);
				const msg =
					(j === null || j === void 0 ? void 0 : j.error) ||
					"Failed to submit results";
				(
					await Promise.resolve().then(() => require("react-toastify"))
				).toast.error(msg);
			} catch (_b) {
				// Ignore errors
			}
		}
		localStorage.removeItem("currentAssignmentId");
	} catch (_c) {
		// Ignore errors
	}
}
async function submitAssignment(
	data,
	userAnswers,
	routerData,
	timeLeft,
	mcqScore,
	mcqTotal,
	userId,
	userName,
) {
	if (routerData.assignmentId) {
		const formattedAnswers = formatAnswersForSubmission(data, userAnswers);
		await handleEnhancedAssignmentSubmission(
			routerData.assignmentId,
			formattedAnswers,
			routerData,
			timeLeft,
			mcqScore,
			mcqTotal,
		);
		return;
	}
	const isLegacyAssignmentMode =
		routerData.teamsAssign === "1" || routerData.teamsAssign === 1;
	if (!isLegacyAssignmentMode) {
		return;
	}
	const assignmentIdStr = localStorage.getItem("currentAssignmentId");
	if (!assignmentIdStr) {
		return;
	}
	const assignmentId = await validateLegacyAssignmentId(assignmentIdStr);
	if (assignmentId === null) {
		return;
	}
	await submitLegacyAssignment(
		assignmentIdStr,
		userId,
		userName,
		routerData,
		mcqScore,
		mcqTotal,
	);
}
