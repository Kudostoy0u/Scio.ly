'use client';

import { useState, useEffect } from 'react';
import Header from '@/app/components/Header';
import EloViewer from './components/EloViewer';
import type { EloData } from './types/elo';
import { useTheme } from '@/app/contexts/ThemeContext';
import { loadEloData } from './utils/dataLoader';

export default function TeamsContent() {
  const [eloData, setEloData] = useState<EloData | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [division, setDivision] = useState<'b' | 'c'>('c');
  const { darkMode } = useTheme();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await loadEloData({ division });
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        setEloData(result.data);
        setMetadata(result.metadata);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load Elo data');
        console.error('Error loading Elo data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [division]);

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <Header />
        <div className="flex items-center justify-center min-h-[60vh] pt-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg">Loading team data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <Header />
        <div className="flex items-center justify-center min-h-[60vh] pt-24">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Error Loading Data</h2>
            <p className={`text-gray-600 mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!eloData) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <Header />
        <div className="flex items-center justify-center min-h-[60vh] pt-24">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">No Data Available</h2>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Team data could not be loaded.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Division Selector */}
        <div className="flex justify-center mb-8">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-1 shadow-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button 
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                division === 'b' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : darkMode 
                    ? 'text-gray-300 hover:text-white' 
                    : 'text-gray-700 hover:text-gray-900'
              }`}
              onClick={() => setDivision('b')}
            >
              Division B
            </button>
            <button 
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                division === 'c' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : darkMode 
                    ? 'text-gray-300 hover:text-white' 
                    : 'text-gray-700 hover:text-gray-900'
              }`}
              onClick={() => setDivision('c')}
            >
              Division C
            </button>
          </div>
        </div>
        
        <EloViewer eloData={eloData} division={division} metadata={metadata} />
      </div>
    </div>
  );
}
