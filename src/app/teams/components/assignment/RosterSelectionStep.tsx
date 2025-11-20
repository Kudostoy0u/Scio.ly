"use client";

import { motion } from "framer-motion";
import type { RosterSelectionStepProps } from "./assignmentTypes";

export default function RosterSelectionStep({
  darkMode,
  onNext: _onNext,
  onBack,
  onError,
  rosterMembers,
  selectedRoster,
  onRosterChange,
  loadingRoster,
  onCreateAssignment,
  creating,
}: RosterSelectionStepProps) {
  const toggleRosterMember = (memberName: string) => {
    if (selectedRoster.includes(memberName)) {
      onRosterChange(selectedRoster.filter((name) => name !== memberName));
    } else {
      onRosterChange([...selectedRoster, memberName]);
    }
  };

  const handleCreateAssignment = async () => {
    if (selectedRoster.length === 0) {
      onError("Please select at least one roster member");
      return;
    }
    try {
      await onCreateAssignment();
    } catch {
      onError("Failed to create assignment. Please try again.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
      data-testid="roster-selection-step"
    >
      <h3 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
        Select Roster Members
      </h3>

      {loadingRoster ? (
        <div className="text-center py-4">Loading roster...</div>
      ) : rosterMembers.length === 0 ? (
        <div className="text-center py-8">
          <div className={`text-lg font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            No roster members found
          </div>
          <div className={`text-sm mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Make sure team members are properly linked to their accounts.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
          {rosterMembers.map((member) => (
            <div
              key={member.student_name}
              className={`p-3 border rounded-lg transition-colors ${
                member.isLinked
                  ? selectedRoster.includes(member.student_name)
                    ? darkMode
                      ? "bg-blue-900/20 border-blue-400 cursor-pointer"
                      : "bg-blue-100 border-blue-300 cursor-pointer"
                    : darkMode
                      ? "bg-gray-700 border-gray-600 hover:bg-gray-600 cursor-pointer"
                      : "bg-white border-gray-200 hover:bg-gray-50 cursor-pointer"
                  : darkMode
                    ? "opacity-50 cursor-not-allowed bg-gray-800 border-gray-600"
                    : "opacity-50 cursor-not-allowed bg-gray-100 border-gray-300"
              }`}
              onClick={() => member.isLinked && toggleRosterMember(member.student_name)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedRoster.includes(member.student_name)}
                    onChange={() => member.isLinked && toggleRosterMember(member.student_name)}
                    disabled={!member.isLinked}
                    className="mr-2"
                  />
                  <span
                    className={`font-medium ${
                      member.isLinked
                        ? darkMode
                          ? "text-white"
                          : "text-gray-900"
                        : "text-gray-500"
                    }`}
                  >
                    {member.student_name}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <div
                    className={`w-2 h-2 rounded-full ${member.isLinked ? "bg-green-500" : "bg-red-500"}`}
                  />
                  <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {member.isLinked ? "Linked" : "Unlinked"}
                  </span>
                </div>
              </div>
              {member.username && member.isLinked && member.username !== "unknown" && (
                <div className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  @{member.username}
                </div>
              )}
              {!member.username && member.userEmail && (
                <div
                  className={`text-xs mt-1 ${
                    member.isLinked
                      ? darkMode
                        ? "text-gray-400"
                        : "text-gray-500"
                      : "text-gray-400"
                  }`}
                >
                  {member.userEmail}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className={`px-4 py-2 border rounded-lg ${
            darkMode
              ? "border-gray-600 text-gray-300 hover:bg-gray-800"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Back
        </button>
        <button
          onClick={handleCreateAssignment}
          disabled={creating || selectedRoster.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create Assignment"}
        </button>
      </div>
    </motion.div>
  );
}
