export interface Assignment {
	id: string;
	title: string;
	description: string;
	assignment_type: string;
	due_date: string;
	points: number;
	is_required: boolean;
	max_attempts: number;
	time_limit_minutes?: number;
	created_at: string;
	updated_at: string;
	creator_email: string;
	creator_name: string;
	questions_count?: number;
	roster_count?: number;
	submitted_count?: number;
	graded_count?: number;
	roster?: Array<{
		student_name: string;
		user_id: string | null;
		email: string | null;
		display_name: string | null;
	}>;
	user_submission?: {
		status: string;
		submitted_at: string;
		grade: number;
		attempt_number: number;
	};
}

export interface AssignmentsTabProps {
	teamId: string;
	isCaptain: boolean;
	onCreateAssignment: () => void;
}
