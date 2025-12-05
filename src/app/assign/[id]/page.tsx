"use client";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import logger from "@/lib/utils/logger";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

type AssignmentQuestion = Record<string, unknown>;

interface AssignmentRow {
	event_name?: string;
	params?: Record<string, unknown>;
	questions?: AssignmentQuestion[];
	school?: string;
	division?: string;
	team_id?: string;
}

const setTeamsSelection = (row: AssignmentRow) => {
	try {
		const sel = { school: row.school, division: row.division, captain: false };
		SyncLocalStorage.setItem("teamsSelection", JSON.stringify(sel));
		logger.log("[assign] set teamsSelection", sel);
	} catch {
		// Ignore localStorage errors
	}
};

const seedCodebustersQuestions = (questions: AssignmentQuestion[]) => {
	logger.log("[assign] seeding codebusters quotes", {
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
	logger.log("[assign] seeding test questions", { count: questions.length });
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

const seedQuestions = (
	eventName: string | undefined,
	questions: AssignmentQuestion[],
) => {
	if (eventName === "Codebusters") {
		seedCodebustersQuestions(questions);
	} else {
		seedTestQuestions(questions);
	}
};

const setupLocalStorage = (
	idStr: string,
	eventName: string | undefined,
	paramsObj: Record<string, unknown>,
	row: AssignmentRow,
) => {
	try {
		SyncLocalStorage.setItem("currentAssignmentId", String(idStr));
		SyncLocalStorage.setItem(
			"testParams",
			JSON.stringify({ ...paramsObj, eventName }),
		);
		document.cookie = `scio_test_params=${encodeURIComponent(JSON.stringify({ ...paramsObj, eventName }))}; Path=/; Max-Age=600; SameSite=Lax`;
		setTeamsSelection(row);
		const questions = Array.isArray(row?.questions) ? row.questions : [];
		seedQuestions(eventName, questions);
	} catch {
		// Ignore errors during question seeding
	}
};

const buildRedirectUrl = (
	row: AssignmentRow,
	eventName: string | undefined,
) => {
	const isCodebusters = eventName === "Codebusters";
	const route = isCodebusters ? "/codebusters" : "/test";
	const sp = new URLSearchParams();
	sp.set("teamsAssign", "1");
	if (row.team_id) {
		sp.set("team", row.team_id);
	}
	if (row.school) {
		sp.set("school", row.school);
	}
	if (row.division) {
		sp.set("division", row.division);
	}
	return `${route}?${sp.toString()}`;
};

// Helper function to fetch assignment data
async function fetchAssignment(idStr: string): Promise<AssignmentRow | null> {
	try {
		logger.log("[assign] fetching assignment", { idStr });
		const res = await fetch(
			`/api/assignments?id=${encodeURIComponent(idStr)}`,
			{
				cache: "no-store",
			},
		);
		const j = await res.json();
		logger.log("[assign] api response", {
			ok: res.ok,
			status: res.status,
			data: j?.data,
		});
		return (j?.data as AssignmentRow | undefined) || null;
	} catch {
		return null;
	}
}

// Helper function to process assignment and redirect
function processAssignment(
	idStr: string,
	row: AssignmentRow,
	router: ReturnType<typeof useRouter>,
): void {
	const eventName = row?.event_name;
	const paramsObj = row?.params || {};
	setupLocalStorage(idStr, eventName, paramsObj, row);
	const target = buildRedirectUrl(row, eventName);
	logger.log("[assign] redirecting to", target);
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

			const row = await fetchAssignment(idStr);
			if (!row) {
				logger.warn("[assign] missing assignment");
				router.replace("/assign/error");
				return;
			}

			try {
				processAssignment(idStr, row, router);
			} catch {
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
