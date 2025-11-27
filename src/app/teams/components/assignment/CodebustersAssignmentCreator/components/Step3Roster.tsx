"use client";
import type React from "react";
import type { RosterMember } from "../../assignmentTypes";

interface Step3RosterProps {
  rosterMembers: RosterMember[];
  selectedRoster: string[];
  loadingRoster: boolean;
  darkMode: boolean;
  onRosterToggle: (memberName: string) => void;
  getMemberTextColor: (member: RosterMember) => string;
  renderMemberInfo: (member: RosterMember) => React.ReactElement | null;
}

export function Step3Roster({
  rosterMembers,
  selectedRoster,
  loadingRoster,
  darkMode,
  onRosterToggle,
  getMemberTextColor,
  renderMemberInfo,
}: Step3RosterProps) {
  if (loadingRoster) {
    return (
      <div className="text-center py-8">
        <div className={`text-lg font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
          Loading roster members...
        </div>
      </div>
    );
  }

  if (rosterMembers.length === 0) {
    return (
      <div className="text-center py-8">
        <div className={`text-lg font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
          No roster members found
        </div>
        <div className={`text-sm mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          Make sure team members are properly linked to their accounts.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
        {rosterMembers.map((member) => (
          <button
            key={member.student_name}
            type="button"
            className={`p-3 border rounded-lg transition-colors text-left w-full ${
              selectedRoster.includes(member.student_name)
                ? darkMode
                  ? "border-blue-400 bg-blue-900/20"
                  : "border-blue-500 bg-blue-50"
                : darkMode
                  ? "border-gray-600 bg-gray-700 hover:bg-gray-600"
                  : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
            onClick={() => onRosterToggle(member.student_name)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedRoster.includes(member.student_name)}
                  onChange={() => {
                    // Handled by parent button click
                  }}
                  className={`rounded ${darkMode ? "accent-blue-400" : "accent-blue-600"}`}
                />
                <span className={`font-medium ${getMemberTextColor(member)}`}>
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
            {renderMemberInfo(member)}
          </button>
        ))}
      </div>
    </div>
  );
}
