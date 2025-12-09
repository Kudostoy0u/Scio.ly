import api from "@/app/api";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import logger from "@/lib/utils/logging/logger";
import { toast } from "react-toastify";
import { clearTestSession, initializeTestSession } from "./timeManagement";

export interface QuoteData {
	author: string;
	quote: string;
	encrypted: string;
	cipherType:
		| "Random Aristocrat"
		| "K1 Aristocrat"
		| "K2 Aristocrat"
		| "K3 Aristocrat"
		| "Random Patristocrat"
		| "K1 Patristocrat"
		| "K2 Patristocrat"
		| "K3 Patristocrat"
		| "Caesar"
		| "Atbash"
		| "Affine"
		| "Hill 2x2"
		| "Hill 3x3"
		| "Baconian"
		| "Porta"
		| "Nihilist"
		| "Fractionated Morse"
		| "Complete Columnar"
		| "Xenocrypt"
		| "Checkerboard";
	key?: string;
	matrix?: number[][];
	portaKeyword?: string;
	nihilistKey?: string;
	columnarKey?: string;
	fractionatedKey?: string;
	fractionationTable?: { [key: string]: string };
	xenocryptKey?: string;
	caesarShift?: number;
	affineA?: number;
	affineB?: number;
	solution?: { [key: string]: string };
	frequencyNotes?: { [key: string]: string };
	hillSolution?: {
		matrix: string[][];
		plaintext: { [key: number]: string };
	};
	nihilistSolution?: { [key: number]: string };
	fractionatedSolution?: { [key: number]: string };
	columnarSolution?: { [key: number]: string };
	xenocryptSolution?: { [key: number]: string };
	difficulty?: number;
}

export interface ShareCodeResult {
	success: boolean;
	eventName?: string;
	testParams?: Record<string, unknown>;
	questions?: Record<string, unknown>[];
	encryptedQuotes?: QuoteData[];
	adjustedTimeRemaining?: number;
	createdAtMs?: number;
	error?: string;
}

export const loadSharedTestCode = async (
	code: string,
): Promise<ShareCodeResult> => {
	try {
		let response = await fetch(`${api.codebustersShare}?code=${code}`);

		if (response.ok) {
			const data = await response.json();
			logger.log("🔍 Codebusters API Response:", data);

			if (
				data.success &&
				data.data &&
				data.data.quotes &&
				data.data.testParams
			) {
				logger.log(
					"🔍 Successfully got encrypted quotes from codebusters endpoint:",
					data.data.quotes.length,
					"quotes",
				);

				SyncLocalStorage.setItem(
					"testParams",
					JSON.stringify(data.data.testParams),
				);

				return {
					success: true,
					eventName: "Codebusters",
					testParams: data.data.testParams,
					encryptedQuotes: data.data.quotes,
					adjustedTimeRemaining: data.data.timeRemainingSeconds,
					createdAtMs: data.data.createdAtMs,
				};
			}
		}

		response = await fetch(`${api.share}?code=${code}`);

		if (response.ok) {
			const data = await response.json();
			logger.log("🔍 General API Response:", data);

			if (data.success && data.data && data.data.testParamsRaw) {
				const testParams = data.data.testParamsRaw;

				logger.log(
					"🔍 Processing regular test with eventName:",
					testParams.eventName,
				);

				SyncLocalStorage.setItem("testParams", JSON.stringify(testParams));

				const questionIds = data.data.questionIds || [];
				if (questionIds.length > 0) {
					try {
						logger.log("🔍 Fetching questions by IDs:", questionIds);
						const questionsResponse = await fetch(api.questionsBatch, {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
							},
							body: JSON.stringify({ ids: questionIds }),
						});
						if (questionsResponse.ok) {
							const questionsData = await questionsResponse.json();
							if (questionsData.success && questionsData.data) {
								logger.log(
									"🔍 Successfully fetched questions:",
									questionsData.data.length,
								);

								return {
									success: true,
									eventName: testParams.eventName,
									testParams: testParams,
									questions: questionsData.data,
									adjustedTimeRemaining: data.data.timeRemainingSeconds,
									createdAtMs: data.data.createdAtMs,
								};
							}
						}
					} catch (fetchError) {
						logger.error("Error fetching questions by IDs:", fetchError);
					}
				}

				return {
					success: true,
					eventName: testParams.eventName,
					testParams: testParams,
					questions: [],
					adjustedTimeRemaining: data.data.timeRemainingSeconds,
					createdAtMs: data.data.createdAtMs,
				};
			}
		}

		return {
			success: false,
			error: "Invalid or expired test code",
		};
	} catch (error) {
		logger.error("Error loading shared test code:", error);
		return {
			success: false,
			error: "Failed to load shared test code",
		};
	}
};

export const handleShareCodeRedirect = async (
	code: string,
): Promise<boolean> => {
	// 1. clear all relevant local storage to ensure a clean slate
	clearTestSession();
	SyncLocalStorage.removeItem("testQuestions");
	SyncLocalStorage.removeItem("testUserAnswers");
	SyncLocalStorage.removeItem("contestedQuestions");
	SyncLocalStorage.removeItem("testParams");
	SyncLocalStorage.removeItem("shareCode");
	SyncLocalStorage.removeItem("codebustersQuotes");
	SyncLocalStorage.removeItem("testSubmitted");
	SyncLocalStorage.removeItem("loaded");

	// 2. fetch the shared test data
	const result = await loadSharedTestCode(code);

	if (!(result.success && result.testParams)) {
		toast.error(
			result.error ||
				"Failed to load shared test. The code may be invalid or expired.",
		);
		return false;
	}

	// 3. copy the share code to clipboard and show success notification
	try {
		await navigator.clipboard.writeText(code);
		toast.success("Share code copied to clipboard!");
	} catch (error) {
		logger.error("Failed to copy share code to clipboard:", error);
	}

	// 4. set up local storage based on the test type
	SyncLocalStorage.setItem("testParams", JSON.stringify(result.testParams));
	try {
		const cookiePayload = encodeURIComponent(JSON.stringify(result.testParams));
		document.cookie = `scio_test_params=${cookiePayload}; Path=/; Max-Age=600; SameSite=Lax`;
	} catch {
		// Ignore cookie errors
	}

	// 5. initialize time management session
	const eventName = result.eventName || "Unknown Event";
	const timeLimit = Number.parseInt(
		(result.testParams.timeLimit as string) || "30",
	);
	const isSharedTest = true;
	const baseRemaining =
		typeof result.adjustedTimeRemaining === "number"
			? result.adjustedTimeRemaining
			: null;
	const createdAt =
		typeof result.createdAtMs === "number" ? result.createdAtMs : null;

	let sharedTimeRemaining: number | undefined;
	if (baseRemaining !== null && createdAt !== null) {
		const now = Date.now();
		const elapsedSeconds = Math.floor((now - createdAt) / 1000);
		sharedTimeRemaining = Math.max(0, baseRemaining - elapsedSeconds);
	} else if (baseRemaining !== null) {
		sharedTimeRemaining = baseRemaining;
	} else if (createdAt !== null) {
		const now = Date.now();
		const elapsedSeconds = Math.floor((now - createdAt) / 1000);
		sharedTimeRemaining = Math.max(0, timeLimit * 60 - elapsedSeconds);
	}

	initializeTestSession(
		eventName,
		timeLimit,
		isSharedTest,
		sharedTimeRemaining ?? undefined,
	);

	// 6. redirect to the correct page
	if (result.eventName === "Codebusters") {
		if (result.encryptedQuotes) {
			SyncLocalStorage.setItem(
				"codebustersQuotes",
				JSON.stringify(result.encryptedQuotes),
			);
		}

		window.location.href = "/codebusters";
	} else {
		if (result.questions && Array.isArray(result.questions)) {
			const questionsWithIndex = result.questions.map(
				(q: Record<string, unknown>, idx: number) => ({
					...q,
					originalIndex: idx,
				}),
			);
			SyncLocalStorage.setItem(
				"testQuestions",
				JSON.stringify(questionsWithIndex),
			);
		}
		SyncLocalStorage.setItem("loaded", "1");
		window.location.href = "/test";
	}

	return true;
};
