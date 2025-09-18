'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTheme } from '@/app/contexts/ThemeContext';

interface CollapsibleExampleProps {
  title: string;
  children: React.ReactNode;
  variant?: 'request' | 'response';
  defaultOpen?: boolean;
}

export default function CollapsibleExample({ 
  title, 
  children, 
  variant = 'response', 
  defaultOpen = false 
}: CollapsibleExampleProps) {
  const { darkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const getVariantStyles = () => {
    if (variant === 'request') {
      return darkMode 
        ? 'bg-yellow-900/20 border-yellow-800' 
        : 'bg-yellow-50 border-yellow-200';
    }
    return darkMode 
      ? 'bg-green-900/20 border-green-800' 
      : 'bg-green-50 border-green-200';
  };

  const getHoverStyles = () => {
    if (variant === 'request') {
      return darkMode 
        ? 'hover:bg-yellow-900/30' 
        : 'hover:bg-yellow-100';
    }
    return darkMode 
      ? 'hover:bg-green-900/30' 
      : 'hover:bg-green-100';
  };

  return (
    <div className={`rounded-lg border ${getVariantStyles()}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-4 text-left flex items-center justify-between transition-colors rounded-lg ${getHoverStyles()}`}
      >
        <h4 className={`font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
          {title}
        </h4>
        {isOpen ? (
          <ChevronDown className="w-5 h-5" />
        ) : (
          <ChevronRight className="w-5 h-5" />
        )}
      </button>
      
      {isOpen && (
        <div className="px-4 pb-4">
          <pre className="text-sm overflow-x-auto">
            <code className={`${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              {children}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
}
