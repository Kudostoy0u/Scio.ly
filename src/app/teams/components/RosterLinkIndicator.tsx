"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface RosterLinkIndicatorProps {
  studentName: string;
  isLinked: boolean;
  userId?: string;
  userEmail?: string;
  teamSlug: string;
  subteamId: string;
  onLinkStatusChange: (studentName: string, isLinked: boolean) => void;
  darkMode?: boolean;
}

interface User {
  id: string;
  email: string;
  display_name: string;
  username: string;
  first_name: string;
  last_name: string;
}

export default function RosterLinkIndicator({
  studentName,
  isLinked,
  userId,
  userEmail,
  teamSlug,
  subteamId,
  onLinkStatusChange,
  darkMode: _darkMode = false,
}: RosterLinkIndicatorProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  const handleLinkClick = async () => {
    if (isLinked) {
      // Already linked - could show user info or unlink option
      return;
    }

    // Try to auto-merge first
    await attemptAutoMerge();
  };

  const attemptAutoMerge = async () => {
    try {
      setIsLinking(true);
      const response = await fetch(`/api/teams/${teamSlug}/roster/link-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subteamId,
          studentName,
          userId: userId, // If we found a matching user
        }),
      });

      if (response.ok) {
        onLinkStatusChange(studentName, true);
      } else {
        // Auto-merge failed, show invite modal
        setShowInviteModal(true);
      }
    } catch (_error) {
      setShowInviteModal(true);
    } finally {
      setIsLinking(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/teams/${teamSlug}/roster/invite?q=${encodeURIComponent(query)}`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (_error) {}
  };

  const handleInviteUser = async () => {
    if (!selectedUser) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/teams/${teamSlug}/roster/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subteamId,
          studentName,
          username: selectedUser.username || selectedUser.email,
          message: `You've been invited to join the team roster as "${studentName}"`,
        }),
      });

      if (response.ok) {
        setShowInviteModal(false);
        setSearchQuery("");
        setSearchResults([]);
        setSelectedUser(null);
        // Show success message
        alert("Invitation sent successfully!");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to send invitation");
      }
    } catch (_error) {
      alert("Failed to send invitation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleLinkClick}
        disabled={isLinking}
        className={`p-1 rounded-full transition-colors ${
          isLinked ? "text-green-500 hover:text-green-600" : "text-red-500 hover:text-red-600"
        } ${isLinking ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        title={isLinked ? `Linked to ${userEmail}` : "Click to invite user"}
      >
        {isLinking ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="w-4 h-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </motion.div>
        ) : isLinked ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        )}
      </button>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
              onClick={() => setShowInviteModal(false)}
            />
            <div className="relative z-50 inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full bg-white">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Invite User for Roster</h3>
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Invite a user to be linked to the roster name:{" "}
                    <strong>&quot;{studentName}&quot;</strong>
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Search Users</label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        searchUsers(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Search by username..."
                    />

                    {searchResults.length > 0 && (
                      <div className="mt-2 border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                        {searchResults.map((user) => (
                          <div
                            key={user.id}
                            className={`p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                              selectedUser?.id === user.id ? "bg-blue-50" : ""
                            }`}
                            onClick={() => setSelectedUser(user)}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-600">
                                  {user.display_name?.charAt(0) ||
                                    user.email.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {user.display_name || "No name"}
                                </p>
                                <p className="text-sm text-gray-600">{user.email}</p>
                                {user.username && (
                                  <p className="text-xs text-gray-500">@{user.username}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedUser && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-md">
                        <p className="text-sm text-blue-800">
                          Selected:{" "}
                          <strong>{selectedUser.display_name || selectedUser.email}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowInviteModal(false);
                      setSearchQuery("");
                      setSearchResults([]);
                      setSelectedUser(null);
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInviteUser}
                    disabled={!selectedUser || isLoading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Sending..." : "Send Invitation"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
