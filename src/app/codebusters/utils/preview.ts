import SyncLocalStorage from "@/lib/database/localStorageReplacement";
export function clearPreviewLocalStorage(): void {
	const keys = [
		"codebustersQuotes",
		"codebustersQuoteIndices",
		"codebustersQuoteUUIDs",
		"codebustersShareData",
		"codebustersIsTestSubmitted",
		"codebustersTestScore",
		"codebustersTimeLeft",
		"codebustersRevealedLetters",
		"codebustersHintedLetters",
		"codebustersHintCounts",
		"codebustersQuotesLoadedFromStorage",
	];
	try {
		for (const key of keys) {
			SyncLocalStorage.removeItem(key);
		}
		SyncLocalStorage.setItem("codebustersForceRefresh", "true");
	} catch {
		// Ignore errors when clearing localStorage
	}
}
