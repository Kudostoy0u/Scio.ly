'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTheme } from '@/app/contexts/ThemeContext';
import Header from '@/app/components/Header';
import { clearTestSession } from '@/app/utils/timeManagement';

// Extend window interface for event subtopics mapping
declare global {
  interface Window {
    eventSubtopicsMapping?: Record<string, string[]>;
  }
}

interface Event {
  id: number;
  name: string;
  subject: string;
  divisions?: string[];
  description?: string;
}

interface Settings {
  questionCount: number;
  timeLimit: number;
  difficulties: string[];
  types: string;
  division: string;
  tournament: string;
  subtopics: string[];
}

function EventDashboard() {
  const router = useRouter();
  const { darkMode } = useTheme();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState('alphabetical');

  const [subtopics, setSubtopics] = useState<string[]>([]);
  const [isSubtopicDropdownOpen, setIsSubtopicDropdownOpen] = useState(false);
  const subtopicDropdownRef = useRef<HTMLDivElement>(null);
  const [isDifficultyDropdownOpen, setIsDifficultyDropdownOpen] = useState(false);
  const difficultyDropdownRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<Settings>({
    questionCount: 10,
    timeLimit: 15,
    difficulties: [],
    types: 'multiple-choice',
    division: 'any',
    tournament: 'any',
    subtopics: []
  });

  const difficultyOptions = [
    { id: 'very-easy', label: 'Very Easy (0-19%)', min: 0, max: 0.19 },
    { id: 'easy', label: 'Easy (20-39%)', min: 0.20, max: 0.39 },
    { id: 'medium', label: 'Medium (40-59%)', min: 0.40, max: 0.59 },
    { id: 'hard', label: 'Hard (60-79%)', min: 0.60, max: 0.79 },
    { id: 'very-hard', label: 'Very Hard (80-100%)', min: 0.80, max: 1.0 }
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    // Skip tournament changes since it's disabled
    if (id === 'tournament') return;
    setSettings((prev) => ({ ...prev, [id]: value }));
  };

  const validateTimeLimit = () => {
    const timeLimit = Number(settings.timeLimit);
    if (isNaN(timeLimit) || !Number.isInteger(timeLimit) || timeLimit < 1) {
      toast.error('Time limit must be an integer greater than or equal to 1 minute.');
      return false;
    }
    return true;
  };

  const handleSubtopicChange = (subtopic: string) => {
    setSettings(prev => {
      if (subtopic === 'any') {
        // If "Any" is selected, clear all specific selections
        return { ...prev, subtopics: [] };
      } else {
        // If a specific subtopic is selected/deselected
        const isCurrentlySelected = prev.subtopics.includes(subtopic);
        if (isCurrentlySelected) {
          return { ...prev, subtopics: prev.subtopics.filter(s => s !== subtopic) };
        } else {
          return { ...prev, subtopics: [...prev.subtopics, subtopic] };
        }
      }
    });
    // Don't close dropdown on selection to allow multiple selections
  };

  const getSubtopicDisplayText = () => {
    if (settings.subtopics.length === 0) {
      return 'Any';
    } else if (settings.subtopics.length === 1) {
      return settings.subtopics[0];
    } else {
      return `${settings.subtopics.length} selected`;
    }
  };

  const handleDifficultyChange = (difficultyId: string) => {
    setSettings(prev => {
      if (difficultyId === 'any') {
        // If "Any" is selected, clear all specific selections
        return { ...prev, difficulties: [] };
      } else {
        // If a specific difficulty is selected/deselected
        const isCurrentlySelected = prev.difficulties.includes(difficultyId);
        if (isCurrentlySelected) {
          return { ...prev, difficulties: prev.difficulties.filter(d => d !== difficultyId) };
        } else {
          return { ...prev, difficulties: [...prev.difficulties, difficultyId] };
        }
      }
    });
  };

  const getDifficultyDisplayText = () => {
    if (settings.difficulties.length === 0) {
      return 'Any';
    } else if (settings.difficulties.length === 1) {
      const option = difficultyOptions.find(opt => opt.id === settings.difficulties[0]);
      return option ? option.label : settings.difficulties[0];
    } else {
      return `${settings.difficulties.length} selected`;
    }
  };

  const handleGenerateTest = () => {
    if (!selectedEvent) {
      toast.error('Please select an event first');
      return;
    }

    if (!validateTimeLimit()) {
      return;
    }

    const selectedEventObj = events.find((event) => event.id === selectedEvent);
    if (!selectedEventObj) return;

    // Clear any existing time management session
    clearTestSession();

    // Check if Codebusters is selected
    if (selectedEventObj.name === 'Codebusters') {

      const testParams = {
        eventName: selectedEventObj.name,
        questionCount: settings.questionCount,
        timeLimit: settings.timeLimit,
        difficulties: settings.difficulties,
        types: settings.types,
        division: settings.division,
        tournament: 'any', // Always use 'any' for privacy
        subtopics: settings.subtopics,
        cipherTypes: settings.subtopics.length > 0 ? settings.subtopics : [] // For backward compatibility with existing codebusters logic
      };

      localStorage.setItem('testParams', JSON.stringify(testParams));
      localStorage.removeItem('testQuestions');
      localStorage.removeItem('testUserAnswers');
      localStorage.removeItem('codebustersQuotes');
      localStorage.removeItem('codebustersIsTestSubmitted');
      localStorage.removeItem('codebustersTestScore');
      localStorage.removeItem('codebustersTimeLeft');
      localStorage.removeItem('shareCode');
      router.push('/codebusters');
      return;
    }

    const testParams = {
      eventName: selectedEventObj.name,
      questionCount: settings.questionCount,
      timeLimit: settings.timeLimit,
      difficulties: settings.difficulties,
      types: settings.types,
      division: settings.division,
      tournament: 'any', // Always use 'any' for privacy
      subtopics: settings.subtopics,
    };

    localStorage.setItem('testParams', JSON.stringify(testParams));
    localStorage.removeItem('testQuestions');
    localStorage.removeItem('testUserAnswers');

    // Redirect to Codebusters page if Codebusters is selected
    if (selectedEventObj.name === 'Codebusters') {
      router.push('/codebusters');
    } else {
      router.push('/test');
    }
  };

  const handleUnlimited = () => {
    if (!selectedEvent) {
      toast.error('Please select an event first');
      return;
    }

    if (!validateTimeLimit()) {
      return;
    }

    const selectedEventObj = events.find((event) => event.id === selectedEvent);
    if (!selectedEventObj) return;

    // Disable unlimited practice for Codebusters
    if (selectedEventObj.name === 'Codebusters') {
      toast.error('Unlimited practice is not available for Codebusters');
      return;
    }

    // Clear any existing time management session
    clearTestSession();

    const unlimitedParams = {
      eventName: selectedEventObj.name,
      difficulties: settings.difficulties,
      division: settings.division,
      tournament: 'any', // Always use 'any' for privacy
      subtopics: settings.subtopics,
      types: settings.types,
    };

    localStorage.setItem('testParams', JSON.stringify(unlimitedParams));
    localStorage.removeItem('testQuestions');
    router.push('/unlimited');
  };

  const selectEvent = (id: number) => {
    setSelectedEvent(id);
  };

  const sortedEvents = [...events].sort((a, b) => {
    if (sortOption === 'alphabetical') {
      return a.name.localeCompare(b.name);
    } else if (sortOption === 'subject') {
      return a.subject.localeCompare(b.subject);
    }
    return 0;
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Define new approved events with division restrictions
        const approvedEvents = [
          { 
            name: "Anatomy - Nervous", 
            subject: "Life & Social Science",
            divisions: ["B", "C"]
          },
          { 
            name: "Anatomy - Endocrine", 
            subject: "Life & Social Science",
            divisions: ["B", "C"]
          },
          { 
            name: "Anatomy - Sense Organs", 
            subject: "Life & Social Science",
            divisions: ["B", "C"]
          },
          { 
            name: "Astronomy", 
            subject: "Earth and Space Science",
            divisions: ["C"]
          },
          { 
            name: "Chemistry Lab", 
            subject: "Physical Science & Chemistry",
            divisions: ["C"]
          },
          { 
            name: "Circuit Lab", 
            subject: "Physical Science & Chemistry",
            divisions: ["B", "C"]
          },
          { 
            name: "Codebusters", 
            subject: "Inquiry & Nature of Science",
            divisions: ["B", "C"]
          },
          { 
            name: "Crime Busters", 
            subject: "Physical Science & Chemistry",
            divisions: ["B"]
          },
          { 
            name: "Designer Genes", 
            subject: "Life & Social Science",
            divisions: ["C"]
          },
          { 
            name: "Disease Detectives", 
            subject: "Life & Social Science",
            divisions: ["B", "C"]
          },
          { 
            name: "Dynamic Planet - Oceanography", 
            subject: "Earth and Space Science",
            divisions: ["B", "C"]
          },
          { 
            name: "Entomology", 
            subject: "Life & Social Science",
            divisions: ["B", "C"]
          },
          { 
            name: "Forensics", 
            subject: "Physical Science & Chemistry",
            divisions: ["C"]
          },
          { 
            name: "Heredity", 
            subject: "Life & Social Science",
            divisions: ["B"]
          },
          { 
            name: "Materials Science", 
            subject: "Physical Science & Chemistry",
            divisions: ["C"]
          },
          { 
            name: "Meteorology", 
            subject: "Earth and Space Science",
            divisions: ["B"]
          },
          { 
            name: "Metric Mastery", 
            subject: "Inquiry & Nature of Science",
            divisions: ["B"]
          },
          { 
            name: "Potions and Poisons", 
            subject: "Physical Science & Chemistry",
            divisions: ["B"]
          },
          { 
            name: "Remote Sensing", 
            subject: "Earth and Space Science",
            divisions: ["B", "C"]
          },
          { 
            name: "Rocks and Minerals", 
            subject: "Earth and Space Science",
            divisions: ["B", "C"]
          },
          { 
            name: "Solar System", 
            subject: "Earth and Space Science",
            divisions: ["B"]
          },
          { 
            name: "Water Quality - Freshwater", 
            subject: "Life & Social Science",
            divisions: ["B", "C"]
          }
        ];

        // Map events to the Event interface
        const eventsWithIds: Event[] = approvedEvents.map((event, index) => ({
          id: index + 1,
          ...event
        }));

        setEvents(eventsWithIds);

        // Use local subtopics mapping

        // Define event-specific subtopics based on the provided mapping
        const eventSubtopics: Record<string, string[]> = {
          "Anatomy - Nervous": ["Brain", "Spinal Cord", "Nerves", "Reflexes", "Neurotransmitters"],
          "Anatomy - Endocrine": ["Hormones", "Glands", "Regulation", "Feedback", "Development"],
          "Anatomy - Sense Organs": ["Eyes", "Ears", "Nose", "Tongue", "Skin"],
          "Astronomy": ["Solar System", "Stars", "Galaxies", "Cosmology", "Instruments"],
          "Chemistry Lab": ["Stoichiometry", "Equilibrium", "Periodicity", "Redox Reactions", "Aqueous Solutions", "Acids and Bases", "Physical Properties", "Thermodynamics", "Gas Laws", "Kinetics", "Electrochemistry"],
          "Circuit Lab": ["Circuits", "Sensors", "Calibration", "Design", "Troubleshooting"],
          "Codebusters": ["Aristocrat", "Patristocrat", "Hill", "Baconian", "Porta"],
          "Crime Busters": ["Evidence Analysis", "Fingerprints", "DNA", "Toxicology", "Crime Scene"],
          "Designer Genes": ["Genetics", "DNA", "Proteins", "Evolution", "Population Genetics"],
          "Disease Detectives": ["Epidemiology", "Pathogens", "Prevention", "Outbreak Investigation", "Statistics"],
          "Dynamic Planet - Oceanography": ["Ocean Circulation", "Marine Life", "Chemistry", "Geology", "Climate"],
          "Entomology": ["Insect Anatomy", "Life Cycles", "Behavior", "Classification", "Ecology"],
          "Forensics": ["Evidence Analysis", "Fingerprints", "DNA", "Toxicology", "Crime Scene"],
          "Heredity": ["Genetics", "DNA", "Proteins", "Evolution", "Population Genetics"],
          "Materials Science": ["Structure", "Properties", "Processing", "Applications", "Testing"],
          "Meteorology": ["Weather Systems", "Clouds", "Precipitation", "Temperature", "Pressure"],
          "Metric Mastery": ["Estimation", "Orders of Magnitude", "Problem Solving", "Scientific Reasoning", "Calculations"],
          "Potions and Poisons": ["Toxicology", "Pharmacology", "Dosage", "Symptoms", "Antidotes"],
          "Remote Sensing": ["Satellites", "Imaging", "Data Analysis", "Applications", "Technology"],
          "Rocks and Minerals": ["Igneous", "Sedimentary", "Metamorphic", "Mineral Properties", "Crystal Systems"],
          "Solar System": ["Planets", "Moons", "Asteroids", "Comets", "Galaxies"],
          "Water Quality - Freshwater": ["pH", "Dissolved Oxygen", "Nutrients", "Pollutants", "Testing"]
        };

        // Store the event subtopics mapping for later use
        window.eventSubtopicsMapping = eventSubtopics;
        
        // Don't set subtopics initially - wait for event selection
        setSubtopics([]);

        console.log(`Loaded ${eventsWithIds.length} approved events`);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load events. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update subtopics when selected event changes
  useEffect(() => {
    if (selectedEvent && events.length > 0 && window.eventSubtopicsMapping) {
      const selectedEventObj = events.find(event => event.id === selectedEvent);
      if (selectedEventObj) {
        const eventSubtopics = window.eventSubtopicsMapping[selectedEventObj.name] || [];
        setSubtopics(eventSubtopics);
        // Reset subtopics selection when event changes
        setSettings(prev => ({ ...prev, subtopics: [] }));

        // Auto-adjust division setting if current selection is not available for this event
        const availableDivisions = selectedEventObj.divisions || ['B', 'C'];
        const canShowB = availableDivisions.includes('B');
        const canShowC = availableDivisions.includes('C');
        const canShowBoth = canShowB && canShowC;

        setSettings(prevSettings => {
          // If current division setting is invalid for this event, auto-select a valid one
          if (prevSettings.division === 'B' && !canShowB) {
            return { ...prevSettings, division: canShowC ? 'C' : 'any' };
          }
          if (prevSettings.division === 'C' && !canShowC) {
            return { ...prevSettings, division: canShowB ? 'B' : 'any' };
          }
          if (prevSettings.division === 'any' && !canShowBoth) {
            return { ...prevSettings, division: canShowB ? 'B' : canShowC ? 'C' : 'any' };
          }
          return prevSettings;
        });
      }
    }
  }, [selectedEvent, events]);

  // Preselect and scroll to the event if a query parameter is provided.
  useEffect(() => {
    const storedEventParams = localStorage.getItem('eventParams');
    if (storedEventParams && events.length > 0) {
        const eventToSelect = events.find(
          (event) => event.name === storedEventParams
        );
        if (eventToSelect) {
          setSelectedEvent(eventToSelect.id);
          
          // Use setTimeout to ensure the DOM is updated before scrolling
          setTimeout(() => {
            const element = document.getElementById(`event-${eventToSelect.id}`);
            if (element) {
              // Find the scrollable container (the event list)
              const container = element.closest('ul')?.parentElement;
              
              if (container) {
                // Find the index of the selected event in the sorted events array
                const sortedEventsInEffect = [...events].sort((a, b) => {
                  if (sortOption === 'alphabetical') {
                    return a.name.localeCompare(b.name);
                  } else if (sortOption === 'subject') {
                    return a.subject.localeCompare(b.subject);
                  }
                  return 0;
                });
                
                const eventIndex = sortedEventsInEffect.findIndex(event => event.id === eventToSelect.id);
                
                if (eventIndex !== -1) {
                  // Calculate the total height of the container
                  const containerHeight = container.scrollHeight;
                  
                  // Calculate proportional scroll position based on event index
                  // Add a small offset to center it better
                  const itemCount = sortedEventsInEffect.length;
                  const scrollRatio = eventIndex / itemCount;
                  
                  // Calculate a dynamic offset based on container height to better center the element
                  // This will position the element more towards the center of the viewport
                  const scrollOffset = containerHeight * 0.2; // 20% of container height
                  
                  // Calculate the scroll position
                  const scrollTop = (containerHeight * scrollRatio) - scrollOffset;
                  
                  // Scroll the container
                  container.scrollTo({
                    top: Math.max(0, scrollTop),
                    behavior: 'smooth'
                  });
                } else {
                  // Fallback if index not found
                  element.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center'
                  });
                }
              } else {
                // Fallback to standard scrollIntoView with adjusted options
                element.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'start'
                });
              }
              
              // Add a highlight animation
              element.classList.add('highlight-animation');
              // Remove the animation class after it completes
              setTimeout(() => {
                element.classList.remove('highlight-animation');
              }, 2000);
            }
            localStorage.removeItem('eventParams');
          }, 300);
        }
    }
  }, [events, sortOption]);

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

  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div
        className={`fixed inset-0 ${
          darkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}
      ></div>

      <Header />

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20">
        <div className="mb-8 mt-8">
          <div className="flex items-center justify-between">
            <h2 className={`text-3xl font-bold  ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Practice
            </h2>
            {/* Mobile down arrow */}
            <button
              onClick={() => {
                const testConfigSection = document.querySelector('[data-test-config]');
                if (testConfigSection) {
                  testConfigSection.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                  });
                }
              }}
              className="lg:hidden p-2 rounded-full"
              aria-label="Scroll to test configuration"
            >
              <svg 
                className={`w-6 h-6 ${
                  darkMode ? 'text-gray-300' : 'text-gray-600'
                }`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </button>
          </div>
          <p className={`mt-2  ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Select an event from the 2026 events list and configure your practice session
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className={`animate-pulse text-lg font-medium ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Loading events...
            </div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-red-500 text-lg">{error}</div>
          </div>
        ) : events.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className={`text-lg ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              No events match the whitelist criteria.
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 h-[calc(120vh+200px)] lg:h-[calc(110vh-200px)]">
            {/* Event List */}
            <div className={`flex-1 rounded-xl overflow-hidden flex flex-col ${
              darkMode ? 'bg-palenight-100' : 'bg-white shadow-md'
            }`}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                <h3 className={`font-medium ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Available Events
                </h3>
                <div className="flex items-center">
                  <label htmlFor="sort" className={`text-sm mr-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Sort:
                  </label>
                  <select
                    id="sort"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className={`text-sm rounded-md border-0 py-1.5 pl-3 pr-8 ${
                      darkMode 
                        ? 'bg-gray-700 text-white focus:ring-blue-500' 
                        : 'bg-gray-50 text-gray-900 focus:ring-blue-600'
                    } focus:ring-1 focus:outline-none`}
                  >
                    <option value="alphabetical">Alphabetical</option>
                    <option value="subject">Subject</option>
                  </select>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 min-h-0 custom-scrollbar">
                <ul className="space-y-2">
                  {sortedEvents.map((event) => (
                    <li
                      key={event.id}
                      id={`event-${event.id}`}
                      onClick={() => selectEvent(event.id)}
                      className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedEvent === event.id
                          ? darkMode
                            ? 'bg-blue-600/20 border-l-4 border-blue-500'
                            : 'bg-blue-50 border-l-4 border-blue-500'
                          : darkMode
                            ? 'hover:bg-gray-700'
                            : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <h4 className={`font-medium text-base ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {event.name}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-3 py-1 rounded-full ${
                            darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {event.subject}
                          </span>
                          {event.divisions && (
                            <span className={`text-xs px-3 py-1 rounded-full ${
                              darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-600'
                            }`}>
                              Div {event.divisions.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Test Configuration */}
            <div 
              data-test-config
              className={`w-full lg:w-96 rounded-xl flex-shrink-0 flex flex-col ${
                darkMode ? 'bg-palenight-100' : 'bg-white shadow-md'
              }`}
            >
              <div className="p-6 flex-1 flex flex-col">
                <h3 className={`text-xl font-semibold mb-6 ${
                  darkMode 
                    ? 'text-white' 
                    : 'text-gray-900'
                }`}>
                  Test Configuration
                </h3>
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
                        max="100"
                        value={settings.questionCount}
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
                        value={settings.timeLimit}
                        onChange={handleChange}
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
                        onClick={() => setSettings(prev => ({ ...prev, types: 'multiple-choice' }))}
                        disabled={Boolean(selectedEvent && events.find(event => event.id === selectedEvent)?.name === 'Codebusters')}
                        className={`flex-1 py-2 px-3 text-sm font-medium rounded-l-md border ${
                          Boolean(selectedEvent && events.find(event => event.id === selectedEvent)?.name === 'Codebusters')
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
                        onClick={() => setSettings(prev => ({ ...prev, types: 'both' }))}
                        disabled={Boolean(selectedEvent && events.find(event => event.id === selectedEvent)?.name === 'Codebusters')}
                        className={`px-3 py-2 text-sm font-medium border-t border-b ${
                          Boolean(selectedEvent && events.find(event => event.id === selectedEvent)?.name === 'Codebusters')
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
                        onClick={() => setSettings(prev => ({ ...prev, types: 'free-response' }))}
                        disabled={Boolean(selectedEvent && events.find(event => event.id === selectedEvent)?.name === 'Codebusters')}
                        className={`flex-1 py-2 px-3 text-sm font-medium rounded-r-md border ${
                          Boolean(selectedEvent && events.find(event => event.id === selectedEvent)?.name === 'Codebusters')
                            ? 'opacity-50 cursor-not-allowed ' + (darkMode ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-400')
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
                        const selectedEventObj = selectedEvent ? events.find(event => event.id === selectedEvent) : null;
                        const availableDivisions = selectedEventObj?.divisions || ['B', 'C'];
                        const canShowB = availableDivisions.includes('B');
                        const canShowC = availableDivisions.includes('C');
                        const canShowBoth = canShowB && canShowC;

                        return (
                          <>
                            <button
                              type="button"
                              onClick={() => canShowB ? setSettings(prev => ({ ...prev, division: 'B' })) : null}
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
                              onClick={() => canShowBoth ? setSettings(prev => ({ ...prev, division: 'any' })) : null}
                              disabled={!canShowBoth}
                              className={`px-3 py-2 text-sm font-medium border-t border-b ${
                                !canShowBoth
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
                              onClick={() => canShowC ? setSettings(prev => ({ ...prev, division: 'C' })) : null}
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
                          disabled={Boolean(selectedEvent && events.find(event => event.id === selectedEvent)?.name === 'Codebusters')}
                          className={`w-full flex justify-between items-center px-3 py-1.5 rounded-md border-0 ${
                            Boolean(selectedEvent && events.find(event => event.id === selectedEvent)?.name === 'Codebusters')
                              ? 'opacity-50 cursor-not-allowed ' + (darkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400')
                              : darkMode
                                ? 'bg-gray-700 text-white focus:ring-blue-500'
                                : 'bg-gray-50 text-gray-900 focus:ring-blue-600'
                          } shadow-sm focus:ring-1 focus:outline-none`}
                        >
                          <span className="break-words">{getDifficultyDisplayText()}</span>
                          <svg
                            className={`w-5 h-5 transform transition-transform ${
                              isDifficultyDropdownOpen ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {isDifficultyDropdownOpen && !Boolean(selectedEvent && events.find(event => event.id === selectedEvent)?.name === 'Codebusters') && (
                          <div className={`absolute z-10 w-full mt-1 max-h-48 overflow-y-auto overflow-x-hidden border rounded-md shadow-lg break-words ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600' 
                              : 'bg-white border-gray-300'
                          }`}>
                            <div className="p-2">
                              {/* Any option */}
                              <label className="flex items-start space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={settings.difficulties.length === 0}
                                  onChange={() => handleDifficultyChange('any')}
                                  className={`rounded border-gray-300 ${
                                    darkMode
                                      ? 'bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500'
                                      : 'bg-white border-gray-300 text-blue-600 focus:ring-blue-500'
                                  }`}
                                />
                                <span className={`text-sm font-medium ${
                                  darkMode ? 'text-gray-300' : 'text-gray-700'
                                }`}>
                                  Any
                                </span>
                              </label>
                              
                              {/* Separator */}
                              <hr className={`my-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`} />
                              
                              {/* Individual difficulty options */}
                              {difficultyOptions.map((option) => (
                                <label key={option.id} className="flex items-start space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={settings.difficulties.includes(option.id)}
                                    onChange={() => handleDifficultyChange(option.id)}
                                    className={`rounded border-gray-300 ${
                                      darkMode
                                        ? 'bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500'
                                        : 'bg-white border-gray-300 text-blue-600 focus:ring-blue-500'
                                    }`}
                                  />
                                  <span className={`text-sm break-words ${
                                    darkMode ? 'text-gray-300' : 'text-gray-700'
                                  }`}>
                                    {option.label}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {selectedEvent && events.find(event => event.id === selectedEvent)?.name === 'Codebusters' ? 'Cipher Types' : 'Subtopics'}
                      </label>
                      <div className="relative" ref={subtopicDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsSubtopicDropdownOpen(!isSubtopicDropdownOpen)}
                          className={`w-full flex justify-between items-center px-3 py-1.5 rounded-md border-0 ${
                            darkMode
                              ? 'bg-gray-700 text-white focus:ring-blue-500'
                              : 'bg-gray-50 text-gray-900 focus:ring-blue-600'
                          } shadow-sm focus:ring-1 focus:outline-none`}
                        >
                          <span className="break-words">{getSubtopicDisplayText()}</span>
                          <svg
                            className={`w-5 h-5 transform transition-transform ${
                              isSubtopicDropdownOpen ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {isSubtopicDropdownOpen && (
                          <div className={`absolute z-10 w-full mt-1 max-h-48 overflow-y-auto overflow-x-hidden border rounded-md shadow-lg break-words ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600' 
                              : 'bg-white border-gray-300'
                          }`}>
                            <div className="p-2">
                              {/* Any option */}
                              <label className="flex items-start space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={settings.subtopics.length === 0}
                                  onChange={() => handleSubtopicChange('any')}
                                  className={`rounded border-gray-300 ${
                                    darkMode
                                      ? 'bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500'
                                      : 'bg-white border-gray-300 text-blue-600 focus:ring-blue-500'
                                  }`}
                                />
                                <span className={`text-sm font-medium ${
                                  darkMode ? 'text-gray-300' : 'text-gray-700'
                                }`}>
                                  Any
                                </span>
                              </label>
                              
                              {/* Separator */}
                              {subtopics.length > 0 && (
                                <hr className={`my-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`} />
                              )}
                              
                              {/* Individual subtopics */}
                              {!selectedEvent ? (
                                <p className={`text-sm px-2 py-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  Please select an event first
                                </p>
                              ) : subtopics.length === 0 ? (
                                <p className={`text-sm px-2 py-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  No {selectedEvent && events.find(event => event.id === selectedEvent)?.name === 'Codebusters' ? 'cipher types' : 'subtopics'} available for this event
                                </p>
                              ) : (
                                subtopics.map((subtopic) => (
                                    <label key={subtopic} className="flex items-start space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={settings.subtopics.includes(subtopic)}
                                        onChange={() => handleSubtopicChange(subtopic)}
                                        className={`rounded border-gray-300 ${
                                          darkMode
                                            ? 'bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500'
                                            : 'bg-white border-gray-300 text-blue-600 focus:ring-blue-500'
                                        }`}
                                      />
                                      <span className={`text-sm break-words ${
                                        darkMode ? 'text-gray-300' : 'text-gray-700'
                                      }`}>
                                        {subtopic.charAt(0).toUpperCase() + subtopic.slice(1)}
                                      </span>
                                    </label>
                                  ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="tournament"
                      className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}
                    >
                      Tournament
                    </label>
                    <select
                      id="tournament"
                      value="any"
                      disabled={true}
                      onClick={() => {
                        toast.info('Tournament selection has been disabled for privacy reasons.');
                      }}
                      className={`block w-full rounded-md border-0 py-1.5 px-3 opacity-50 cursor-not-allowed ${
                        darkMode
                          ? 'bg-gray-800 text-gray-500'
                          : 'bg-gray-100 text-gray-500'
                      } shadow-sm`}
                    >
                      <option value="any">Any Tournament</option>
                    </select>
                  </div>

                  <div className="pt-2 grid grid-cols-2 gap-3 mt-auto">
                    <button
                      onClick={handleGenerateTest}
                      disabled={!selectedEvent}
                      className={`py-3 px-4 rounded-lg font-medium transition-all duration-300 border-2 ${
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
                      onClick={handleUnlimited}
                      disabled={Boolean(!selectedEvent || (selectedEvent && events.find(event => event.id === selectedEvent)?.name === 'Codebusters'))}
                      className={`py-3 px-4 rounded-lg font-medium transition-all duration-300 border-2 ${
                        !selectedEvent || (selectedEvent && events.find(event => event.id === selectedEvent)?.name === 'Codebusters')
                          ? 'opacity-50 cursor-not-allowed ' + (darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-500')
                          : darkMode
                            ? 'border-indigo-500 text-indigo-400 hover:bg-indigo-500 hover:text-white'
                            : 'border-indigo-500 text-indigo-600 hover:bg-indigo-500 hover:text-white'
                      }`}
                    >
                      Unlimited Practice
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>



      {/* Back Button (bottom-left) */}
      <button
        onClick={() => router.push('/dashboard')}
        className={`fixed bottom-8 left-8 p-4 rounded-full shadow-lg transition-transform duration-300 hover:scale-110  ${
          darkMode
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-blue-500 hover:bg-blue-600'
        } text-white z-50`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
      </button>

      <ToastContainer theme={darkMode ? "dark" : "light"} />
      <style jsx global>{`
          ::-webkit-scrollbar {
            width: 8px;
            transition: background 1s ease;
            ${darkMode
              ? 'background: black;'
              : 'background: white;'
            }
          }

          ::-webkit-scrollbar-thumb {
            background: ${darkMode
              ? '#374151'
              : '#3b82f6'};
            border-radius: 4px;
            transition: background 1s ease;
          }     
          ::-webkit-scrollbar-thumb:hover {
            background: ${darkMode
              ? '#1f2937'
              : '#2563eb'};
          }
          
          /* Handle long words by breaking them */
          .break-words {
            word-break: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
          }
          
          /* Specifically target very long words (14+ characters) */
          .break-words * {
            word-break: break-word;
            overflow-wrap: break-word;
          }
          
          /* Ensure checkboxes stay aligned when text wraps */
          input[type="checkbox"] {
            flex-shrink: 0;
            margin-top: 0.125rem;
          }
        `}</style>
    </div>
  );
}

export default EventDashboard;