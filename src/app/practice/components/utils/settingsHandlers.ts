import type { Event, Settings } from "@/app/practice/types";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import type React from "react";
import { toast } from "react-toastify";

export function createSettingsChangeHandler(
  selectedEvent: Event | null,
  settings: Settings,
  onSettingsChange: (settings: Settings) => void
) {
  return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;

    if (id === "questionCount") {
      const questionCount = Number.parseInt(value);
      if (questionCount > 200) {
        toast.warning("You cannot select more than 200 questions");
        return;
      }
      if (questionCount < 1) {
        onSettingsChange({ ...settings, questionCount: 1 });
        saveQuestionCount(selectedEvent, 1);
        return;
      }
      onSettingsChange({ ...settings, questionCount });
      saveQuestionCount(selectedEvent, questionCount);
    } else if (id === "timeLimit") {
      const timeLimit = Number.parseInt(value);
      if (timeLimit < 1) {
        onSettingsChange({ ...settings, timeLimit: 1 });
        saveTimeLimit(selectedEvent, 1);
      } else if (timeLimit > 120) {
        onSettingsChange({ ...settings, timeLimit: 120 });
        saveTimeLimit(selectedEvent, 120);
      } else {
        onSettingsChange({ ...settings, timeLimit });
        saveTimeLimit(selectedEvent, timeLimit);
      }
    } else {
      onSettingsChange({
        ...settings,
        [id]: value,
      });
    }
  };
}

function saveQuestionCount(selectedEvent: Event | null, questionCount: number): void {
  if (!selectedEvent || selectedEvent.name !== "Codebusters") {
    SyncLocalStorage.setItem("defaultQuestionCount", questionCount.toString());
  } else {
    SyncLocalStorage.setItem("codebustersQuestionCount", questionCount.toString());
  }
}

function saveTimeLimit(selectedEvent: Event | null, timeLimit: number): void {
  if (!selectedEvent || selectedEvent.name !== "Codebusters") {
    SyncLocalStorage.setItem("defaultTimeLimit", timeLimit.toString());
  } else {
    SyncLocalStorage.setItem("codebustersTimeLimit", timeLimit.toString());
  }
}

export function validateTimeLimit(
  settings: Settings,
  onSettingsChange: (settings: Settings) => void
): void {
  if (settings.timeLimit < 1) {
    onSettingsChange({ ...settings, timeLimit: 1 });
  } else if (settings.timeLimit > 120) {
    onSettingsChange({ ...settings, timeLimit: 120 });
  }
}

export function saveQuestionTypes(selectedEvent: Event | null, types: string): void {
  if (!selectedEvent || selectedEvent.name !== "Codebusters") {
    SyncLocalStorage.setItem("defaultQuestionTypes", types);
  }
}

export function saveIdPercentage(percentage: number): void {
  if (typeof window !== "undefined") {
    SyncLocalStorage.setItem("defaultIdPercentage", percentage.toString());
  }
}

export function savePureIdOnly(pureIdOnly: boolean): void {
  if (typeof window !== "undefined") {
    SyncLocalStorage.setItem("defaultPureIdOnly", pureIdOnly ? "true" : "false");
  }
}

export function saveCharLengthRange(min: number, max: number): void {
  if (typeof window !== "undefined") {
    SyncLocalStorage.setItem("codebustersCharLengthMin", min.toString());
    SyncLocalStorage.setItem("codebustersCharLengthMax", max.toString());
  }
}

export function saveRmTypeFilter(rmType: "rock" | "mineral" | undefined): void {
  if (typeof window !== "undefined") {
    if (rmType) {
      SyncLocalStorage.setItem("rocksRmTypeFilter", rmType);
    } else {
      SyncLocalStorage.removeItem("rocksRmTypeFilter");
    }
  }
}
