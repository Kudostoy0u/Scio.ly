'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useTheme } from '@/app/contexts/ThemeContext';
import Header from '@/app/components/Header';
import { clearTestSession } from '@/app/utils/timeManagement';
import { Event, Settings } from '../types';
import { NORMAL_DEFAULTS, savePreferences } from '../utils';
import { buildTestParams, saveTestParams } from '@/app/utils/testParams';
import EventList from './EventList';
import TestConfiguration from './TestConfiguration';
import { ArrowUpRight } from 'lucide-react';
import { listDownloadedEventSlugs, subscribeToDownloads, hasOfflineEvent } from '@/app/utils/storage';

export default function PracticeDashboard() {
  const router = useRouter();
  const { darkMode } = useTheme();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState('alphabetical');
  const [continueInfo, setContinueInfo] = useState<{ eventName: string; route: '/test' | '/codebusters' } | null>(null);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  const [isLarge, setIsLarge] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [downloadedSet, setDownloadedSet] = useState<Set<string>>(new Set());

  const [settings, setSettings] = useState<Settings>({
    questionCount: NORMAL_DEFAULTS.questionCount,
    timeLimit: NORMAL_DEFAULTS.timeLimit,
    difficulties: [],
    types: 'multiple-choice',
    division: 'any',
    tournament: '',
    subtopics: [],
    idPercentage: 0,
  });

  // Load localStorage values after component mounts (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedQuestionCount = localStorage.getItem('defaultQuestionCount');
      const storedTimeLimit = localStorage.getItem('defaultTimeLimit');
      const storedDivision = localStorage.getItem('defaultDivision') || 'any';
      const storedQuestionTypes = localStorage.getItem('defaultQuestionTypes') || 'multiple-choice';
      const storedIdPercentage = localStorage.getItem('defaultIdPercentage');
      
      const questionCount = storedQuestionCount ? parseInt(storedQuestionCount) : NORMAL_DEFAULTS.questionCount;
      const timeLimit = storedTimeLimit ? parseInt(storedTimeLimit) : NORMAL_DEFAULTS.timeLimit;
      const idPercentage = storedIdPercentage ? parseInt(storedIdPercentage) : 0;
      
      setSettings(prev => ({
        ...prev,
        questionCount: isNaN(questionCount) ? NORMAL_DEFAULTS.questionCount : questionCount,
        timeLimit: isNaN(timeLimit) ? NORMAL_DEFAULTS.timeLimit : timeLimit,
        division: (storedDivision === 'B' || storedDivision === 'C' || storedDivision === 'any') ? storedDivision as any : 'any',
        types: (storedQuestionTypes === 'multiple-choice' || storedQuestionTypes === 'both' || storedQuestionTypes === 'free-response')
          ? storedQuestionTypes as any
          : 'multiple-choice',
        idPercentage: isNaN(idPercentage) ? 0 : idPercentage
      }));
    }
  }, []);

  // Detect offline and load downloaded event slugs
  useEffect(() => {
    const updateOnline = () => setIsOffline(!navigator.onLine);
    updateOnline();
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    
    const loadDownloadedSlugs = async () => {
      try {
        const keys = await listDownloadedEventSlugs();
        setDownloadedSet(new Set(keys));
      } catch {}
    };
    
    loadDownloadedSlugs();
    
    // Subscribe to cross-tab download updates for immediate UI sync
    const unsubscribe = subscribeToDownloads(loadDownloadedSlugs);
    
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      try { unsubscribe(); } catch {}
    };
  }, []);

  // Detect if there is a test in progress with at least one answer
  useEffect(() => {
    // Track viewport size to switch behavior on mobile vs desktop
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = () => setIsLarge(mq.matches);
    try {
      mq.addEventListener('change', apply);
    } catch {
      // Safari fallback
      mq.addListener(apply);
    }
    apply();
    return () => {
      try {
        mq.removeEventListener('change', apply);
      } catch {
        mq.removeListener(apply);
      }
    };
  }, []);

  useEffect(() => {
    // Sync Available Events panel height to EXACT Test Configuration height
    if (typeof window === 'undefined') return;
    const target = document.querySelector('[data-test-config]') as HTMLElement | null;
    if (!target) return;
    const update = () => {
      try {
        const rect = target.getBoundingClientRect();
        if (rect && rect.height > 0) setPanelHeight(rect.height);
      } catch {}
    };
    update();
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => update());
      ro.observe(target);
    } catch {
      // Fallback: listen to window resize
      window.addEventListener('resize', update);
    }
    return () => {
      if (ro) {
        try { ro.disconnect(); } catch {}
      } else {
        window.removeEventListener('resize', update);
      }
    };
  }, []);

  useEffect(() => {
    // Recompute on theme/layout shifts that might affect sizes
    const t = setTimeout(() => {
      const target = document.querySelector('[data-test-config]') as HTMLElement | null;
      if (target) {
        const rect = target.getBoundingClientRect();
        if (rect && rect.height > 0) setPanelHeight(rect.height);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [darkMode, selectedEvent]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // Prefer session info for event name and submission state
      const sessionStr = localStorage.getItem('currentTestSession');
      const session = sessionStr ? JSON.parse(sessionStr) as { eventName?: string; isSubmitted?: boolean } : null;
      if (session && session.isSubmitted) {
        setContinueInfo(null);
        return;
      }

      // General tests: check answered state
      const testAnswersStr = localStorage.getItem('testUserAnswers');
      const testAnswers = testAnswersStr ? JSON.parse(testAnswersStr) as Record<string, (string | null)[]> : null;
      const hasGeneralProgress = !!testAnswers && Object.values(testAnswers).some(arr => Array.isArray(arr) ? arr.some(v => v && String(v).length > 0) : !!testAnswersStr);

      // Codebusters: check any solution/notes fields populated
      const cbQuotesStr = localStorage.getItem('codebustersQuotes');
      let hasCodebustersProgress = false;
      if (cbQuotesStr) {
        try {
          const quotes = JSON.parse(cbQuotesStr) as Array<any>;
          hasCodebustersProgress = Array.isArray(quotes) && quotes.some(q => {
            const hasSolution = !!(q && q.solution && Object.values(q.solution).some((v) => typeof v === 'string' && v.length > 0));
            const hasHill = !!(q && q.hillSolution && q.hillSolution.plaintext && Object.values(q.hillSolution.plaintext).some((v) => typeof v === 'string' && v.length > 0));
            const hasNihilist = !!(q && q.nihilistSolution && Object.values(q.nihilistSolution).some((v) => typeof v === 'string' && v.length > 0));
            const hasFractionated = !!(q && q.fractionatedSolution && Object.values(q.fractionatedSolution).some((v) => typeof v === 'string' && v.length > 0));
            const hasColumnar = !!(q && q.columnarSolution && Object.values(q.columnarSolution).some((v) => typeof v === 'string' && v.length > 0));
            const hasXeno = !!(q && q.xenocryptSolution && Object.values(q.xenocryptSolution).some((v) => typeof v === 'string' && v.length > 0));
            const hasNotes = !!(q && q.frequencyNotes && Object.values(q.frequencyNotes).some((v) => typeof v === 'string' && v.length > 0));
            return hasSolution || hasHill || hasNihilist || hasFractionated || hasColumnar || hasXeno || hasNotes;
          });
        } catch {}
      }

      // Also consider current session state for Codebusters
      if (hasCodebustersProgress || (session && session.eventName === 'Codebusters')) {
        const params = localStorage.getItem('testParams');
        const eventName = (() => { try { return (params ? JSON.parse(params).eventName : undefined) || 'Codebusters'; } catch { return 'Codebusters'; }})();
        setContinueInfo({ eventName, route: '/codebusters' });
        return;
      }

      if (hasGeneralProgress) {
        const params = localStorage.getItem('testParams');
        const eventName = (() => { try { return (params ? JSON.parse(params).eventName : undefined) || 'Practice Test'; } catch { return 'Practice Test'; }})();
        setContinueInfo({ eventName, route: '/test' });
        return;
      }

      setContinueInfo(null);
    } catch {
      setContinueInfo(null);
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

    if (isOffline) {
      const slug = selectedEventObj.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      // Use real-time check instead of stale state
      (async () => {
        const hasDownloaded = await hasOfflineEvent(slug);
        if (!hasDownloaded) {
          toast.error('This event is not downloaded for offline use. Go to Offline page to download it.');
          return;
        }
        // Continue with test generation
        proceedWithTest(selectedEventObj);
      })();
      return;
    }
    
    proceedWithTest(selectedEventObj);
  };

  const proceedWithTest = (selectedEventObj: Event) => {
    // Clear any existing time management session
    clearTestSession();

    // ensure no stale sessions affect timer
    try { clearTestSession(); } catch {}
    const testParams = buildTestParams(selectedEventObj.name, settings);
    saveTestParams(testParams);
    if (selectedEventObj.name === 'Codebusters') {
      // clear codebusters legacy local keys for safety
      try {
        localStorage.removeItem('codebustersQuotes');
        localStorage.removeItem('codebustersIsTestSubmitted');
        localStorage.removeItem('codebustersTestScore');
        localStorage.removeItem('codebustersTimeLeft');
        localStorage.removeItem('shareCode');
      } catch {}
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

    if (isOffline) {
      const slug = selectedEventObj.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      // Use real-time check instead of stale state
      (async () => {
        const hasDownloaded = await hasOfflineEvent(slug);
        if (!hasDownloaded) {
          toast.error('This event is not downloaded for offline use. Go to Offline page to download it.');
          return;
        }
        // Continue with unlimited practice
        proceedWithUnlimited(selectedEventObj);
      })();
      return;
    }
    
    proceedWithUnlimited(selectedEventObj);
  };

  const proceedWithUnlimited = (selectedEventObj: Event) => {
    // Save preferences
    savePreferences(selectedEventObj.name, settings.questionCount, settings.timeLimit);

    // Clear any existing test session
    clearTestSession();

    // Special behavior for Codebusters: treat as creating a test with 1 question
    if (selectedEventObj.name === 'Codebusters') {
      const cbParams = buildTestParams(selectedEventObj.name, { ...settings, questionCount: 1 });
      saveTestParams(cbParams);
      try {
        localStorage.removeItem('codebustersQuotes');
        localStorage.removeItem('codebustersIsTestSubmitted');
        localStorage.removeItem('codebustersTestScore');
        localStorage.removeItem('codebustersTimeLeft');
        localStorage.removeItem('shareCode');
      } catch {}
      router.push('/codebusters');
      return;
    }

    // Default Unlimited behavior for non-Codebusters events
    try {
      const cookiePayload = encodeURIComponent(JSON.stringify({
        eventName: selectedEventObj.name,
        types: settings.types,
        division: settings.division,
        difficulties: settings.difficulties,
        subtopics: settings.subtopics,
        idPercentage: settings.idPercentage,
      }));
      document.cookie = `scio_unlimited_params=${cookiePayload}; Path=/; Max-Age=600; SameSite=Lax`;
    } catch {}
    router.push('/unlimited');
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
          // Sync division with normal events' selection
          const savedDivision = (() => {
            const stored = localStorage.getItem('defaultDivision');
            return stored === 'B' || stored === 'C' || stored === 'any' ? stored : 'any';
          })();
          const availableDivisions = selectedEventObj.divisions || ['B', 'C'];
          const canShowB = availableDivisions.includes('B');
          const canShowC = availableDivisions.includes('C');
          const divisionForEvent = (() => {
            if (savedDivision === 'any') {
              return (canShowB && canShowC) ? 'any' : (canShowC ? 'C' : 'B');
            }
            if (savedDivision === 'B' && !canShowB) return 'C';
            if (savedDivision === 'C' && !canShowC) return 'B';
            return savedDivision;
          })();

          setSettings(prev => ({
            ...prev,
            questionCount: isNaN(questionCount) ? 3 : questionCount,
            timeLimit: isNaN(timeLimit) ? 15 : timeLimit,
            difficulties: [],
            types: 'free-response',
            division: divisionForEvent as any,
            subtopics: []
          }));
        } else {
          // Fallback for server-side rendering
          const availableDivisions = selectedEventObj.divisions || ['B', 'C'];
          const canShowB = availableDivisions.includes('B');
          const canShowC = availableDivisions.includes('C');
          const divisionForEvent = (canShowB && canShowC) ? 'any' : (canShowC ? 'C' : 'B');
          setSettings(prev => ({
            ...prev,
            questionCount: 3,
            timeLimit: 15,
            difficulties: [],
            types: 'free-response',
            division: divisionForEvent as any,
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
        const savedDivision = (() => {
          if (typeof window === 'undefined') return 'any';
          const stored = localStorage.getItem('defaultDivision');
          return stored === 'B' || stored === 'C' || stored === 'any' ? stored : 'any';
        })();
        const savedTypes = (() => {
          if (typeof window === 'undefined') return 'multiple-choice';
          const stored = localStorage.getItem('defaultQuestionTypes');
          return stored === 'multiple-choice' || stored === 'both' || stored === 'free-response' ? stored : 'multiple-choice';
        })();
        const savedIdPercentage = (() => {
          if (typeof window === 'undefined') return 0;
          const stored = localStorage.getItem('defaultIdPercentage');
          const parsed = stored ? parseInt(stored) : 0;
          return isNaN(parsed) ? 0 : parsed;
        })();
        const availableDivisions = selectedEventObj.divisions || ['B', 'C'];
        const canShowB = availableDivisions.includes('B');
        const canShowC = availableDivisions.includes('C');
        const divisionForEvent = (() => {
          if (savedDivision === 'any') {
            return (canShowB && canShowC) ? 'any' : (canShowC ? 'C' : 'B');
          }
          if (savedDivision === 'B' && !canShowB) return 'C';
          if (savedDivision === 'C' && !canShowC) return 'B';
          return savedDivision;
        })();
        
        setSettings(prev => ({
          ...prev,
          questionCount: defaultQuestionCount,
          timeLimit: defaultTimeLimit,
          difficulties: [],
          types: savedTypes as any,
          division: divisionForEvent as any,
          subtopics: [],
          idPercentage: savedIdPercentage
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
            name: "Materials Science - Nanomaterials", 
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
          "Anatomy - Nervous": ["Brain Anatomy", "Spinal Cord", "Cranial Nerves", "Peripheral Nervous System", "Autonomic Nervous System", "Neurons", "Synapses", "Neurotransmitters", "Reflexes", "Sensory Pathways", "Motor Pathways", "Brain Functions"],
          "Anatomy - Endocrine": ["Pituitary Gland", "Thyroid Gland", "Adrenal Glands", "Pancreas", "Gonads", "Hormones", "Hormone Regulation", "Endocrine Disorders", "Metabolism", "Growth and Development", "Stress Response", "Reproductive Endocrinology"],
          "Anatomy - Sense Organs": ["Eye Anatomy", "Eye Physiology", "Ear Anatomy", "Ear Physiology", "Olfactory System", "Integumentary System", "Visual Pathway", "Hearing Physiology", "Balance (Equilibrium)", "Sensory Receptors", "Nervous System Anatomy", "Nervous System Physiology"],
          "Astronomy": ["Solar System", "Stars", "Galaxies", "Cosmology", "Instruments"],
          "Chemistry Lab": ["Stoichiometry", "Equilibrium", "Periodicity", "Redox Reactions", "Aqueous Solutions", "Acids and Bases", "Physical Properties", "Thermodynamics", "Gas Laws", "Kinetics", "Electrochemistry"],
          "Circuit Lab": ["Circuits", "Sensors", "Calibration", "Design", "Troubleshooting"],
          "Codebusters": ["Random Aristocrat", "K1 Aristocrat", "K2 Aristocrat", "K3 Aristocrat", "Random Patristocrat", "K1 Patristocrat", "K2 Patristocrat", "K3 Patristocrat", "Caesar", "Atbash", "Affine", "Hill 2x2", "Hill 3x3", "Baconian", "Porta", "Nihilist", "Fractionated Morse", "Complete Columnar", "Xenocrypt", "Checkerboard"],
          "Crime Busters": ["Evidence Analysis", "Fingerprints", "DNA", "Toxicology", "Crime Scene"],
          "Designer Genes": ["Genetics", "DNA", "Proteins", "Evolution", "Population Genetics"],
          "Disease Detectives": ["Epidemiology", "Pathogens", "Prevention", "Outbreak Investigation", "Statistics"],
          "Dynamic Planet - Oceanography": ["Plate Tectonics", "Earthquakes", "Volcanoes", "Mountain Building", "Ocean Basins", "Continental Drift", "Seafloor Spreading", "Subduction", "Faulting", "Folding", "Geologic Time", "Rock Deformation"],
          "Entomology": ["Insect Anatomy", "Life Cycles", "Behavior", "Classification", "Ecology"],
          "Forensics": ["Evidence Analysis", "Fingerprints", "DNA", "Toxicology", "Crime Scene"],
          "Heredity": ["Genetics", "DNA", "Proteins", "Evolution", "Population Genetics"],
          "Materials Science - Nanomaterials": ["Basics","Quantum Effects","Properties","Classification","Carbon Nanomaterials","Specific Types","Synthesis Methods","Top-Down","Bottom-Up","Microscopy","Spectroscopy","Analysis Techniques","Physical Properties","Mechanical Properties","Thermal Properties","Electronics","Biomedical","Energy","Materials"],
          "Meteorology": ["Weather Systems", "Clouds", "Precipitation", "Temperature", "Pressure"],
          "Metric Mastery": ["Estimation", "Orders of Magnitude", "Problem Solving", "Scientific Reasoning", "Calculations"],
          "Potions and Poisons": ["Toxicology", "Pharmacology", "Dosage", "Symptoms", "Antidotes"],
          "Remote Sensing": ["Satellites", "Imaging", "Data Analysis", "Applications", "Technology"],
          "Rocks and Minerals": ["Igneous", "Sedimentary", "Metamorphic", "Mineral Properties", "Crystal Systems"],
          "Solar System": ["Planets", "Moons", "Asteroids", "Comets", "Galaxies"],
          "Water Quality - Freshwater": ["pH", "Dissolved Oxygen", "Nutrients", "Pollutants", "Testing", "Classification"]
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
          {continueInfo && (
            <button
              type="button"
              onClick={() => router.push(continueInfo.route)}
              className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm group transition-colors ${
                darkMode
                  ? 'bg-transparent border-yellow-500/60 text-yellow-300 hover:border-yellow-400'
                  : 'bg-transparent border-yellow-500/70 text-yellow-700 hover:border-yellow-500'
              }`}
            >
              <span>{`Continue test for ${continueInfo.eventName}?`}</span>
              <ArrowUpRight
                className="w-4 h-4 transform transition-transform duration-200 rotate-45 group-hover:rotate-0"
              />
            </button>
          )}

          <p className={`mt-2 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Select an event from the 2026 events list and configure your practice session
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-stretch">
          {/* Event List */}
          <div
            className="flex-none lg:flex-1 overflow-hidden"
            style={{ height: isLarge && panelHeight ? `${panelHeight}px` : '48vh' }}
          >
            <EventList
              events={events}
              selectedEvent={selectedEvent}
              sortOption={sortOption}
              onEventSelect={selectEvent}
              onSortChange={setSortOption}
              loading={loading}
              error={error}
              isOffline={isOffline}
              downloadedSlugs={downloadedSet}
            />
          </div>

          {/* Test Configuration */}
          <div className="w-full lg:w-auto">
            <TestConfiguration
              selectedEvent={selectedEventObj || null}
              settings={settings}
              onSettingsChange={setSettings}
              onGenerateTest={handleGenerateTest}
              onUnlimited={handleUnlimited}
            />
          </div>
        </div>
      </main>

      {/* No floating back button on practice page */}

      {/* Global ToastContainer handles notifications */}
      <style jsx global>{`
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

          /* Responsive shared panel height for Practice panels */
          .practice-panel {
            height: 85vh;
          }
          @media (min-width: 640px) {
            .practice-panel { height: 86vh; }
          }
          @media (min-width: 1024px) {
            .practice-panel { height: 88vh; }
          }
          @media (min-width: 1280px) {
            .practice-panel { height: 82vh; }
          }
          @media (min-width: 1536px) {
            .practice-panel { height: 80vh; }
          }
        `}</style>
    </div>
  );
} 