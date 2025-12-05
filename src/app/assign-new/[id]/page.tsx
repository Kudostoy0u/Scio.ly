"use client";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import logger from "@/lib/utils/logger";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

type AssignmentQuestion = Record<string, unknown>;

interface Assignment {
	event_name?: string;
	questions?: AssignmentQuestion[];
	school?: string;
	division?: string;
	team_id?: string;
}

const setTeamsSelection = (assignment: Assignment) => {
	try {
		const sel = {
			school: assignment.school,
			division: assignment.division,
			captain: false,
		};
		SyncLocalStorage.setItem("teamsSelection", JSON.stringify(sel));
		logger.log("[assign-new] set teamsSelection", sel);
	} catch {
		// Ignore localStorage errors
	}
};

const seedCodebustersQuestions = (questions: AssignmentQuestion[]) => {
	logger.log("[assign-new] seeding codebusters quotes", {
		count: questions.length,
	});
	try {
		SyncLocalStorage.setItem("codebustersQuotes", JSON.stringify(questions));
		SyncLocalStorage.setItem("codebustersQuotesLoadedFromStorage", "true");
		SyncLocalStorage.removeItem("codebustersIsTestSubmitted");
		SyncLocalStorage.removeItem("codebustersTestScore");
		SyncLocalStorage.removeItem("codebustersTimeLeft");
	} catch {
		// Ignore localStorage errors
	}
};

const seedTestQuestions = (questions: AssignmentQuestion[]) => {
	logger.log("[assign-new] seeding test questions", {
		count: questions.length,
	});
	try {
		const seeded = questions.map((q, idx) => ({
			...q,
			originalIndex: idx,
		}));
		SyncLocalStorage.setItem("testQuestions", JSON.stringify(seeded));
		SyncLocalStorage.removeItem("testUserAnswers");
		SyncLocalStorage.removeItem("testGradingResults");
	} catch {
		// Ignore localStorage errors
	}
};

const seedQuestions = (eventName: string, questions: AssignmentQuestion[]) => {
	if (eventName === "Codebusters") {
		seedCodebustersQuestions(questions);
	} else {
		seedTestQuestions(questions);
	}
};

const setupLocalStorage = (
	idStr: string,
	eventName: string,
	assignment: Assignment,
) => {
	try {
		SyncLocalStorage.setItem("currentAssignmentId", String(idStr));
		SyncLocalStorage.setItem("testParams", JSON.stringify({ eventName }));
		document.cookie = `scio_test_params=${encodeURIComponent(JSON.stringify({ eventName }))}; Path=/; Max-Age=600; SameSite=Lax`;
		setTeamsSelection(assignment);
		const questions = Array.isArray(assignment.questions)
			? assignment.questions
			: [];
		seedQuestions(eventName, questions);
	} catch {
		// Ignore errors during question seeding
	}
};

const buildRedirectUrl = (
	idStr: string,
	assignment: Assignment,
	eventName: string,
) => {
	const isCodebusters = eventName === "Codebusters";
	const route = isCodebusters ? "/codebusters" : "/test";
	const sp = new URLSearchParams();
	sp.set("teamsAssign", "1");
	sp.set("assignmentId", idStr);
	if (assignment.team_id) {
		sp.set("team", assignment.team_id);
	}
	if (assignment.school) {
		sp.set("school", assignment.school);
	}
	if (assignment.division) {
		sp.set("division", assignment.division);
	}
	return `${route}?${sp.toString()}`;
};

// Helper function to fetch assignment data
async function fetchAssignment(idStr: string): Promise<Assignment | null> {
	try {
		logger.log("[assign-new] fetching assignment", { idStr });
		const res = await fetch(`/api/assignments-new/${idStr}`, {
			cache: "no-store",
		});
		const j = await res.json();
		logger.log("[assign-new] api response", {
			ok: res.ok,
			status: res.status,
			data: j?.assignment,
		});
		return (j?.assignment as Assignment | undefined) || null;
	} catch (error) {
		logger.error("[assign-new] error:", error);
		return null;
	}
}

// Helper function to process assignment and redirect
function processAssignment(
	idStr: string,
	assignment: Assignment,
	router: ReturnType<typeof useRouter>,
): void {
	const eventName = assignment.event_name || "Assignment";
	setupLocalStorage(idStr, eventName, assignment);
	const target = buildRedirectUrl(idStr, assignment, eventName);
	logger.log("[assign-new] redirecting to", target);
	router.replace(target);
}

export default function Page() {
	const router = useRouter();
	const params = useParams<{ id: string }>();

	useEffect(() => {
		const go = async () => {
			const idStr = params?.id as string | undefined;
			if (!idStr) {
				return;
			}

			const assignment = await fetchAssignment(idStr);
			if (!assignment) {
				logger.warn("[assign-new] missing assignment");
				router.replace("/assign/error");
				return;
			}

			try {
				processAssignment(idStr, assignment, router);
			} catch (error) {
				logger.error("[assign-new] error:", error);
				router.replace("/assign/error");
			}
		};
		go();
	}, [params?.id, router]);

	return (
		<div className="min-h-screen flex items-center justify-center">
			Loading…
		</div>
	);
}
