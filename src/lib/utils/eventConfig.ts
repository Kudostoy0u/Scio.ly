/**
 * Centralized event configuration utility
 * Single source of truth for event capabilities and settings
 */

export interface EventCapabilities {
  supportsPictureQuestions: boolean;
  supportsIdentificationOnly: boolean;
  availableDivisions: string[];
  maxQuestions: number;
  defaultTimeLimit: number;
  isCodebusters?: boolean;
}

/**
 * Check if an event supports picture/ID questions
 */
export function supportsPictureQuestions(eventName: string): boolean {
  const base = eventName.split(" - ")[0];
  const candidates = [
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
  ];
  if (!eventName) return false;
  return candidates.includes(eventName) || candidates.includes(base);
}

/**
 * Check if an event supports identification-only questions
 */
export function supportsIdentificationOnly(eventName: string): boolean {
  const candidates = [
    "Rocks and Minerals",
    "Entomology",
    "Water Quality - Freshwater",
    "Astronomy",
  ];
  return candidates.includes(eventName);
}

/**
 * Check if an event is Codebusters (has special handling)
 */
export function isCodebustersEvent(eventName: string): boolean {
  return eventName === "Codebusters";
}

/**
 * Get event capabilities
 */
export function getEventCapabilities(eventName: string): EventCapabilities {
  const isCodebusters = isCodebustersEvent(eventName);

  return {
    supportsPictureQuestions: supportsPictureQuestions(eventName),
    supportsIdentificationOnly: supportsIdentificationOnly(eventName),
    availableDivisions: ["B", "C"], // Most events support both divisions
    maxQuestions: isCodebusters ? 10 : 50, // Codebusters typically has fewer questions
    defaultTimeLimit: isCodebusters ? 15 : 30, // Codebusters has shorter time limits
    isCodebusters,
  };
}

/**
 * Validate event name and return normalized version
 */
export function validateEventName(eventName: string): string {
  if (!eventName || typeof eventName !== "string") {
    throw new Error("Event name is required");
  }

  const trimmed = eventName.trim();
  if (trimmed.length === 0) {
    throw new Error("Event name cannot be empty");
  }

  return trimmed;
}

/**
 * Get default settings for an event
 */
export function getDefaultEventSettings(eventName: string) {
  const capabilities = getEventCapabilities(eventName);

  return {
    questionCount: 10,
    timeLimit: capabilities.defaultTimeLimit,
    difficulties: ["easy", "medium", "hard"],
    types: "multiple-choice" as const,
    division: "any" as const,
    tournament: "any",
    subtopics: [] as string[],
    idPercentage: capabilities.supportsPictureQuestions ? 0 : undefined,
    charLengthMin: undefined,
    charLengthMax: undefined,
    pureIdOnly: capabilities.supportsIdentificationOnly ? false : undefined,
  };
}
