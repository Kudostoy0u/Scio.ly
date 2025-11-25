import type React from "react";

interface SliderThumbProps {
  position: number;
  isDragging: boolean;
  darkMode: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
}

export function SliderThumb({
  position,
  isDragging,
  darkMode,
  onMouseDown,
  onTouchStart,
}: SliderThumbProps) {
  return (
    <div
      className={`absolute w-4 h-4 rounded-full border-2 cursor-grab active:cursor-grabbing transform -translate-x-1/2 shadow-lg touch-none ${
        isDragging ? "" : "transition-all duration-200"
      } ${
        darkMode
          ? "bg-white border-blue-400 hover:border-blue-300 hover:shadow-xl"
          : "bg-white border-blue-500 hover:border-blue-600 hover:shadow-xl"
      }`}
      style={{ left: `${position}%` }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    />
  );
}
