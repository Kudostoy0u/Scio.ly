'use client';

import { useState } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { Send, Mail, User, Briefcase, GraduationCap, Clock, MessageCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import Header from '@/app/components/Header';
import { handleCareersSubmission } from '@/app/utils/careersUtils';

interface CareersFormData {
  name: string;
  email: string;
  discordId: string;
  position: string;
  hoursPerWeek: string;
  experience: string;
  message: string;
}

export default function CareersClientPage() {
  const { darkMode } = useTheme();
  const [formData, setFormData] = useState<CareersFormData>({
    name: '',
    email: '',
    discordId: '',
    position: '',
    hoursPerWeek: '',
    experience: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.discordId.trim() || !formData.position.trim() || !formData.hoursPerWeek.trim() || !formData.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const result = await handleCareersSubmission(formData);
      if (result.success) {
        toast.success(result.message);
        setFormData({ name: '', email: '', discordId: '', position: '', hoursPerWeek: '', experience: '', message: '' });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Careers form error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CareersFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const countWords = (text: string) => {
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  };

  const experienceWordCount = countWords(formData.experience);
  const messageWordCount = countWords(formData.message);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header />
      {/* Global ToastContainer handles notifications */}
      <div className="pt-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Join Our Team</h1>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Help us make Science Olympiad practice accessible to everyone. We&apos;re looking for passionate individuals to join our mission!</p>
          </div>
          <div className={`${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg p-6`}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <User className="w-4 h-4" />
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Your full name"
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                  required
                />
              </div>
              <div>
                <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <Mail className="w-4 h-4" />
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="your.email@example.com"
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                  required
                />
              </div>
              <div>
                <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <MessageCircle className="w-4 h-4" />
                  Discord ID *
                </label>
                <input
                  type="text"
                  value={formData.discordId}
                  onChange={(e) => handleInputChange('discordId', e.target.value)}
                  placeholder="For example: the_tinfoil_hat"
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                  required
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>All communication happens through Discord</p>
              </div>
              <div>
                <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <Briefcase className="w-4 h-4" />
                  Position of Interest *
                </label>
                <select
                  value={formData.position}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  required
                >
                  <option value="">Select a position</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Development">Development</option>
                  <option value="Content Creation">Content Creation</option>
                  <option value="Community Management">Community Management</option>
                  <option value="UI/UX Design">UI/UX Design</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <Clock className="w-4 h-4" />
                  Hours Able to Contribute per Week *
                </label>
                <select
                  value={formData.hoursPerWeek}
                  onChange={(e) => handleInputChange('hoursPerWeek', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  required
                >
                  <option value="">Select hours per week</option>
                  <option value="1-2 hours">1-2 hours</option>
                  <option value="3-4 hours">3-4 hours</option>
                  <option value="5-9 hours">5-9 hours</option>
                  <option value="10+ hours">10+ hours</option>
                </select>
              </div>
              <div>
                <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <GraduationCap className="w-4 h-4" />
                  Relevant Experience
                </label>
                <textarea
                  value={formData.experience}
                  onChange={(e) => {
                    const text = e.target.value;
                    if (countWords(text) <= 250) {
                      handleInputChange('experience', text);
                    }
                  }}
                  placeholder="Tell us about your relevant experience, skills, and background... (250 words max)"
                  rows={4}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                />
                <div className="flex justify-between items-center mt-1">
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    We&apos;re looking for people ready to hit the ground running! Please link any projects, a Github, LinkedIn, Instagram, or any other profiles that may be relevant to your position.
                  </p>
                  <span className={`text-xs ${experienceWordCount > 250 ? 'text-red-500' : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {experienceWordCount}/250 words
                  </span>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Cover Letter *</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => {
                    const text = e.target.value;
                    if (countWords(text) <= 250) {
                      handleInputChange('message', text);
                    }
                  }}
                  placeholder="Please tell us why you&apos;d like to join our team and what you can bring to Scio.ly... (250 words max)"
                  rows={6}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                  required
                />
                <div className="flex justify-between items-center mt-1">
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Please be as detailed as possible to help us understand your interest</p>
                  <span className={`text-xs ${messageWordCount > 250 ? 'text-red-500' : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {messageWordCount}/250 words
                  </span>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors duration-200">
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Application
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="pb-8" />
    </div>
  );
}
