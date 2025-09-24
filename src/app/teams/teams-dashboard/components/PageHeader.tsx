import React from 'react';
import { Share2 } from 'lucide-react';

export default function PageHeader({
  darkMode,
  selection,
  onShare,
  onUnlink,
}: {
  darkMode: boolean;
  selection: { school: string; captain: boolean } | null;
  onShare: () => void;
  onUnlink: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold">Teams</h1>
      {selection && (
        <div className="flex items-center gap-3 text-sm">
          <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{selection.school}</span>
          <span className={`px-2 py-0.5 rounded ${selection.captain ? 'bg-blue-600 text-white' : darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>{selection.captain ? 'Captain' : 'Member'}</span>
          <button 
            onClick={onShare}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            title="Share team"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button onClick={onUnlink} className={`px-2 py-1 border rounded transition-colors ${darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-800'}`}>Unlink</button>
        </div>
      )}
    </div>
  );
}


