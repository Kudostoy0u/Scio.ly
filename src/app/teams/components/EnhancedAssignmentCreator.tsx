"use client";

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { AssignmentCreatorProps, AssignmentDetails, QuestionGenerationSettings } from './assignment/assignmentTypes';
import { 
  getAvailableEvents, 
  getEventSubtopics, 
  getEventCapabilitiesForEvent,
  generateQuestions,
  fetchRosterMembers,
  createAssignment
} from './assignment/assignmentUtils';
import { isCodebustersEvent } from '@/lib/utils/eventConfig';
import AssignmentDetailsStep from './assignment/AssignmentDetailsStep';
import QuestionGenerationStep from './assignment/QuestionGenerationStep';
import QuestionPreviewStep from './assignment/QuestionPreviewStep';
import RosterSelectionStep from './assignment/RosterSelectionStep';
import CodebustersAssignmentCreator from './assignment/CodebustersAssignmentCreator';

export default function EnhancedAssignmentCreator({
  teamId,
  subteamId,
  onAssignmentCreated,
  onCancel,
  darkMode = false,
  prefillEventName = ''
}: AssignmentCreatorProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Assignment details
  const [details, setDetails] = useState<AssignmentDetails>({
    title: '',
    description: '',
    assignmentType: 'homework',
    dueDate: '',
    timeLimitMinutes: 30,
    eventName: prefillEventName
  });

  // Question generation settings
  const [settings, setSettings] = useState<QuestionGenerationSettings>({
    questionCount: 10,
    questionType: 'both',
    selectedSubtopics: [],
    idPercentage: 0,
    pureIdOnly: false
  });

  // Generated questions and roster
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [rosterMembers, setRosterMembers] = useState<any[]>([]);
  const [selectedRoster, setSelectedRoster] = useState<string[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  // Available events and subtopics
  const [availableEvents] = useState<string[]>(getAvailableEvents());
  const [availableSubtopics, setAvailableSubtopics] = useState<string[]>([]);
  const [eventCapabilities, setEventCapabilities] = useState({
    supportsPictureQuestions: false,
    supportsIdentificationOnly: false
  });

  // Update event name when prefillEventName changes
  useEffect(() => {
    if (prefillEventName && prefillEventName !== details.eventName) {
      setDetails(prev => ({ ...prev, eventName: prefillEventName }));
    }
  }, [prefillEventName, details.eventName]);

  // Load roster members when component mounts
  useEffect(() => {
    const loadRosterMembers = async () => {
    setLoadingRoster(true);
    try {
      const members = await fetchRosterMembers(teamId, subteamId);
      setRosterMembers(members);
    } catch (error) {
      console.error('Failed to load roster members:', error);
      setError('Failed to load roster members');
    } finally {
      setLoadingRoster(false);
    }
    };
    
    loadRosterMembers();
  }, [teamId, subteamId]);

  // Update subtopics and capabilities when event changes
  useEffect(() => {
    const updateSubtopicsAndCapabilities = async () => {
      if (details.eventName) {
        try {
          const subtopics = await getEventSubtopics(details.eventName);
          const capabilities = getEventCapabilitiesForEvent(details.eventName);
          setAvailableSubtopics(subtopics);
          setEventCapabilities(capabilities);
        } catch (error) {
          console.error('Error loading subtopics:', error);
          setAvailableSubtopics([]);
        }
      }
    };
    
    updateSubtopicsAndCapabilities();
  }, [details.eventName]);

  // Check if this is a Codebusters assignment and render accordingly
  if (isCodebustersEvent(details.eventName)) {
    return (
      <CodebustersAssignmentCreator
        teamId={teamId}
        subteamId={subteamId}
        onAssignmentCreated={onAssignmentCreated}
        onCancel={onCancel}
        darkMode={darkMode}
        prefillEventName={details.eventName}
      />
    );
  }

  const handleGenerateQuestions = async () => {
    setGeneratingQuestions(true);
    setError(null);
    
    try {
      const questions = await generateQuestions(
        details.eventName,
        settings.questionCount,
        settings.questionType,
        settings.selectedSubtopics,
        settings.idPercentage,
        settings.pureIdOnly,
        teamId
      );
      
      setGeneratedQuestions(questions);
      toast.success(`Generated ${questions.length} questions successfully!`);
    } catch (error) {
      console.error('Failed to generate questions:', error);
      setError('Failed to generate questions. Please try again.');
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const replaceQuestion = async (index: number) => {
    try {
      const newQuestion = await generateQuestions(
        details.eventName,
        1,
        settings.questionType,
        settings.selectedSubtopics,
        settings.idPercentage,
        settings.pureIdOnly,
        teamId
      );
      
      if (newQuestion.length > 0) {
        const updatedQuestions = [...generatedQuestions];
        updatedQuestions[index] = newQuestion[0];
        setGeneratedQuestions(updatedQuestions);
        toast.success('Question replaced successfully!');
      }
    } catch (error) {
      console.error('Failed to replace question:', error);
      setError('Failed to replace question. Please try again.');
    }
  };

  const handleCreateAssignment = async () => {
    setLoading(true);
    setError(null);

    try {
      const assignmentData = {
        title: details.title,
        description: details.description,
        assignment_type: details.assignmentType,
        due_date: details.dueDate,
        time_limit_minutes: details.timeLimitMinutes,
        event_name: details.eventName,
        questions: generatedQuestions,
        roster_members: selectedRoster
      };

      const assignment = await createAssignment(teamId, subteamId, assignmentData);
      
      toast.success('Assignment created successfully!');
      onAssignmentCreated(assignment);
    } catch (error) {
      console.error('Failed to create assignment:', error);
      setError('Failed to create assignment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDetailsChange = (updates: Partial<AssignmentDetails>) => {
    setDetails(prev => ({ ...prev, ...updates }));
  };

  const handleSettingsChange = (updates: Partial<QuestionGenerationSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleNext = () => {
    setError(null);
    setStep(prev => prev + 1);
  };

  const handleQuestionGenerationNext = async () => {
    setError(null);
    try {
      await handleGenerateQuestions();
      setStep(prev => prev + 1);
    } catch {
      // Error is already handled in handleGenerateQuestions
      // Don't advance to next step if generation fails
    }
  };

  const handleBack = () => {
    setError(null);
    setStep(prev => prev - 1);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className={`max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Create Assignment
            </h2>
            <button
              onClick={onCancel}
              className={`p-2 rounded-lg hover:bg-opacity-20 transition-colors ${
                darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNumber
                      ? 'bg-blue-600 text-white'
                      : darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {stepNumber}
                  </div>
                  {stepNumber < 4 && (
                    <div className={`w-12 h-1 mx-2 ${
                      step > stepNumber ? 'bg-blue-600' : darkMode ? 'bg-gray-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Details</span>
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Questions</span>
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Preview</span>
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Roster</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Step 1: Assignment Details */}
          {step === 1 && (
            <AssignmentDetailsStep
              darkMode={darkMode}
              onNext={handleNext}
              onBack={onCancel}
              onError={handleError}
              details={details}
              onDetailsChange={handleDetailsChange}
              prefillEventName={prefillEventName}
              availableEvents={availableEvents}
            />
          )}

          {/* Step 2: Question Generation */}
          {step === 2 && (
            <QuestionGenerationStep
              darkMode={darkMode}
              onNext={handleQuestionGenerationNext}
              onBack={handleBack}
              onError={handleError}
              settings={settings}
              onSettingsChange={handleSettingsChange}
              availableSubtopics={availableSubtopics}
              supportsPictureQuestions={eventCapabilities.supportsPictureQuestions}
              supportsIdentificationOnly={eventCapabilities.supportsIdentificationOnly}
              onGenerateQuestions={handleGenerateQuestions}
              generatingQuestions={generatingQuestions}
            />
          )}

          {/* Step 3: Question Preview */}
          {step === 3 && (
            <QuestionPreviewStep
              onNext={handleNext}
              onBack={handleBack}
              onError={handleError}
              questions={generatedQuestions}
              showAnswers={showAnswers}
              onShowAnswersChange={setShowAnswers}
              onReplaceQuestion={replaceQuestion}
            />
          )}

          {/* Step 4: Roster Selection */}
          {step === 4 && (
            <RosterSelectionStep
              darkMode={darkMode}
              onNext={handleNext}
              onBack={handleBack}
              onError={handleError}
              rosterMembers={rosterMembers}
              selectedRoster={selectedRoster}
              onRosterChange={setSelectedRoster}
              loadingRoster={loadingRoster}
              onCreateAssignment={handleCreateAssignment}
              creating={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
}