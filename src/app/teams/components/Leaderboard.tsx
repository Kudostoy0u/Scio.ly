'use client';
import logger from '@/lib/utils/logger';


import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { EloData, LeaderboardEntry } from '../../analytics/types/elo';
import { getLeaderboard } from '../../analytics/utils/eloDataProcessor';
import { useTheme } from '@/app/contexts/ThemeContext';
import { ChevronLeft, ChevronRight, Search, Calendar } from 'lucide-react';
import { EVENT_WHITELISTS } from './leaderboard/constants';
import { collectSeasons, collectStates, eventsForSeason, buildTournamentDates, TournamentDate, computeRankingChanges, formatRankingChange, rankColor, formatDate } from './leaderboard/utils';

interface LeaderboardProps {
  eloData: EloData;
  division: 'b' | 'c';
  metadata?: any;
}

// TournamentDate moved to utils


// Whitelists moved to constants

const Leaderboard: React.FC<LeaderboardProps> = ({ eloData, division, metadata }) => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 25;
  const { darkMode } = useTheme();
  const prevSearchTerm = useRef<string>('');


  const allSeasons = useMemo(() => collectSeasons(eloData), [eloData]);

  const allStates = useMemo(() => collectStates(eloData), [eloData]);


  const eventsForSelectedSeason = useMemo(() => eventsForSeason(eloData, selectedSeason, division, EVENT_WHITELISTS), [eloData, selectedSeason, division]);


  const getTournamentDatesForSeason = useCallback((season: string): TournamentDate[] => buildTournamentDates(metadata, season), [metadata]);

  const mostRecentSeason = allSeasons[allSeasons.length - 1] || '2024';
  

  useEffect(() => {
    if (!selectedSeason) {
      setSelectedSeason(mostRecentSeason);
    }
  }, [mostRecentSeason, selectedSeason]);
  

  const tournamentDates = useMemo(() => {
    return getTournamentDatesForSeason(selectedSeason);
  }, [selectedSeason, getTournamentDatesForSeason]);
  

  const currentTournamentIndex = useMemo(() => {
    return tournamentDates.findIndex(t => t.date === selectedDate);
  }, [tournamentDates, selectedDate]);
  
  const lastTournamentDate = tournamentDates[tournamentDates.length - 1]?.date || '';


  useEffect(() => {
    if (!selectedDate && lastTournamentDate) {
      setSelectedDate(lastTournamentDate);
    }
  }, [lastTournamentDate, selectedDate]);


  useEffect(() => {
    setSelectedEvent('');
  }, [selectedSeason, division]);


  const rankingChanges = useMemo(() => computeRankingChanges(eloData, selectedEvent, selectedSeason, selectedState, selectedDate), [eloData, selectedEvent, selectedSeason, selectedState, selectedDate]);
  

  const getRankingChange = (entry: LeaderboardEntry): number => {
    const key = `${entry.school}-${entry.state}`;
    return rankingChanges.get(key) || 0;
  };


  const formatChangeLocal = (change: number) => formatRankingChange(!!darkMode, change);


  const leaderboardDataMemo = useMemo(() => {
    try {

      let data = getLeaderboard(eloData, selectedEvent || undefined, selectedSeason, 1000, selectedDate);
      

      if (selectedState) {
        data = data
          .filter(entry => entry.state === selectedState)
          .sort((a, b) => b.elo - a.elo);
      }
      
      return data;
    } catch (error) {
      logger.error('Error loading leaderboard:', error);
      return [];
    }
  }, [eloData, selectedEvent, selectedSeason, selectedState, selectedDate]);


  useEffect(() => {
    setIsLoading(true);

    const timeout = setTimeout(() => {
      setLeaderboardData(leaderboardDataMemo);
      setIsLoading(false);
    }, 50);
    
    return () => clearTimeout(timeout);
  }, [leaderboardDataMemo]);


  useEffect(() => {
    if (selectedEvent && !eventsForSelectedSeason.includes(selectedEvent)) {
      setSelectedEvent('');
    }
  }, [selectedSeason, selectedEvent, eventsForSelectedSeason]);


  const originalRankMap = useMemo(() => {
    const rankMap = new Map<string, number>();
    leaderboardData.forEach((entry, index) => {
      const key = `${entry.school}-${entry.state}-${entry.season}-${entry.event || 'overall'}`;
      rankMap.set(key, index + 1);
    });
    return rankMap;
  }, [leaderboardData]);


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


  useEffect(() => {
    if (prevSearchTerm.current !== searchTerm) {
      prevSearchTerm.current = searchTerm;
      setCurrentPage(1);
    }
  }, [searchTerm]);


  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSeason, selectedEvent, selectedState, selectedDate]);

  const getRankColor = (rank: number) => rankColor(!!darkMode, rank);

  // formatDate moved to utils

  const selectedTournament = tournamentDates.find(t => t.date === selectedDate);

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6`}>
      <div className="text-center mb-6">
        <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>🏆 Leaderboard</h2>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          Top teams by Elo rating - {selectedSeason} Season
        </p>
      </div>

      <div className="mb-6 space-y-4">
        {/* Filters Row 1: Season and State */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className={`text-sm font-medium text-center sm:text-left ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Season:</label>
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
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className={`text-sm font-medium text-center sm:text-left ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>State:</label>
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className={`text-sm font-medium text-center sm:text-left ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Event:</label>
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

        {/* Timeline Slider */}
        {tournamentDates.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Season Timeline: {selectedTournament ? formatDate(selectedDate) : 'Select date'}
              </label>
            </div>
            <div className="relative">
              <input
                type="range"
                min="0"
                max={tournamentDates.length - 1}
                value={currentTournamentIndex >= 0 ? currentTournamentIndex : 0}
                onChange={(e) => {
                  const index = parseInt(e.target.value);
                  setSelectedDate(tournamentDates[index]?.date || '');
                }}
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                  darkMode 
                    ? 'bg-gray-700 slider-dark' 
                    : 'bg-gray-200 slider-light'
                }`}
                style={{
                  background: `linear-gradient(to right, ${
                    darkMode ? '#3B82F6' : '#2563EB'
                  } 0%, ${
                    darkMode ? '#3B82F6' : '#2563EB'
                  } ${currentTournamentIndex >= 0 ? (currentTournamentIndex / (tournamentDates.length - 1)) * 100 : 0}%, ${
                    darkMode ? '#374151' : '#E5E7EB'
                  } ${currentTournamentIndex >= 0 ? (currentTournamentIndex / (tournamentDates.length - 1)) * 100 : 0}%, ${
                    darkMode ? '#374151' : '#E5E7EB'
                  } 100%)`
                }}
              />
              <div className="flex justify-between text-xs mt-1">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                  {tournamentDates[0] ? formatDate(tournamentDates[0].date) : ''}
                </span>
                <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                  {tournamentDates[tournamentDates.length - 1] ? formatDate(tournamentDates[tournamentDates.length - 1].date) : ''}
                </span>
              </div>
            </div>
            {selectedTournament && (
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                📍 {selectedTournament.allTournaments.length > 2 ? (
                  <span>
                    {selectedTournament.allTournaments[0]}, {selectedTournament.allTournaments[1]}{' '}
                    <span className="group relative inline-block">
                      <span className="text-blue-500 hover:text-blue-600 cursor-pointer transition-colors">
                        and {selectedTournament.allTournaments.length - 2} more
                      </span>
                      <div className={`absolute left-0 top-full mt-1 w-64 ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'} rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10`}>
                        <div className="p-3">
                          <div className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>All tournaments on this date:</div>
                          {selectedTournament.allTournaments.map((tournament, index) => (
                            <div key={index} className={`text-sm py-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {tournament}
                            </div>
                          ))}
                        </div>
                      </div>
                    </span>
                  </span>
                ) : (
                  selectedTournament.tournament
                )}
              </div>
            )}
          </div>
        )}

        {/* Results Summary */}
        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {isLoading ? (
            <div className="flex items-center space-x-1">
              <span className={`h-4 rounded w-12 animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></span>
              <span className={`h-4 rounded w-8 animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></span>
              <span className={`h-4 rounded w-16 animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></span>
              <span className={`h-4 rounded w-12 animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></span>
              <span className={`h-4 rounded w-16 animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></span>
            </div>
          ) : (
            <>
              Showing {paginatedData.length} of {filteredData.length} results
              {searchTerm && ` for "${searchTerm}"`}
            </>
          )}
        </div>
      </div>

      <div className={`overflow-hidden rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        {/* Always show the table structure to prevent content shift */}
        {(
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-2 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Rank
                  </th>
                  <th className={`px-2 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    School
                  </th>
                  <th className={`hidden sm:table-cell px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    State
                  </th>
                  <th className={`hidden md:table-cell px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Season
                  </th>
                  {selectedEvent && (
                    <th className={`hidden lg:table-cell px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Event
                    </th>
                  )}
                  <th className={`px-2 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Elo Rating
                  </th>
                  <th className={`hidden sm:table-cell px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Ranking Change
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                {isLoading ? (

                  Array.from({ length: Math.min(20, paginatedData.length || 20) }).map((_, index) => (
                    <tr key={`placeholder-${index}`} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                      <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRankColor(index + 1)}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className={`px-2 sm:px-6 py-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        <div>
                          <div className={`h-4 rounded w-32 animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                          <div className={`sm:hidden text-xs mt-1`}>
                            <div className={`h-3 rounded w-8 animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                          </div>
                        </div>
                      </td>
                      <td className={`hidden sm:table-cell px-6 py-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        <div className={`h-4 rounded w-8 animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                      </td>
                      <td className={`hidden md:table-cell px-6 py-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        <div className={`h-4 rounded w-12 animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                      </td>
                      {selectedEvent && (
                        <td className={`hidden lg:table-cell px-6 py-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          <div className={`h-4 rounded w-20 animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                        </td>
                      )}
                      <td className={`px-2 sm:px-6 py-4 text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        <div className={`h-4 rounded w-12 animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                      </td>
                      <td className={`hidden sm:table-cell px-6 py-4 text-sm`}>
                        <div className={`h-4 rounded w-16 animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                      </td>
                    </tr>
                  ))
                ) : (
                  paginatedData.map((entry) => {

                  const key = `${entry.school}-${entry.state}-${entry.season}-${entry.event || 'overall'}`;
                  const actualRank = originalRankMap.get(key) || 1;
                  
                  return (
                    <tr key={`${entry.school}-${entry.state}-${entry.season}-${entry.event || 'overall'}`} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                      <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRankColor(actualRank)}`}>
                          {actualRank}
                        </span>
                      </td>
                      <td className={`px-2 sm:px-6 py-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        <div>
                        {entry.school}
                          <div className={`sm:hidden text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {entry.state}
                          </div>
                        </div>
                      </td>
                      <td className={`hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {entry.state}
                      </td>
                      <td className={`hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {entry.season}
                      </td>
                      {selectedEvent && (
                        <td className={`hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {entry.event}
                        </td>
                      )}
                      <td className={`px-2 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {Math.round(entry.elo)}
                      </td>
                      <td className={`hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm font-semibold`}>
                        {(() => {
                          const change = getRankingChange(entry);
                          const formatted = formatChangeLocal(change);
                          return (
                            <span className={formatted.colorClass}>
                              {formatted.text}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {!isLoading && totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Page {currentPage} of {totalPages}
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                currentPage === 1
                  ? darkMode 
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
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
                    className={`px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
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
              className={`flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                currentPage === totalPages
                  ? darkMode 
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              <span className="hidden sm:inline">Next</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .slider-dark::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: 2px solid #1F2937;
        }
        
        .slider-light::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #2563EB;
          cursor: pointer;
          border: 2px solid #FFFFFF;
        }
        
        .slider-dark::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: 2px solid #1F2937;
        }
        
        .slider-light::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #2563EB;
          cursor: pointer;
          border: 2px solid #FFFFFF;
        }
      `}</style>
    </div>
  );
};

export default Leaderboard;
