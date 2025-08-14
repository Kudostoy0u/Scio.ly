'use client';
import React, { useState, useEffect } from 'react';
import { FaShareAlt } from "react-icons/fa";
// ToastContainer is globally provided in Providers
import { useTheme } from '@/app/contexts/ThemeContext';
import EditQuestionModal from '@/app/components/EditQuestionModal';
import ShareModal from '@/app/components/ShareModal';
import { useTestState } from './hooks/useTestState';
import { TestLayout, TestHeader, ProgressBar, QuestionCard, TestFooter } from './components';
import { FloatingActionButtons } from '@/app/components/FloatingActionButtons';

export default function TestContent({ initialData, initialRouterData }: { initialData?: any[]; initialRouterData?: any }) {
  const { darkMode } = useTheme();
  const [isOffline, setIsOffline] = useState(false);
  
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

  if (!isMounted) {
    return null;
  }

  const isFromBookmarks = localStorage.getItem('testFromBookmarks') === 'true';
    
  return (
    <>
      <TestLayout darkMode={darkMode}>
        <TestHeader
          eventName={routerData.eventName || 'Loading...'}
          timeLeft={timeLeft}
          darkMode={darkMode}
          isFromBookmarks={isFromBookmarks}
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

        <ProgressBar
          answeredCount={Object.keys(userAnswers).length}
          totalCount={data.length}
          isSubmitted={isSubmitted}
        />

          <main
          className={`w-full max-w-3xl rounded-lg shadow-md p-6 mt-4 ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}
          >
          <button
            onClick={() => setShareModalOpen(true)}
            disabled={isOffline}
            title={isOffline ? "Share feature not available offline" : "Share Test"}
            className="absolute"
          >
            <div className={`flex justify-between transition-all duration-200 ${
              isOffline 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-blue-400 hover:text-blue-500'
            }`}>
              <FaShareAlt className="transition-all duration-500 mt-0.5" />
              <p>&nbsp;&nbsp;Take together</p>
          </div>
          </button>

            {isLoading ? (
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
                <div className="container mx-auto px-4 py-8 mt-3">
                  {data.map((question, index) => {
                    const isBookmarked = isQuestionBookmarked(question);

                    return (
                    <QuestionCard
                        key={index}
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
                </div>

              <TestFooter
                isSubmitted={isSubmitted}
                darkMode={darkMode}
                onSubmit={handleSubmit}
                onReset={handleResetTest}
                onBackToMain={handleBackToMain}
              />
              </>
            )}
          </main>
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

      {/* Floating Action Buttons */}
      <FloatingActionButtons
        darkMode={darkMode}
        onReset={handleResetTest}
        showReferenceButton={routerData.eventName === 'Codebusters'}
        onShowReference={() => {
          // Handle reference button click for codebusters
          window.open('/2024_Div_C_Resource.pdf', '_blank');
        }}
        eventName={routerData.eventName}
      />

      {/* Global ToastContainer handles notifications */}
    </>
  );
}


