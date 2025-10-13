'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { Plus, Calendar, CheckCircle, Clock, BarChart3, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import AssignmentViewerModal from './AssignmentViewerModal';
import { useEnhancedTeamData } from '@/app/hooks/useEnhancedTeamData';

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
  onCreateAssignment 
}: AssignmentsTabProps) {
  const { darkMode } = useTheme();
  const { assignments, loading, error, loadAssignments, invalidateCache } = useEnhancedTeamData();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Load assignments using enhanced hook
  useEffect(() => {
    loadAssignments(teamId);
  }, [teamId, loadAssignments]);

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      setDeletingAssignmentId(assignmentId);
      const response = await fetch(`/api/teams/${teamId}/assignments/${assignmentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Invalidate cache and reload assignments to get updated data
        invalidateCache(`assignments-${teamId}`);
        await loadAssignments(teamId);
        setShowDeleteConfirm(null);
        toast.success('Assignment deleted successfully');
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to delete assignment';
        toast.error(errorMessage);
      }
    } catch {
      const errorMessage = 'Failed to delete assignment';
      toast.error(errorMessage);
    } finally {
      setDeletingAssignmentId(null);
    }
  };

  const getAssignmentStatus = (assignment: Assignment) => {
    // For captains, show overall assignment status
    if (isCaptain) {
      const submittedCount = assignment.submitted_count || 0;
      const rosterCount = assignment.roster_count || 0;
      
      if (rosterCount > 0 && submittedCount === rosterCount) {
        return 'completed';
      }
      
      if (assignment.due_date) {
        const dueDate = new Date(assignment.due_date);
        const now = new Date();
        if (now > dueDate && submittedCount < rosterCount) {
          return 'overdue';
        }
      }
      
      return 'pending';
    }
    
    // For students, show their individual status
    if (assignment.user_submission) {
      if (assignment.user_submission.status === 'submitted') {
        return 'completed';
      }
      if (assignment.user_submission.status === 'graded') {
        return 'graded';
      }
    }
    
    if (assignment.due_date) {
      const dueDate = new Date(assignment.due_date);
      const now = new Date();
      if (now > dueDate) {
        return 'overdue';
      }
    }
    
    return 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'graded':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'overdue':
        return <Clock className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'graded':
        return darkMode ? 'bg-green-900/20 text-green-300' : 'bg-green-100 text-green-800';
      case 'overdue':
        return darkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-100 text-red-800';
      default:
        return darkMode ? 'bg-yellow-900/20 text-yellow-300' : 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
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
          <div className={`text-red-500 mb-4`}>⚠️</div>
          <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Error loading assignments
          </h3>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-xl md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Assignments</h2>
        {isCaptain && (
          <button
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
            <div className={`text-6xl mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>📋</div>
            <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>No assignments yet</h3>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {isCaptain ? 'Create your first assignment to get started.' : 'No assignments have been created yet.'}
            </p>
          </div>
        ) : (
          assignments.map((assignment) => {
            const status = getAssignmentStatus(assignment);
            return (
              <div
                key={assignment.id}
                className={`p-3 md:p-4 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                } transition-colors`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {assignment.title}
                      </h3>
                      <div className="ml-4 flex items-center space-x-2">
                        {getStatusIcon(status)}
                        {isCaptain && (
                          <>
                            <button
                              onClick={() => setSelectedAssignmentId(assignment.id)}
                              className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                              title="View Assignment Analytics"
                            >
                              <BarChart3 className="w-4 h-4" />
                            </button>
                            {showDeleteConfirm === assignment.id ? (
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => handleDeleteAssignment(assignment.id)}
                                  disabled={deletingAssignmentId === assignment.id}
                                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                >
                                  {deletingAssignmentId === assignment.id ? 'Deleting...' : 'Confirm'}
                                </button>
                                <button
                                  onClick={() => setShowDeleteConfirm(null)}
                                  className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowDeleteConfirm(assignment.id)}
                                className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} hover:bg-red-100`}
                                title="Delete Assignment"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                        {status}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                        {assignment.assignment_type}
                      </span>
                    </div>
                    <p className={`mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {assignment.description}
                    </p>
                    {assignment.roster && assignment.roster.length > 0 && (
                      <div className={`mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <div className="text-sm font-medium mb-1">Assigned to:</div>
                        <div className="flex flex-wrap gap-1">
                          {assignment.roster.slice(0, 3).map((student, index) => (
                            <span
                              key={index}
                              className={`px-2 py-1 rounded-full text-xs ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
                            >
                              {student.display_name || student.student_name}
                            </span>
                          ))}
                          {assignment.roster.length > 3 && (
                            <span className={`px-2 py-1 rounded-full text-xs ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                              +{assignment.roster.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className={`flex flex-wrap items-center gap-3 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {assignment.due_date && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Due: {formatDate(assignment.due_date)}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <span>{assignment.points} points</span>
                      </div>
                      {assignment.time_limit_minutes && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{assignment.time_limit_minutes} min</span>
                        </div>
                      )}
                      {assignment.questions_count && (
                        <div className="flex items-center space-x-1">
                          <span>{assignment.questions_count} questions</span>
                        </div>
                      )}
                      {isCaptain && assignment.roster_count && (
                        <div className="flex items-center space-x-1">
                          <span>{assignment.submitted_count || 0}/{assignment.roster_count} submitted</span>
                        </div>
                      )}
                      {assignment.user_submission && (
                        <div className="flex items-center space-x-1">
                          <span>Attempt {assignment.user_submission.attempt_number}/{assignment.max_attempts}</span>
                        </div>
                      )}
                    </div>
                    {assignment.user_submission && (
                      <div className={`mt-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Submitted: {formatDate(assignment.user_submission.submitted_at)}
                        {assignment.user_submission.grade !== null && (
                          <span className="ml-2 font-medium">
                            Grade: {assignment.user_submission.grade}/{assignment.points}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Progress bar for captains */}
                    {isCaptain && assignment.roster_count && assignment.roster_count > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                            Submissions
                          </span>
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                            {assignment.submitted_count || 0}/{assignment.roster_count}
                          </span>
                        </div>
                        <div className={`w-full rounded-full h-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${((assignment.submitted_count || 0) / assignment.roster_count) * 100}%`
                            }}
                          />
                        </div>
                        
                        {/* See results button */}
                        {(assignment.submitted_count || 0) > 0 && (
                          <button
                            onClick={() => setSelectedAssignmentId(assignment.id)}
                            className={`mt-2 text-xs px-3 py-1 rounded-lg transition-colors ${
                              darkMode 
                                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
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
