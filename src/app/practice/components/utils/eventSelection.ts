import type { Event, Settings } from "@/app/practice/types";
import { NORMAL_DEFAULTS } from "@/app/practice/utils";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";

const PICTURE_QUESTION_EVENTS = [
  "Rocks and Minerals",
  "Entomology",
  "Anatomy - Nervous",
  "Anatomy - Endocrine",
  "Anatomy - Sense Organs",
  "Anatomy & Physiology",
  "Dynamic Planet",
  "Dynamic Planet - Oceanography",
  "Water Quality",
  "Water Quality - Freshwater",
  "Remote Sensing",
  "Circuit Lab",
  "Astronomy",
  "Designer Genes",
  "Forensics",
  "Meteorology",
  "Potions and Poisons",
  "Solar System",
];

const IDENTIFICATION_ONLY_EVENTS = [
  "Rocks and Minerals",
  "Entomology",
  "Water Quality - Freshwater",
  "Astronomy",
  "Potions and Poisons",
  "Solar System",
];

export function supportsPictureQuestions(eventName: string): boolean {
  const base = eventName.split(" - ")[0] || "";
  return PICTURE_QUESTION_EVENTS.includes(eventName) || PICTURE_QUESTION_EVENTS.includes(base);
}

export function supportsIdentificationOnly(eventName: string): boolean {
  return IDENTIFICATION_ONLY_EVENTS.includes(eventName);
}

function getDivisionForEvent(
  savedDivision: string,
  availableDivisions: string[]
): Settings["division"] {
  const canShowB = availableDivisions.includes("B");
  const canShowC = availableDivisions.includes("C");

  if (savedDivision === "any") {
    return canShowB && canShowC ? "any" : canShowC ? "C" : "B";
  }
  if (savedDivision === "B" && !canShowB) {
    return "C";
  }
  if (savedDivision === "C" && !canShowC) {
    return "B";
  }
  return savedDivision as Settings["division"];
}

function getStoredValue(key: string, defaultValue: string): string {
  if (typeof window === "undefined") {
    return defaultValue;
  }
  return SyncLocalStorage.getItem(key) || defaultValue;
}

function getStoredNumber(key: string, defaultValue: number): number {
  if (typeof window === "undefined") {
    return defaultValue;
  }
  const stored = SyncLocalStorage.getItem(key);
  const parsed = stored ? Number.parseInt(stored) : defaultValue;
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function getCodebustersSettings(event: Event): Partial<Settings> {
  if (typeof window !== "undefined") {
    const codebustersQuestionCount = SyncLocalStorage.getItem("codebustersQuestionCount");
    const codebustersTimeLimit = SyncLocalStorage.getItem("codebustersTimeLimit");

    const questionCount = codebustersQuestionCount ? Number.parseInt(codebustersQuestionCount) : 3;
    const timeLimit = codebustersTimeLimit ? Number.parseInt(codebustersTimeLimit) : 15;

    if (!codebustersQuestionCount) {
      SyncLocalStorage.setItem("codebustersQuestionCount", "3");
    }
    if (!codebustersTimeLimit) {
      SyncLocalStorage.setItem("codebustersTimeLimit", "15");
    }

    const savedDivision = getStoredValue("defaultDivision", "any");
    const validDivision =
      savedDivision === "B" || savedDivision === "C" || savedDivision === "any"
        ? savedDivision
        : "any";
    const availableDivisions = event.divisions || ["B", "C"];
    const divisionForEvent = getDivisionForEvent(validDivision, availableDivisions);

    return {
      questionCount: Number.isNaN(questionCount) ? 3 : questionCount,
      timeLimit: Number.isNaN(timeLimit) ? 15 : timeLimit,
      difficulties: [],
      types: "free-response",
      division: divisionForEvent,
      subtopics: [],
    };
  }
  const availableDivisions = event.divisions || ["B", "C"];
  const divisionForEvent = getDivisionForEvent("any", availableDivisions);
  return {
    questionCount: 3,
    timeLimit: 15,
    difficulties: [],
    types: "free-response",
    division: divisionForEvent,
    subtopics: [],
  };
}

export function getSettingsForEvent(event: Event): Partial<Settings> {
  if (event.name === "Codebusters") {
    return getCodebustersSettings(event);
  }

  const defaultQuestionCount = getStoredNumber(
    "defaultQuestionCount",
    NORMAL_DEFAULTS.questionCount
  );
  const defaultTimeLimit = getStoredNumber("defaultTimeLimit", NORMAL_DEFAULTS.timeLimit);
  const savedDivision = getStoredValue("defaultDivision", "any");
  const validDivision =
    savedDivision === "B" || savedDivision === "C" || savedDivision === "any"
      ? savedDivision
      : "any";
  const savedTypes = getStoredValue("defaultQuestionTypes", "multiple-choice");
  const validTypes =
    savedTypes === "multiple-choice" || savedTypes === "both" || savedTypes === "free-response"
      ? savedTypes
      : "multiple-choice";

  const supportsPicture = supportsPictureQuestions(event.name);
  const supportsIdOnly = supportsIdentificationOnly(event.name);

  const savedIdPercentage = supportsPicture ? getStoredNumber("defaultIdPercentage", 0) : 0;
  const savedPureIdOnly = supportsIdOnly && getStoredValue("defaultPureIdOnly", "false") === "true";

  const availableDivisions = event.divisions || ["B", "C"];
  const divisionForEvent = getDivisionForEvent(validDivision, availableDivisions);

  return {
    questionCount: defaultQuestionCount,
    timeLimit: defaultTimeLimit,
    difficulties: [],
    types: validTypes,
    division: divisionForEvent,
    subtopics: [],
    idPercentage: savedIdPercentage,
    pureIdOnly: savedPureIdOnly,
  };
}
