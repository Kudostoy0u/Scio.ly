import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import logger from "@/lib/utils/logging/logger";

export type ContinueInfo = {
	eventName: string;
	route: "/test" | "/codebusters";
	label: string;
} | null;

export function computeContinueInfo(): ContinueInfo {
	if (typeof window === "undefined") {
		return null;
	}
	try {
		const sessionStr = SyncLocalStorage.getItem("currentTestSession");
		// Read submission flags up front for both test types
		const testSubmitted = SyncLocalStorage.getItem("testSubmitted") === "true";
		const cbSubmitted =
			SyncLocalStorage.getItem("codebustersIsTestSubmitted") === "true";
		const session = sessionStr
			? (JSON.parse(sessionStr) as {
					eventName?: string;
					isSubmitted?: boolean;
				})
			: null;
		if (session?.eventName) {
			const route: "/test" | "/codebusters" =
				session.eventName === "Codebusters" ? "/codebusters" : "/test";
			// Use the correct submitted flag based on the active event
			const eventSubmitted =
				session.eventName === "Codebusters" ? cbSubmitted : testSubmitted;
			const label =
				session.isSubmitted || eventSubmitted
					? `View results for ${session.eventName}?`
					: `Continue test for ${session.eventName}?`;
			return { eventName: session.eventName, route, label };
		}
		const testAnswersStr = SyncLocalStorage.getItem("testUserAnswers");
		const testAnswers = testAnswersStr
			? (JSON.parse(testAnswersStr) as Record<string, (string | null)[]>)
			: null;
		const hasGeneralProgress =
			!testSubmitted &&
			!!testAnswers &&
			Object.values(testAnswers).some((arr) =>
				Array.isArray(arr)
					? arr.some((v) => v && String(v).length > 0)
					: !!testAnswersStr,
			);
		const cbQuotesStr = SyncLocalStorage.getItem("codebustersQuotes");
		let hasCodebustersProgress = false;
		if (!cbSubmitted && cbQuotesStr) {
			try {
				const quotes = JSON.parse(cbQuotesStr) as Array<{
					solution?: Record<number, string>;
					hillSolution?: { plaintext?: Record<number, string> };
					nihilistSolution?: Record<number, string>;
					fractionatedSolution?: Record<number, string>;
					columnarSolution?: Record<number, string>;
					xenocryptSolution?: Record<number, string>;
					frequencyNotes?: Record<number, string>;
				}>;
				hasCodebustersProgress =
					Array.isArray(quotes) &&
					quotes.some((q) => {
						const hasSolution = !!(
							q?.solution &&
							Object.values(q.solution).some(
								(v) => typeof v === "string" && v.length > 0,
							)
						);
						const hasHill = !!(
							q?.hillSolution?.plaintext &&
							Object.values(q.hillSolution.plaintext).some(
								(v) => typeof v === "string" && v.length > 0,
							)
						);
						const hasNihilist = !!(
							q?.nihilistSolution &&
							Object.values(q.nihilistSolution).some(
								(v) => typeof v === "string" && v.length > 0,
							)
						);
						const hasFractionated = !!(
							q?.fractionatedSolution &&
							Object.values(q.fractionatedSolution).some(
								(v) => typeof v === "string" && v.length > 0,
							)
						);
						const hasColumnar = !!(
							q?.columnarSolution &&
							Object.values(q.columnarSolution).some(
								(v) => typeof v === "string" && v.length > 0,
							)
						);
						const hasXeno = !!(
							q?.xenocryptSolution &&
							Object.values(q.xenocryptSolution).some(
								(v) => typeof v === "string" && v.length > 0,
							)
						);
						const hasNotes = !!(
							q?.frequencyNotes &&
							Object.values(q.frequencyNotes).some(
								(v) => typeof v === "string" && v.length > 0,
							)
						);
						return (
							hasSolution ||
							hasHill ||
							hasNihilist ||
							hasFractionated ||
							hasColumnar ||
							hasXeno ||
							hasNotes
						);
					});
			} catch {
				// Ignore errors when checking progress
			}
		}
		if (hasGeneralProgress || testSubmitted) {
			const params = SyncLocalStorage.getItem("testParams");
			const eventName = (() => {
				try {
					const p = params ? JSON.parse(params) : undefined;
					return (p?.eventName as string | undefined) || "Practice Test";
				} catch {
					return "Practice Test";
				}
			})();
			const label = testSubmitted
				? `View results for ${eventName}?`
				: `Continue test for ${eventName}?`;
			return { eventName, route: "/test", label };
		}
		if (hasCodebustersProgress || cbSubmitted) {
			const label = cbSubmitted
				? "View results for Codebusters?"
				: "Continue test for Codebusters?";
			return { eventName: "Codebusters", route: "/codebusters", label };
		}
		return null;
	} catch (e) {
		logger.error("Error checking for continue info:", e);
		return null;
	}
}
