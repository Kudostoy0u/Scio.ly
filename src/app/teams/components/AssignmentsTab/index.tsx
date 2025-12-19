"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { trpc } from "@/lib/trpc/client";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import AssignmentViewerModal from "../AssignmentViewerModal";
import EnhancedAssignmentCreator from "../EnhancedAssignmentCreator";
import { AssignmentCard } from "./AssignmentCard";
import type { Assignment, AssignmentsTabProps } from "./types";
import { hasAssignmentProgress } from "./utils";

export default function AssignmentsTab({
	teamSlug,
	isCaptain,
	onCreateAssignment: _onCreateAssignment,
	activeSubteamId,
}: AssignmentsTabProps) {
	const { darkMode } = useTheme();
	const utils = trpc.useUtils();
	const [selectedAssignmentId, setSelectedAssignmentId] = useState<
		string | null
	>(null);
	const [deletingAssignmentId, setDeletingAssignmentId] = useState<
		string | null
	>(null);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
		null,
	);
	const [showCreateModal, setShowCreateModal] = useState(false);

	const {
		data: assignments = [],
		isLoading: loading,
		error,
	} = trpc.teams.assignments.useQuery(
		{ teamSlug },
		{
			refetchOnMount: true,
			refetchOnWindowFocus: true,
		},
	);

	const deleteAssignmentMutation = trpc.teams.deleteAssignment.useMutation();

	// Listen for assignment submission events to invalidate cache
	useEffect(() => {
		const handleAssignmentSubmitted = (event: Event) => {
			const customEvent = event as CustomEvent<{
				teamSlug: string;
				assignmentId?: string;
			}>;
			if (customEvent.detail?.teamSlug === teamSlug) {
				// Invalidate assignments list
				utils.teams.assignments.invalidate({ teamSlug });
				// Invalidate assignment analytics if assignmentId is provided
				if (customEvent.detail.assignmentId) {
					utils.teams.getAssignmentAnalytics.invalidate({
						assignmentId: customEvent.detail.assignmentId,
					});
				}
			}
		};

		window.addEventListener("assignmentSubmitted", handleAssignmentSubmitted);
		return () => {
			window.removeEventListener(
				"assignmentSubmitted",
				handleAssignmentSubmitted,
			);
		};
	}, [teamSlug, utils]);

	const handleDeleteAssignment = async (assignmentId: string) => {
		try {
			setDeletingAssignmentId(assignmentId);
			await deleteAssignmentMutation.mutateAsync({
				teamSlug,
				assignmentId,
			});
			utils.teams.assignments.invalidate({ teamSlug });
			setShowDeleteConfirm(null);
			toast.success("Assignment deleted successfully");
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to delete assignment";
			toast.error(errorMessage);
		} finally {
			setDeletingAssignmentId(null);
		}
	};

	const handleStartAssignment = (assignmentId: string) => {
		window.location.href = `/test?assignmentId=${assignmentId}`;
	};

	const handleViewAssignment = (assignmentId: string) => {
		window.location.href = `/test?assignmentId=${assignmentId}&viewResults=true`;
	};

	if (loading) {
		return (
			<div className="p-6">
				<div className="flex items-center justify-center h-64">
					<div
						className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}
					>
						Loading assignments...
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6">
				<div className="text-center py-12">
					<div className={"text-red-500 mb-4"}>⚠️</div>
					<h3
						className={`text-lg font-medium mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
					>
						Error loading assignments
					</h3>
					<p className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
						{error instanceof Error ? error.message : String(error)}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="p-4 md:p-6">
			<div className="flex items-center justify-between mb-6">
				<h2
					className={`text-xl md:text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
				>
					Assignments
				</h2>
				{isCaptain && (
					<button
						type="button"
						onClick={() => setShowCreateModal(true)}
						className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
					>
						<span>Create</span>
						<Plus className="w-4 h-4" />
					</button>
				)}
			</div>

			<div className="space-y-4">
				{assignments.length === 0 ? (
					<div className="text-center py-12">
						<div
							className={`text-6xl mb-4 ${darkMode ? "text-gray-500" : "text-gray-400"}`}
						>
							📋
						</div>
						<h3
							className={`text-lg font-medium mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
						>
							No assignments yet
						</h3>
						<p className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
							{isCaptain
								? "Create your first assignment to get started."
								: "No assignments have been created yet."}
						</p>
					</div>
				) : (
					assignments.map((assignment) => {
						const assignmentTyped = assignment as unknown as Assignment;
						return (
							<AssignmentCard
								key={assignmentTyped.id}
								assignment={assignmentTyped}
								darkMode={darkMode}
								isCaptain={isCaptain}
								hasProgress={hasAssignmentProgress(assignmentTyped.id)}
								onStartAssignment={() =>
									handleStartAssignment(assignmentTyped.id)
								}
								onViewAssignment={() =>
									handleViewAssignment(assignmentTyped.id)
								}
								onViewAnalytics={() =>
									setSelectedAssignmentId(assignmentTyped.id)
								}
								onDelete={() => handleDeleteAssignment(assignmentTyped.id)}
								showDeleteConfirm={showDeleteConfirm === assignmentTyped.id}
								isDeletingAssignment={
									deletingAssignmentId === assignmentTyped.id
								}
								onCancelDelete={() => setShowDeleteConfirm(null)}
							/>
						);
					})
				)}
			</div>

			{selectedAssignmentId && (
				<AssignmentViewerModal
					assignmentId={selectedAssignmentId}
					teamSlug={teamSlug}
					isCaptain={isCaptain}
					onClose={() => setSelectedAssignmentId(null)}
					darkMode={darkMode}
				/>
			)}

			{showCreateModal && (
				<EnhancedAssignmentCreator
					teamId={teamSlug}
					subteamId={activeSubteamId || undefined}
					onAssignmentCreated={() => {
						utils.teams.assignments.invalidate({ teamSlug });
						setShowCreateModal(false);
					}}
					onCancel={() => setShowCreateModal(false)}
					darkMode={darkMode}
				/>
			)}
		</div>
	);
}
