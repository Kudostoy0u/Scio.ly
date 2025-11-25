import { useCallback, useEffect, useState } from "react";
import type React from "react";

interface UseSliderDragProps {
  dataPointsLength: number;
  startIndex: number;
  endIndex: number;
  onStartIndexChange: (index: number) => void;
  onEndIndexChange: (index: number) => void;
  sliderRef: React.RefObject<HTMLDivElement>;
}

export function useSliderDrag({
  dataPointsLength,
  startIndex,
  endIndex,
  onStartIndexChange,
  onEndIndexChange,
  sliderRef,
}: UseSliderDragProps) {
  const [isDragging, setIsDragging] = useState<"start" | "end" | null>(null);

  const calculateIndexFromPosition = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) {
        return 0;
      }
      const rect = sliderRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      return Math.round(percentage * (dataPointsLength - 1));
    },
    [dataPointsLength, sliderRef]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!(isDragging && sliderRef.current)) {
        return;
      }

      const newIndex = calculateIndexFromPosition(e.clientX);

      if (isDragging === "start") {
        const newStartIndex = Math.min(newIndex, endIndex - 1);
        onStartIndexChange(newStartIndex);
      } else {
        const newEndIndex = Math.max(newIndex, startIndex + 1);
        onEndIndexChange(newEndIndex);
      }
    },
    [
      isDragging,
      endIndex,
      startIndex,
      calculateIndexFromPosition,
      onStartIndexChange,
      onEndIndexChange,
      sliderRef,
    ]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!(isDragging && sliderRef.current)) {
        return;
      }

      const touch = e.touches[0];
      if (!touch) {
        return;
      }

      const newIndex = calculateIndexFromPosition(touch.clientX);

      if (isDragging === "start") {
        const newStartIndex = Math.min(newIndex, endIndex - 1);
        onStartIndexChange(newStartIndex);
      } else {
        const newEndIndex = Math.max(newIndex, startIndex + 1);
        onEndIndexChange(newEndIndex);
      }
    },
    [
      isDragging,
      endIndex,
      startIndex,
      calculateIndexFromPosition,
      onStartIndexChange,
      onEndIndexChange,
      sliderRef,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchend", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchend", handleMouseUp);
      };
    }
    return undefined;
  }, [isDragging, handleMouseMove, handleTouchMove, handleMouseUp]);

  const handleMouseDown = (e: React.MouseEvent, thumb: "start" | "end") => {
    setIsDragging(thumb);
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent, thumb: "start" | "end") => {
    setIsDragging(thumb);
    e.preventDefault();
  };

  return {
    isDragging,
    handleMouseDown,
    handleTouchStart,
  };
}
