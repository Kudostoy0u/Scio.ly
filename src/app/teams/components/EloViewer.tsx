'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import type { EloData, ChartType, ChartData } from '../types/elo';
import { getAllSchools, getAllEvents, processChartData } from '../utils/eloDataProcessor';
import { getChartConfig } from './ChartConfig';
import Leaderboard from './Leaderboard';
import CompareTool from './CompareTool';
import { useTheme } from '@/app/contexts/ThemeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface EloViewerProps {
  eloData: EloData;
}

type TabType = 'charts' | 'leaderboard' | 'compare';

const EloViewer: React.FC<EloViewerProps> = ({ eloData }) => {
  const [activeTab, setActiveTab] = useState<TabType>('charts');
  const [chartType, setChartType] = useState<ChartType>('overall');
  const [viewMode, setViewMode] = useState<'season' | 'tournament'>('tournament');
  const [selectedSchools, setSelectedSchools] = useState<string[]>([
    'Seven Lakes High School Varsity (TX)',
    'Adlai E. Stevenson High School Varsity (IL)'
  ]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [chartData, setChartData] = useState<ChartData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<any>(null);
  const { darkMode } = useTheme();

  const schools = getAllSchools(eloData);
  const events = getAllEvents(eloData);

  const filteredSchools = schools.filter(school =>
    school.toLowerCase().includes(schoolSearch.toLowerCase())
  );

  const filteredEvents = events.filter(event =>
    event.toLowerCase().includes(eventSearch.toLowerCase())
  );

  const generateChart = useCallback(() => {
    if (selectedSchools.length === 0) {
      setError('Please select at least one school');
      setChartData({});
      return;
    }

    if (chartType === 'event' && selectedEvents.length === 0) {
      setError('Please select at least one event');
      setChartData({});
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = processChartData(eloData, chartType, selectedSchools, selectedEvents, viewMode);
      setChartData(data);
    } catch (err) {
      setError('Error generating chart data');
      console.error(err);
      setChartData({});
    } finally {
      setIsLoading(false);
    }
  }, [eloData, chartType, selectedSchools, selectedEvents, viewMode]);

  const handleSchoolToggle = (school: string) => {
    setSelectedSchools(prev => 
      prev.includes(school) 
        ? prev.filter(s => s !== school)
        : [...prev, school]
    );
  };

  const handleEventToggle = (event: string) => {
    setSelectedEvents(prev => 
      prev.includes(event) 
        ? prev.filter(e => e !== event)
        : [...prev, event]
    );
  };

  const removeSchool = (school: string) => {
    setSelectedSchools(prev => prev.filter(s => s !== school));
  };

  const removeEvent = (event: string) => {
    setSelectedEvents(prev => prev.filter(e => e !== event));
  };

  const clearAllSchools = () => {
    setSelectedSchools([]);
  };

  const clearAllEvents = () => {
    setSelectedEvents([]);
  };

  const handleChartTypeChange = (newChartType: ChartType) => {
    setChartType(newChartType);
    setChartData({}); // Clear chart data when changing chart type
  };

  const handleViewModeChange = (newViewMode: 'season' | 'tournament') => {
    setViewMode(newViewMode);
    setChartData({}); // Clear chart data when changing view mode
  };

  useEffect(() => {
    if (selectedSchools.length > 0) {
      generateChart();
    } else {
      setChartData({});
    }
  }, [selectedSchools, selectedEvents, chartType, viewMode, generateChart]);

  const chartConfig = Object.keys(chartData).length > 0 ? getChartConfig(chartData, chartType, viewMode, darkMode) : null;

  const renderChartsTab = () => (
    <>
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6 mb-6`}>
        <div className="space-y-6">
          {/* Chart Type and View Mode Controls */}
          <div className="flex flex-wrap gap-4">
            <div className="flex gap-2">
              <button 
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  chartType === 'overall' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => handleChartTypeChange('overall')}
              >
                Overall
              </button>
              <button 
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  chartType === 'event' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => handleChartTypeChange('event')}
              >
                Event
              </button>
            </div>

            <div className="flex gap-2">
              <button 
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'season' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => handleViewModeChange('season')}
              >
                By Season
              </button>
              <button 
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'tournament' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => handleViewModeChange('tournament')}
              >
                By Tournament
              </button>
            </div>
          </div>

          {/* School Selection */}
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Select Schools
            </label>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search schools..."
                value={schoolSearch}
                onChange={(e) => setSchoolSearch(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${darkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
              <div className={`max-h-48 overflow-y-auto border rounded-md ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-white'}`}>
                {filteredSchools.map(school => (
                  <div
                    key={school}
                    className={`px-3 py-2 cursor-pointer border-b last:border-b-0 transition-colors ${
                      selectedSchools.includes(school) 
                        ? darkMode 
                          ? 'bg-blue-900/20 text-blue-300' 
                          : 'bg-blue-50 text-blue-700'
                        : darkMode 
                          ? 'border-gray-600 hover:bg-gray-600 text-gray-300' 
                          : 'border-gray-100 hover:bg-gray-50 text-gray-700'
                    }`}
                    onClick={() => handleSchoolToggle(school)}
                  >
                    {school}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {selectedSchools.map(school => (
                  <span key={school} className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                    darkMode 
                      ? 'bg-blue-900/30 text-blue-200' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {school}
                    <button 
                      onClick={() => removeSchool(school)} 
                      className={`ml-2 ${darkMode ? 'text-blue-400 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {selectedSchools.length > 0 && (
                  <button
                    onClick={clearAllSchools}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      darkMode 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-red-100 hover:bg-red-200 text-red-700'
                    }`}
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Event Selection (only for event charts) */}
          {chartType === 'event' && (
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Select Events
              </label>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Search events..."
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md ${darkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                <div className={`max-h-48 overflow-y-auto border rounded-md ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-white'}`}>
                  {filteredEvents.map(event => (
                    <div
                      key={event}
                      className={`px-3 py-2 cursor-pointer border-b last:border-b-0 transition-colors ${
                        selectedEvents.includes(event) 
                          ? darkMode 
                            ? 'bg-blue-900/20 text-blue-300' 
                            : 'bg-blue-50 text-blue-700'
                          : darkMode 
                            ? 'border-gray-600 hover:bg-gray-600 text-gray-300' 
                            : 'border-gray-100 hover:bg-gray-50 text-gray-700'
                      }`}
                      onClick={() => handleEventToggle(event)}
                    >
                      {event}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {selectedEvents.map(event => (
                    <span key={event} className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                      darkMode 
                        ? 'bg-blue-900/30 text-blue-200' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {event}
                      <button 
                        onClick={() => removeEvent(event)} 
                        className={`ml-2 ${darkMode ? 'text-blue-400 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {selectedEvents.length > 0 && (
                    <button
                      onClick={clearAllEvents}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        darkMode 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : 'bg-red-100 hover:bg-red-200 text-red-700'
                      }`}
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className={`px-4 py-3 rounded-md ${
              darkMode 
                ? 'bg-red-900/20 border border-red-800 text-red-300' 
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Chart Container */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6`}>
        <div className="relative h-96">
          {isLoading && (
            <div className={`absolute inset-0 flex items-center justify-center rounded-lg ${darkMode ? 'bg-gray-800 bg-opacity-75' : 'bg-white bg-opacity-75'}`}>
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading chart data...</p>
              </div>
            </div>
          )}
          {chartConfig && !isLoading && (
            <Line 
              ref={chartRef}
              data={chartConfig.data} 
              options={chartConfig.options} 
            />
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Team Performance Analysis
        </h1>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          Track team performance across seasons and events
        </p>
      </div>

      {/* Tab Navigation */}
      <div className={`flex rounded-lg shadow-sm border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <button 
          className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'charts' 
              ? 'bg-blue-600 text-white' 
              : darkMode 
                ? 'text-gray-300 hover:bg-gray-700' 
                : 'text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('charts')}
        >
          📊 Charts
        </button>
        <button 
          className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'leaderboard' 
              ? 'bg-blue-600 text-white' 
              : darkMode 
                ? 'text-gray-300 hover:bg-gray-700' 
                : 'text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 Leaderboard
        </button>
        <button 
          className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'compare' 
              ? 'bg-blue-600 text-white' 
              : darkMode 
                ? 'text-gray-300 hover:bg-gray-700' 
                : 'text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('compare')}
        >
          ⚔️ Compare
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'charts' && renderChartsTab()}
        {activeTab === 'leaderboard' && <Leaderboard eloData={eloData} />}
        {activeTab === 'compare' && <CompareTool eloData={eloData} />}
      </div>
    </div>
  );
};

export default EloViewer;
