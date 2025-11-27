/**
 * Component for displaying the list of leaderboards
 */

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { Leaderboard } from "../types";

interface LeaderboardItemProps {
  leaderboard: Leaderboard;
  selectedLeaderboard: string | null;
  onSelect: (id: string) => void;
  darkMode: boolean;
  copied: boolean;
  onCopy: (code: string) => void;
}

function LeaderboardItem({
  leaderboard: lb,
  selectedLeaderboard,
  onSelect,
  darkMode,
  copied,
  onCopy,
}: LeaderboardItemProps) {
  return (
    <button
      key={lb.id}
      type="button"
      onClick={() => onSelect(lb.id)}
      className={`p-3 rounded-lg cursor-pointer transition-colors border text-left w-full ${
        selectedLeaderboard === lb.id
          ? darkMode
            ? "bg-blue-900/20 border-blue-400"
            : "bg-blue-50 border-blue-500"
          : darkMode
            ? "border-gray-700 hover:bg-gray-700"
            : "border-gray-200 hover:bg-gray-100"
      }`}
    >
      {lb.is_public && (
        <span
          className={`inline-block text-[10px] px-2 py-0.5 rounded-full mb-1 ${darkMode ? "bg-blue-900 text-blue-300" : "bg-blue-100 text-blue-700"}`}
        >
          Global
        </span>
      )}
      <h3 className={`font-medium ${darkMode ? "" : "text-gray-900"}`}>{lb.name}</h3>
      <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-700"}`}>{lb.description}</p>
      {lb.join_code && (
        <div className="flex items-center gap-2 mt-2">
          <code className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
            {lb.join_code}
          </code>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (lb.join_code) {
                onCopy(lb.join_code);
              }
            }}
            className={`${darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}
    </button>
  );
}

interface LeaderboardListProps {
  leaderboards: Leaderboard[];
  selectedLeaderboard: string | null;
  onSelect: (id: string) => void;
  onJoinPublic: () => void;
  hasJoinedPublic: boolean;
  publicLeaderboard: Leaderboard | null;
  darkMode: boolean;
}

export function LeaderboardList({
  leaderboards,
  selectedLeaderboard,
  onSelect,
  onJoinPublic,
  hasJoinedPublic,
  publicLeaderboard,
  darkMode,
}: LeaderboardListProps) {
  const [copied, setCopied] = useState(false);

  const copyJoinLink = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`rounded-lg p-4 ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"} shadow-sm`}
    >
      <h2 className={`text-xl font-semibold mb-4 ${darkMode ? "" : "text-gray-900"}`}>
        Your Leaderboards
      </h2>
      <div className="space-y-2">
        {!hasJoinedPublic && publicLeaderboard && (
          <div
            className={`p-3 rounded-lg border ${darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"} flex items-start justify-between gap-3`}
          >
            <div>
              <h3 className={`font-medium ${darkMode ? "" : "text-gray-900"}`}>
                Global Leaderboard
              </h3>
              <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-700"}`}>
                Compete with everyone on Scio.ly
              </p>
            </div>
            <button
              type="button"
              onClick={onJoinPublic}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Join
            </button>
          </div>
        )}
        {leaderboards.length === 0 ? (
          <p className={`text-center py-8 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Join with a code or create a private leaderboard to get started.
          </p>
        ) : (
          leaderboards.map((lb) => (
            <LeaderboardItem
              key={lb.id}
              leaderboard={lb}
              selectedLeaderboard={selectedLeaderboard}
              onSelect={onSelect}
              darkMode={darkMode}
              copied={copied}
              onCopy={copyJoinLink}
            />
          ))
        )}
      </div>
    </div>
  );
}
