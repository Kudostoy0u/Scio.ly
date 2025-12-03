import type { Settings } from "@/app/practice/types";
import { buildTestParams, saveTestParams } from "@/app/utils/testParams";
import { clearTestSession } from "@/app/utils/timeManagement";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";

export function proceedWithTest(
  selectedEventName: string,
  settings: Settings,
  push: (url: string) => void
) {
  clearTestSession();
  try {
    clearTestSession();
  } catch {
    // Ignore clearTestSession errors
  }
  const testParams = buildTestParams(selectedEventName, settings);
  saveTestParams(testParams);
  if (selectedEventName === "Codebusters") {
    try {
      SyncLocalStorage.removeItem("codebustersQuotes");
      SyncLocalStorage.removeItem("codebustersIsTestSubmitted");
      SyncLocalStorage.removeItem("codebustersTestScore");
      SyncLocalStorage.removeItem("codebustersTimeLeft");
      SyncLocalStorage.removeItem("codebustersQuotesLoadedFromStorage");
      SyncLocalStorage.removeItem("shareCode");
    } catch {
      // Ignore localStorage errors
    }
    push("/codebusters");
  } else {
    try {
      SyncLocalStorage.removeItem("testGradingResults");
      SyncLocalStorage.removeItem("testSubmitted");
    } catch {
      // Ignore localStorage errors
    }
    push("/test");
  }
}

export function proceedWithUnlimited(
  selectedEventName: string,
  settings: Settings,
  push: (url: string) => void
) {
  try {
    const cookiePayload = encodeURIComponent(
      JSON.stringify({
        eventName: selectedEventName,
        types: settings.types,
        division: settings.division,
        difficulties: settings.difficulties,
        subtopics: settings.subtopics,
        idPercentage: settings.idPercentage,
        pureIdOnly: settings.pureIdOnly,
        rmTypeFilter: settings.rmTypeFilter,
      })
    );
    document.cookie = `scio_unlimited_params=${cookiePayload}; Path=/; Max-Age=600; SameSite=Lax`;
  } catch {
    // Ignore cookie errors
  }
  if (selectedEventName === "Codebusters") {
    const cbParams = buildTestParams(selectedEventName, { ...settings, questionCount: 1 });
    saveTestParams(cbParams);
    try {
      SyncLocalStorage.removeItem("codebustersQuotes");
      SyncLocalStorage.removeItem("codebustersIsTestSubmitted");
      SyncLocalStorage.removeItem("codebustersTestScore");
      SyncLocalStorage.removeItem("codebustersTimeLeft");
      SyncLocalStorage.removeItem("codebustersQuotesLoadedFromStorage");
      SyncLocalStorage.removeItem("shareCode");
    } catch {
      // Ignore localStorage errors
    }
    push("/codebusters");
    return;
  }
  push("/unlimited");
}
