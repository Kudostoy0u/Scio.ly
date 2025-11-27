import type { AssignmentDetails, QuestionGenerationSettings } from "../../assignmentTypes";

export function validateDetails(details: AssignmentDetails): string | null {
  if (!details.title.trim()) {
    return "Title is required";
  }
  if (!details.eventName) {
    return "Event is required";
  }
  return null;
}

export function validateSettings(
  settings: QuestionGenerationSettings,
  timeLimitMinutes: number
): string | null {
  if (settings.questionCount <= 0 || settings.questionCount > 10) {
    return "Question count must be between 1 and 10";
  }
  if (timeLimitMinutes <= 0) {
    return "Time limit must be greater than 0";
  }
  if (!settings.cipherTypes || settings.cipherTypes.length === 0) {
    return "At least one cipher type must be selected";
  }
  return null;
}

export function validateRoster(selectedRoster: string[]): string | null {
  if (selectedRoster.length === 0) {
    return "At least one person must be selected";
  }
  return null;
}

export function validateAssignmentCreation(
  details: AssignmentDetails,
  settings: QuestionGenerationSettings,
  selectedRoster: string[]
): string | null {
  const detailsError = validateDetails(details);
  if (detailsError) {
    return detailsError;
  }

  const settingsError = validateSettings(settings, details.timeLimitMinutes);
  if (settingsError) {
    return settingsError;
  }

  const rosterError = validateRoster(selectedRoster);
  if (rosterError) {
    return rosterError;
  }

  return null;
}
