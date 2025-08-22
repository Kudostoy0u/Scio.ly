'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { EloData, LeaderboardEntry } from '../types/elo';
import { getLeaderboard } from '../utils/eloDataProcessor';
import { useTheme } from '@/app/contexts/ThemeContext';
import { ChevronLeft, ChevronRight, Search, Calendar } from 'lucide-react';

interface LeaderboardProps {
  eloData: EloData;
  division: 'b' | 'c';
}

interface TournamentDate {
  date: string;
  tournament: string;
  season: string;
}

// Event whitelists by season and division
const EVENT_WHITELISTS: Record<string, Record<string, string[]>> = {
  '2018': {
    'C': [
      'Anatomy and Physiology', 'Astronomy', 'Chemistry Lab', 'Disease Detectives', 'Dynamic Planet',
      'Ecology', 'Experimental Design', 'Fermi Questions', 'Forensics', 'Game On', 'Helicopters',
      'Herpetology', 'Hovercraft', 'Materials Science', 'Microbe Mission', 'Mission Possible',
      'Mousetrap Vehicle', 'Optics', 'Remote Sensing', 'Rocks and Minerals', 'Thermodynamics',
      'Towers', 'Write It Do It'
    ],
    'B': [
      'Anatomy and Physiology', 'Battery Buggy', 'Crime Busters', 'Disease Detectives', 'Dynamic Planet',
      'Ecology', 'Experimental Design', 'Fast Facts', 'Herpetology', 'Hovercraft', 'Meteorology',
      'Microbe Mission', 'Mystery Architecture', 'Optics', 'Potions and Poisons', 'Road Scholar',
      'Rocks and Minerals', 'Roller Coaster', 'Solar System', 'Thermodynamics', 'Towers', 'Wright Stuff', 'Write It Do It'
    ]
  },
  '2019': {
    'C': [
      'Anatomy and Physiology', 'Astronomy', 'Boomilever', 'Chemistry Lab', 'Circuit Lab', 'Codebusters',
      'Designer Genes', 'Disease Detectives', 'Dynamic Planet', 'Experimental Design', 'Fermi Questions',
      'Forensics', 'Fossils', 'Geologic Mapping', 'Herpetology', 'Mission Possible', 'Mousetrap Vehicle',
      'Protein Modeling', 'Sounds of Music', 'Thermodynamics', 'Water Quality', 'Wright Stuff', 'Write It Do It'
    ],
    'B': [
      'Anatomy and Physiology', 'Battery Buggy', 'Boomilever', 'Circuit Lab', 'Crime Busters', 'Density Lab',
      'Disease Detectives', 'Dynamic Planet', 'Elastic Launched Glider', 'Experimental Design', 'Fossils',
      'Game On', 'Heredity', 'Herpetology', 'Meteorology', 'Mystery Architecture', 'Potions and Poisons',
      'Road Scholar', 'Roller Coaster', 'Solar System', 'Thermodynamics', 'Water Quality', 'Write It Do It'
    ]
  },
  '2020': {
    'C': [
      'Anatomy and Physiology', 'Astronomy', 'Boomilever', 'Chemistry Lab', 'Circuit Lab', 'Codebusters',
      'Designer Genes', 'Detector Building', 'Disease Detectives', 'Dynamic Planet', 'Experimental Design',
      'Forensics', 'Fossils', 'Geologic Mapping', 'Gravity Vehicle', 'Machines', 'Ornithology',
      'Ping Pong Parachute', 'Protein Modeling', 'Sounds of Music', 'Water Quality', 'Wright Stuff', 'Write It Do It'
    ],
    'B': [
      'Anatomy and Physiology', 'Boomilever', 'Circuit Lab', 'Crime Busters', 'Density Lab', 'Disease Detectives',
      'Dynamic Planet', 'Elastic Launched Glider', 'Experimental Design', 'Food Science', 'Fossils',
      'Game On', 'Heredity', 'Machines', 'Meteorology', 'Mission Possible', 'Mousetrap Vehicle', 'Ornithology',
      'Ping Pong Parachute', 'Reach for the Stars', 'Road Scholar', 'Water Quality', 'Write It Do It'
    ]
  },
  '2021': {
    'C': [
      'Anatomy and Physiology', 'Astronomy', 'Boomilever', 'Chemistry Lab', 'Circuit Lab', 'Codebusters',
      'Designer Genes', 'Detector Building', 'Disease Detectives', 'Dynamic Planet', 'Experimental Design',
      'Forensics', 'Fossils', 'Geologic Mapping', 'Gravity Vehicle', 'Machines', 'Ornithology',
      'Ping Pong Parachute', 'Protein Modeling', 'Sounds of Music', 'Water Quality', 'Wright Stuff', 'Write It Do It'
    ],
    'B': [
      'Anatomy and Physiology', 'Boomilever', 'Circuit Lab', 'Crime Busters', 'Density Lab', 'Disease Detectives',
      'Dynamic Planet', 'Elastic Launched Glider', 'Experimental Design', 'Food Science', 'Fossils',
      'Game On', 'Heredity', 'Machines', 'Meteorology', 'Mission Possible', 'Mousetrap Vehicle', 'Ornithology',
      'Ping Pong Parachute', 'Reach for the Stars', 'Road Scholar', 'Water Quality', 'Write It Do It'
    ]
  },
  '2022': {
    'C': [
      'Anatomy and Physiology', 'Astronomy', 'Bridge', 'Cell Biology', 'Chemistry Lab', 'Codebusters',
      'Detector Building', 'Disease Detectives', 'Dynamic Planet', 'Environmental Chemistry', 'Experimental Design',
      'Forensics', 'Gravity Vehicle', 'Green Generation', 'It\'s About Time', 'Ornithology', 'Ping Pong Parachute',
      'Remote Sensing', 'Rocks and Minerals', 'Trajectory', 'WiFi Lab', 'Wright Stuff', 'Write It Do It'
    ],
    'B': [
      'Anatomy and Physiology', 'Bio-Process Lab', 'Bridge', 'Codebusters', 'Crave the Wave', 'Crime Busters',
      'Disease Detectives', 'Dynamic Planet', 'Electric Wright Stuff', 'Experimental Design', 'Food Science',
      'Green Generation', 'Meteorology', 'Mission Possible', 'Mousetrap Vehicle', 'Ornithology', 'Ping Pong Parachute',
      'Road Scholar', 'Rocks and Minerals', 'Solar System', 'Sounds of Music', 'Storm the Castle', 'Write It Do It'
    ]
  },
  '2023': {
    'C': [
      'Anatomy and Physiology', 'Astronomy', 'Bridge', 'Cell Biology', 'Chemistry Lab', 'Codebusters',
      'Detector Building', 'Disease Detectives', 'Dynamic Planet', 'Environmental Chemistry', 'Experimental Design',
      'Fermi Questions', 'Flight', 'Forensics', 'Forestry', 'Green Generation', 'It\'s About Time',
      'Remote Sensing', 'Rocks and Minerals', 'Scrambler', 'Trajectory', 'WiFi Lab', 'Write It Do It'
    ],
    'B': [
      'Anatomy and Physiology', 'Bio-Process Lab', 'Bridge', 'Can\'t Judge a Powder', 'Codebusters', 'Crave the Wave',
      'Crime Busters', 'Disease Detectives', 'Dynamic Planet', 'Experimental Design', 'Fast Facts', 'Flight',
      'Forestry', 'Green Generation', 'Meteorology', 'Road Scholar', 'Rocks and Minerals', 'Roller Coaster',
      'Solar System', 'Sounds of Music', 'Storm the Castle', 'Wheeled Vehicle', 'Write It Do It'
    ]
  },
  '2024': {
    'C': [
      'Air Trajectory', 'Anatomy and Physiology', 'Astronomy', 'Chemistry Lab', 'Codebusters', 'Detector Building',
      'Disease Detectives', 'Dynamic Planet', 'Ecology', 'Experimental Design', 'Fermi Questions', 'Flight',
      'Forensics', 'Forestry', 'Fossils', 'Geologic Mapping', 'Microbe Mission', 'Optics', 'Robot Tour',
      'Scrambler', 'Tower', 'Wind Power', 'Write It Do It'
    ],
    'B': [
      'Air Trajectory', 'Anatomy and Physiology', 'Can\'t Judge a Powder', 'Codebusters', 'Crime Busters',
      'Disease Detectives', 'Dynamic Planet', 'Ecology', 'Experimental Design', 'Fast Facts', 'Flight',
      'Forestry', 'Fossils', 'Meteorology', 'Microbe Mission', 'Optics', 'Reach for the Stars', 'Road Scholar',
      'Roller Coaster', 'Tower', 'Wheeled Vehicle', 'Wind Power', 'Write It Do It'
    ]
  },
  '2025': {
    'C': [
      'Air Trajectory', 'Anatomy and Physiology', 'Astronomy', 'Bungee Drop', 'Chemistry Lab', 'Codebusters',
      'Disease Detectives', 'Dynamic Planet', 'Ecology', 'Electric Vehicle', 'Entomology', 'Experimental Design',
      'Forensics', 'Fossils', 'Geologic Mapping', 'Helicopter', 'Materials Science', 'Microbe Mission',
      'Optics', 'Robot Tour', 'Tower', 'Wind Power', 'Write It Do It'
    ],
    'B': [
      'Air Trajectory', 'Anatomy and Physiology', 'Codebusters', 'Crime Busters', 'Disease Detectives',
      'Dynamic Planet', 'Ecology', 'Entomology', 'Experimental Design', 'Fossils', 'Helicopter', 'Meteorology',
      'Metric Mastery', 'Microbe Mission', 'Mission Possible', 'Optics', 'Potions and Poisons', 'Reach for the Stars',
      'Road Scholar', 'Scrambler', 'Tower', 'Wind Power', 'Write It Do It'
    ]
  }
};

const Leaderboard: React.FC<LeaderboardProps> = ({ eloData, division }) => {
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

  // Get events available for the selected season and division
  const getEventsForSeason = (season: string, division: string): string[] => {
    // First, get the whitelist for this season and division
    const whitelist = EVENT_WHITELISTS[season]?.[division] || [];
    
    // Then, get events that exist in the data and are in the whitelist
    const events = new Set<string>();
    
    for (const stateCode in eloData) {
      for (const schoolName in eloData[stateCode]) {
        const school = eloData[stateCode][schoolName];
        const seasonData = school.seasons[season];
        if (seasonData) {
          Object.keys(seasonData.events).forEach(event => {
            if (event !== '__OVERALL__' && whitelist.includes(event)) {
              events.add(event);
            }
          });
        }
      }
    }
    
    return Array.from(events).sort();
  };

  // Get all tournament dates for the selected season
  const getTournamentDatesForSeason = (season: string): TournamentDate[] => {
    const dates = new Set<string>();
    const tournamentMap = new Map<string, string>();
    
    for (const stateCode in eloData) {
      for (const schoolName in eloData[stateCode]) {
        const school = eloData[stateCode][schoolName];
        const seasonData = school.seasons[season];
        if (seasonData) {
          Object.values(seasonData.events).forEach(event => {
            if (event.history) {
              event.history.forEach(entry => {
                dates.add(entry.date);
                tournamentMap.set(entry.date, entry.tournament);
              });
            }
          });
        }
      }
    }
    
    return Array.from(dates)
      .sort()
      .map(date => ({
        date,
        tournament: tournamentMap.get(date) || 'Unknown Tournament',
        season
      }));
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

  const eventsForSelectedSeason = getEventsForSeason(selectedSeason, division.toUpperCase() as 'B' | 'C');
  const tournamentDates = getTournamentDatesForSeason(selectedSeason);
  const lastTournamentDate = tournamentDates[tournamentDates.length - 1]?.date || '';

  // Initialize selected date to last tournament if not set
  useEffect(() => {
    if (!selectedDate && lastTournamentDate) {
      setSelectedDate(lastTournamentDate);
    }
  }, [lastTournamentDate, selectedDate]);

  // Reset selected event when season or division changes
  useEffect(() => {
    setSelectedEvent('');
  }, [selectedSeason, division]);

  // Function to calculate ranking change compared to previous year
  const calculateRankingChange = (entry: LeaderboardEntry): number => {
    try {
      const currentYear = parseInt(entry.season);
      const previousYear = (currentYear - 1).toString();
      
      // Get current year ranking
      const currentYearData = getLeaderboard(eloData, entry.event || undefined, entry.season, 1000);
      const currentRank = currentYearData.findIndex(e => 
        e.school === entry.school && e.state === entry.state
      ) + 1;
      
      if (currentRank === 0) return 0; // Not found in current year
      
      // Get previous year ranking
      const previousYearData = getLeaderboard(eloData, entry.event || undefined, previousYear, 1000);
      const previousRank = previousYearData.findIndex(e => 
        e.school === entry.school && e.state === entry.state
      ) + 1;
      
      if (previousRank === 0) return 0; // Not found in previous year (new team)
      
      // Return the change (negative means they moved up in ranking, positive means they moved down)
      return previousRank - currentRank;
    } catch (error) {
      console.error('Error calculating ranking change:', error);
      return 0;
    }
  };

  // Function to format and style the ranking change
  const formatRankingChange = (change: number): { text: string; colorClass: string } => {
    if (change > 0) {
      // Moved up in ranking (lower rank number = better)
      return {
        text: `+${change}`,
        colorClass: darkMode ? 'text-green-400' : 'text-green-600'
      };
    } else if (change < 0) {
      // Moved down in ranking (higher rank number = worse)
      return {
        text: `${change}`, // Already negative
        colorClass: darkMode ? 'text-red-400' : 'text-red-600'
      };
    } else {
      // No change or no previous data
      return {
        text: '-',
        colorClass: darkMode ? 'text-gray-400' : 'text-gray-500'
      };
    }
  };

  useEffect(() => {
    setIsLoading(true);
    try {
      // Get all data first with date filtering
      let data = getLeaderboard(eloData, selectedEvent || undefined, selectedSeason, 1000, selectedDate);
      
      // Filter by state if selected, then re-sort to maintain proper ranking
      if (selectedState) {
        data = data
          .filter(entry => entry.state === selectedState)
          .sort((a, b) => b.elo - a.elo); // Re-sort by Elo (highest first)
      }
      
      setLeaderboardData(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eloData, selectedEvent, selectedSeason, selectedState, selectedDate]);

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

  // Reset to first page when search term changes
  useEffect(() => {
    if (prevSearchTerm.current !== searchTerm) {
      prevSearchTerm.current = searchTerm;
      setCurrentPage(1);
    }
  }, [searchTerm]);

  // Reset to first page when major filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSeason, selectedEvent, selectedState, selectedDate]);

  const getRankColor = (rank: number) => {
    if (rank === 1) return darkMode ? 'bg-yellow-900/30 text-yellow-200' : 'bg-yellow-100 text-yellow-800'; // Gold
    if (rank === 2) return darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'; // Silver
    if (rank === 3) return darkMode ? 'bg-orange-900/30 text-orange-200' : 'bg-orange-100 text-orange-800'; // Bronze
    return darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-600';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const selectedTournament = tournamentDates.find(t => t.date === selectedDate);

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6`}>
      <div className="text-center mb-6">
        <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>🏆 Leaderboard</h2>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          Top teams by Elo rating - {selectedSeason} Season
          {selectedTournament && (
            <span className="block text-sm mt-1">
              📅 {formatDate(selectedDate)} - {selectedTournament.tournament}
            </span>
          )}
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
                value={tournamentDates.findIndex(t => t.date === selectedDate)}
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
                  } ${(tournamentDates.findIndex(t => t.date === selectedDate) / (tournamentDates.length - 1)) * 100}%, ${
                    darkMode ? '#374151' : '#E5E7EB'
                  } ${(tournamentDates.findIndex(t => t.date === selectedDate) / (tournamentDates.length - 1)) * 100}%, ${
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
                📍 {selectedTournament.tournament}
              </div>
            )}
          </div>
        )}

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
                          const change = calculateRankingChange(entry);
                          const formatted = formatRankingChange(change);
                          return (
                            <span className={formatted.colorClass}>
                              {formatted.text}
                            </span>
                          );
                        })()}
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
