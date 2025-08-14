import React from 'react';
import { FaShareAlt } from 'react-icons/fa';

interface ShareButtonProps {
  onShare: () => void;
  isOffline?: boolean;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ onShare, isOffline = false }) => {
  return (
    <button
      onClick={onShare}
      disabled={isOffline}
      title={isOffline ? "Share feature not available offline" : "Share Test"}
      className="mb-4"
    >
      <div className={`flex justify-between transition-all duration-200 ${
        isOffline 
          ? 'text-gray-400 cursor-not-allowed' 
          : 'text-blue-400 hover:text-blue-500'
      }`}>
        <FaShareAlt className="transition-all duration-500 mt-0.5"/> 
        <p>&nbsp;&nbsp;Take together</p>
      </div>
    </button>
  );
};
