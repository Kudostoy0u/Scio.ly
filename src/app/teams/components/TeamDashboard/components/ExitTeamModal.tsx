"use client";

interface ExitTeamModalProps {
  isOpen: boolean;
  darkMode: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ExitTeamModal({ isOpen, darkMode, onConfirm, onCancel }: ExitTeamModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
    >
      <div
        className={`rounded-lg p-6 max-w-md w-full mx-4 ${darkMode ? "bg-gray-800" : "bg-white"}`}
      >
        <h3 className={`text-lg font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
          Exit Team
        </h3>
        <p className={`mb-6 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
          Are you sure you want to exit this team?
        </p>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className={`px-4 py-2 border rounded-lg transition-colors ${
              darkMode
                ? "text-gray-300 border-gray-600 hover:bg-gray-700"
                : "text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Exit Team
          </button>
        </div>
      </div>
    </div>
  );
}
