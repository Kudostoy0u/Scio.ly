import React from 'react';
import { FaShareAlt } from 'react-icons/fa';

interface ShareButtonProps {
  onShare: () => void;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ onShare }) => {
  return (
    <button
      onClick={onShare}
      title="Share Test"
      className="mb-4"
    >
      <div className="flex justify-between text-blue-400">
        <FaShareAlt className="transition-all duration-500 mt-0.5"/> 
        <p>&nbsp;&nbsp;Take together</p>
      </div>
    </button>
  );
};
