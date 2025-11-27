"use client";

interface DeleteSubteamModalProps {
  isOpen: boolean;
  darkMode: boolean;
  subteamName: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteSubteamModal({
  isOpen,
  darkMode,
  subteamName,
  onConfirm,
  onCancel,
}: DeleteSubteamModalProps) {
  if (!(isOpen && subteamName)) {
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
          Delete Subteam
        </h3>
        <p className={`mb-6 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
          Are you sure you want to delete the subteam &ldquo;{subteamName}&rdquo;? This action
          cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className={`px-4 py-2 rounded-lg transition-colors ${
              darkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
