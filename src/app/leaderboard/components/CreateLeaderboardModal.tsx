/**
 * Modal for creating a new private leaderboard
 */

import { useAuth } from "@/app/contexts/authContext";
import { useTheme } from "@/app/contexts/themeContext";
import logger from "@/lib/utils/logger";
import { useState } from "react";

interface CreateLeaderboardModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateLeaderboardModal({ onClose, onCreated }: CreateLeaderboardModalProps) {
  const { darkMode } = useTheme();
  const { client } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [resetFrequency, setResetFrequency] = useState("month");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    const { data, error } = await (
      client.rpc as unknown as (
        name: string,
        args?: Record<string, unknown>
      ) => Promise<{ data: unknown; error: unknown }>
    )("create_private_leaderboard", {
      p_name: name,
      p_description: description,
      p_reset_frequency: resetFrequency,
    });

    if (error) {
      logger.error("Error creating leaderboard:", error);
    } else if (data) {
      onCreated();
      onClose();
    }
    setCreating(false);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose();
        }
      }}
    >
      <div
        className={`rounded-lg p-6 max-w-md w-full ${darkMode ? "bg-gray-800" : "bg-white"}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
          }
        }}
      >
        <h3 className="text-xl font-semibold mb-4">Create Private Leaderboard</h3>

        <input
          type="text"
          placeholder="Leaderboard name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg mb-3 ${
            darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 text-gray-900"
          }`}
        />

        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg mb-3 ${
            darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 text-gray-900"
          }`}
          rows={3}
        />

        <select
          value={resetFrequency}
          onChange={(e) => setResetFrequency(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg mb-4 ${
            darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 text-gray-900"
          }`}
        >
          <option value="week">Reset Weekly</option>
          <option value="month">Reset Monthly</option>
          <option value="6month">Reset Every 6 Months</option>
          <option value="year">Reset Yearly</option>
          <option value="never">Never Reset</option>
        </select>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 px-4 py-2 rounded-lg ${
              darkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!name || creating}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
