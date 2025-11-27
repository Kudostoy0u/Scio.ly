"use client";

interface ArchiveTeamModalProps {
  isOpen: boolean;
  darkMode: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ArchiveTeamModal({ isOpen, darkMode, onConfirm, onCancel }: ArchiveTeamModalProps) {
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
          Archive Team
        </h3>
        <p className={`mb-6 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
          Are you sure you want to archive this team? This action will move the team to the archived
          section and can be undone later.
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
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Archive Team
          </button>
        </div>
      </div>
    </div>
  );
}
