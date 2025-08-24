'use client';
import React, { useState, useEffect } from 'react';
import { FaShareAlt } from "react-icons/fa";
import { RefreshCcw } from 'lucide-react';
// ToastContainer is globally provided in Providers
import { useTheme } from '@/app/contexts/ThemeContext';
import EditQuestionModal from '@/app/components/EditQuestionModal';
import ShareModal from '@/app/components/ShareModal';
import Header from '@/app/components/Header';
import { useTestState } from './hooks/useTestState';
import { TestLayout, TestHeader, ProgressBar, TestSummary, QuestionCard, TestFooter, TestPrintConfigModal } from './components';
import { FloatingActionButtons } from '@/app/components/FloatingActionButtons';
import { createTestPrintStyles, createTestPrintContent, setupTestPrintWindow } from './utils/printUtils';
import { toast } from 'react-toastify';

export default function TestContent({ initialData, initialRouterData }: { initialData?: any[]; initialRouterData?: any }) {
  const { darkMode } = useTheme();
  const [isOffline, setIsOffline] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [tournamentName, setTournamentName] = useState('');
  const [questionPoints, setQuestionPoints] = useState<{[key: number]: number}>({});
  
  // Detect offline status
  useEffect(() => {
    const updateOnline = () => setIsOffline(!navigator.onLine);
    updateOnline();
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  const {
    // State
    isLoading,
    data,
      routerData,
    userAnswers,
    isSubmitted,
    fetchError,
    timeLeft,
      explanations,
    loadingExplanation,
      gradingResults,
    gradingFRQs,
    isMounted,
    shareModalOpen,
    inputCode,
    submittedReports,
    submittedEdits,
    isEditModalOpen,
    editingQuestion,
    isResetting,
    
    // Handlers
    handleAnswerChange,
    handleSubmit,
    handleResetTest,
    handleGetExplanation,
    handleBookmarkChange,
    handleReportSubmitted,
    handleEditSubmitted,
    handleQuestionRemoved,
    handleEditOpen,
    handleEditSubmit,
    closeShareModal,
    handleBackToMain,
    isQuestionBookmarked,
    setShareModalOpen,
    setInputCode,
    setIsEditModalOpen
  } = useTestState({ initialData, initialRouterData });

  // Handle print configuration modal
  const handlePrintConfig = () => {
    setPrintModalOpen(true);
  };

  // Handle actual printing
  const handleActualPrint = async () => {
    if (!tournamentName.trim()) {
      toast.error('Tournament name is required');
      return;
    }

    // Create custom compact text-based format for questions
    const formatQuestionsForPrint = () => {
      let questionsHtml = '';
      
      data.forEach((question, index) => {
        const points = questionPoints[index] || (question.options && question.options.length > 0 ? 2 : 5);
        
        // Start question div
        questionsHtml += `<div class="question">`;
        
        // Question number and text
        questionsHtml += `<div class="question-header">${index + 1}. ${question.question} [${points} pts]</div>`;
        
        // Add image if present
        if (question.imageUrl || (question as any).imageData) {
          questionsHtml += `<div class="question-image">
            <img src="${(question as any).imageData || question.imageUrl}" alt="Question Image" />
          </div>`;
        }
        
        // Handle multiple choice questions
        if (question.options && question.options.length > 0) {
          questionsHtml += `<div class="question-options">`;
          question.options.forEach((option, optionIndex) => {
            const letter = String.fromCharCode(97 + optionIndex); // a, b, c, d...
            questionsHtml += `<div class="option">${letter}. ${option}</div>`;
          });
          questionsHtml += `</div>`;
        } else {
          // Free response question - add answer lines
          questionsHtml += `<div class="answer-space">
            <div class="answer-line">Answer: _________________________________________________</div>
            <div class="answer-line">_______________________________________________________</div>
            <div class="answer-line">_______________________________________________________</div>
          </div>`;
        }
        
        questionsHtml += `</div>`; // Close question div
      });
      
      return questionsHtml;
    };

    // Get minimal stylesheets for print
    const getStylesheets = () => {
      // Return minimal CSS for clean text-based layout
      return '';
    };

    // Create print styles using utility function
    const printStyles = createTestPrintStyles(getStylesheets);

    // Create answer key
    const createAnswerKey = () => {
      let answerKeyHtml = '<div class="answer-key-section">';
      answerKeyHtml += '<div class="answer-key-header">ANSWER KEY</div>';
      answerKeyHtml += '<div class="answer-key-content">';
      
      // Calculate how many columns we can fit (aim for 4-5 columns)
      const totalQuestions = data.length;
      const columns = Math.min(5, Math.ceil(totalQuestions / 20)); // 20 questions per column max
      const questionsPerColumn = Math.ceil(totalQuestions / columns);
      
      for (let col = 0; col < columns; col++) {
        answerKeyHtml += '<div class="answer-column">';
        
        for (let i = col * questionsPerColumn; i < Math.min((col + 1) * questionsPerColumn, totalQuestions); i++) {
          const question = data[i];
          const questionNumber = i + 1;
          
          if (question.options && question.options.length > 0) {
            // Multiple choice question - find the correct answer letter
            const correctAnswers = question.answers;
            let answerLetters = '';
            
                         if (Array.isArray(correctAnswers)) {
               answerLetters = correctAnswers.map(ans => {
                 if (typeof ans === 'string') {
                   // Find the index of this answer in the options
                   const optionIndex = question.options?.findIndex(opt => opt === ans) ?? -1;
                   return optionIndex >= 0 ? String.fromCharCode(97 + optionIndex) : ans;
                 } else if (typeof ans === 'number') {
                   // Direct index
                   return String.fromCharCode(97 + ans);
                 }
                 return ans;
               }).join(', ');
             } else if (typeof correctAnswers === 'string') {
               const optionIndex = question.options?.findIndex(opt => opt === correctAnswers) ?? -1;
               answerLetters = optionIndex >= 0 ? String.fromCharCode(97 + optionIndex) : correctAnswers;
             } else if (typeof correctAnswers === 'number') {
               answerLetters = String.fromCharCode(97 + correctAnswers);
             }
            
            answerKeyHtml += `<div class="answer-item">${questionNumber}. ${answerLetters}</div>`;
          } else {
            // Free response question
            answerKeyHtml += `<div class="answer-item">${questionNumber}. [judge on accuracy and completeness]</div>`;
          }
        }
        
        answerKeyHtml += '</div>'; // Close column
      }
      
      answerKeyHtml += '</div>'; // Close answer-key-content
      answerKeyHtml += '</div>'; // Close answer-key-section
      
      return answerKeyHtml;
    };

    // Create print content using utility function
    const printContent = createTestPrintContent({
      tournamentName,
      questionsHtml: formatQuestionsForPrint() + createAnswerKey(),
      questionPoints
    }, printStyles);

    // Setup print window using utility function
    try {
      // Use the robust popup-based print approach
      await setupTestPrintWindow(printContent);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to print test');
    }

    // Close the modal
    setPrintModalOpen(false);
  };

  if (!isMounted) {
    return null;
  }

  const isFromBookmarks = localStorage.getItem('testFromBookmarks') === 'true';
    
  return (
    <>
      <Header />
      <TestLayout darkMode={darkMode}>
        <div className="pt-20">
          <TestHeader
            eventName={routerData.eventName || 'Loading...'}
            timeLeft={timeLeft}
            darkMode={darkMode}
            isFromBookmarks={isFromBookmarks}
            isSubmitted={isSubmitted}
          />

          {/* Inline back link to Practice */}
          <div className="w-full max-w-3xl mt-0.5 mb-5">
          <button
            onClick={handleBackToMain}
            className={`group inline-flex items-center text-base font-medium ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
            <span className="ml-2">Go back</span>
          </button>
        </div>

        {isSubmitted ? (
          <TestSummary
            data={data}
            userAnswers={userAnswers}
            gradingResults={gradingResults}
            darkMode={darkMode}
          />
        ) : (
          <ProgressBar
            answeredCount={Object.keys(userAnswers).length}
            totalCount={data.length}
            isSubmitted={isSubmitted}
          />
        )}

          <main
          className={`w-full max-w-3xl min-w-[50vw] rounded-lg shadow-md p-6 mt-4 ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}
          >
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleResetTest}
                title="Reset Test"
                className={`flex items-center transition-all duration-200 ${
                  darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                <span className="text-sm">Reset</span>
              </button>
              
              <button
                onClick={handlePrintConfig}
                disabled={isOffline || data.length === 0}
                title={isOffline ? "Print feature not available offline" : "Print Test"}
                className={`flex items-center transition-all duration-200 ${
                  isOffline || data.length === 0
                    ? 'text-gray-400 cursor-not-allowed' 
                    : darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span className="text-sm">Print</span>
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              
              <button
                onClick={() => setShareModalOpen(true)}
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
          </div>

            <div className="container mx-auto px-4 mt-3">
              {isLoading && !isResetting ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
                </div>
              ) : fetchError ? (
                <div className="text-red-600 text-center">{fetchError}</div>
              ) : routerData.eventName === "Codebusters" && routerData.types === 'multiple-choice' ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <p className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    No MCQs available for this event
                  </p>
                  <p className={`text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Please select &quot;MCQ + FRQ&quot; in the dashboard to practice this event
                  </p>
                </div>
              ) : (
                <>
                  {data.map((question, index) => {
                    const isBookmarked = isQuestionBookmarked(question);
                    // Use a more stable key that includes question content to prevent DOM manipulation errors
                    const questionKey = question.id || `question-${index}-${question.question.substring(0, 50)}`;

                    return (
                    <QuestionCard
                        key={questionKey}
                            question={question}
                      index={index}
                      userAnswers={userAnswers[index] || []}
                      isSubmitted={isSubmitted}
                      darkMode={darkMode}
                      eventName={routerData.eventName || 'Unknown Event'}
                            isBookmarked={isBookmarked}
                      gradingResults={gradingResults}
                      explanations={explanations}
                      loadingExplanation={loadingExplanation}
                      submittedReports={submittedReports}
                      submittedEdits={submittedEdits}
                      gradingFRQs={gradingFRQs}
                      onAnswerChange={handleAnswerChange}
                            onBookmarkChange={handleBookmarkChange}
                            onReportSubmitted={handleReportSubmitted}
                            onEditSubmitted={handleEditSubmitted}
                      onEdit={handleEditOpen}
                            onQuestionRemoved={handleQuestionRemoved}
                      onGetExplanation={handleGetExplanation}
                      isOffline={isOffline}
                    />
                    );
                  })}
                </>
              )}
            </div>

            {!isLoading && !fetchError && !(routerData.eventName === "Codebusters" && routerData.types === 'multiple-choice') && data.length > 0 && (
              <TestFooter
                isSubmitted={isSubmitted}
                darkMode={darkMode}
                onSubmit={handleSubmit}
                onReset={handleResetTest}
                onBackToMain={handleBackToMain}
              />
            )}
          </main>
        </div>
      </TestLayout>

      <ShareModal
        isOpen={shareModalOpen}
        onClose={closeShareModal}
        inputCode={inputCode}
        setInputCode={setInputCode}
        darkMode={darkMode}
      />

      {editingQuestion && (
        <EditQuestionModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleEditSubmit}
          darkMode={darkMode}
          question={editingQuestion}
          eventName={routerData.eventName || 'Unknown Event'}
          canEditAnswers={isSubmitted}
        />
      )}

      {/* Test Print Configuration Modal */}
      <TestPrintConfigModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        onPrint={handleActualPrint}
        questions={data}
        tournamentName={tournamentName}
        setTournamentName={setTournamentName}
        questionPoints={questionPoints}
        setQuestionPoints={setQuestionPoints}
        darkMode={darkMode}
      />

      {/* Floating Action Buttons */}
      <FloatingActionButtons
        darkMode={darkMode}
        showReferenceButton={routerData.eventName === 'Codebusters'}
        onShowReference={() => {
          // Handle reference button click for codebusters
          window.open('/2024_Div_C_Resource.pdf', '_blank');
        }}
        eventName={routerData.eventName}
        hidden={isEditModalOpen}
      />

      {/* Global ToastContainer handles notifications */}
    </>
  );
}


