"use client";

import { formatDate } from "@/app/analytics/utils/eloDataProcessor";
import { useTheme } from "@/app/contexts/themeContext";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ChartRangeSliderProps {
  dataPoints: Array<{ x: Date; y: number; tournament?: string; link?: string }>;
  onRangeChange: (startIndex: number, endIndex: number) => void;
  isMobile: boolean;
}

// Helper function to format date from data point
const formatDataPointDate = (dataPoint: { x: Date } | undefined): string => {
  if (!dataPoint?.x) {
    return "";
  }
  return formatDate(dataPoint.x.toISOString().split("T")[0] ?? "");
};

// Helper function to calculate index from client position
const calculateIndexFromPosition = (
  clientX: number,
  rect: DOMRect,
  dataPointsLength: number
): number => {
  const x = clientX - rect.left;
  const percentage = Math.max(0, Math.min(1, x / rect.width));
  return Math.round(percentage * (dataPointsLength - 1));
};

// Helper function to update index based on drag type
const updateIndexFromDrag = (
  newIndex: number,
  dragType: "start" | "end",
  startIndex: number,
  endIndex: number,
  setStartIndex: (index: number) => void,
  setEndIndex: (index: number) => void
): void => {
  if (dragType === "start") {
    const newStartIndex = Math.min(newIndex, endIndex - 1);
    setStartIndex(newStartIndex);
  } else {
    const newEndIndex = Math.max(newIndex, startIndex + 1);
    setEndIndex(newEndIndex);
  }
};

const ChartRangeSlider: React.FC<ChartRangeSliderProps> = ({
  dataPoints,
  onRangeChange,
  isMobile,
}) => {
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(dataPoints.length - 1);
  const [isDragging, setIsDragging] = useState<"start" | "end" | null>(null);
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

  const handleMouseDown = (e: React.MouseEvent, thumb: "start" | "end") => {
    setIsDragging(thumb);
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent, thumb: "start" | "end") => {
    setIsDragging(thumb);
    e.preventDefault();
  };

  const handleDragMove = useCallback(
    (clientX: number) => {
      if (!(isDragging && sliderRef.current)) {
        return;
      }

      const rect = sliderRef.current.getBoundingClientRect();
      const newIndex = calculateIndexFromPosition(clientX, rect, dataPoints.length);
      updateIndexFromDrag(newIndex, isDragging, startIndex, endIndex, setStartIndex, setEndIndex);
    },
    [isDragging, endIndex, startIndex, dataPoints.length]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      handleDragMove(e.clientX);
    },
    [handleDragMove]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        handleDragMove(touch.clientX);
      }
    },
    [handleDragMove]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleTouchEnd);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };
    }
    return undefined;
  }, [isDragging, handleMouseMove, handleTouchMove, handleMouseUp, handleTouchEnd]);

  if (dataPoints.length === 0) {
    return null;
  }

  const startPercentage = (startIndex / (dataPoints.length - 1)) * 100;
  const endPercentage = (endIndex / (dataPoints.length - 1)) * 100;

  // Helper to get thumb classes
  const getThumbClasses = (): string => {
    const baseClasses =
      "absolute w-4 h-4 rounded-full border-2 cursor-grab active:cursor-grabbing transform -translate-x-1/2 shadow-lg touch-none";
    const transitionClass = isDragging ? "" : "transition-all duration-200";
    const colorClasses = darkMode
      ? "bg-white border-blue-400 hover:border-blue-300 hover:shadow-xl"
      : "bg-white border-blue-500 hover:border-blue-600 hover:shadow-xl";
    return `${baseClasses} ${transitionClass} ${colorClasses}`;
  };

  const thumbClasses = getThumbClasses();
  const startDateText = formatDataPointDate(dataPoints[startIndex]);
  const endDateText = formatDataPointDate(dataPoints[endIndex]);
  const firstDateText = formatDataPointDate(dataPoints[0]);
  const lastDateText = formatDataPointDate(dataPoints[dataPoints.length - 1]);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
          Range: {startDateText} - {endDateText}
        </span>
        <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
          {endIndex - startIndex + 1} of {dataPoints.length} points
        </span>
      </div>

      <div className="relative px-2">
        <div ref={sliderRef} className="relative h-8 flex items-center">
          <div
            className={`absolute w-full h-1 rounded-full ${darkMode ? "bg-gray-600" : "bg-gray-300"}`}
          />
          <div
            className={`absolute h-1 rounded-full bg-blue-500 ${isDragging ? "" : "transition-all duration-200"}`}
            style={{
              left: `${startPercentage}%`,
              width: `${endPercentage - startPercentage}%`,
            }}
          />
          <div
            className={thumbClasses}
            style={{ left: `${startPercentage}%` }}
            onMouseDown={(e) => handleMouseDown(e, "start")}
            onTouchStart={(e) => handleTouchStart(e, "start")}
          />
          <div
            className={thumbClasses}
            style={{ left: `${endPercentage}%` }}
            onMouseDown={(e) => handleMouseDown(e, "end")}
            onTouchStart={(e) => handleTouchStart(e, "end")}
          />
        </div>
      </div>

      <div className="flex justify-between text-xs px-2">
        <span className={darkMode ? "text-gray-400" : "text-gray-500"}>{firstDateText}</span>
        <span className={darkMode ? "text-gray-400" : "text-gray-500"}>{lastDateText}</span>
      </div>
    </div>
  );
};

export default ChartRangeSlider;
