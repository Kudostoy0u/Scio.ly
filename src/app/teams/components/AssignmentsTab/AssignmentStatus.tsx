import { CheckCircle, Clock } from "lucide-react";
import type { Assignment } from "./types";

interface AssignmentStatusProps {
	assignment: Assignment;
	isCaptain: boolean;
}

export function getAssignmentStatus(
	assignment: Assignment,
	isCaptain: boolean,
): string {
	if (isCaptain) {
		const submittedCount = assignment.submitted_count || 0;
		const rosterCount = assignment.roster_count || 0;

		if (rosterCount > 0 && submittedCount === rosterCount) {
			return "Completed!";
		}

		if (assignment.due_date) {
			const dueDate = new Date(assignment.due_date);
			const now = new Date();
			if (now > dueDate && submittedCount < rosterCount) {
				return "overdue";
			}
		}

		return "pending";
	}

	if (assignment.user_submission) {
		if (assignment.user_submission.status === "submitted") {
			return "completed";
		}
		if (assignment.user_submission.status === "graded") {
			return "graded";
		}
	}

	if (assignment.due_date) {
		const dueDate = new Date(assignment.due_date);
		const now = new Date();
		if (now > dueDate) {
			return "overdue";
		}
	}

	return "pending";
}

export function getStatusIcon(status: string) {
	switch (status) {
		case "completed":
		case "Completed!":
		case "graded":
			return <CheckCircle className="w-5 h-5 text-green-500" />;
		case "overdue":
			return <Clock className="w-5 h-5 text-red-500" />;
		default:
			return <Clock className="w-5 h-5 text-yellow-500" />;
	}
}

export function getStatusColor(status: string, darkMode: boolean) {
	switch (status) {
		case "completed":
		case "Completed!":
		case "graded":
			return darkMode
				? "bg-green-900/20 text-green-300"
				: "bg-green-100 text-green-800";
		case "overdue":
			return darkMode
				? "bg-red-900/20 text-red-300"
				: "bg-red-100 text-red-800";
		default:
			return darkMode
				? "bg-yellow-900/20 text-yellow-300"
				: "bg-yellow-100 text-yellow-800";
	}
}

export const AssignmentStatusBadge: React.FC<
	AssignmentStatusProps & { darkMode: boolean }
> = ({ assignment, isCaptain, darkMode }) => {
	const status = getAssignmentStatus(assignment, isCaptain);

	return (
		<span
			className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status, darkMode)}`}
		>
			{status}
		</span>
	);
};
