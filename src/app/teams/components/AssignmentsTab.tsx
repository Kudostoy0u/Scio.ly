"use client";

import { useAuth } from "@/app/contexts/authContext";
import { useTheme } from "@/app/contexts/themeContext";
import { useEnhancedTeamData } from "@/app/hooks/useEnhancedTeamData";
import SyncLocalStorage from "@/lib/database/localStorage-replacement";
import { AlertTriangle, BarChart3, Calendar, CheckCircle, Clock, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import AssignmentViewerModal from "./AssignmentViewerModal";

interface Assignment {
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

interface AssignmentsTabProps {
  teamId: string;
  isCaptain: boolean;
  onCreateAssignment: () => void;
}

export default function AssignmentsTab({
  teamId,
  isCaptain,
  onCreateAssignment,
}: AssignmentsTabProps) {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const { assignments, loading, error, loadAssignments, invalidateCache } = useEnhancedTeamData();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Load assignments using enhanced hook
  useEffect(() => {
    // Invalidate cache to ensure fresh data
    invalidateCache(`assignments-${teamId}`);
    loadAssignments(teamId);
  }, [teamId, loadAssignments, invalidateCache]);

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      setDeletingAssignmentId(assignmentId);
      const response = await fetch(`/api/teams/${teamId}/assignments/${assignmentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Invalidate cache and reload assignments to get updated data
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
    // Use the new assignment system that works with UUIDs
    // This ensures fresh data is loaded from API and localStorage is properly cleared
    window.location.href = `/assign-new/${assignmentId}`;
  };

  const handleViewAssignment = (assignmentId: string) => {
    // Navigate to test page to view results
    window.location.href = `/test?assignmentId=${assignmentId}&viewResults=true`;
  };

  const handleDeclineAssignment = async (assignmentId: string) => {
    try {
      // Call the decline API endpoint
      const response = await fetch(`/api/teams/${teamId}/assignments/${assignmentId}/decline`, {
        method: "POST",
      });

      if (response.ok) {
        // Clear any existing assignment data
        clearAssignmentData(assignmentId);

        // Remove current assignment ID if it matches
        const currentAssignmentId = SyncLocalStorage.getItem("currentAssignmentId");
        if (currentAssignmentId === assignmentId) {
          SyncLocalStorage.removeItem("currentAssignmentId");
        }

        // Invalidate cache and reload assignments to get updated data from server
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

  const hasAssignmentProgress = (assignmentId: string): boolean => {
    const assignmentKey = `assignment_${assignmentId}`;
    const hasQuestions = SyncLocalStorage.getItem(`${assignmentKey}_questions`);
    const hasAnswers = SyncLocalStorage.getItem(`${assignmentKey}_answers`);
    return !!(hasQuestions || hasAnswers);
  };

  const isUserAssignedToAssignment = (assignment: Assignment): boolean => {
    if (!(user?.id && assignment.roster)) {
      return false;
    }
    return assignment.roster.some((rosterMember) => rosterMember.user_id === user.id);
  };

  const hasEveryoneDeclined = (assignment: Assignment): boolean => {
    // If there's no roster or the roster is empty, everyone has declined
    return !assignment.roster || assignment.roster.length === 0;
  };

  const clearAssignmentData = (assignmentId: string) => {
    const assignmentKey = `assignment_${assignmentId}`;
    SyncLocalStorage.removeItem(`${assignmentKey}_questions`);
    SyncLocalStorage.removeItem(`${assignmentKey}_answers`);
    SyncLocalStorage.removeItem(`${assignmentKey}_grading`);
    SyncLocalStorage.removeItem(`${assignmentKey}_session`);
  };

  const getAssignmentStatus = (assignment: Assignment) => {
    // For captains, show overall assignment status
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

    // For students, show their individual status
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
  };

  const getStatusIcon = (status: string) => {
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
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "Completed!":
      case "graded":
        return darkMode ? "bg-green-900/20 text-green-300" : "bg-green-100 text-green-800";
      case "overdue":
        return darkMode ? "bg-red-900/20 text-red-300" : "bg-red-100 text-red-800";
      default:
        return darkMode ? "bg-yellow-900/20 text-yellow-300" : "bg-yellow-100 text-yellow-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
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
          <h3 className={`text-lg font-medium mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
            Error loading assignments
          </h3>
          <p className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>{error}</p>
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
            <div className={`text-6xl mb-4 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
              📋
            </div>
            <h3 className={`text-lg font-medium mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
              No assignments yet
            </h3>
            <p className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              {isCaptain
                ? "Create your first assignment to get started."
                : "No assignments have been created yet."}
            </p>
          </div>
        ) : (
          // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex assignment rendering with multiple conditional states
          assignments.map((assignment) => {
            const assignmentTyped = assignment as unknown as Assignment;
            const status = getAssignmentStatus(assignmentTyped);
            const everyoneDeclined = hasEveryoneDeclined(assignmentTyped);

            return (
              <div
                key={assignmentTyped.id}
                className={`p-3 md:p-4 rounded-lg border ${
                  darkMode
                    ? "bg-gray-800 border-gray-700 hover:bg-gray-750"
                    : "bg-white border-gray-200 hover:bg-gray-50"
                } transition-colors`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                        {assignmentTyped.title}
                      </h3>
                      <div className="ml-4 flex items-center space-x-2">
                        {everyoneDeclined ? (
                          <div title="Everyone declined this assignment">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                          </div>
                        ) : (
                          getStatusIcon(status)
                        )}
                        {isCaptain && (
                          <>
                            <button
                              type="button"
                              onClick={() => setSelectedAssignmentId(assignmentTyped.id)}
                              className={`p-2 rounded-lg ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                              title="View Assignment Analytics"
                            >
                              <BarChart3 className="w-4 h-4" />
                            </button>
                            {showDeleteConfirm === assignmentTyped.id ? (
                              <div className="flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAssignment(assignmentTyped.id)}
                                  disabled={deletingAssignmentId === assignmentTyped.id}
                                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                >
                                  {deletingAssignmentId === assignmentTyped.id
                                    ? "Deleting..."
                                    : "Confirm"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowDeleteConfirm(null)}
                                  className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(assignmentTyped.id)}
                                className={`p-2 rounded-lg ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"} hover:bg-red-100`}
                                title="Delete Assignment"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {everyoneDeclined ? (
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <span
                          className={`text-sm font-medium ${darkMode ? "text-orange-400" : "text-orange-600"}`}
                        >
                          Everyone declined this assignment
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}
                          >
                            {status}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}
                          >
                            {assignmentTyped.assignment_type}
                          </span>
                        </div>
                        <p className={`mb-3 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                          {assignmentTyped.description}
                        </p>
                      </>
                    )}
                    {!everyoneDeclined && (
                      <>
                        {assignmentTyped.roster && assignmentTyped.roster.length > 0 && (
                          <div className={`mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            <div className="text-sm font-medium mb-1">Assigned to:</div>
                            <div className="flex flex-wrap gap-1">
                              {assignmentTyped.roster.slice(0, 3).map((student, index: number) => {
                                const studentName =
                                  typeof student === "string"
                                    ? student
                                    : ((
                                        student as {
                                          display_name?: string | null;
                                          student_name?: string | null;
                                        }
                                      )?.display_name ??
                                      (
                                        student as {
                                          display_name?: string | null;
                                          student_name?: string | null;
                                        }
                                      )?.student_name ??
                                      "Unknown");
                                return (
                                  <span
                                    key={`student-${index}-${String(studentName).slice(0, 20)}`}
                                    className={`px-2 py-1 rounded-full text-xs ${darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}
                                  >
                                    {studentName}
                                  </span>
                                );
                              })}
                              {assignmentTyped.roster.length > 3 && (
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}
                                >
                                  +{assignmentTyped.roster.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        <div
                          className={`flex flex-wrap items-center gap-3 text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          {assignmentTyped.due_date && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>Due: {formatDate(assignmentTyped.due_date)}</span>
                            </div>
                          )}
                          {assignmentTyped.time_limit_minutes && (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{assignmentTyped.time_limit_minutes} min</span>
                            </div>
                          )}
                          {assignmentTyped.questions_count && (
                            <div className="flex items-center space-x-1">
                              <span>{assignmentTyped.questions_count} questions</span>
                            </div>
                          )}
                          {isCaptain && assignmentTyped.roster_count && (
                            <div className="flex items-center space-x-1">
                              <span>
                                {assignmentTyped.submitted_count || 0}/
                                {assignmentTyped.roster_count}{" "}
                                {(assignmentTyped.submitted_count || 0) ===
                                assignmentTyped.roster_count
                                  ? "completed"
                                  : "submitted"}
                              </span>
                            </div>
                          )}
                        </div>
                        {assignmentTyped.user_submission && (
                          <div
                            className={`mt-2 text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
                          >
                            Submitted: {formatDate(assignmentTyped.user_submission.submitted_at)}
                          </div>
                        )}
                      </>
                    )}

                    {/* Start/Continue Assignment Button for Students */}
                    {!everyoneDeclined &&
                      (!isCaptain ||
                        (isCaptain && isUserAssignedToAssignment(assignmentTyped))) && (
                        <div className="mt-3 flex items-center gap-2">
                          {assignmentTyped.user_submission ? (
                            <button
                              type="button"
                              onClick={() => handleViewAssignment(assignmentTyped.id)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                darkMode
                                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                                  : "bg-purple-100 hover:bg-purple-200 text-purple-700"
                              }`}
                            >
                              My Results
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartAssignment(assignmentTyped.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  darkMode
                                    ? "bg-green-600 hover:bg-green-700 text-white"
                                    : "bg-green-100 hover:bg-green-200 text-green-700"
                                }`}
                              >
                                {hasAssignmentProgress(assignmentTyped.id)
                                  ? "Continue Assignment"
                                  : "Start Assignment"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeclineAssignment(assignmentTyped.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  darkMode
                                    ? "bg-gray-600 hover:bg-gray-700 text-white"
                                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                }`}
                              >
                                Decline
                              </button>
                            </>
                          )}
                        </div>
                      )}

                    {/* Progress bar for captains */}
                    {!everyoneDeclined &&
                      isCaptain &&
                      assignmentTyped.roster_count &&
                      assignmentTyped.roster_count > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                              {(assignmentTyped.submitted_count || 0) ===
                              assignmentTyped.roster_count
                                ? "Completed"
                                : "Submissions"}
                            </span>
                            <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                              {assignmentTyped.submitted_count || 0}/{assignmentTyped.roster_count}
                            </span>
                          </div>
                          <div
                            className={`w-full rounded-full h-2 ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}
                          >
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${((assignmentTyped.submitted_count || 0) / assignmentTyped.roster_count) * 100}%`,
                              }}
                            />
                          </div>

                          {/* See results button */}
                          {(assignmentTyped.submitted_count || 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedAssignmentId(assignmentTyped.id)}
                              className={`mt-2 text-xs px-3 py-1 rounded-lg transition-colors ${
                                darkMode
                                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                                  : "bg-blue-100 hover:bg-blue-200 text-blue-700"
                              }`}
                            >
                              See Results
                            </button>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Assignment Viewer Modal */}
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
