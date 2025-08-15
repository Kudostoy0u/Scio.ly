import React, { useState, useEffect } from 'react';

interface PDFModalProps {
  showPDFViewer: boolean;
  darkMode: boolean;
  onClose: () => void;
}

export const PDFModal: React.FC<PDFModalProps> = ({ 
  showPDFViewer, 
  darkMode, 
  onClose 
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleOpenInNewWindow = () => {
    window.open('/2024_Div_C_Resource.pdf', '_blank');
    onClose();
  };

  const handleIframeError = () => {
    setIframeError(true);
  };

  if (!showPDFViewer) return null;

  // On mobile or if iframe fails, show option to open in new window
  if (isMobile || iframeError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={onClose}>
        <div 
          className={`relative w-11/12 max-w-md p-6 rounded-lg shadow-2xl ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Codebusters Reference</h3>
            <button
              onClick={onClose}
              className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-300 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {isMobile ? 'PDF viewer is not available on mobile devices.' : 'Failed to load PDF in embedded viewer.'}
          </p>
          <button
            onClick={handleOpenInNewWindow}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
          >
            Open PDF in New Window
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={onClose}>
      <div 
        className="relative w-11/12 h-5/6 max-w-5xl bg-white rounded-lg shadow-2xl flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex justify-between items-center p-4 ${darkMode ? 'bg-gray-800 text-white' : 'bg-blue-100 text-gray-800'} rounded-t-lg`}>
          <h3 className="text-lg font-semibold">Codebusters Reference</h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-300 hover:text-white' : 'hover:bg-gray-500 text-gray-700'}`}
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-hidden bg-white">
          <iframe
            src="/2024_Div_C_Resource.pdf"
            className="w-full h-full border-none"
            title="Codebusters Reference PDF"
            onError={handleIframeError}
          />
        </div>
      </div>
    </div>
  );
};