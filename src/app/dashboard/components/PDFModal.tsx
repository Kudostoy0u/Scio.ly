import React from 'react';

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
  if (!showPDFViewer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={onClose}>
      <div 
        className="relative w-11/12 h-5/6 max-w-5xl bg-white rounded-lg shadow-2xl flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex justify-between items-center p-4 ${darkMode ? 'bg-gray-800 text-white' : 'bg-blue-100 text-gray-800'} rounded-t-lg`}>
          <h3 className="text-lg font-semibold">Codebusters Reference</h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-full hover:bg-opacity-20 ${darkMode ? 'hover:bg-white text-white' : 'hover:bg-gray-500 text-gray-700'}`}
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
          />
        </div>
      </div>
    </div>
  );
};
