import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const STORAGE_KEY = 'teams_migration_warning_seen';

export default function MigrationWarningModal({
  darkMode,
  isOpen,
  onClose,
}: {
  darkMode: boolean;
  isOpen: boolean;
  onClose: () => void;
}) {
  // Check localStorage on mount to see if warning was already shown this session
  useEffect(() => {
    try {
      const seen = sessionStorage.getItem(STORAGE_KEY);
      if (seen === 'true') {
        onClose();
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [onClose]);

  const handleClose = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Ignore localStorage errors
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div 
        className={`${
          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        } w-full max-w-lg rounded-xl shadow-2xl overflow-hidden`}
      >
        {/* Header with warning color */}
        <div className={`${
          darkMode ? 'bg-yellow-900/30 border-b border-yellow-800' : 'bg-yellow-50 border-b border-yellow-200'
        } px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-6 h-6 ${
              darkMode ? 'text-yellow-400' : 'text-yellow-600'
            }`} />
            <h2 className="text-xl font-bold">System Migration Notice</h2>
          </div>
          <button
            onClick={handleClose}
            className={`p-1 rounded-full transition-colors ${
              darkMode 
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-800'
            }`}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          <div className={`${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          } space-y-3`}>
            <p className="text-base leading-relaxed">
              <strong>Important:</strong> The Teams feature will be migrating to a new system in the coming days.
            </p>
            
            <p className="text-base leading-relaxed">
              During this transition period, you may experience:
            </p>
            
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Temporary service interruptions</li>
              <li>Changes to the user interface</li>
              <li>Potential data synchronization delays</li>
            </ul>
            
            <p className="text-base leading-relaxed font-semibold">
              ⚠️ Please note: All existing team data will be deleted during the migration. If you have important roster information, please save it elsewhere before the migration occurs.
            </p>
          </div>

          {/* Footer message */}
          <div className={`${
            darkMode 
              ? 'bg-red-900/20 border border-red-800 text-red-300' 
              : 'bg-red-50 border border-red-200 text-red-800'
          } rounded-lg p-3 text-sm`}>
            <p>
              🚨 <strong>Action Required:</strong> Back up any important team data now. All data will be permanently deleted during migration.
            </p>
          </div>
        </div>

        {/* Action button */}
        <div className={`${
          darkMode ? 'bg-gray-900 border-t border-gray-700' : 'bg-gray-50 border-t border-gray-200'
        } px-6 py-4 flex justify-end`}>
          <button
            onClick={handleClose}
            className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
              darkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}

