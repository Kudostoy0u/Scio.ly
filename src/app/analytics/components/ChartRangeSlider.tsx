'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { formatDate } from '../utils/eloDataProcessor';

interface ChartRangeSliderProps {
  dataPoints: Array<{ x: Date; y: number; tournament?: string; link?: string }>;
  onRangeChange: (startIndex: number, endIndex: number) => void;
  isMobile: boolean;
}

const ChartRangeSlider: React.FC<ChartRangeSliderProps> = ({ 
  dataPoints, 
  onRangeChange, 
  isMobile 
}) => {
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(dataPoints.length - 1);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const { darkMode } = useTheme();


  useEffect(() => {
    if (dataPoints.length > 0) {
      if (isMobile) {

        const recentCount = Math.max(1, Math.floor(dataPoints.length * 0.3));
        setStartIndex(dataPoints.length - recentCount);
        setEndIndex(dataPoints.length - 1);
      } else {

        setStartIndex(0);
        setEndIndex(dataPoints.length - 1);
      }
    }
  }, [dataPoints.length, isMobile]);


  useEffect(() => {
    if (dataPoints.length > 0) {
      onRangeChange(startIndex, endIndex);
    }
  }, [startIndex, endIndex, onRangeChange, dataPoints.length]);

  const handleMouseDown = (e: React.MouseEvent, thumb: 'start' | 'end') => {
    setIsDragging(thumb);
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent, thumb: 'start' | 'end') => {
    setIsDragging(thumb);
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newIndex = Math.round(percentage * (dataPoints.length - 1));

    if (isDragging === 'start') {
      const newStartIndex = Math.min(newIndex, endIndex - 1);
      setStartIndex(newStartIndex);
    } else {
      const newEndIndex = Math.max(newIndex, startIndex + 1);
      setEndIndex(newEndIndex);
    }
  }, [isDragging, endIndex, startIndex, dataPoints.length]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newIndex = Math.round(percentage * (dataPoints.length - 1));

    if (isDragging === 'start') {
      const newStartIndex = Math.min(newIndex, endIndex - 1);
      setStartIndex(newStartIndex);
    } else {
      const newEndIndex = Math.max(newIndex, startIndex + 1);
      setEndIndex(newEndIndex);
    }
  }, [isDragging, endIndex, startIndex, dataPoints.length]);

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  const handleTouchEnd = () => {
    setIsDragging(null);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleTouchMove]);



  if (dataPoints.length === 0) return null;

  const startPercentage = (startIndex / (dataPoints.length - 1)) * 100;
  const endPercentage = (endIndex / (dataPoints.length - 1)) * 100;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
          Range: {dataPoints[startIndex]?.x ? formatDate(dataPoints[startIndex].x.toISOString().split('T')[0]) : ''} - {dataPoints[endIndex]?.x ? formatDate(dataPoints[endIndex].x.toISOString().split('T')[0]) : ''}
        </span>
        <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
          {endIndex - startIndex + 1} of {dataPoints.length} points
        </span>
      </div>
      
      <div className="relative px-2">
        {/* Track container */}
        <div 
          ref={sliderRef}
          className="relative h-8 flex items-center"
        >
          {/* Background track */}
          <div className={`absolute w-full h-1 rounded-full ${
            darkMode ? 'bg-gray-600' : 'bg-gray-300'
          }`} />
          
          {/* Active range track */}
          <div
            className={`absolute h-1 rounded-full bg-blue-500 ${isDragging ? '' : 'transition-all duration-200'}`}
            style={{
              left: `${startPercentage}%`,
              width: `${endPercentage - startPercentage}%`
            }}
          />
          
          {/* Start thumb */}
          <div
            className={`absolute w-4 h-4 rounded-full border-2 cursor-grab active:cursor-grabbing transform -translate-x-1/2 shadow-lg touch-none ${
              isDragging ? '' : 'transition-all duration-200'
            } ${
              darkMode 
                ? 'bg-white border-blue-400 hover:border-blue-300 hover:shadow-xl' 
                : 'bg-white border-blue-500 hover:border-blue-600 hover:shadow-xl'
            }`}
            style={{ left: `${startPercentage}%` }}
            onMouseDown={(e) => handleMouseDown(e, 'start')}
            onTouchStart={(e) => handleTouchStart(e, 'start')}
          />
          
          {/* End thumb */}
          <div
            className={`absolute w-4 h-4 rounded-full border-2 cursor-grab active:cursor-grabbing transform -translate-x-1/2 shadow-lg touch-none ${
              isDragging ? '' : 'transition-all duration-200'
            } ${
              darkMode 
                ? 'bg-white border-blue-400 hover:border-blue-300 hover:shadow-xl' 
                : 'bg-white border-blue-500 hover:border-blue-600 hover:shadow-xl'
            }`}
            style={{ left: `${endPercentage}%` }}
            onMouseDown={(e) => handleMouseDown(e, 'end')}
            onTouchStart={(e) => handleTouchStart(e, 'end')}
          />
        </div>
      </div>
      
      {/* Data point indicators */}
      <div className="flex justify-between text-xs px-2">
        <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
          {dataPoints[0] ? formatDate(dataPoints[0].x.toISOString().split('T')[0]) : ''}
        </span>
        <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
          {dataPoints[dataPoints.length - 1] ? formatDate(dataPoints[dataPoints.length - 1].x.toISOString().split('T')[0]) : ''}
        </span>
      </div>
      

    </div>
  );
};

export default ChartRangeSlider;
