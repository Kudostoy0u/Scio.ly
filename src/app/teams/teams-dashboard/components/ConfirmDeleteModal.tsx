import React from 'react';

export default function ConfirmDeleteModal({
  darkMode,
  open,
  teamName,
  onCancel,
  onConfirm,
}: {
  darkMode: boolean;
  open: boolean;
  teamName?: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} w-full max-w-sm rounded-lg shadow-xl p-5`}>
        <div className="text-lg font-semibold mb-2">Delete subteam</div>
        <div className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm mb-4`}>Are you sure you want to delete &quot;{teamName || ''}&quot;? This cannot be undone.</div>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onCancel} className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'} px-3 py-1.5 rounded`}>Cancel</button>
          <button onClick={onConfirm} className={`${darkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'} px-3 py-1.5 rounded`}>Delete</button>
        </div>
      </div>
    </div>
  );
}


