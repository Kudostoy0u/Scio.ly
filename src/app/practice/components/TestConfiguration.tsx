'use client';

import { useState, useRef, useEffect } from 'react';
import { Event, Settings } from '../types';
import { useTheme } from '@/app/contexts/ThemeContext';
import { toast } from 'react-toastify';
import { Heart } from 'lucide-react';
import { isConfigFavorited, toggleFavoriteConfig, getFavoriteConfigs } from '@/app/utils/favorites';

interface TestConfigurationProps {
  selectedEvent: Event | null;
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  onGenerateTest: () => void;
  onUnlimited: () => void;
}

export default function TestConfiguration({
  selectedEvent,
  settings,
  onSettingsChange,
  onGenerateTest,
  onUnlimited
}: TestConfigurationProps) {
  const { darkMode } = useTheme();
  const [isSubtopicDropdownOpen, setIsSubtopicDropdownOpen] = useState(false);
  const [isDifficultyDropdownOpen, setIsDifficultyDropdownOpen] = useState(false);
  const subtopicDropdownRef = useRef<HTMLDivElement>(null);
  const difficultyDropdownRef = useRef<HTMLDivElement>(null);

  function FavoriteHeart({ selectedEventName, settings }: { selectedEventName: string | null; settings: Settings }) {
    const [favorited, setFavorited] = useState(false);

    useEffect(() => {
      if (!selectedEventName) {
        setFavorited(false);
        return;
      }
      try {
        setFavorited(
          isConfigFavorited({ eventName: selectedEventName, settings })
        );
      } catch {}
      // Re-evaluate when settings change
    }, [selectedEventName, settings]);

    const toggle = () => {
      if (!selectedEventName) return;
      // Enforce max of 4: if trying to add a new favorite when already at 4, show error and do nothing
      const already = isConfigFavorited({ eventName: selectedEventName, settings });
      if (!already) {
        try {
          const count = getFavoriteConfigs().length;
          if (count >= 4) {
            toast.error('Maximum of 4 favorites reached. Unfavorite a configuration to add a new one.');
            return;
          }
        } catch {}
      }
      const { favorited: nowFav } = toggleFavoriteConfig({ eventName: selectedEventName, settings });
      setFavorited(nowFav);
    };

    return (
      <button
        type="button"
        onClick={toggle}
        disabled={!selectedEventName}
        className={`p-2 rounded-md border transition-colors ${
          !selectedEventName
            ? (darkMode ? 'opacity-50 border-gray-700 text-gray-500' : 'opacity-50 border-gray-200 text-gray-400')
            : favorited
              ? (darkMode ? 'border-pink-500 text-pink-400 hover:bg-pink-500/10' : 'border-pink-500 text-pink-600 hover:bg-pink-100')
              : (darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-100')
        }`}
        title={favorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart className={`w-5 h-5 ${favorited ? 'fill-current' : ''}`} />
      </button>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    
    if (id === 'questionCount') {
      const questionCount = parseInt(value);
      if (questionCount > 200) {
        toast.warning('You cannot select more than 200 questions');
        return;
      }
      if (questionCount < 1) {
        onSettingsChange({ ...settings, questionCount: 1 });
        return;
      }
      onSettingsChange({ ...settings, questionCount });
      
      // Save to localStorage for all events except Codebusters
      if (selectedEvent && selectedEvent.name !== 'Codebusters') {
        localStorage.setItem('defaultQuestionCount', questionCount.toString());
      } else if (selectedEvent && selectedEvent.name === 'Codebusters') {
        localStorage.setItem('codebustersQuestionCount', questionCount.toString());
      }
    } else if (id === 'timeLimit') {
      const timeLimit = parseInt(value);
      if (timeLimit < 1) {
        onSettingsChange({ ...settings, timeLimit: 1 });
      } else if (timeLimit > 120) {
        onSettingsChange({ ...settings, timeLimit: 120 });
      } else {
        onSettingsChange({ ...settings, timeLimit });
      }
      
      // Save to localStorage for all events except Codebusters
      if (selectedEvent && selectedEvent.name !== 'Codebusters') {
        localStorage.setItem('defaultTimeLimit', timeLimit.toString());
      } else if (selectedEvent && selectedEvent.name === 'Codebusters') {
        localStorage.setItem('codebustersTimeLimit', timeLimit.toString());
      }
    } else {
      onSettingsChange({
        ...settings,
        [id]: value
      });
    }
  };

  const validateTimeLimit = () => {
    if (settings.timeLimit < 1) {
      onSettingsChange({ ...settings, timeLimit: 1 });
    } else if (settings.timeLimit > 120) {
      onSettingsChange({ ...settings, timeLimit: 120 });
    }
  };

  const handleSubtopicChange = (subtopic: string) => {
    const newSubtopics = settings.subtopics.includes(subtopic)
      ? settings.subtopics.filter(s => s !== subtopic)
      : [...settings.subtopics, subtopic];
    
    onSettingsChange({ ...settings, subtopics: newSubtopics });
  };

  const getSubtopicDisplayText = () => {
    if (settings.subtopics.length === 0) return 'All Subtopics';
    if (settings.subtopics.length === 1) return settings.subtopics[0];
    return `${settings.subtopics.length} selected`;
  };

  const handleDifficultyChange = (difficultyId: string) => {
    const newDifficulties = settings.difficulties.includes(difficultyId)
      ? settings.difficulties.filter(d => d !== difficultyId)
      : [...settings.difficulties, difficultyId];
    
    onSettingsChange({ ...settings, difficulties: newDifficulties });
  };

  // Persist division and question types in localStorage
  useEffect(() => {
    if (selectedEvent && selectedEvent.name !== 'Codebusters') {
      // Division
      const availableDivisions = selectedEvent.divisions || ['B', 'C'];
      const canShowB = availableDivisions.includes('B');
      const canShowC = availableDivisions.includes('C');
      const normalizedDivision = settings.division === 'any'
        ? (canShowB && canShowC ? 'any' : (canShowC ? 'C' : 'B'))
        : (settings.division === 'B' && !canShowB)
          ? 'C'
          : (settings.division === 'C' && !canShowC)
            ? 'B'
            : settings.division;

      localStorage.setItem('defaultDivision', normalizedDivision);

      // Question types
      const normalizedTypes = ['multiple-choice', 'both', 'free-response'].includes(settings.types)
        ? settings.types
        : 'multiple-choice';
      localStorage.setItem('defaultQuestionTypes', normalizedTypes);
    }
  }, [settings.division, settings.types, selectedEvent]);

  const getDifficultyDisplayText = () => {
    if (settings.difficulties.length === 0) return 'All Difficulties';
    if (settings.difficulties.length === 1) return settings.difficulties[0];
    return `${settings.difficulties.length} selected`;
  };

  // Click outside detection for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (subtopicDropdownRef.current && !subtopicDropdownRef.current.contains(event.target as Node)) {
        setIsSubtopicDropdownOpen(false);
      }
      if (difficultyDropdownRef.current && !difficultyDropdownRef.current.contains(event.target as Node)) {
        setIsDifficultyDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isCodebusters = selectedEvent?.name === 'Codebusters';
  const isRocks = selectedEvent?.name === 'Rocks and Minerals';
  const isEntomology = selectedEvent?.name === 'Entomology';

  return (
    <div 
      data-test-config
      className={`w-full lg:w-96 rounded-xl flex-shrink-0 flex flex-col ${
        darkMode ? 'bg-palenight-100' : 'bg-white shadow-md'
      }`}
    >
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-6">
          <h3 className={`text-xl font-semibold ${
          darkMode 
            ? 'text-white' 
            : 'text-gray-900'
        }`}>
            Test Configuration
          </h3>
          <FavoriteHeart selectedEventName={selectedEvent?.name || null} settings={settings} />
        </div>
        <div className="space-y-5 flex-1">
          {/* Number of Questions and Time Limit on same line */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="questionCount"
                className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Number of Questions
              </label>
              <input
                type="number"
                id="questionCount"
                min="1"
                max="200"
                value={isNaN(settings.questionCount) ? '' : settings.questionCount}
                onChange={handleChange}
                className={`block w-full rounded-md border-0 py-1.5 px-3 ${
                  darkMode
                    ? 'bg-gray-700 text-white focus:ring-blue-500'
                    : 'bg-gray-50 text-gray-900 focus:ring-blue-600'
                } shadow-sm focus:ring-1 focus:outline-none`}
              />
            </div>
            <div>
              <label
                htmlFor="timeLimit"
                className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Time Limit (minutes)
              </label>
              <input
                type="number"
                id="timeLimit"
                min="1"
                max="120"
                value={isNaN(settings.timeLimit) ? '' : settings.timeLimit}
                onChange={handleChange}
                onBlur={validateTimeLimit}
                className={`block w-full rounded-md border-0 py-1.5 px-3 ${
                  darkMode
                    ? 'bg-gray-700 text-white focus:ring-blue-500'
                    : 'bg-gray-50 text-gray-900 focus:ring-blue-600'
                } shadow-sm focus:ring-1 focus:outline-none`}
              />
            </div>
          </div>

          {/* Question Types Toggle */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Question Types
            </label>
            <div className={`flex rounded-md border ${
              darkMode ? 'border-gray-600' : 'border-gray-300'
            }`}>
              <button
                type="button"
                  onClick={() => {
                    onSettingsChange({ ...settings, types: 'multiple-choice' });
                    localStorage.setItem('defaultQuestionTypes', 'multiple-choice');
                  }}
                disabled={isCodebusters}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-l-md border ${
                  isCodebusters
                    ? 'opacity-50 cursor-not-allowed ' + (darkMode ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-400')
                    : settings.types === 'multiple-choice'
                      ? darkMode
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-blue-500 bg-blue-500 text-white'
                      : darkMode
                        ? 'border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-400'
                        : 'border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600'
                }`}
              >
                MCQ only
              </button>
              <button
                type="button"
                  onClick={() => {
                    onSettingsChange({ ...settings, types: 'both' });
                    localStorage.setItem('defaultQuestionTypes', 'both');
                  }}
                disabled={isCodebusters}
                className={`px-3 py-2 text-sm font-medium border-t border-b border-l border-r ${
                  isCodebusters
                    ? 'opacity-50 cursor-not-allowed ' + (darkMode ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-400')
                    : settings.types === 'both'
                      ? darkMode
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-green-500 bg-green-500 text-white'
                      : darkMode
                        ? 'border-gray-600 text-gray-300 hover:border-green-500 hover:text-green-400'
                        : 'border-gray-300 text-gray-700 hover:border-green-500 hover:text-green-600'
                }`}
              >
                MCQ + FRQ
              </button>
              <button
                type="button"
                  onClick={() => {
                    onSettingsChange({ ...settings, types: 'free-response' });
                    localStorage.setItem('defaultQuestionTypes', 'free-response');
                  }}
                disabled={isCodebusters}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-r-md border ${
                  isCodebusters
                    ? (settings.types === 'free-response' || settings.types === 'frq-only'
                        ? darkMode
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-blue-500 bg-blue-500 text-white'
                        : 'opacity-50 cursor-not-allowed ' + (darkMode ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-400'))
                    : settings.types === 'free-response'
                      ? darkMode
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-blue-500 bg-blue-500 text-white'
                      : darkMode
                        ? 'border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-400'
                        : 'border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600'
                }`}
              >
                FRQ only
              </button>
            </div>
          </div>

          {/* Identification slider for events with image ID (Rocks & Minerals, Entomology) */}
          {(isRocks || isEntomology) && (
            <div>
              <label htmlFor="idPercentage" className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                ID Questions (% of total)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  id="idPercentage"
                  min={0}
                  max={100}
                  step={5}
                  value={settings.idPercentage ?? 10}
                  onChange={(e) => onSettingsChange({ ...settings, idPercentage: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{settings.idPercentage ?? 10}%</span>
              </div>
            </div>
          )}

          {/* Division Toggle */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Division
            </label>
            <div className={`flex rounded-md border ${
              darkMode ? 'border-gray-600' : 'border-gray-300'
            }`}>
              {(() => {
                const availableDivisions = selectedEvent?.divisions || ['B', 'C'];
                const canShowB = availableDivisions.includes('B');
                const canShowC = availableDivisions.includes('C');

                return (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (!canShowB) return;
                        onSettingsChange({ ...settings, division: 'B' });
                        localStorage.setItem('defaultDivision', 'B');
                      }}
                      disabled={!canShowB}
                      className={`flex-1 py-2 px-3 text-sm font-medium rounded-l-md border ${
                        !canShowB
                          ? 'opacity-50 cursor-not-allowed ' + (darkMode ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-400')
                          : settings.division === 'B'
                            ? darkMode
                              ? 'border-blue-500 bg-blue-500 text-white'
                              : 'border-blue-500 bg-blue-500 text-white'
                            : darkMode
                              ? 'border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-400'
                              : 'border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600'
                      }`}
                    >
                      Division B
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!(canShowB && canShowC)) return;
                        onSettingsChange({ ...settings, division: 'any' });
                        localStorage.setItem('defaultDivision', 'any');
                      }}
                      disabled={!(canShowB && canShowC)}
                      className={`px-3 py-2 text-sm font-medium border-t border-b border-l border-r ${
                        !(canShowB && canShowC)
                          ? 'opacity-50 cursor-not-allowed ' + (darkMode ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-400')
                          : settings.division === 'any'
                            ? darkMode
                              ? 'border-green-500 bg-green-500 text-white'
                              : 'border-green-500 bg-green-500 text-white'
                            : darkMode
                              ? 'border-gray-600 text-gray-300 hover:border-green-500 hover:text-green-400'
                              : 'border-gray-300 text-gray-700 hover:border-green-500 hover:text-green-600'
                      }`}
                    >
                      Both
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!canShowC) return;
                        onSettingsChange({ ...settings, division: 'C' });
                        localStorage.setItem('defaultDivision', 'C');
                      }}
                      disabled={!canShowC}
                      className={`flex-1 py-2 px-3 text-sm font-medium rounded-r-md border ${
                        !canShowC
                          ? 'opacity-50 cursor-not-allowed ' + (darkMode ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-400')
                          : settings.division === 'C'
                            ? darkMode
                              ? 'border-blue-500 bg-blue-500 text-white'
                              : 'border-blue-500 bg-blue-500 text-white'
                            : darkMode
                              ? 'border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-400'
                              : 'border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600'
                      }`}
                    >
                      Division C
                    </button>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Difficulty and Subtopic on same line */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Difficulty
              </label>
              <div className="relative" ref={difficultyDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDifficultyDropdownOpen(!isDifficultyDropdownOpen)}
                  disabled={isCodebusters}
                  className={`w-full flex justify-between items-center px-3 py-2.5 rounded-md border-0 text-sm ${
                    isCodebusters
                      ? 'opacity-50 cursor-not-allowed ' + (darkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400')
                      : darkMode
                        ? 'bg-gray-700 text-white focus:ring-blue-500'
                        : 'bg-gray-50 text-gray-900 focus:ring-blue-600'
                  } shadow-sm focus:ring-1 focus:outline-none`}
                >
                  <span>{getDifficultyDisplayText()}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      isDifficultyDropdownOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {isDifficultyDropdownOpen && (
                  <div className={`absolute z-10 mt-1 w-full rounded-md shadow-lg ${
                    darkMode ? 'bg-gray-700' : 'bg-white'
                  } ring-1 ring-black ring-opacity-5`}>
                    <div className="py-1">
                      {isCodebusters ? (
                        // Codebusters uses simple difficulty levels
                        ['Easy', 'Medium', 'Hard'].map((difficulty) => (
                          <label
                            key={difficulty}
                            className={`flex items-center px-4 py-2 text-xs cursor-pointer ${
                              darkMode
                                ? 'text-gray-300 hover:bg-gray-600'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={settings.difficulties.includes(difficulty)}
                              onChange={() => handleDifficultyChange(difficulty)}
                              className={`mr-3 rounded ${
                                darkMode ? 'bg-gray-600 border-gray-500' : 'bg-gray-50 border-gray-300'
                              }`}
                            />
                            {difficulty}
                          </label>
                        ))
                      ) : (
                        // Other events use detailed difficulty levels
                        [
                          { id: 'very-easy', label: 'Very Easy (0-19%)' },
                          { id: 'easy', label: 'Easy (20-39%)' },
                          { id: 'medium', label: 'Medium (40-59%)' },
                          { id: 'hard', label: 'Hard (60-79%)' },
                          { id: 'very-hard', label: 'Very Hard (80-100%)' }
                        ].map((difficulty) => (
                          <label
                            key={difficulty.id}
                            className={`flex items-center px-4 py-2 text-xs cursor-pointer ${
                              darkMode
                                ? 'text-gray-300 hover:bg-gray-600'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={settings.difficulties.includes(difficulty.id)}
                              onChange={() => handleDifficultyChange(difficulty.id)}
                              className={`mr-3 rounded ${
                                darkMode ? 'bg-gray-600 border-gray-500' : 'bg-gray-50 border-gray-300'
                              }`}
                            />
                            {difficulty.label}
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {isCodebusters ? 'Cipher Types' : 'Subtopics'}
              </label>
              <div className="relative" ref={subtopicDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsSubtopicDropdownOpen(!isSubtopicDropdownOpen)}
                  className={`w-full flex justify-between items-center px-3 py-2.5 rounded-md border-0 text-sm ${
                    darkMode
                      ? 'bg-gray-700 text-white focus:ring-blue-500'
                      : 'bg-gray-50 text-gray-900 focus:ring-blue-600'
                  } shadow-sm focus:ring-1 focus:outline-none`}
                >
                  <span>{getSubtopicDisplayText()}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      isSubtopicDropdownOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {isSubtopicDropdownOpen && (
                  <div className={`absolute z-10 mt-1 w-full rounded-md shadow-lg ${
                    darkMode ? 'bg-gray-700' : 'bg-white'
                  } ring-1 ring-black ring-opacity-5 max-h-60 overflow-y-auto`}>
                    <div className="py-1">
                      {isCodebusters ? (
                        // Codebusters cipher types based on division
                        (() => {
                          const divisionCipherTypes = [
                            "Random Aristocrat",
                            "K1 Aristocrat",
                            "K2 Aristocrat",
                            "K3 Aristocrat",
                            "Random Patristocrat",
                            "K1 Patristocrat",
                            "K2 Patristocrat",
                            "K3 Patristocrat",
                            "Baconian",
                            "Xenocrypt",
                            "Fractionated Morse",
                            "Porta",
                            "Columnar Transposition",
                            "Nihilist",
                            "Hill 2x2",
                            "Hill 3x3",
                            "Checkerboard"
                          ];
                          
                          const divisionBCipherTypes = [
                            "Random Aristocrat",
                            "K1 Aristocrat",
                            "K2 Aristocrat",
                            "Random Patristocrat",
                            "K1 Patristocrat",
                            "K2 Patristocrat",
                            "Baconian",
                            "Fractionated Morse",
                            "Columnar Transposition",
                            "Xenocrypt",
                            "Porta",
                            "Nihilist",
                            "Atbash",
                            "Caesar",
                            "Affine",
                            "Hill 2x2",
                            "Checkerboard"
                          ];
                          
                          const cipherTypes = settings.division === 'C' ? divisionCipherTypes : divisionBCipherTypes;
                          
                          return cipherTypes.map((cipherType) => (
                            <label
                              key={cipherType}
                              className={`flex items-center px-4 py-2 text-xs cursor-pointer ${
                                darkMode
                                  ? 'text-gray-300 hover:bg-gray-600'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={settings.subtopics.includes(cipherType)}
                                onChange={() => handleSubtopicChange(cipherType)}
                                className={`mr-3 rounded ${
                                  darkMode ? 'bg-gray-600 border-gray-500' : 'bg-gray-50 border-gray-300'
                                }`}
                              />
                              {cipherType}
                            </label>
                          ));
                        })()
                      ) : (
                        // Regular subtopics for other events
                        selectedEvent && window.eventSubtopicsMapping?.[selectedEvent.name]?.map((subtopic) => (
                          <label
                            key={subtopic}
                            className={`flex items-center px-4 py-2 text-xs cursor-pointer ${
                              darkMode
                                ? 'text-gray-300 hover:bg-gray-600'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={settings.subtopics.includes(subtopic)}
                              onChange={() => handleSubtopicChange(subtopic)}
                              className={`mr-3 rounded ${
                                darkMode ? 'bg-gray-600 border-gray-500' : 'bg-gray-50 border-gray-300'
                              }`}
                            />
                            {subtopic}
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tournaments Dropdown */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Tournaments
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => toast.info('Disabled for privacy reasons')}
                className={`w-full flex justify-between items-center px-3 py-1.5 rounded-md border-0 opacity-50 cursor-not-allowed ${
                  darkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'
                } shadow-sm`}
                title="Disabled for privacy reasons"
              >
                <span>All Tournaments</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-auto">
            <button
              onClick={onGenerateTest}
              disabled={!selectedEvent}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 border-2 ${
                !selectedEvent
                  ? 'opacity-50 cursor-not-allowed ' + (darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-500')
                  : darkMode
                    ? 'border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white'
                    : 'border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white'
              }`}
            >
              Generate Test
            </button>
            <button
              onClick={onUnlimited}
              disabled={!selectedEvent}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 border-2 ${
                !selectedEvent
                  ? 'opacity-50 cursor-not-allowed ' + (darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-500')
                  : darkMode
                    ? 'border-indigo-500 text-indigo-400 hover:bg-indigo-500 hover:text-white'
                    : 'border-indigo-500 text-indigo-600 hover:bg-indigo-500 hover:text-white'
              }`}
            >
              Unlimited
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 