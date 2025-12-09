"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { useEnhancedTeamData } from "@/app/hooks/useEnhancedTeamData";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import AssignmentViewerModal from "../AssignmentViewerModal";
import { AssignmentCard } from "./AssignmentCard";
import type { Assignment, AssignmentsTabProps } from "./types";
import { clearAssignmentData, hasAssignmentProgress } from "./utils";

export default function AssignmentsTab({
	teamId,
	isCaptain,
	onCreateAssignment,
}: AssignmentsTabProps) {
	const { darkMode } = useTheme();
	const { assignments, loading, error, loadAssignments, invalidateCache } =
		useEnhancedTeamData();
	const [selectedAssignmentId, setSelectedAssignmentId] = useState<
		string | null
	>(null);
	const [deletingAssignmentId, setDeletingAssignmentId] = useState<
		string | null
	>(null);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
		null,
	);

	useEffect(() => {
		invalidateCache(`assignments-${teamId}`);
		loadAssignments(teamId);
	}, [teamId, loadAssignments, invalidateCache]);

	const handleDeleteAssignment = async (assignmentId: string) => {
		try {
			setDeletingAssignmentId(assignmentId);
			const response = await fetch(
				`/api/teams/${teamId}/assignments/${assignmentId}`,
				{
					method: "DELETE",
				},
			);

			if (response.ok) {
				invalidateCache(`assignments-${teamId}`);
				await loadAssignments(teamId);
				setShowDeleteConfirm(null);
				toast.success("Assignment deleted successfully");
			} else {
				const errorData = await response.json();
				const errorMessage = errorData.error || "Failed to delete assignment";
				toast.error(errorMessage);
			}
		} catch {
			const errorMessage = "Failed to delete assignment";
			toast.error(errorMessage);
		} finally {
			setDeletingAssignmentId(null);
		}
	};

	const handleStartAssignment = (assignmentId: string) => {
		window.location.href = `/assign-new/${assignmentId}`;
	};

	const handleViewAssignment = (assignmentId: string) => {
		window.location.href = `/test?assignmentId=${assignmentId}&viewResults=true`;
	};

	const handleDeclineAssignment = async (assignmentId: string) => {
		try {
			const response = await fetch(
				`/api/teams/${teamId}/assignments/${assignmentId}/decline`,
				{
					method: "POST",
				},
			);

			if (response.ok) {
				clearAssignmentData(assignmentId);

				const currentAssignmentId = SyncLocalStorage.getItem(
					"currentAssignmentId",
				);
				if (currentAssignmentId === assignmentId) {
					SyncLocalStorage.removeItem("currentAssignmentId");
				}

				invalidateCache(`assignments-${teamId}`);
				await loadAssignments(teamId);

				toast.success("Assignment declined");
			} else {
				const errorData = await response.json();
				const errorMessage = errorData.error || "Failed to decline assignment";
				toast.error(errorMessage);
			}
		} catch (_error) {
			toast.error("Failed to decline assignment");
		}
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
						{error}
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
						onClick={onCreateAssignment}
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
								onDeclineAssignment={() =>
									handleDeclineAssignment(assignmentTyped.id)
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
					teamId={teamId}
					isCaptain={isCaptain}
					onClose={() => setSelectedAssignmentId(null)}
					darkMode={darkMode}
				/>
			)}
		</div>
	);
}
