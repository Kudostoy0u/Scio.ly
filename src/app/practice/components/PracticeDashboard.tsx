'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTheme } from '@/app/contexts/ThemeContext';
import Header from '@/app/components/Header';
import { clearTestSession } from '@/app/utils/timeManagement';
import { Event, Settings } from '../types';
import { NORMAL_DEFAULTS, loadPreferences, savePreferences } from '../utils';
import EventList from './EventList';
import TestConfiguration from './TestConfiguration';

export default function PracticeDashboard() {
  const router = useRouter();
  const { darkMode } = useTheme();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState('alphabetical');

  const [settings, setSettings] = useState<Settings>({
    questionCount: NORMAL_DEFAULTS.questionCount,
    timeLimit: NORMAL_DEFAULTS.timeLimit,
    difficulties: [],
    types: 'multiple-choice',
    division: 'any',
    tournament: '',
    subtopics: []
  });

  // Load localStorage values after component mounts (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedQuestionCount = localStorage.getItem('defaultQuestionCount');
      const storedTimeLimit = localStorage.getItem('defaultTimeLimit');
      
      const questionCount = storedQuestionCount ? parseInt(storedQuestionCount) : NORMAL_DEFAULTS.questionCount;
      const timeLimit = storedTimeLimit ? parseInt(storedTimeLimit) : NORMAL_DEFAULTS.timeLimit;
      
      setSettings(prev => ({
        ...prev,
        questionCount: isNaN(questionCount) ? NORMAL_DEFAULTS.questionCount : questionCount,
        timeLimit: isNaN(timeLimit) ? NORMAL_DEFAULTS.timeLimit : timeLimit
      }));
    }
  }, []);

  // This function is no longer needed as it's handled in TestConfiguration component
  // const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  //   const { id, value } = e.target;
  //   setSettings(prev => ({
  //     ...prev,
  //     [id]: id === 'questionCount' || id === 'timeLimit' ? parseInt(value) : value
  //   }));
  // };

  const handleGenerateTest = () => {
    if (!selectedEvent) {
      toast.error('Please select an event first');
      return;
    }

    const selectedEventObj = events.find((event) => event.id === selectedEvent);
    if (!selectedEventObj) {
      toast.error('Selected event not found');
      return;
    }

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

    const selectedEventObj = events.find(event => event.id === selectedEvent);
    if (!selectedEventObj) {
      toast.error('Selected event not found');
      return;
    }

    // Save preferences
    savePreferences(selectedEventObj.name, settings.questionCount, settings.timeLimit);

    // Clear any existing test session
    clearTestSession();

    // Build query parameters for unlimited mode
    const params = new URLSearchParams({
      event: selectedEventObj.name,
      mode: 'unlimited',
      types: settings.types,
      division: settings.division
    });

    if (settings.difficulties.length > 0) {
      params.append('difficulties', settings.difficulties.join(','));
    }

    if (settings.subtopics.length > 0) {
      params.append('subtopics', settings.subtopics.join(','));
    }

    // Navigate to unlimited page
    router.push(`/unlimited?${params.toString()}`);
  };

  const selectEvent = (id: number) => {
    setSelectedEvent(id);
    const selectedEventObj = events.find(event => event.id === id);
    
    if (selectedEventObj) {
      if (selectedEventObj.name === 'Codebusters') {
        // Codebusters uses its own localStorage system with defaults of 3 and 15
        if (typeof window !== 'undefined') {
          const codebustersQuestionCount = localStorage.getItem('codebustersQuestionCount');
          const codebustersTimeLimit = localStorage.getItem('codebustersTimeLimit');
          
          const questionCount = codebustersQuestionCount ? parseInt(codebustersQuestionCount) : 3;
          const timeLimit = codebustersTimeLimit ? parseInt(codebustersTimeLimit) : 15;
          
          // Set defaults if not already set
          if (!codebustersQuestionCount) {
            localStorage.setItem('codebustersQuestionCount', '3');
          }
          if (!codebustersTimeLimit) {
            localStorage.setItem('codebustersTimeLimit', '15');
          }
          
          setSettings(prev => ({
            ...prev,
            questionCount: isNaN(questionCount) ? 3 : questionCount,
            timeLimit: isNaN(timeLimit) ? 15 : timeLimit,
            difficulties: [],
            types: 'free-response',
            division: selectedEventObj.divisions?.includes('B') ? 'B' : 'C',
            subtopics: []
          }));
        } else {
          // Fallback for server-side rendering
          setSettings(prev => ({
            ...prev,
            questionCount: 3,
            timeLimit: 15,
            difficulties: [],
            types: 'free-response',
            division: selectedEventObj.divisions?.includes('B') ? 'B' : 'C',
            subtopics: []
          }));
        }
      } else {
        // Other events use global defaults from localStorage
        const defaultQuestionCount = (() => {
          if (typeof window === 'undefined') return NORMAL_DEFAULTS.questionCount;
          const stored = localStorage.getItem('defaultQuestionCount');
          const parsed = stored ? parseInt(stored) : NORMAL_DEFAULTS.questionCount;
          return isNaN(parsed) ? NORMAL_DEFAULTS.questionCount : parsed;
        })();
        const defaultTimeLimit = (() => {
          if (typeof window === 'undefined') return NORMAL_DEFAULTS.timeLimit;
          const stored = localStorage.getItem('defaultTimeLimit');
          const parsed = stored ? parseInt(stored) : NORMAL_DEFAULTS.timeLimit;
          return isNaN(parsed) ? NORMAL_DEFAULTS.timeLimit : parsed;
        })();
        
        setSettings(prev => ({
          ...prev,
          questionCount: defaultQuestionCount,
          timeLimit: defaultTimeLimit,
          difficulties: [],
          types: 'multiple-choice',
          division: selectedEventObj.divisions?.includes('B') ? 'B' : 'C',
          subtopics: []
        }));
      }
    }
  };

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
          "Codebusters": ["Random Aristocrat", "K1 Aristocrat", "K2 Aristocrat", "K3 Aristocrat", "Random Patristocrat", "K1 Patristocrat", "K2 Patristocrat", "K3 Patristocrat", "Caesar", "Atbash", "Affine", "Hill 2x2", "Hill 3x3", "Baconian", "Porta", "Nihilist", "Fractionated Morse", "Columnar Transposition", "Xenocrypt"],
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

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load events. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const selectedEventObj = selectedEvent ? events.find(event => event.id === selectedEvent) : null;

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

        <div className="flex flex-col lg:flex-row gap-8 h-[calc(120vh+200px)] lg:h-[calc(110vh-200px)]">
          {/* Event List */}
          <EventList
            events={events}
            selectedEvent={selectedEvent}
            sortOption={sortOption}
            onEventSelect={selectEvent}
            onSortChange={setSortOption}
            loading={loading}
            error={error}
          />

          {/* Test Configuration */}
          <TestConfiguration
            selectedEvent={selectedEventObj || null}
            settings={settings}
            onSettingsChange={setSettings}
            onGenerateTest={handleGenerateTest}
            onUnlimited={handleUnlimited}
          />
        </div>
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