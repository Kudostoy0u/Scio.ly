'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { EloData, LeaderboardEntry } from '../types/elo';
import { getLeaderboard } from '../utils/eloDataProcessor';
import { useTheme } from '@/app/contexts/ThemeContext';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface LeaderboardProps {
  eloData: EloData;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ eloData }) => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 25;
  const { darkMode } = useTheme();

  // Get all available seasons from the data
  const getAllSeasons = (): string[] => {
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
    
    return allSeasons.sort();
  };

  // Get all available states from the data
  const getAllStates = (): string[] => {
    return Object.keys(eloData).sort();
  };

  // Get events available for the selected season
  const getEventsForSeason = (season: string): string[] => {
    const events = new Set<string>();
    
    for (const stateCode in eloData) {
      for (const schoolName in eloData[stateCode]) {
        const school = eloData[stateCode][schoolName];
        const seasonData = school.seasons[season];
        if (seasonData) {
          Object.keys(seasonData.events).forEach(event => {
            if (event !== '__OVERALL__') {
              events.add(event);
            }
          });
        }
      }
    }
    
    return Array.from(events).sort();
  };

  const allSeasons = getAllSeasons();
  const allStates = getAllStates();
  const mostRecentSeason = allSeasons[allSeasons.length - 1] || '2024';
  
  // Initialize selected season to most recent if not set
  useEffect(() => {
    if (!selectedSeason) {
      setSelectedSeason(mostRecentSeason);
    }
  }, [mostRecentSeason, selectedSeason]);

  const eventsForSelectedSeason = getEventsForSeason(selectedSeason);

  useEffect(() => {
    setIsLoading(true);
    try {
      // Get all data first
      let data = getLeaderboard(eloData, selectedEvent || undefined, selectedSeason, 1000);
      
      // Filter by state if selected, then re-sort to maintain proper ranking
      if (selectedState) {
        data = data
          .filter(entry => entry.state === selectedState)
          .sort((a, b) => b.elo - a.elo); // Re-sort by Elo (highest first)
      }
      
      setLeaderboardData(data);
      setCurrentPage(1); // Reset to first page when filters change
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eloData, selectedEvent, selectedSeason, selectedState]);

  // Reset event selection when season changes (if event is not available in new season)
  useEffect(() => {
    if (selectedEvent && !eventsForSelectedSeason.includes(selectedEvent)) {
      setSelectedEvent('');
    }
  }, [selectedSeason, selectedEvent, eventsForSelectedSeason]);

  // Filter and paginate data (state filtering is now handled at the data level)
  const filteredData = useMemo(() => {
    return leaderboardData.filter(entry => {
      const matchesSearch = 
        entry.school.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.state.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }, [leaderboardData, searchTerm]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const getRankColor = (rank: number) => {
    if (rank === 1) return darkMode ? 'bg-yellow-900/30 text-yellow-200' : 'bg-yellow-100 text-yellow-800'; // Gold
    if (rank === 2) return darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'; // Silver
    if (rank === 3) return darkMode ? 'bg-orange-900/30 text-orange-200' : 'bg-orange-100 text-orange-800'; // Bronze
    return darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-600';
  };

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6`}>
      <div className="text-center mb-6">
        <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>🏆 Leaderboard</h2>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Top teams by Elo rating - {selectedSeason} Season</p>
      </div>

      <div className="mb-6 space-y-4">
        {/* Filters Row 1: Season and State */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Season:</label>
            <select 
              value={selectedSeason} 
              onChange={(e) => setSelectedSeason(e.target.value)}
              className={`px-3 py-2 border rounded-md ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              {allSeasons.map(season => (
                <option key={season} value={season}>{season}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>State:</label>
            <select 
              value={selectedState} 
              onChange={(e) => setSelectedState(e.target.value)}
              className={`px-3 py-2 border rounded-md ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value="">All States</option>
              {allStates.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filters Row 2: Event and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Event:</label>
            <select 
              value={selectedEvent} 
              onChange={(e) => setSelectedEvent(e.target.value)}
              className={`px-3 py-2 border rounded-md ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value="">Overall</option>
              {eventsForSelectedSeason.map(event => (
                <option key={event} value={event}>{event}</option>
              ))}
            </select>
          </div>
          
          {/* Search Input */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
            <input
              type="text"
              placeholder="Search schools or states..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-3 py-2 border rounded-md ${darkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
          </div>
        </div>

        {/* Results Summary */}
        {!isLoading && (
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Showing {paginatedData.length} of {filteredData.length} results
            {searchTerm && ` for "${searchTerm}"`}
          </div>
        )}
      </div>

      <div className={`overflow-hidden rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading leaderboard...</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Rank
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    School
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    State
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Season
                  </th>
                  {selectedEvent && (
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Event
                    </th>
                  )}
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Elo Rating
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                {paginatedData.map((entry) => {
                  // Find the rank in the filtered data (not global data)
                  const filteredIndex = filteredData.findIndex(item => 
                    item.school === entry.school && 
                    item.state === entry.state && 
                    item.season === entry.season && 
                    (item.event || 'overall') === (entry.event || 'overall')
                  );
                  const actualRank = filteredIndex + 1;
                  
                  return (
                    <tr key={`${entry.school}-${entry.state}-${entry.season}-${entry.event || 'overall'}`} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRankColor(actualRank)}`}>
                          {actualRank}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {entry.school}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {entry.state}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {entry.season}
                      </td>
                      {selectedEvent && (
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {entry.event}
                        </td>
                      )}
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {Math.round(entry.elo)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {!isLoading && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Page {currentPage} of {totalPages}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                currentPage === 1
                  ? darkMode 
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </button>
            
            {/* Page Numbers */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : darkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                currentPage === totalPages
                  ? darkMode 
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
