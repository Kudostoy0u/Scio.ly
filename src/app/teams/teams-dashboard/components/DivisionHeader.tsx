import React from 'react';
import { Save as SaveIcon } from 'lucide-react';

export default function DivisionHeader({
  darkMode,
  division,
  isLeader,
  saving,
  onSave,
}: {
  darkMode: boolean;
  division: 'B' | 'C';
  isLeader: boolean;
  saving: boolean;
  onSave: () => void | Promise<void>;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold">Division {division}</h2>
      {isLeader && (
        <button
          onClick={onSave}
          disabled={saving}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-900/50' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300'}`}
          title="Save roster"
        >
          <SaveIcon className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save'}
        </button>
      )}
    </div>
  );
}


