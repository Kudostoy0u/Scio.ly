import { useRef } from "react";
import { useSchoolSuggestions } from "./useSchoolSuggestions";

interface SchoolInputProps {
  id: string;
  label: string;
  selectedSchool: string;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (school: string) => void;
  onRemove: () => void;
  schools: string[];
  darkMode: boolean;
}

export function SchoolInput({
  id,
  label,
  selectedSchool,
  search,
  onSearchChange,
  onSelect,
  onRemove,
  schools,
  darkMode,
}: SchoolInputProps) {
  const inputRef = useRef<HTMLDivElement>(null);
  const { suggestions, showSuggestions, setShowSuggestions, handleSelect } = useSchoolSuggestions({
    search,
    selectedSchool,
    schools,
    onSelect,
  });

  if (selectedSchool) {
    return (
      <div
        className={`flex items-center justify-between border rounded-lg px-4 py-3 ${
          darkMode ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-200"
        }`}
      >
        <span className={`font-medium ${darkMode ? "text-blue-100" : "text-blue-900"}`}>
          {selectedSchool}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className={`${darkMode ? "text-blue-400 hover:text-blue-200" : "text-blue-600 hover:text-blue-800"}`}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={inputRef}>
      <input
        id={id}
        type="text"
        placeholder={`Search for ${label.toLowerCase()}...`}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        className={`w-full px-3 py-2 border rounded-md ${darkMode ? "border-gray-600 bg-gray-700 text-white placeholder-gray-400" : "border-gray-300 bg-white text-gray-900 placeholder-gray-500"} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div
          className={`absolute z-10 w-full mt-1 border rounded-md shadow-lg max-h-48 overflow-y-auto ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"}`}
        >
          {suggestions.map((school) => (
            <button
              key={school}
              type="button"
              className={`w-full text-left px-3 py-2 cursor-pointer border-b last:border-b-0 ${darkMode ? "border-gray-600 hover:bg-gray-600 text-gray-300" : "border-gray-100 hover:bg-gray-100 text-gray-700"}`}
              onClick={() => handleSelect(school)}
            >
              {school}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
