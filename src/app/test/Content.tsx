'use client';
import React from 'react';
import { FaShareAlt } from "react-icons/fa";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTheme } from '@/app/contexts/ThemeContext';
import PDFViewer from '@/app/components/PDFViewer';
import EditQuestionModal from '@/app/components/EditQuestionModal';
import ShareModal from '@/app/components/ShareModal';
import { useTestState } from './hooks/useTestState';
import { TestLayout, TestHeader, ProgressBar, QuestionCard, TestFooter } from './components';

export default function TestPage() {
  const { darkMode } = useTheme();
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
  } = useTestState();

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
          onReset={handleResetTest}
        />

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
            title="Share Test"
            className="absolute"
          >
            <div className="flex justify-between text-blue-400">
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
                      onAnswerChange={handleAnswerChange}
                            onBookmarkChange={handleBookmarkChange}
                            onReportSubmitted={handleReportSubmitted}
                            onEditSubmitted={handleEditSubmitted}
                      onEdit={handleEditOpen}
                            onQuestionRemoved={handleQuestionRemoved}
                      onGetExplanation={handleGetExplanation}
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

      {/* Add the reference button as sticky at the bottom */}
      {routerData.eventName === 'Codebusters' && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30 mb-2">
          <PDFViewer 
            pdfPath="/2024_Div_C_Resource.pdf" 
            buttonText="Codebusters Reference" 
            darkMode={darkMode} 
          />
        </div>
      )}

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={darkMode ? "dark" : "light"}
      />
    </>
  );
}


