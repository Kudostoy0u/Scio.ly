import React from 'react';

export default function ExistingTeamWarning({
  darkMode,
  open,
  division,
  onCancel,
  onConfirm,
}: {
  darkMode: boolean;
  open: boolean;
  division: 'B' | 'C';
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-xl max-w-md w-full p-6`}>
        <div className="text-lg font-semibold mb-2">Team already exists</div>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm`}>
          Someone has already created a team for this school in Division {division}. Do you want to create a new one?
        </p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onCancel} className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'} px-3 py-1.5 rounded`}>
            Cancel
          </button>
          <button onClick={onConfirm} className={`${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} px-3 py-1.5 rounded`}>
            Create New Team
          </button>
        </div>
      </div>
    </div>
  );
}


