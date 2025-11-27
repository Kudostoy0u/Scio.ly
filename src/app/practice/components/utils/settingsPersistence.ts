import type { Event, Settings } from "@/app/practice/types";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";

export function persistDivisionAndTypes(selectedEvent: Event | null, settings: Settings): void {
  if (!selectedEvent || selectedEvent.name !== "Codebusters") {
    const availableDivisions = selectedEvent?.divisions || ["B", "C"];
    const canShowB = availableDivisions.includes("B");
    const canShowC = availableDivisions.includes("C");
    const normalizedDivision =
      settings.division === "any"
        ? canShowB && canShowC
          ? "any"
          : canShowC
            ? "C"
            : "B"
        : settings.division === "B" && !canShowB
          ? "C"
          : settings.division === "C" && !canShowC
            ? "B"
            : settings.division;

    SyncLocalStorage.setItem("defaultDivision", normalizedDivision);

    const normalizedTypes = ["multiple-choice", "both", "free-response"].includes(settings.types)
      ? settings.types
      : "multiple-choice";
    SyncLocalStorage.setItem("defaultQuestionTypes", normalizedTypes);
  }
}
