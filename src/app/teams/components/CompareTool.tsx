'use client';
import logger from '@/lib/utils/logger';


import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { EloData, ComparisonResult } from '../types/elo';
import { compareSchools, getAllSchools } from '../utils/eloDataProcessor';
import { stripTrailingParenthetical } from '@/lib/utils/string';
import { useTheme } from '@/app/contexts/ThemeContext';

interface CompareToolProps {
  eloData: EloData;
}

const CompareTool: React.FC<CompareToolProps> = ({ eloData }) => {
  const [school1, setSchool1] = useState<string>('');
  const [school2, setSchool2] = useState<string>('');
  const [school1Search, setSchool1Search] = useState<string>('');
  const [school2Search, setSchool2Search] = useState<string>('');
  const [school1Suggestions, setSchool1Suggestions] = useState<string[]>([]);
  const [school2Suggestions, setSchool2Suggestions] = useState<string[]>([]);
  const [showSchool1Suggestions, setShowSchool1Suggestions] = useState(false);
  const [showSchool2Suggestions, setShowSchool2Suggestions] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
  const [overallResult, setOverallResult] = useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { darkMode } = useTheme();

  const school1Ref = useRef<HTMLDivElement>(null);
  const school2Ref = useRef<HTMLDivElement>(null);

  const schools = useMemo(() => getAllSchools(eloData), [eloData]);
  

  const mostRecentSeason = useMemo(() => {
    const allSeasons: string[] = [];
    
    for (const stateCode in eloData) {
      for (const schoolName in eloData[stateCode]) {
        const school = eloData[stateCode][schoolName];
        Object.keys(school.seasons).forEach(season => {
          if (!allSeasons.includes(season)) {
            allSeasons.push(season);
          }
        });
      }
    }
    

    return allSeasons.sort().pop() || '2024';
  }, [eloData]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (school1Ref.current && !school1Ref.current.contains(event.target as Node)) {
        setShowSchool1Suggestions(false);
      }
      if (school2Ref.current && !school2Ref.current.contains(event.target as Node)) {
        setShowSchool2Suggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  useEffect(() => {
    if (school1Search.trim() && !school1) {
      const filtered = schools.filter(school =>
        school.toLowerCase().includes(school1Search.toLowerCase())
      ).slice(0, 10);
      setSchool1Suggestions(filtered);
      setShowSchool1Suggestions(true);
    } else {
      setSchool1Suggestions([]);
      setShowSchool1Suggestions(false);
    }
  }, [school1Search, schools, school1]);

  useEffect(() => {
    if (school2Search.trim() && !school2) {
      const filtered = schools.filter(school =>
        school.toLowerCase().includes(school2Search.toLowerCase())
      ).slice(0, 10);
      setSchool2Suggestions(filtered);
      setShowSchool2Suggestions(true);
    } else {
      setSchool2Suggestions([]);
      setShowSchool2Suggestions(false);
    }
  }, [school2Search, schools, school2]);

  const handleSchool1Select = (selectedSchool: string) => {
    setSchool1(selectedSchool);
    setSchool1Search('');
    setShowSchool1Suggestions(false);
  };

  const handleSchool2Select = (selectedSchool: string) => {
    setSchool2(selectedSchool);
    setSchool2Search('');
    setShowSchool2Suggestions(false);
  };

  const handleSchool1Remove = () => {
    setSchool1('');
    setSchool1Search('');
  };

  const handleSchool2Remove = () => {
    setSchool2('');
    setSchool2Search('');
  };

  const handleCompare = () => {
    if (!school1 || !school2) {
      setError('Please select both schools to compare');
      return;
    }

    if (school1 === school2) {
      setError('Please select different schools to compare');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { eventResults, overallResult } = compareSchools(eloData, school1, school2, mostRecentSeason);
      setComparisonResults(eventResults);
      setOverallResult(overallResult);
    } catch (err) {
      setError('Error comparing schools');
      logger.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getWinPercentageColor = (percentage: number) => {
    if (percentage >= 70) return darkMode ? 'text-green-600' : 'text-green-800';
    if (percentage >= 60) return darkMode ? 'text-green-400' : 'text-green-600';
    if (percentage >= 50) return darkMode ? 'text-green-500' : 'text-green-500';
    if (percentage >= 40) return darkMode ? 'text-yellow-400' : 'text-yellow-500';
    if (percentage >= 30) return darkMode ? 'text-orange-400' : 'text-orange-600';
    return darkMode ? 'text-red-400' : 'text-red-600';
  };

  const getWinPercentageText = (percentage: number, schoolName?: string) => {
    const baseText = (() => {
      if (percentage >= 70) return 'Strong Advantage';
      if (percentage >= 60) return 'Moderate Advantage';
      if (percentage >= 50) return 'Slight Advantage';
      if (percentage >= 40) return 'Slight Disadvantage';
      if (percentage >= 30) return 'Moderate Disadvantage';
      return 'Strong Disadvantage';
    })();
    

    return schoolName ? `${baseText} to ${schoolName}` : baseText;
  };

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6`}>
      <div className="text-center mb-6">
        <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>⚔️ School Comparison Tool</h2>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Compare two schools and see their win probabilities across events - {mostRecentSeason} Season</p>
      </div>

      <div className="space-y-6 mb-6">
        {/* School 1 Selection */}
        <div>
          <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>School 1:</label>
          {school1 ? (
            <div className={`flex items-center justify-between border rounded-lg px-4 py-3 ${
              darkMode 
                ? 'bg-blue-900/20 border-blue-800' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <span className={`font-medium ${darkMode ? 'text-blue-100' : 'text-blue-900'}`}>{school1}</span>
              <button 
                onClick={handleSchool1Remove} 
                className={`${darkMode ? 'text-blue-400 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
              >
                ×
              </button>
            </div>
          ) : (
            <div className="relative" ref={school1Ref}>
              <input
                type="text"
                placeholder="Search for school 1..."
                value={school1Search}
                onChange={(e) => setSchool1Search(e.target.value)}
                onFocus={() => setShowSchool1Suggestions(true)}
                className={`w-full px-3 py-2 border rounded-md ${darkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
              {showSchool1Suggestions && school1Suggestions.length > 0 && (
                <div className={`absolute z-10 w-full mt-1 border rounded-md shadow-lg max-h-48 overflow-y-auto ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
                  {school1Suggestions.map(school => (
                    <div
                      key={school}
                      className={`px-3 py-2 cursor-pointer border-b last:border-b-0 ${darkMode ? 'border-gray-600 hover:bg-gray-600 text-gray-300' : 'border-gray-100 hover:bg-gray-100 text-gray-700'}`}
                      onClick={() => handleSchool1Select(school)}
                    >
                      {school}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* School 2 Selection */}
        <div>
          <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>School 2:</label>
          {school2 ? (
            <div className={`flex items-center justify-between border rounded-lg px-4 py-3 ${
              darkMode 
                ? 'bg-blue-900/20 border-blue-800' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <span className={`font-medium ${darkMode ? 'text-blue-100' : 'text-blue-900'}`}>{school2}</span>
              <button 
                onClick={handleSchool2Remove} 
                className={`${darkMode ? 'text-blue-400 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
              >
                ×
              </button>
            </div>
          ) : (
            <div className="relative" ref={school2Ref}>
              <input
                type="text"
                placeholder="Search for school 2..."
                value={school2Search}
                onChange={(e) => setSchool2Search(e.target.value)}
                onFocus={() => setShowSchool2Suggestions(true)}
                className={`w-full px-3 py-2 border rounded-md ${darkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
              {showSchool2Suggestions && school2Suggestions.length > 0 && (
                <div className={`absolute z-10 w-full mt-1 border rounded-md shadow-lg max-h-48 overflow-y-auto ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
                  {school2Suggestions.map(school => (
                    <div
                      key={school}
                      className={`px-3 py-2 cursor-pointer border-b last:border-b-0 ${darkMode ? 'border-gray-600 hover:bg-gray-600 text-gray-300' : 'border-gray-100 hover:bg-gray-100 text-gray-700'}`}
                      onClick={() => handleSchool2Select(school)}
                    >
                      {school}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button 
          onClick={handleCompare}
          disabled={!school1 || !school2 || isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Comparing...' : 'Compare Schools'}
        </button>
      </div>

      {error && (
        <div className={`px-4 py-3 rounded-md mb-6 ${
          darkMode 
            ? 'bg-red-900/20 border border-red-800 text-red-300' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {error}
        </div>
      )}

      {overallResult && (
        <div className={`rounded-lg p-4 mb-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Overall Result</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}><strong>{stripTrailingParenthetical(school1)}</strong> Win Probability:</span>
              <div className={`text-lg font-semibold ${getWinPercentageColor(overallResult.school1WinPercentage)}`}>
                {overallResult.school1WinPercentage.toFixed(1)}%
              </div>
            </div>
            <div>
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Assessment:</span>
              <div className={`text-lg font-semibold ${getWinPercentageColor(overallResult.school1WinPercentage)}`}>
                {getWinPercentageText(overallResult.school1WinPercentage)}
              </div>
            </div>
            <div>
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}><strong>{school1.replace(/\s*\([^)]*\)$/, '')}</strong> Elo:</span>
              <div className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {Math.round(overallResult.school1Elo)}
              </div>
            </div>
            <div>
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}><strong>{school2.replace(/\s*\([^)]*\)$/, '')}</strong> Elo:</span>
              <div className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {Math.round(overallResult.school2Elo)}
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Analyzing schools...</p>
            </div>
          </div>
        ) : comparisonResults.length > 0 ? (
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Event-by-Event Comparison</h3>
            
            {/* Mobile-friendly view */}
            <div className="md:hidden">
              <div className="space-y-3">
                {comparisonResults.map((result, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex-1 mr-4">
                        <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {result.event}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 min-w-0">
                        <div className={`text-lg font-semibold ${getWinPercentageColor(result.school1WinPercentage)}`}>
                          {result.school1WinPercentage.toFixed(1)}%
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} max-w-32`}>
                          {getWinPercentageText(result.school1WinPercentage, stripTrailingParenthetical(school1))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block">
              <div className={`overflow-hidden rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="overflow-x-auto">
                  <table className={`min-w-full divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                      <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Event
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          <strong>{stripTrailingParenthetical(school1)}</strong> Elo
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          <strong>{stripTrailingParenthetical(school2)}</strong> Elo
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          <strong>{school1.replace(/\s*\([^)]*\)$/, '')}</strong> Win %
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Assessment
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                      {comparisonResults.map((result, index) => (
                        <tr key={index} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {result.event}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            {Math.round(result.school1Elo)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            {Math.round(result.school2Elo)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${getWinPercentageColor(result.school1WinPercentage)}`}>
                            {result.school1WinPercentage.toFixed(1)}%
                          </td>
                                                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${getWinPercentageColor(result.school1WinPercentage)}`}>
                          {getWinPercentageText(result.school1WinPercentage)}
                        </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CompareTool;
