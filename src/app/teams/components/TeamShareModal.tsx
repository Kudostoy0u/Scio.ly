"use client";
import logger from "@/lib/utils/logger";

import { useTheme } from "@/app/contexts/themeContext";
import { Copy, Crown, Share2, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

interface TeamShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: string;
  division: "B" | "C";
  isCaptain: boolean;
  onJoinTeam?: (teamData: unknown, type: "captain" | "user") => void;
}

export default function TeamShareModal({
  isOpen,
  onClose,
  school,
  division,
  isCaptain,
}: TeamShareModalProps) {
  const { darkMode } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"share" | "join">("share");
  const [captainCode, setCaptainCode] = useState<string>("");
  const [userCode, setUserCode] = useState<string>("");
  const [joinCode, setJoinCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const loadCodes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const res = await fetch(
        `/api/teams/units?school=${encodeURIComponent(school)}&division=${division}`
      );
      if (!res.ok) {
        if (res.status === 401) {
          toast.error("You must be signed in to view team codes.");
        }
        throw new Error("Failed to load codes");
      }
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data) && data.data.length > 0) {
        // show first unit's codes by default
        setCaptainCode(data.data[0].captainCode || "");
        setUserCode(data.data[0].userCode || "");
      } else {
        setCaptainCode("");
        setUserCode("");
      }
    } catch (err) {
      setError("Failed to load team codes");
      logger.error("Error loading codes:", err);
    } finally {
      setIsLoading(false);
    }
  }, [school, division]);

  const handleJoinTeam = async () => {
    if (!joinCode.trim()) {
      setError("Please enter a code");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/teams/join-by-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode.trim() }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || "Invalid or expired code");
        if (response.status === 401) {
          toast.error("You must be signed in to join a team.");
        }
        return;
      }

      router.push(`/teams/${result.slug}`);
      setSuccess("Successfully joined team!");

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError("Failed to join team");
      logger.error("Error joining team:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess(`${type} code copied to clipboard!`);
      setTimeout(() => setSuccess(""), 2000);
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCodes();
    }
  }, [isOpen, loadCodes]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
    >
      <div className="min-h-full flex items-center justify-center p-4">
        <div
          className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-xl w-full max-w-md sm:max-w-lg p-4 sm:p-6`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Team Sharing
            </h2>
            <button
              type="button"
              onClick={onClose}
              className={`p-1 rounded-full hover:bg-gray-100 ${darkMode ? "hover:bg-gray-700" : ""}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex border-b mb-4 text-sm">
            <button
              type="button"
              onClick={() => setActiveTab("share")}
              className={`flex-1 py-2 px-4 text-sm font-medium ${
                activeTab === "share" ? "border-b-2 border-blue-500" : ""
              }`}
            >
              Share Team
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("join")}
              className={`flex-1 py-2 px-4 text-sm font-medium ${
                activeTab === "join" ? "border-b-2 border-blue-500" : ""
              }`}
            >
              Join Team
            </button>
          </div>

          {activeTab === "share" ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Share these permanent codes with your team members.
              </p>

              {isCaptain && (
                <div>
                  <label
                    htmlFor="captain-code"
                    className="flex items-center gap-2 text-sm font-medium mb-2"
                  >
                    <Crown className="w-4 h-4 text-yellow-500" />
                    Captain Code
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <input
                      id="captain-code"
                      type="text"
                      value={captainCode}
                      readOnly={true}
                      className="flex-1 px-3 py-2 border rounded text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(captainCode, "Captain")}
                      className="px-3 py-2 border rounded hover:bg-gray-100"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Share this code with someone who should have captain access
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="user-code-input"
                  className="flex items-center gap-2 text-sm font-medium mb-2"
                >
                  <Users className="w-4 h-4 text-blue-500" />
                  User Code
                </label>
                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                  <input
                    id="user-code-input"
                    type="text"
                    value={userCode}
                    readOnly={true}
                    className="flex-1 px-3 py-2 border rounded text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(userCode, "User")}
                    className="px-3 py-2 border rounded hover:bg-gray-100"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Share this code with team members who should have view access
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Enter a code to join a team. You&apos;ll get the appropriate access level based on
                the code type.
              </p>

              <div>
                <label htmlFor="join-code" className="block text-sm font-medium mb-2">
                  Team Code
                </label>
                <input
                  id="join-code"
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter team code..."
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <button
                type="button"
                onClick={handleJoinTeam}
                disabled={isLoading || !joinCode.trim()}
                className="w-full py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
              >
                {isLoading ? "Joining..." : "Join Team"}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded">
              {success}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
