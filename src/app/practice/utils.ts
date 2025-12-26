import SyncLocalStorage from "@/lib/database/localStorageReplacement";
// localstorage keys for different event types
export const NORMAL_EVENT_PREFERENCES = "scio_normal_event_preferences";
export const CODEBUSTERS_PREFERENCES = "scio_codebusters_preferences";

export const NORMAL_DEFAULTS = {
	questionCount: 10,
	timeLimit: 15,
};

export const savePreferences = (
	eventName: string,
	questionCount: number,
	timeLimit: number,
) => {
	const isCodebusters = eventName === "Codebusters";
	const key = isCodebusters
		? CODEBUSTERS_PREFERENCES
		: NORMAL_EVENT_PREFERENCES;
	const preferences = { questionCount, timeLimit };
	SyncLocalStorage.setItem(key, JSON.stringify(preferences));
};
