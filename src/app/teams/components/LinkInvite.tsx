"use client";

import { useTheme } from "@/app/contexts/themeContext";
import { Send, User, X } from "lucide-react";
import type React from "react";
import { useState } from "react";

interface LinkInviteProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (username: string) => void;
  studentName: string;
}

export default function LinkInvite({
  isOpen,
  onClose,
  onSubmit,
  studentName: _studentName,
}: LinkInviteProps) {
  const { darkMode } = useTheme();
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(username.trim());
      setUsername("");
      onClose();
    } catch (_error) {
      // Ignore errors
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setUsername("");
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`mt-3 p-3 rounded-lg border ${
        darkMode ? "bg-gray-700 border-gray-600" : "bg-blue-50 border-blue-200"
      }`}
    >
      <div className="flex items-center space-x-2 mb-2">
        <User className={`w-4 h-4 ${darkMode ? "text-blue-400" : "text-blue-600"}`} />
        <span className={`text-sm font-medium ${darkMode ? "text-blue-300" : "text-blue-800"}`}>
          Link to a student account
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <input
          type="text"
          placeholder="Enter username or email..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
            darkMode
              ? "bg-gray-600 text-white border-gray-500 focus:border-blue-500"
              : "bg-white text-gray-900 border-gray-300 focus:border-blue-500"
          }`}
        />
        <button
          type="submit"
          disabled={!username.trim() || submitting}
          className={`px-3 py-2 rounded-lg font-medium transition-colors ${
            username.trim() && !submitting
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-400 text-gray-200 cursor-not-allowed"
          }`}
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
        <button
          type="button"
          onClick={handleClose}
          className={`p-2 rounded-lg transition-colors ${
            darkMode ? "hover:bg-gray-600 text-gray-400" : "hover:bg-gray-200 text-gray-500"
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
