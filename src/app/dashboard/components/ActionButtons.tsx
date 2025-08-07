'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { FaFileAlt, FaBookmark, FaDiscord, FaBook, FaUsers } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface ActionButtonsProps {
  darkMode: boolean;
}

export default function ActionButtons({ darkMode }: ActionButtonsProps) {
  const router = useRouter();
  const [testCodeDigits, setTestCodeDigits] = useState(['', '', '', '', '', '']);
  
  const cardStyle = darkMode
    ? 'bg-gray-800 border-gray-700 text-white'
    : 'bg-white border-gray-200 text-gray-900';

  const handleLoadTest = async (code: string) => {
    try {
      const response = await fetch(`/api/test/${code}`);
      if (response.ok) {
        const data = await response.json();
        if (data.exists) {
          router.push(`/test?code=${code}`);
        } else {
          toast.error('Test not found. Please check your code.');
        }
      } else {
        toast.error('Failed to load test. Please try again.');
      }
    } catch (error) {
      console.error('Error loading test:', error);
      toast.error('An error occurred while loading the test.');
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').split('').slice(0, 6);
    
    const newDigits = [...testCodeDigits];
    digits.forEach((digit, i) => {
      if (index + i < 6) {
        newDigits[index + i] = digit;
      }
    });
    
    setTestCodeDigits(newDigits);
    
    // Auto-submit if we have 6 digits
    if (newDigits.every(d => d !== '') && newDigits.join('').length === 6) {
      handleLoadTest(newDigits.join(''));
    }
  };

  const handleDigitChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    if (value.length > 1) return; // Only allow single digit
    
    const newDigits = [...testCodeDigits];
    newDigits[index] = value;
    setTestCodeDigits(newDigits);
    
    // Move to next input if value is entered
    if (value && index < 5) {
      const nextInput = document.getElementById(`digit-${index + 1}`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
      }
    }
    
    // Auto-submit if we have 6 digits
    if (newDigits.every(d => d !== '') && newDigits.join('').length === 6) {
      handleLoadTest(newDigits.join(''));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !testCodeDigits[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      const prevInput = document.getElementById(`digit-${index - 1}`) as HTMLInputElement;
      if (prevInput) {
        prevInput.focus();
      }
    }
  };

  return (
    <>
      {/* Row 1: Load Test with Code and Bookmarked Questions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Load Test with Code */}
        <div className={`rounded-lg cursor-pointer ${cardStyle} hover:border-gray-600`}>
          <div className={`w-full h-full p-6 flex items-center gap-4 ${darkMode ? 'text-white' : 'text-black'}`}>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-1">Load Test with Code</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 md:flex md:space-x-2 md:grid-cols-none">
              {testCodeDigits.map((digit, index) => (
                <input
                  key={index}
                  id={`digit-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(e, index)}
                  onPaste={(e) => handlePaste(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className={`w-10 h-10 text-center text-sm font-bold border-2 rounded-lg ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                      : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                  } focus:outline-none`}
                  placeholder="•"
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Bookmarked Questions Button */}
        <motion.div 
          onClick={() => router.push('/bookmarks')}
          className={`rounded-lg cursor-pointer ${cardStyle} hover:border-gray-600`}
        >
          <div className={`w-full h-full p-6 flex items-center gap-4 ${darkMode ? 'text-white' : 'text-black'}`}>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <FaBookmark className="text-2xl text-green-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-1">Bookmarked Questions</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                View and practice over your bookmarked questions
              </p>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Row 2: Recent Reports and Scio.ly for Teams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Recent Reports Button */}
        <motion.div 
          onClick={() => router.push('/reports')}
          className={`rounded-lg cursor-pointer ${cardStyle} hover:border-gray-600`}
        >
          <div className={`w-full h-full p-6 flex items-center gap-4 ${darkMode ? 'text-white' : 'text-black'}`}>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <FaFileAlt className="text-2xl text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-1">Recent Reports</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Check out how the community has been fixing up the question base
              </p>
            </div>
          </div>
        </motion.div>
        
        {/* Scio.ly for Teams Button */}
        <motion.div 
          onClick={() => toast.info('Coming soon!', { position: 'top-right' })}
          className={`rounded-lg cursor-pointer ${cardStyle} hover:border-gray-600`}
        >
          <div className={`w-full h-full p-6 flex items-center gap-4 ${darkMode ? 'text-white' : 'text-black'}`}>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <FaUsers className="text-2xl text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-1">Scio.ly for Teams</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Collaborative features for teams and organizations
              </p>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Row 3: Discord Bot and Scio.ly Docs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Discord Bot Button */}
        <motion.div 
          onClick={() => window.open('https://discord.com/oauth2/authorize?client_id=1400979720614711327&permissions=8&integration_type=0&scope=bot+applications.commands', '_blank')}
          className={`rounded-lg cursor-pointer ${cardStyle} hover:border-gray-600`}
        >
          <div className={`w-full h-full p-6 flex items-center gap-4 ${darkMode ? 'text-white' : 'text-black'}`}>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <FaDiscord className="text-2xl text-purple-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-1">Add Discord Bot</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Add Scio.ly bot to your Discord server for quick access
              </p>
            </div>
          </div>
        </motion.div>
        
        {/* Scio.ly Docs Button */}
        <motion.div 
          onClick={() => toast.info('Coming soon!', { position: 'top-right' })}
          className={`rounded-lg cursor-pointer ${cardStyle} hover:border-gray-600`}
        >
          <div className={`w-full h-full p-6 flex items-center gap-4 ${darkMode ? 'text-white' : 'text-black'}`}>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <FaBook className="text-2xl text-orange-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-1">Scio.ly Docs</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Science Olympiad event documentation and resources
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
} 