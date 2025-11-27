"use client";

interface CharacterDisplayProps {
  char: string;
  i: number;
  isLetter: boolean;
  value: string;
  isCorrect: boolean;
  isHinted: boolean;
  showCorrectAnswer: boolean;
  isSameCipherLetter: boolean;
  correctMappingValue: string;
  darkMode: boolean;
  quoteIndex: number;
  onCharChange: (char: string, value: string) => void;
  onFocus: (char: string) => void;
  onBlur: () => void;
}

// Helper function to get character input className
function getCharacterInputClassName(
  isSameCipherLetter: boolean,
  showCorrectAnswer: boolean,
  isHinted: boolean,
  isCorrect: boolean,
  darkMode: boolean
): string {
  const baseClasses = "w-5 h-5 sm:w-6 sm:h-6 text-center border rounded mt-1 text-xs sm:text-sm";
  const focusClasses = isSameCipherLetter
    ? "border-2 border-blue-500"
    : darkMode
      ? "bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500"
      : "bg-white border-gray-300 text-gray-900 focus:border-blue-500";
  const stateClasses = showCorrectAnswer
    ? isHinted
      ? "border-yellow-500 bg-yellow-100/10"
      : isCorrect
        ? "border-green-500 bg-green-100/10"
        : "border-red-500 bg-red-100/10"
    : "";
  return `${baseClasses} ${focusClasses} ${stateClasses}`;
}

export function CharacterDisplay({
  char,
  i,
  isLetter,
  value,
  isCorrect,
  isHinted,
  showCorrectAnswer,
  isSameCipherLetter,
  correctMappingValue,
  darkMode,
  quoteIndex,
  onCharChange,
  onFocus,
  onBlur,
}: CharacterDisplayProps) {
  if (!isLetter) {
    return <div className="w-5 h-12 sm:w-6 sm:h-14 mt-1" />;
  }

  return (
    <div className="flex flex-col items-center mx-0.5">
      <span className={`text-base sm:text-lg ${darkMode ? "text-gray-300" : "text-gray-900"}`}>
        {char}
      </span>
      <div className="relative h-12 sm:h-14">
        <input
          type="text"
          id={`substitution-${quoteIndex}-${i}`}
          name={`substitution-${quoteIndex}-${i}`}
          maxLength={1}
          value={value}
          disabled={showCorrectAnswer}
          onChange={(e) => onCharChange(char, e.target.value.toUpperCase())}
          onFocus={() => onFocus(char)}
          onBlur={onBlur}
          autoComplete="off"
          className={getCharacterInputClassName(
            isSameCipherLetter,
            showCorrectAnswer,
            isHinted,
            isCorrect,
            darkMode
          )}
        />
        {showCorrectAnswer && !isCorrect && (
          <div
            className={`absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs ${
              darkMode ? "text-red-400" : "text-red-600"
            }`}
          >
            {correctMappingValue}
          </div>
        )}
      </div>
    </div>
  );
}
