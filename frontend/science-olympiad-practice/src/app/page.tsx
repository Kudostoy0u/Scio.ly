"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import {FaBook, FaRobot, FaChartPie, FaDiscord, FaGithub } from "react-icons/fa";
import { Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
  useMotionTemplate,
  useMotionValue,
  animate,
  useInView,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { FiArrowRight, FiClock, FiTarget } from "react-icons/fi";
import 'react-toastify/dist/ReactToastify.css';
import Header from './components/Header';
import Image from 'next/image';
import { useTheme } from './contexts/ThemeContext';
import { Suspense } from "react";
import { Float, Points } from "@react-three/drei";

const COLORS_TOP = ["#13FFAA", "#1E67C6", "#CE84CF", "#DD335C"];

// Helper function to parse K notation
const parseKValue = (value: string): number => {
  if (value.endsWith('K')) {
    return parseFloat(value.replace('K', '')) * 1000;
  }
  return parseFloat(value);
};

// Animated Counter Component
function AnimatedCounter({ value, className }: { value: string; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const count = useMotionValue(0);
  const rounded = useMotionValue("0");
  const targetValue = parseKValue(value);

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, targetValue, {
        duration: 2,
        ease: "easeOut",
        onUpdate: (latest) => {
          if (latest >= 1000) {
            rounded.set((latest / 1000).toFixed(1) + "K");
          } else {
            rounded.set(latest.toFixed(0));
          }
        },
      });
      return () => controls.stop();
    }
  }, [isInView, count, rounded, targetValue]);

  return (
    <motion.span ref={ref} className={className}>
      {rounded}
    </motion.span>
  );
}

// Sample Question Component
function SampleQuestion() {
  const { darkMode } = useTheme();
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const correctAnswer = "Triceps brachii"; // Updated correct answer to full text

  // Options array without prefixes
  const options = ['Deltoid', 'Triceps brachii', 'Brachialis', 'Pectoralis major'];

  const handleAnswerClick = (option: string) => {
    setSelectedAnswer(option);
  };

  const getOptionClasses = (option: string) => {
    const baseClasses = `w-full text-left p-3 rounded-lg border transition-all duration-200 flex items-center gap-3 group transform hover:scale-[1.02] `;
    const themeClasses = darkMode ? 'border-gray-700 text-white' : 'border-gray-300 text-gray-800';
    const interactionClasses = selectedAnswer ? 'cursor-default' : 'cursor-default group-hover:scale-[1.02]';

    if (!selectedAnswer) {
      return `${baseClasses} ${themeClasses} ${interactionClasses} ${darkMode ? 'bg-gray-700/50 hover:bg-gray-600/50' : 'bg-gray-100 hover:bg-gray-200'}`;
    }
    if (option === selectedAnswer) {
      return `${baseClasses} ${themeClasses} ${interactionClasses} ${
        option === correctAnswer
          ? 'bg-green-500/30 border-green-500'
          : 'bg-red-500/30 border-red-500'
      }`;
    }
    // Fade out unselected options
    return `${baseClasses} ${themeClasses} ${interactionClasses} ${darkMode ? 'bg-gray-800/30 text-gray-500 border-gray-700/50' : 'bg-gray-50 text-gray-400 border-gray-200'}`;
  };

  const getRadioClasses = (option: string) => {
    const baseRadioClasses = "h-4 w-4 rounded-full border-2 flex-shrink-0 transition-colors duration-200";

    if (!selectedAnswer) {
      // Before selection: Gray bg, gray border -> blue border (group hover) -> purple bg/border (self hover)
      return `${baseRadioClasses} ${darkMode 
        ? 'bg-gray-700 border-gray-600 group-hover:border-blue-500' 
        : 'bg-gray-300 border-gray-400 group-hover:border-blue-500'}`;
    }
    if (option === selectedAnswer) {
      // Selected: Green (correct) or Red (incorrect)
      return `${baseRadioClasses} ${
        option === correctAnswer
          ? (darkMode ? 'border-green-500 bg-green-600' : 'border-green-600 bg-green-500')
          : (darkMode ? 'border-red-500 bg-red-600' : 'border-red-600 bg-red-500')
      }`;
    }
    // Faded for unselected after selection
    return `${baseRadioClasses} ${darkMode ? 'border-gray-700 bg-gray-800 opacity-50' : 'border-gray-300 bg-gray-200 opacity-50'}`;
  };

  return (
    <div className={`relative overflow-hidden rounded-xl p-6 border ${darkMode 
      ? 'bg-gray-900 border-gray-800 shadow-lg shadow-blue-500/15 hover:shadow-xl hover:shadow-blue-400/20' 
      : 'bg-white border-gray-200 shadow-lg shadow-blue-400/10 hover:shadow-xl hover:shadow-blue-400/15'
    } animated-border-streak transition-shadow duration-300`}>
      <h4 className={`text-lg font-semibold mb-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Anatomy & Physiology - Muscular System</h4>
      <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        Which muscle acts as the primary antagonist to the biceps brachii during forearm flexion?
      </p>
      <div className="space-y-3 mb-4">
        {options.map((optionText) => { // Use options array
          return (
            <button
              key={optionText} // Use full text as key
              onClick={() => handleAnswerClick(optionText)} // Pass full text
              disabled={!!selectedAnswer}
              className={getOptionClasses(optionText)}
              
            >
              {/* Custom Radio Button */}
              <span className={getRadioClasses(optionText)}></span>
              <span>{optionText}</span> {/* Display full text */} 
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { darkMode, setDarkMode } = useTheme();
  const color = useMotionValue(COLORS_TOP[0]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [selectedStudyMode, setSelectedStudyMode] = useState<string | null>(null); // State for study mode
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds

  useEffect(() => {
    const controls = animate(color, COLORS_TOP, {
      ease: "easeInOut",
      duration: 10,
      repeat: Infinity,
      repeatType: "mirror",
    });

    return () => {
      controls.stop();
    };
  }, [color]);

  // Effect to handle theme changes and reset button styles
  useEffect(() => {
    if (!darkMode && buttonRef.current) {
      // Force reset any lingering styles when in light mode
      const button = buttonRef.current;
      button.style.boxShadow = '';
      button.style.border = '';
    }
  }, [darkMode]);

  useEffect(() => {
    // Apply scrollbar styles based on theme
    document.documentElement.classList.toggle('dark-scrollbar', darkMode);
    document.documentElement.classList.toggle('light-scrollbar', !darkMode);
  }, [darkMode]);

  // Countdown Timer Effect
  useEffect(() => {
    if (timeLeft <= 0) return; // Stop if time is up

    const intervalId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    // Cleanup interval on component unmount or when time runs out
    return () => clearInterval(intervalId);
  }, [timeLeft]); // Rerun effect if timeLeft changes (needed for cleanup)

  // Helper function to format time
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const backgroundImage = useMotionTemplate`radial-gradient(132% 132% at 50% 10%, rgba(2, 6, 23, 0.8) 50%, ${color})`;
  const border = useMotionTemplate`1px solid ${color}`;
  const boxShadow = useMotionTemplate`0px 4px 24px ${color}`;
  const mainFeatures = [
    {
      icon: <FaBook className="w-8 h-8" />,
      title: "Comprehensive Coverage",
      description: "Over 3000 questions across 24 Division C events, with Division B support coming soon"
    },
    {
      icon: <FaRobot className="w-8 h-8" />,
      title: "AI Explanations",
      description: "Get instant, detailed explanations for every question using Google's Gemini 2.0"
    },
    {
      icon: <FaChartPie className="w-8 h-8" />,
      title: "Smart Features",
      description: "Track progress, share tests, and contest answers - all in one platform"
    }
  ];

  // Updated metrics data with raw numbers for animation
  const metrics = [
    { number: "5.3K", raw: 5300, label: "Practice tests worth of questions" },
    { number: "93K", raw: 93000, label: "Questions solved" },
    { number: "6.6K", raw: 6600, label: "Active users" }
  ];

  const handleThemeToggle = () => {
    setDarkMode(!darkMode);
  };

  const titleGradient = `bg-gradient-to-r ${darkMode ? 'from-blue-400 via-cyan-400 to-green-400' : 'from-blue-600 via-cyan-500 to-green-500'} bg-clip-text text-transparent pb-1`;

  // Helper for Study Mode Radio Button Classes
  const getStudyModeRadioClasses = (mode: string) => {
    const baseClasses = "mt-1.5 h-4 w-4 rounded-full border-2 flex-shrink-0 transition-colors duration-200";
    const isSelected = selectedStudyMode === mode;

    if (isSelected) {
      return `${baseClasses} ${darkMode ? 'border-purple-500 bg-purple-600' : 'border-purple-600 bg-purple-500'}`; // Selected: Purple
    } else {
      // Not Selected: Gray -> Purple (self hover) - Removed group-hover blue
      return `${baseClasses} ${darkMode ? 'border-gray-600 bg-gray-700 hover:bg-purple-600' : 'border-gray-400 bg-gray-300 hover:bg-purple-500'}`;
    }
  };

  // Define study modes data
  const studyModes = [
    { id: 'timed', title: 'Timed Tests', description: 'Simulate competition conditions with customizable timed tests' },
    { id: 'unlimited', title: 'Unlimited Practice', description: 'Practice endlessly with our question bank, filtered by difficulty' },
    { id: 'shared', title: 'Shared Tests', description: 'Take tests shared by teammates or create your own to share' },
  ];

  return (
    <div className={`relative font-Poppins ${darkMode ? 'bg-[#020617]' : 'bg-white'} transition-colors duration-300 cursor-default`}>
      <Header />
      {/* Updated Hero Section */}
      <section className="min-h-screen relative overflow-hidden">
        {darkMode && (
          <motion.div
            style={{ backgroundImage }}
            className="absolute inset-0 z-10"
          />
        )}
        
        {darkMode && (
          <div className="absolute inset-0 z-5">
            <Canvas>
              <Stars radius={100} count={2000} factor={10} saturation={100} fade speed={1} />
            </Canvas>
          </div>
        )}
        
        {!darkMode && (
          <>
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-blue-100 to-white"></div>
            <div className="absolute inset-0 z-5 opacity-20">
              <Canvas>
                <ambientLight intensity={0.1} />
                <directionalLight position={[0, 10, 5]} intensity={0.3} />
                <Suspense fallback={null}>
                  <Float
                    speed={2}
                    rotationIntensity={0.5}
                    floatIntensity={1}
                  >
                    <Points count={800} size={0.6}>
                      <pointsMaterial color="#4299e1" />
                    </Points>
                  </Float>
                </Suspense>
              </Canvas>
            </div>
            <div 
              className="absolute inset-0 z-1 pointer-events-none static-gradient"
            ></div>
          </>
        )}

        <div className="relative z-20 h-screen flex items-center justify-center">
          <div className="text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-8xl font-bold mb-6 ${darkMode ? 'text-gray-100' : 'text-gray-900'} pb-1`}
            >
              Scio.ly
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`text-2xl mb-8 w-[85vw] md:max-w-2xl mx-auto ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Over <span className="font-bold text-blue-500">4000</span> Science Olympiad tests compiled into one website, designed for the <span className="font-bold text-blue-500">ultimate studying experience</span>.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Link href="/dashboard">
                <motion.button
                  ref={buttonRef}
                  style={darkMode ? { border, boxShadow } : {}}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  className={`group relative flex mx-auto items-center gap-1.5 rounded-full px-6 py-3 transition-all ${
                    darkMode 
                      ? 'bg-gray-950/10 text-gray-50 hover:bg-gray-950/50' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg light-button-halo'
                  }`}
                >
                  Start Practicing
                  <FiArrowRight className="transition-transform group-hover:-rotate-45 group-active:-rotate-12" />
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Features Section */}
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
        className={`py-20 px-4 ${darkMode ? '' : 'bg-gray-50'}`}
      >
        <div className="max-w-7xl mx-auto">
          <h2 className={`text-5xl font-bold mb-4 ${titleGradient}`}>
            Master Science Olympiad Events
          </h2>
          <p className={`mb-12 max-w-2xl ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Stop wasting time searching for practice materials. Scio.ly provides a comprehensive, organized platform
            carefully designed and crafted for Science Olympiad students – available to everyone, for free.
          </p>

          {/* Feature Cards with animation */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {mainFeatures.map((feature, index) => (
              <div className="transform transition-all duration-300 hover:scale-[1.03]" key={index}>
              <motion.div
                key={index}
                className={`rounded-xl p-6 border transform transition-all duration-300 ${
                  darkMode
                    ? 'bg-gray-900/50 border-gray-800 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10'
                    : 'bg-white border-gray-200 hover:border-blue-300 shadow-sm hover:shadow-md'
                }`}
              >
                <div className={`mb-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{feature.icon}</div>
                <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{feature.title}</h3>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{feature.description}</p>
              </motion.div>
              </div>
            ))}
          </div>

          {/* Event Categories - Staggered Animation */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {[...Array(4)].map((_, index) => (
              <div key = {index} className = "hover:scale-[1.02] duration-300">
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`rounded-lg p-4 border transition-colors duration-200 ${ // Base styles
                  index === 0 ? (darkMode ? 'bg-green-500/10 border-green-500/20 hover:border-green-800' : 'bg-green-200 border-green-100 hover:border-green-500') :
                  index === 1 ? (darkMode ? 'bg-purple-500/10 border-purple-500/20 hover:border-purple-800' : 'bg-purple-200 border-purple-100 hover:border-purple-500') :
                  index === 2 ? (darkMode ? 'bg-blue-500/10 border-blue-500/20 hover:border-blue-800' : 'bg-blue-200 border-blue-100 hover:border-blue-500') :
                  (darkMode ? 'bg-red-500/10 border-red-500/20 hover:border-red-800' : 'bg-red-200 border-red-100 hover:border-red-500')
                }`}
              >
                <h4 className={
                  index === 0 ? (darkMode ? 'text-green-400 font-semibold mb-2' : 'text-green-700 font-semibold mb-2') :
                  index === 1 ? (darkMode ? 'text-purple-400 font-semibold mb-2' : 'text-purple-700 font-semibold mb-2') :
                  index === 2 ? (darkMode ? 'text-blue-400 font-semibold mb-2' : 'text-blue-700 font-semibold mb-2') :
                  (darkMode ? 'text-red-400 font-semibold mb-2' : 'text-red-700 font-semibold mb-2')
                }>
                  {index === 0 ? 'Life Science' : index === 1 ? 'Earth & Space' : index === 2 ? 'Physical Science' : 'New and FRQ-based'}
                </h4>
                <ul className={`text-sm space-y-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {index === 0 ? ['• Anatomy & Physiology', '• Microbe Mission', '• Disease Detectives'].map(item => <li key={item}>{item}</li>) :
                   index === 1 ? ['• Astronomy', '• Dynamic Planet', '• Fossils'].map(item => <li key={item}>{item}</li>) :
                   index === 2 ? ['• Wind Power', '• Optics', '• Chemistry Lab'].map(item => <li key={item}>{item}</li>) :
                   ['• Codebusters', '• Entomology', '• Geologic Mapping'].map(item => <li key={item}>{item}</li>)}
                </ul>
              </motion.div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* NEW Sample Question Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.5 }}
        className={`py-20 px-4 ${darkMode ? 'bg-gray-900/60' : 'bg-gray-100'}`}
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Right Column: Text Content (Now first in source order) */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="md:order-2" // Keep it on the right visually on medium+ screens
          >
            <div className={`inline-block px-3 py-1 rounded-full text-sm mb-4 ${darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
              Hands-on Practice
            </div>
            <h2 className={`text-5xl font-bold mb-4 ${titleGradient}`}> 
              Learn by Doing
            </h2>
            <p className={darkMode ? 'text-gray-300 mb-6' : 'text-gray-700 mb-6'}>
              As Science Olympiad competitors ourselves, we wanted to learn our events beyond memorizing wiki facts. Scio.ly provides thousands of questions from past exams so you know exactly what to expect. 
            </p>
          </motion.div>

          {/* Left Column: Sample Question (Now second in source order) */}
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="md:order-1" // Keep it on the left visually on medium+ screens
          >
            <SampleQuestion />
          </motion.div>
        </div>
      </motion.section>

      {/* Resources Preview Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
        className={`py-20 px-4 ${darkMode ? 'bg-gray-900/30' : 'bg-white'}`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
            >
              <div className={`inline-block px-3 py-1 rounded-full text-sm mb-4 ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                Test Features
              </div>
              <h2 className={`text-5xl leading-[7vh] font-bold mb-4 ${titleGradient}`}>Everything You Need</h2>
              <p className={darkMode ? 'text-gray-300 mb-6' : 'text-gray-700 mb-6'}>
                Practice smarter with our comprehensive testing platform:
              </p>
              <ul className={darkMode ? 'space-y-3 text-gray-300' : 'space-y-3 text-gray-700'}>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Share tests with teammates using unique codes
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Contest answers and Gemini 2.0 explanations
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Customizable difficulty ratings
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Both MCQ and FRQ support
                </li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ y: 0, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              className={`${darkMode 
                ? 'bg-gray-900 border-gray-800 shadow-lg shadow-blue-500/15 hover:shadow-xl hover:shadow-blue-400/20' 
                : 'bg-white border-gray-200 shadow-lg shadow-blue-400/10 hover:shadow-xl hover:shadow-blue-400/15'
              } rounded-xl p-6 border overflow-hidden transform hover:scale-105 transition-all duration-300`}>
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-3">
                    <span className={`${darkMode ? 'text-blue-400' : 'text-blue-600'} font-mono`}>Test Code:</span>
                    <span className={`${darkMode ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-100 text-blue-600'} px-3 py-1 rounded font-mono`}>ABC123</span>
                  </div>
                  <span className={`${darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'} px-2 py-1 rounded text-xs uppercase tracking-wider`}>
                    Shared
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`rounded-lg p-4 hover:scale-[1.02] duration-300 ${darkMode ? 'bg-gray-800/50 border border-gray-700/50' : 'bg-white/90 shadow-sm border border-gray-200'}`}>
                    <div className={`mb-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Questions</div>
                    <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>15</div>
                  </div>
                  <div className={`rounded-lg p-4 hover:scale-[1.02] duration-300 ${darkMode ? 'bg-gray-800/50 border border-gray-700/50' : 'bg-white/90 shadow-sm border border-gray-200'}`}>
                    <div className={`mb-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Time Limit</div>
                    <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>25:00</div>
                  </div>
                  <div className={`rounded-lg p-4 hover:scale-[1.02] duration-300 ${darkMode ? 'bg-gray-800/50 border border-gray-700/50' : 'bg-white/90 shadow-sm border border-gray-200'}`}>
                    <div className={`mb-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Difficulty</div>
                    <div className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Mixed</div>
                  </div>
                  <div className={`rounded-lg p-4 hover:scale-[1.02] duration-300 ${darkMode ? 'bg-gray-800/50 border border-gray-700/50' : 'bg-white/90 shadow-sm border border-gray-200'}`}>
                    <div className={`mb-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Event</div>
                    <div className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>Ecology</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Progress Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
        className={`py-20 px-4 ${darkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800' : 'bg-gradient-to-br from-blue-50/50 to-blue-100/50'}`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Right Column: Text Content (Swapped) */}
            <motion.div
              initial={{ x: 50, opacity: 0 }} // Start from right
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="md:order-2" // Ensure it appears on the right on medium screens and up
            >
              <div className={`inline-block px-3 py-1 rounded-full text-sm mb-4 ${darkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                Practice Your Way
              </div>
              <h2 className={`text-5xl font-bold mb-4 ${titleGradient}`}>Multiple Study Modes</h2>
              <p className={darkMode ? 'text-gray-400 mb-6' : 'text-gray-700 mb-6'}>
                Choose how you want to practice:
              </p>
              <ul className={`space-y-1 ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                {studyModes.map((mode) => (
                  <li key={mode.id}>
                    <button
                      onClick={() => setSelectedStudyMode(mode.id)}
                      className={`w-full flex items-start text-left gap-3 group p-3 rounded-lg transition-all duration-200 hover:scale-[1.02] ${selectedStudyMode === mode.id ? (darkMode ? 'bg-gray-700/30' : 'bg-gray-100') : ''} ${darkMode ? 'hover:bg-gray-700/20' : 'hover:bg-gray-50'}`}
                    >
                      {/* Custom Radio Button */}
                      <span className={getStudyModeRadioClasses(mode.id)}></span>
                      <div className="flex-1">
                        <strong className={darkMode ? 'text-white' : 'text-gray-900'}>{mode.title}</strong>
                        <p className="text-sm">{mode.description}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Left Column: Study Mode Cards (Swapped) */}
            <motion.div
              initial={{ x: -50, opacity: 0 }} // Start from left
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className={`rounded-xl p-6 border h-full md:order-1 transition-shadow duration-300 ${ 
                darkMode
                  ? 'bg-gray-900/70 border-gray-800 shadow-lg shadow-blue-500/15 hover:shadow-xl hover:shadow-blue-400/20'
                  : 'bg-white border-gray-200 shadow-lg shadow-blue-400/10 hover:shadow-xl hover:shadow-blue-400/15'
              }`}>
              <div className="flex flex-col h-full space-y-4">
                <div className={`p-6 rounded-lg flex-1 transition-all duration-300 transform hover:scale-[1.02] ${ // Reduced scale from 1.05
                  darkMode ? 'bg-blue-500/10 hover:bg-blue-500/20 hover:shadow-md hover:shadow-blue-500/10' : 'bg-blue-50 border border-blue-100 hover:bg-blue-100 hover:shadow-lg hover:shadow-blue-500/10'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={darkMode ? 'text-blue-400 text-xl font-semibold' : 'text-blue-700 text-xl font-semibold'}>Timed Test</h3>
                    <FiClock className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div className="flex justify-between items-end">
                    <span className={darkMode ? 'text-gray-400 text-lg' : 'text-gray-600 text-lg'}>15 Questions</span>
                    <span className={`text-2xl font-mono ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>{formatTime(timeLeft)}</span>
                  </div>
                </div>
                <div className={`p-6 rounded-lg flex-1 transition-all duration-300 transform hover:scale-[1.02] ${ // Reduced scale from 1.05
                  darkMode ? 'bg-purple-500/10 hover:bg-purple-500/20 hover:shadow-md hover:shadow-purple-500/10' : 'bg-purple-50 border border-purple-100 hover:bg-purple-100 hover:shadow-lg hover:shadow-purple-500/10'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={darkMode ? 'text-purple-400 text-xl font-semibold' : 'text-purple-700 text-xl font-semibold'}>Unlimited</h3>
                    <FiTarget className={`w-6 h-6 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div className="flex justify-between items-end">
                    <span className={darkMode ? 'text-gray-400 text-lg' : 'text-gray-600 text-lg'}>No Limits</span>
                    <span className={`text-2xl font-mono ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>∞</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Metrics Section - Updated */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
        className={`py-20 px-4 ${
        darkMode
          ? 'bg-gradient-to-br from-gray-900 via-[#020617] to-gray-900'
          : 'bg-gray-50'
      }`}>
        <div className="max-w-7xl mx-auto text-left">
          <h2 className={`text-5xl font-bold mb-12 ${titleGradient}`}>Trusted by Thousands</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {metrics.map((metric, index) => (
              <div key={index} className="p-6 border-l-4 border-blue-500/30 pl-6">
                <AnimatedCounter
                  value={metric.number}
                  className={`text-5xl font-bold mb-2 block ${darkMode ? 'text-white' : 'text-gray-900'}`}
                />
                <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{metric.label}</div>
              </div>
            ))}
          </div>

        </div>
      </motion.section>

      {/* Final CTA Section */}
      <section className={`py-20 px-4 ${
        darkMode 
          ? 'bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900' 
          : 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500'
      }`}>
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
            Time to get practicing.
          </h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto text-white/90">
            Join thousands of students upping their knowledge and bringing back gold with our comprehensive platform.
          </p>
          <Link 
            href="/dashboard" 
            className={`inline-block px-8 py-4 rounded-lg text-lg font-medium transition-all transform hover:scale-105 ${
              darkMode 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg hover:shadow-blue-500/20' 
                : 'bg-white text-blue-600 shadow-lg hover:shadow-white/30'
            }`}
          >
            Start Now
          </Link>
        </div>
      </section>

      {/* FAQ Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.5 }}
        className={`py-20 px-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
      >
        <div className="max-w-7xl mx-auto">
          <h2 className={`text-5xl font-bold mb-16 text-center ${titleGradient}`}>Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[...Array(4)].map((_, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.03, boxShadow: darkMode ? '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.2)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={`rounded-xl p-6 border ${
                darkMode
                  ? 'bg-gray-800/50 border-gray-700'
                  : 'bg-white border-gray-200 shadow-sm'
              }`}>
                <h3 className={`text-xl font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {index === 0 ? 'Where do the questions come from?' :
                   index === 1 ? 'How is AI being used?' :
                   index === 2 ? 'Is this an official practice platform?' :
                   'How can I contribute?'}
                </h3>
                <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                  {index === 0 ? 'Our questions are sourced from publicly available Science Olympiad tests and resources, ensuring a comprehensive and diverse question bank.' :
                   index === 1 ? 'AI is primarily used for grading free response question, providing detailed explanations, and processing reports. All questions are from real Science Olympiad tests - AI is not used to generate questions.' :
                   index === 2 ? 'No, Scio.ly is not not endorsed by Science Olympiad Inc. Our platform provides practice materials based on past exams but we do not make any guarantees about content on future exams.' :
                   'We welcome contributions! Check out our GitHub repository to see how you can help improve the platform, suggest features, or report issues. You can also help by sending feedback through our contact form.'}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-100 border-gray-200'} border-t`}>
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <Link href="/" className="flex items-center">
                <Image
                  src="/site-logo.png"
                  alt="Scio.ly Logo"
                  width={32}
                  height={32}
                  className="mr-2"
                />
                <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Scio.ly</span>
              </Link>
              <p className={`mt-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Making Science Olympiad practice accessible to everyone. 
              </p>
            </div>
            <div>
              <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/dashboard" className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/practice" className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                    Practice
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Connect</h3>
              <div className="flex space-x-4">
                <a href="https://github.com/NapervilleASK/Scio.ly" className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                  <FaGithub className="w-6 h-6" />
                </a>
                <a href="https://discord.gg/hXSkrD33gu" className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                  <FaDiscord className="w-6 h-6" />
                </a>
              </div>
            </div>
          </div>
          <div className={`mt-8 pt-8 border-t text-center text-sm ${darkMode ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-600'}`}>
            <p>© {new Date().getFullYear()} Scio.ly. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Dark Mode Toggle */}
      <button
        onClick={handleThemeToggle}
        className={`fixed bottom-8 right-8 p-3 rounded-full shadow-lg transition-transform duration-300 hover:scale-110 z-50 ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}
        aria-label="Toggle dark mode"
      >
        {darkMode ? (
          // Sun icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-yellow-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="12" cy="12" r="4" fill="currentColor"/>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707"
            />
          </svg>
        ) : (
          // Moon icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.354 15.354A9 9 0 1112 3v0a9 9 0 008.354 12.354z"
            />
          </svg>
        )}
      </button>

      <style jsx>{`
        :global(::-webkit-scrollbar) {
          width: 8px;
        }
        :global(::-webkit-scrollbar-thumb) {
          background: ${darkMode
            ? 'linear-gradient(to bottom, rgb(36, 36, 36), rgb(111, 35, 72))'
            : 'linear-gradient(to bottom, #3b82f6, #0ea5e9)'};
          border-radius: 4px;
        }
        :global(::-webkit-scrollbar-thumb:hover) {
          background: ${darkMode
            ? 'linear-gradient(to bottom, rgb(23, 23, 23), rgb(83, 26, 54))'
            : 'linear-gradient(to bottom, #2563eb, #0284c7)'};
        }
        :global(::-webkit-scrollbar-track) {
          background: ${darkMode ? 'black' : '#f1f5f9'};
        }

        @keyframes breathe {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 0.5;
          }
        }
        
        .breathing-gradient {
          background: radial-gradient(circle at center, rgba(56, 189, 248, 0.1) 0%, rgba(255, 255, 255, 0) 70%, rgba(34, 197, 94, 0.05) 100%);
          animation: breathe 15s ease-in-out infinite;
        }

        .static-gradient {
          background: linear-gradient(180deg, 
            rgba(56, 189, 248, 0.05) 0%, 
            rgba(255, 255, 255, 0) 30%, 
            rgba(34, 197, 94, 0.02) 70%,
            rgba(59, 130, 246, 0.03) 100%);
        }
        
        .light-button-halo {
          box-shadow: 0 0 15px 5px rgba(37, 99, 235, 0.2);
        }
        
        .light-button-halo:hover {
          box-shadow: 0 0 20px 8px rgba(37, 99, 235, 0.3);
        }
      `}</style>
    </div>
  );
}
