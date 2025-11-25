interface SliderTrackProps {
  startPercentage: number;
  endPercentage: number;
  isDragging: boolean;
  darkMode: boolean;
}

export function SliderTrack({
  startPercentage,
  endPercentage,
  isDragging,
  darkMode,
}: SliderTrackProps) {
  return (
    <>
      {/* Background track */}
      <div
        className={`absolute w-full h-1 rounded-full ${darkMode ? "bg-gray-600" : "bg-gray-300"}`}
      />
      {/* Active range track */}
      <div
        className={`absolute h-1 rounded-full bg-blue-500 ${isDragging ? "" : "transition-all duration-200"}`}
        style={{
          left: `${startPercentage}%`,
          width: `${endPercentage - startPercentage}%`,
        }}
      />
    </>
  );
}
