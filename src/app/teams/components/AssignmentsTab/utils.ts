import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import type { Assignment } from "./types";

export function hasAssignmentProgress(assignmentId: string): boolean {
	const assignmentKey = `assignment_${assignmentId}`;
	const hasQuestions = SyncLocalStorage.getItem(`${assignmentKey}_questions`);
	const hasAnswers = SyncLocalStorage.getItem(`${assignmentKey}_answers`);
	return !!(hasQuestions || hasAnswers);
}

export function hasEveryoneDeclined(assignment: Assignment): boolean {
	return !assignment.roster || assignment.roster.length === 0;
}

export function formatDate(dateString: string) {
	return new Date(dateString).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}
