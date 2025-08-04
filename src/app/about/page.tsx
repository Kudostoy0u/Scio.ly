
'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTheme } from '@/app/contexts/ThemeContext';
import Header from '@/app/components/Header';
import Image from 'next/image';


interface ContactFormData {
  name: string;
  email: string;
  topic: string;
  message: string;
}

// Contact Modal Component
const ContactModal = ({ isOpen, onClose, onSubmit, darkMode }: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ContactFormData) => void;
  darkMode: boolean;
}) => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    topic: 'suggestion',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ name: '', email: '', topic: 'suggestion', message: '' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className={`rounded-lg p-6 w-[90%] sm:w-[600px] max-h-[90vh] overflow-y-auto mx-4 ${
            darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Contact Us</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mb-4 text-sm">
            Contact us about anything: suggestions, bugs, assistance, and more!
          </p>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name (will not be shown publicly)</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full p-2 rounded-md ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  } border`}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email (will not be shown publicly)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full p-2 rounded-md ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  } border`}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Topic</label>
                <select
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className={`w-full p-2 rounded-md ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  } border`}
                >
                  <option value="suggestion">Suggestion</option>
                  <option value="bug">Website Bug</option>
                  <option value="question">Question</option>
                  <option value="mistake">Mistake in Question</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  className={`w-full p-2 rounded-md ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  } border`}
                  required
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2 rounded-md ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600"
                >
                  Submit
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default function AboutPage() {
  const { darkMode } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [showMascotCaption, setShowMascotCaption] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Add effect for scrollbar theme
  useEffect(() => {
    // Apply scrollbar styles based on theme
    document.documentElement.classList.toggle('dark-scrollbar', darkMode);
    document.documentElement.classList.toggle('light-scrollbar', !darkMode);
  }, [darkMode]);

  const handleContact = async (data: ContactFormData) => {
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        setContactModalOpen(false);
      }
    } catch (error) {
      console.error('Error sending contact form:', error);
    }
  };



  const toggleMascotCaption = () => {
    // Only toggle if on mobile
    if (isMobile) {
      setShowMascotCaption(!showMascotCaption);
    }
  };

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Background */}
      <div
        className={`fixed inset-0 ${
          darkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}
      ></div>

      <Header />
      
      {/* Contact Modal */}
      <ContactModal 
        isOpen={contactModalOpen} 
        onClose={() => setContactModalOpen(false)} 
        onSubmit={handleContact}
        darkMode={darkMode}
      />

      {/* Main Content */}
      <main className="relative z-10 pt-36 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div
          className="text-center mb-16"
        >
            <h1 className={`text-4xl sm:text-5xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-black'}`}>
              About <span className="text-blue-500">Scio.ly</span>
            </h1>
          <p className={`text-xl max-w-3xl mx-auto  ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            We&apos;re on a mission to make Science Olympiad practice accessible, engaging, and effective for students everywhere.
          </p>
        </div>

        {/* Our Story Section */}
        <section
          className={`mb-16 p-6 rounded-xl max-w-4xl mx-auto  ${
            darkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/90 shadow-lg backdrop-blur-sm'
          }`}
        >
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2">
              <h2 className={`text-3xl font-bold mb-6  ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Our Story
              </h2>
              <div className={`space-y-4  ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <p>
                  Hey! We&apos;re Aiden and Kundan. We experienced firsthand the challenge of finding high-quality, centralized practice materials for Science Olympiad. After spent countless hours searching for past tests, we decided to build the platform we wished we had: a comprehensive, accessible, and user-friendly test-taking plattform that would empower students to excel.
                </p>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center items-center">
              <div 
                className="relative w-80 h-80 rounded-2xl overflow-hidden group cursor-pointer"
                onClick={toggleMascotCaption}
              >
                <Image
                  src="/ASK.png"
                  alt="ASK - Science Olympiad mascot"
                  fill
                  style={{ objectFit: 'cover', objectPosition: 'center 70%' }}
                  className={`rounded-2xl transition-transform duration-300 ${
                    isMobile && showMascotCaption 
                      ? 'scale-105' 
                      : 'group-hover:scale-105'
                  }`}
                />
                <div className={`absolute inset-0 bg-black transition-all duration-300 flex items-end justify-center rounded-2xl ${
                  isMobile && showMascotCaption 
                    ? 'bg-opacity-40' 
                    : 'bg-opacity-0 group-hover:bg-opacity-40'
                }`}>
                  <div className={`text-white text-center p-4 transition-transform duration-300 ${
                    isMobile && showMascotCaption 
                      ? 'translate-y-0' 
                      : 'translate-y-full group-hover:translate-y-0'
                  }`}>
                    <p className="font-bold text-lg">Hylas the Cat</p>
                    <p>Our coolest mascot</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Our Methodology Section */}
        <section
          className={`mb-16 p-6 rounded-xl max-w-4xl mx-auto  ${
            darkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/90 shadow-lg backdrop-blur-sm'
          }`}
        >
          <h2 className={`text-3xl font-bold mb-6 text-center  ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Our Methodology
          </h2>
          <div className="max-w-4xl mx-auto">
            <p className={`text-center text-lg mb-8  ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              We sourced thousands of previous Science Olympiad tournament archives from friends and associates in test trading. Then, we ran PDF and .docx files through extensive processing and the latest Gemini 2.5 models to extract questions and get answers, which are served through a Golang API. 
            </p>
            
            {/* Dynamic Technology Flowchart */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* PDF Processing */}
              <div className={`p-4 rounded-lg text-center ${
                darkMode ? 'bg-gray-700/50' : 'bg-gray-100/50'
              }`}>
                <div className="flex justify-center mb-3">
                  <Image 
                    src="/file.svg" 
                    alt="PDF Files" 
                    width={50} 
                    height={50} 
                    className="filter invert"
                  />
                </div>
                <h3 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  PDF Processing
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Extract questions from tournament archives
                </p>
              </div>

              {/* Google Gemini AI */}
              <div className={`p-4 rounded-lg text-center ${
                darkMode ? 'bg-gray-700/50' : 'bg-gray-100/50'
              }`}>
                <div className="flex justify-center mb-3">
                  <Image 
                    src="/google-icon.png" 
                    alt="Google Gemini 2.5" 
                    width={50} 
                    height={50} 
                  />
                </div>
                <h3 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Gemini 2.5 AI
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Advanced AI processing & answer generation
                </p>
              </div>

              {/* Postprocessing & Database */}
              <div className={`p-4 rounded-lg text-center ${
                darkMode ? 'bg-gray-700/50' : 'bg-gray-100/50'
              }`}>
                <div className="flex justify-center mb-3 space-x-2">
                  <Image 
                    src={darkMode ? "/cog-white.png" : "/cog-black.png"} 
                    alt="Processing" 
                    width={40} 
                    height={40} 
                  />
                  <Image 
                    src="/postgresql-icon.png" 
                    alt="PostgreSQL" 
                    width={40} 
                    height={40} 
                  />
                </div>
                <h3 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Processing & Storage
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Filter, validate & store in PostgreSQL
                </p>
              </div>

              {/* Backend & Frontend */}
              <div className={`p-4 rounded-lg text-center ${
                darkMode ? 'bg-gray-700/50' : 'bg-gray-100/50'
              }`}>
                <div className="flex justify-center mb-3 space-x-2">
                  <Image 
                    src={darkMode ? "/vercel-white.png" : "/vercel-icon.svg"} 
                    alt="Vercel" 
                    width={35} 
                    height={35} 
                  />
                  <Image 
                    src={darkMode ? "/nextjs-white.png" : "/nextjs-black.png"} 
                    alt="Next.js Frontend" 
                    width={35} 
                    height={35} 
                  />
                </div>
                <h3 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Deployment & Frontend
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Vercel serves Next.js frontend
                </p>
              </div>
            </div>

            {/* Go Backend Section */}
            <div className={`p-6 rounded-lg mb-6 ${
              darkMode ? 'bg-gray-700/30' : 'bg-green-50/50'
            }`}>
              <h3 className={`text-xl font-semibold mb-4 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Backend Architecture
              </h3>
              <div className="flex justify-center items-center space-x-4">
                <Image 
                  src="/postgresql-icon.png" 
                  alt="PostgreSQL" 
                  width={50} 
                  height={50} 
                />
                <span className="text-2xl">→</span>
                <Image 
                  src="/golang.png" 
                  alt="Go Backend" 
                  width={50} 
                  height={50} 
                />
                <span className="text-2xl">→                </span>
                <Image 
                  src={darkMode ? "/nextjs-white.png" : "/nextjs-black.png"} 
                  alt="Next.js" 
                  width={50} 
                  height={50} 
                />
              </div>
              <p className={`text-center mt-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                PostgreSQL feeds Go API, which serves data to Next.js frontend
              </p>
            </div>


          </div>
        </section>

        {/* Our Philosophy Section */}
        <section
          className={`mb-16 p-6 rounded-xl max-w-4xl mx-auto  ${
            darkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/90 shadow-lg backdrop-blur-sm'
          }`}
        >
          <h2 className={`text-3xl font-bold mb-6 text-center  ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Our Philosophy
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className={`text-xl font-semibold mb-2  ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Learn by Doing
              </h3>
              <p className={` ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                We believe that the most effective way to learn is through hands-on practice. Our platform is designed to provide students with thousands of real test questions, allowing them to actively engage with the material and develop a deep understanding of the concepts.
              </p>
            </div>
            <div>
              <h3 className={`text-xl font-semibold mb-2  ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Accessibility for All
              </h3>
              <p className={` ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                We are committed to making Science Olympiad preparation accessible to everyone. Scio.ly is a free platform, ensuring that all students, regardless of their background or school&apos;s resources, have the opportunity to succeed.
              </p>
            </div>
          </div>
        </section>

        {/* Our Technology Section */}
        <section
          className={`mb-16 p-6 rounded-xl max-w-4xl mx-auto  ${
            darkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/90 shadow-lg backdrop-blur-sm'
          }`}
        >
          <h2 className={`text-3xl font-bold mb-6 text-center  ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            More Technologies
          </h2>
          <p className={`text-center max-w-3xl mx-auto mb-8  ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Scio.ly is built on a modern technology stack to provide a fast, reliable, and feature-rich experience.
            Questions are instantly sent from us to you, ensuring a seamless experience.
          </p>
          <div className="grid grid-cols-2 gap-8 max-w-md mx-auto">
            <div className="flex justify-center">
              <Image 
                src={darkMode ? "/nextjs-white.png" : "/nextjs-black.png"} 
                alt="Next.js" 
                width={70} 
                height={70} 
              />
            </div>
            <div className="flex justify-center">
              <Image src="/typescript-icon.png" alt="TypeScript" width={60} height={60} />
            </div>
            <div className="flex justify-center">
              <Image src="/supabase-icon.png" alt="Supabase" width={60} height={60} />
            </div>
            <div className="flex justify-center">
              <Image 
                src={darkMode ? "/vercel-white.png" : "/vercel-icon.svg"} 
                alt="Vercel" 
                width={70} 
                height={70} 
              />
            </div>
          </div>
        </section>

        {/* Acknowledgement Section */}
        <section
          className={`mb-16 p-6 rounded-xl max-w-4xl mx-auto  ${
            darkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/90 shadow-lg backdrop-blur-sm'
          }`}
        >
          <div className="flex items-center justify-center">
            <span className="text-2xl mr-4">🚀</span>
            <p className={`text-lg  ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Thanks to Alan Cai for contributing 20,000 past tests to the question bank!
            </p>
          </div>
        </section>

        {/* Contact CTA */}
        <section
          className={`mb-16 p-6 rounded-xl text-center max-w-4xl mx-auto  ${
            darkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/90 shadow-lg backdrop-blur-sm'
          }`}
        >
          <h2 className={`text-2xl font-bold mb-4  ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Want to get in touch?
          </h2>
          <p className={`mb-6 max-w-2xl mx-auto  ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            We&apos;d love to hear from you! Whether you have questions, feedback, or just want to say hello, our team is here to help.
          </p>
          <button
            className={`px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105 ${
              darkMode 
                ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700' 
                : 'bg-blue-500 text-white shadow-lg hover:bg-blue-600'
            }`}
            onClick={() => setContactModalOpen(true)}
          >
            Contact Us
          </button>
        </section>
      </main>



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
      `}</style>
    </div>
  );
}
