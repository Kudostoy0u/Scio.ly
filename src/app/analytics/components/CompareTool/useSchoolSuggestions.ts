import { useEffect, useState } from "react";

interface UseSchoolSuggestionsProps {
  search: string;
  selectedSchool: string;
  schools: string[];
  onSelect: (school: string) => void;
}

export function useSchoolSuggestions({
  search,
  selectedSchool,
  schools,
  onSelect,
}: UseSchoolSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (search.trim() && !selectedSchool) {
      const filtered = schools
        .filter((school) => school.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 10);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [search, schools, selectedSchool]);

  const handleSelect = (school: string) => {
    onSelect(school);
    setShowSuggestions(false);
  };

  return {
    suggestions,
    showSuggestions,
    setShowSuggestions,
    handleSelect,
  };
}
