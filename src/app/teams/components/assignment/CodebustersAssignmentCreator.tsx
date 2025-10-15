'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { AssignmentCreatorProps, AssignmentDetails, QuestionGenerationSettings, RosterMember } from './assignmentTypes';
import { fetchRosterMembers, createAssignment } from './assignmentUtils';

import { DISABLED_CIPHERS } from '@/app/codebusters/config';
import type { QuoteData } from '@/app/codebusters/types';

// Cipher types organized by division (same as practice page)
const DIVISION_B_ONLY_CIPHERS: QuoteData['cipherType'][] = [
  'Affine',
  'Atbash',
  'Caesar',
];

const DIVISION_C_ONLY_CIPHERS: QuoteData['cipherType'][] = [
  'Hill 2x2',
  'Hill 3x3',
  'K3 Aristocrat',
];

const BOTH_DIVISIONS_CIPHERS: QuoteData['cipherType'][] = [
  'Baconian',
  'Checkerboard',
  'Complete Columnar',
  'Cryptarithm',
  'Fractionated Morse',
  'K1 Aristocrat',
  'K2 Aristocrat',
  'Random Aristocrat',
  'K1 Patristocrat',
  'K2 Patristocrat',
  'K1 Xenocrypt',
  'K2 Xenocrypt',
  'Nihilist',
  'Porta',
];

// Filter out disabled ciphers
const getAvailableCiphers = (division: string): QuoteData['cipherType'][] => {
  let allCiphers: QuoteData['cipherType'][] = [];
  
  if (division === 'B') {
    allCiphers = [...DIVISION_B_ONLY_CIPHERS, ...BOTH_DIVISIONS_CIPHERS];
  } else if (division === 'C') {
    allCiphers = [...DIVISION_C_ONLY_CIPHERS, ...BOTH_DIVISIONS_CIPHERS];
  } else {
    // 'any' or default - include all
    allCiphers = [...DIVISION_B_ONLY_CIPHERS, ...DIVISION_C_ONLY_CIPHERS, ...BOTH_DIVISIONS_CIPHERS];
  }
  
  return allCiphers.filter(cipher => !DISABLED_CIPHERS.includes(cipher));
};

interface CodebustersAssignmentCreatorProps extends AssignmentCreatorProps {
  darkMode?: boolean;
}

export default function CodebustersAssignmentCreator({
  teamId,
  subteamId,
  onAssignmentCreated,
  onCancel,
  darkMode = false,
  prefillEventName = 'Codebusters'
}: CodebustersAssignmentCreatorProps) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);


  // Assignment details
  const [details, setDetails] = useState<AssignmentDetails>({
    title: '',
    description: '',
    assignmentType: 'homework',
    dueDate: '',
    timeLimitMinutes: 15,
    eventName: prefillEventName
  });

  // Codebusters-specific settings
  const [settings, setSettings] = useState<QuestionGenerationSettings>({
    questionCount: 3,
    questionType: 'frq',
    selectedSubtopics: [],
    idPercentage: 0,
    pureIdOnly: false,
    difficulties: ['any'], // Default to any difficulty
    cipherTypes: ['all'], // Default to "all"
    division: 'any',
    charLengthMin: 50,
    charLengthMax: 200
  });


  // Roster data
  const [rosterMembers, setRosterMembers] = useState<RosterMember[]>([]);
  const [selectedRoster, setSelectedRoster] = useState<string[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  
  // Dropdown state
  const [cipherDropdownOpen, setCipherDropdownOpen] = useState(false);

  // Available events

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cipherDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('.cipher-dropdown')) {
          setCipherDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [cipherDropdownOpen]);

  const handleDetailsChange = (newDetails: Partial<AssignmentDetails>) => {
    setDetails(prev => ({ ...prev, ...newDetails }));
  };

  const handleSettingsChange = (newSettings: Partial<QuestionGenerationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Special handler for division changes that also updates cipher types
  const handleDivisionChange = (division: 'B' | 'C' | 'any') => {
    setSettings(prev => ({ 
      ...prev, 
      division,
      cipherTypes: ['all'] // Reset to "all" when division changes
    }));
  };



  const handleCreateAssignment = async () => {
    // Validate all requirements for assignment creation
    const validationError = validateAssignmentCreation();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const assignment = await createAssignment(
        teamId,
        subteamId,
        {
          title: details.title,
          description: details.description,
          assignment_type: details.assignmentType,
          due_date: details.dueDate,
          time_limit_minutes: details.timeLimitMinutes,
          event_name: details.eventName,
          questions: [], // Empty array - questions will be generated dynamically
          roster_members: selectedRoster,
          // Include Codebusters-specific parameters for dynamic generation
          codebusters_params: {
            questionCount: settings.questionCount,
            cipherTypes: settings.cipherTypes?.includes('all') 
              ? getAvailableCiphers(settings.division || 'any')
              : (settings.cipherTypes || []),
            division: settings.division || 'any',
            charLengthMin: settings.charLengthMin || 50,
            charLengthMax: settings.charLengthMax || 200
          }
        }
      );

      toast.success('Codebusters assignment created successfully!');
      onAssignmentCreated(assignment);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  const validateDetails = (): string | null => {
    if (!details.title.trim()) return 'Title is required';
    if (!details.eventName) return 'Event is required';
    return null;
  };

  const validateSettings = (): string | null => {
    if (settings.questionCount <= 0 || settings.questionCount > 10) {
      return 'Question count must be between 1 and 10';
    }
    if (details.timeLimitMinutes <= 0) return 'Time limit must be greater than 0';
    if (!settings.cipherTypes || settings.cipherTypes.length === 0) {
      return 'At least one cipher type must be selected';
    }
    return null;
  };

  const validateRoster = (): string | null => {
    if (selectedRoster.length === 0) {
      return 'At least one person must be selected';
    }
    return null;
  };

  const validateAssignmentCreation = (): string | null => {
    const detailsError = validateDetails();
    if (detailsError) return detailsError;
    
    const settingsError = validateSettings();
    if (settingsError) return settingsError;
    
    const rosterError = validateRoster();
    if (rosterError) return rosterError;
    
    return null;
  };

  const handleNext = () => {
    const error = validateDetails();
    if (error) {
      setError(error);
      return;
    }
    setError(null);
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep(prev => prev - 1);
  };

  const handleQuestionGenerationNext = async () => {
    const error = validateSettings();
    if (error) {
      setError(error);
      return;
    }
    
    setError(null);
    // Skip question generation and preview - go directly to people selection
    setStep(3);
  };


  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Assignment Details
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Title *
                </label>
                <input
                  type="text"
                  value={details.title}
                  onChange={(e) => handleDetailsChange({ title: e.target.value })}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 ${
                    darkMode 
                      ? 'border-gray-600 bg-gray-700 text-white' 
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                  placeholder="Enter assignment title"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  value={details.description}
                  onChange={(e) => handleDetailsChange({ description: e.target.value })}
                  rows={3}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 ${
                    darkMode 
                      ? 'border-gray-600 bg-gray-700 text-white' 
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                  placeholder="Enter assignment description"
                />
              </div>


              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  value={details.dueDate}
                  onChange={(e) => handleDetailsChange({ dueDate: e.target.value })}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 ${
                    darkMode 
                      ? 'border-gray-600 bg-gray-700 text-white' 
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                />
              </div>
            </div>

            {error && (
              <div className={`rounded-md p-4 ${
                darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50'
              }`}>
                <p className={`text-sm ${
                  darkMode ? 'text-red-300' : 'text-red-800'
                }`}>{error}</p>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={onCancel}
                className={`px-4 py-2 border rounded-lg transition-colors ${
                  darkMode
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-800'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next: Configure Ciphers
              </button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Codebusters Configuration
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Number of Questions *
                  </label>
                  <input
                    type="number"
                    value={settings.questionCount}
                    onChange={(e) => handleSettingsChange({ questionCount: parseInt(e.target.value) || 0 })}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 ${
                      darkMode 
                        ? 'border-gray-600 bg-gray-700 text-white' 
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                    min="1"
                    max="10"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Time Limit (minutes) *
                  </label>
                  <input
                    type="number"
                    value={details.timeLimitMinutes}
                    onChange={(e) => handleDetailsChange({ timeLimitMinutes: parseInt(e.target.value) || 0 })}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 ${
                      darkMode 
                        ? 'border-gray-600 bg-gray-700 text-white' 
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                    min="1"
                    max="60"
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Division
                </label>
                <select
                  value={settings.division}
                  onChange={(e) => handleDivisionChange(e.target.value as 'B' | 'C' | 'any')}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 ${
                    darkMode 
                      ? 'border-gray-600 bg-gray-700 text-white' 
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                >
                  <option value="any">Any Division</option>
                  <option value="B">Division B</option>
                  <option value="C">Division C</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Cipher Types *
                </label>
                <div className="mt-1 relative cipher-dropdown">
                  <button
                    type="button"
                    onClick={() => setCipherDropdownOpen(!cipherDropdownOpen)}
                    className={`relative w-full rounded-md border px-3 py-2 text-left cursor-pointer ${
                      darkMode 
                        ? 'border-gray-600 bg-gray-700 text-white' 
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                  >
                    <span className="block truncate">
                      {settings.cipherTypes?.includes('all') 
                        ? 'All Available Ciphers' 
                        : settings.cipherTypes?.length === 1 
                          ? settings.cipherTypes[0]
                          : `${settings.cipherTypes?.length || 0} selected`
                      }
                    </span>
                    <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </button>
                  
                  {cipherDropdownOpen && (
                    <div className={`absolute z-10 mt-1 w-full rounded-md shadow-lg ${
                      darkMode ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-300'
                    }`}>
                      <div className="max-h-60 overflow-auto">
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => {
                              handleSettingsChange({ cipherTypes: ['all'] });
                              setCipherDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm ${
                              settings.cipherTypes?.includes('all')
                                ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-900')
                                : (darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-900 hover:bg-gray-100')
                            }`}
                          >
                            All Available Ciphers
                          </button>
                          
                          {getAvailableCiphers(settings.division || 'any').map((cipherType) => (
                            <button
                              key={cipherType}
                              type="button"
                              onClick={() => {
                                const currentTypes = settings.cipherTypes || [];
                                if (currentTypes.includes('all')) {
                                  // If "all" is selected, replace with just this cipher
                                  handleSettingsChange({ cipherTypes: [cipherType] });
                                } else if (currentTypes.includes(cipherType)) {
                                  // Remove this cipher
                                  const newTypes = currentTypes.filter(type => type !== cipherType);
                                  handleSettingsChange({ cipherTypes: newTypes.length > 0 ? newTypes : ['all'] });
                                } else {
                                  // Add this cipher
                                  handleSettingsChange({ cipherTypes: [...currentTypes, cipherType] });
                                }
                                // Don't close dropdown for individual cipher selections
                              }}
                              className={`w-full text-left px-3 py-2 text-sm ${
                                settings.cipherTypes?.includes(cipherType)
                                  ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-900')
                                  : (darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-900 hover:bg-gray-100')
                              }`}
                            >
                              {cipherType}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Min Character Length
                  </label>
                  <input
                    type="number"
                    value={settings.charLengthMin || 50}
                    onChange={(e) => handleSettingsChange({ charLengthMin: parseInt(e.target.value) || 50 })}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 ${
                      darkMode 
                        ? 'border-gray-600 bg-gray-700 text-white' 
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                    min="10"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Max Character Length
                  </label>
                  <input
                    type="number"
                    value={settings.charLengthMax || 200}
                    onChange={(e) => handleSettingsChange({ charLengthMax: parseInt(e.target.value) || 200 })}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 ${
                      darkMode 
                        ? 'border-gray-600 bg-gray-700 text-white' 
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                    min="50"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className={`rounded-md p-4 ${
                darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50'
              }`}>
                <p className={`text-sm ${
                  darkMode ? 'text-red-300' : 'text-red-800'
                }`}>{error}</p>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={handleBack}
                className={`px-4 py-2 border rounded-lg transition-colors ${
                  darkMode
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-800'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Back
              </button>
              <button
                onClick={handleQuestionGenerationNext}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next: Select People
              </button>
            </div>
          </div>
        );


      case 3:
        return (
          <div className="space-y-6">
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Select People
            </h2>
            
            {loadingRoster ? (
              <div className="text-center py-8">
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Loading roster members...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {rosterMembers.map((member) => (
                    <div
                      key={member.student_name}
                      className={`p-3 border rounded-lg transition-colors ${
                        selectedRoster.includes(member.student_name)
                          ? darkMode
                            ? 'border-blue-400 bg-blue-900/20'
                            : 'border-blue-500 bg-blue-50'
                          : darkMode
                          ? 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        if (selectedRoster.includes(member.student_name)) {
                          setSelectedRoster(prev => prev.filter(name => name !== member.student_name));
                        } else {
                          setSelectedRoster(prev => [...prev, member.student_name]);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {member.student_name}
                          </h3>
                          {member.username && (
                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              @{member.username}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {member.isLinked && (
                            <span className={`text-xs ${
                              darkMode ? 'text-green-400' : 'text-green-600'
                            }`}>Linked</span>
                          )}
                          <input
                            type="checkbox"
                            checked={selectedRoster.includes(member.student_name)}
                            onChange={() => {}} // Handled by parent div click
                            className={`rounded ${
                              darkMode ? 'accent-blue-400' : 'accent-blue-600'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className={`rounded-md p-4 ${
                darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50'
              }`}>
                <p className={`text-sm ${
                  darkMode ? 'text-red-300' : 'text-red-800'
                }`}>{error}</p>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={handleBack}
                className={`px-4 py-2 border rounded-lg transition-colors ${
                  darkMode
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-800'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Back
              </button>
              <button
                onClick={handleCreateAssignment}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Creating Assignment...' : 'Create Assignment'}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50" 
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onCancel}
    >
      <div 
        className={`max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Create Codebusters Assignment
              </h1>
              <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Step {step} of 3
              </p>
            </div>
            <button
              onClick={onCancel}
              className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${
                darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              }`}
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {renderStep()}
        </div>
      </div>
    </div>
  );
}
