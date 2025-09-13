import React from 'react';

interface TestPrintConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  questions: any[];
  tournamentName: string;
  setTournamentName: (name: string) => void;
  questionPoints: {[key: number]: number};
  setQuestionPoints: (points: {[key: number]: number}) => void;
  darkMode: boolean;
}

export const TestPrintConfigModal: React.FC<TestPrintConfigModalProps> = ({
  isOpen,
  onClose,
  onPrint,
  questions,
  tournamentName,
  setTournamentName,
  questionPoints,
  setQuestionPoints,
  darkMode
}) => {
  if (!isOpen) return null;

  const handlePointChange = (index: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setQuestionPoints({
      ...questionPoints,
      [index]: numValue
    });
  };

  const getSuggestedPoints = (question: any) => {


    if (question.options && question.options.length > 0) {
      return 2;
    } else {
      return 5;
    }
  };

  const getQuestionType = (question: any) => {
    if (question.options && question.options.length > 0) {
      return 'Multiple Choice';
    } else {
      return 'Free Response';
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-black' : 'bg-black'}`} style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className={`max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} rounded-lg shadow-xl`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Print Test Configuration
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-full hover:bg-opacity-20 ${darkMode ? 'hover:bg-white text-white' : 'hover:bg-gray-200 text-gray-600'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tournament Name */}
          <div className="mb-6">
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Tournament Name *
            </label>
            <input
              type="text"
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Enter tournament name"
            />
          </div>

          {/* Tournament Use Warning */}
          <div className={`mb-4 p-4 border-l-4 rounded-r-lg ${darkMode ? 'bg-red-900/30 border-red-400 text-red-200' : 'bg-red-50 border-red-500 text-red-800'}`}>
            <div className="flex items-start">
              <svg className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-semibold mb-1">Not for Official Tournament Use</h4>
                <p className="text-sm">
                  This tool is designed for practice and educational purposes only. 
                  Do not use these generated tests for official Science Olympiad tournaments.
                </p>
              </div>
            </div>
          </div>

          {/* Print Optimization Info */}
          <div className={`mb-6 p-4 border-l-4 rounded-r-lg ${darkMode ? 'bg-blue-900/30 border-blue-400 text-blue-200' : 'bg-blue-50 border-blue-500 text-blue-800'}`}>
            <div className="flex items-start">
              <svg className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-semibold mb-1">Print Optimization Tip</h4>
                <p className="text-sm">
                  For optimal printing results, go to your browser&apos;s print options and disable headers and footers. 
                  This will ensure clean page margins and proper formatting.
                </p>
              </div>
            </div>
          </div>

          {/* Question Points */}
          <div className="mb-6">
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Question Point Values
            </h3>
            <div className="space-y-3">
              {questions.map((question, index) => {
                const questionType = getQuestionType(question);
                const suggestedPoints = getSuggestedPoints(question);
                const currentPoints = questionPoints[index] || suggestedPoints;

                return (
                  <div key={index} className={`p-4 border rounded-lg ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Question {index + 1}
                      </span>
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {questionType}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Suggested: </span>
                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{suggestedPoints} pts</span>
                      </div>
                      <div>
                        <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Points: </span>
                        <input
                          type="number"
                          value={currentPoints}
                          onChange={(e) => handlePointChange(index, e.target.value)}
                          min="1"
                          max="100"
                          className={`w-16 px-2 py-1 border rounded text-center ${
                            darkMode 
                              ? 'bg-gray-600 border-gray-500 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className={`px-4 py-2 border rounded-md ${
                darkMode 
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={onPrint}
              disabled={!tournamentName.trim()}
              className={`px-4 py-2 rounded-md ${
                !tournamentName.trim()
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Print Test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
