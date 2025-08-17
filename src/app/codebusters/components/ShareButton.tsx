import React from 'react';
import { FaShareAlt } from 'react-icons/fa';
import { RefreshCcw } from 'lucide-react';

interface ShareButtonProps {
  onShare: () => void;
  onReset?: () => void;
  isOffline?: boolean;
  darkMode?: boolean;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ onShare, onReset, isOffline = false, darkMode = false }) => {
  return (
    <div className="flex justify-between items-center mb-4">
      {onReset && (
        <button
          onClick={onReset}
          title="Reset Test"
          className={`flex items-center transition-all duration-200 ${
            darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          <span className="text-sm">Reset</span>
        </button>
      )}
      
      <button
        onClick={onShare}
        disabled={isOffline}
        title={isOffline ? "Share feature not available offline" : "Share Test"}
      >
        <div className={`flex items-center transition-all duration-200 ${
          isOffline 
            ? 'text-gray-400 cursor-not-allowed' 
            : 'text-blue-400 hover:text-blue-500'
        }`}>
          <FaShareAlt className="transition-all duration-500 mr-2" />
          <span className="text-sm">Take together</span>
        </div>
      </button>
    </div>
  );
};
