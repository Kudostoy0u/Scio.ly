"use client";
import { formatTime } from "@/app/utils/questionUtils";

interface TestHeaderProps {
  eventName: string;
  timeLeft: number | null;
  darkMode: boolean;
  isFromBookmarks: boolean;
  isSubmitted: boolean;
}

export default function TestHeader({
  eventName,
  timeLeft,
  darkMode,
  isFromBookmarks,
  isSubmitted,
}: TestHeaderProps) {
  return (
    <>
      <header className="w-full max-w-[90vw] md:max-w-3xl flex justify-between items-center pt-3">
        <div className="flex items-center flex-1 min-w-0">
          <h1
            className={`text-lg md:text-xl lg:text-3xl font-extrabold break-words ${darkMode ? "text-blue-400" : "text-blue-600"}`}
          >
            {eventName || "Loading..."}
            {isFromBookmarks && (
              <span
                className={`ml-2 text-sm font-normal ${darkMode ? "text-green-400" : "text-green-600"}`}
              >
                (Bookmarked)
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          {timeLeft !== null && (
            <div
              className={`text-lg md:text-xl font-semibold ${
                isSubmitted
                  ? darkMode
                    ? "text-gray-500"
                    : "text-gray-400"
                  : timeLeft <= 300
                    ? "text-red-600"
                    : darkMode
                      ? "text-white"
                      : "text-blue-600"
              }`}
            >
              {formatTime(timeLeft)}
            </div>
          )}
        </div>
      </header>
    </>
  );
}
