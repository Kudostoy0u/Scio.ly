"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import SyncLocalStorage from "@/lib/database/localStorage-replacement";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import type { Event, Settings } from "@/app/practice/types";
import DifficultyDropdown from "./DifficultyDropdown";
import DivisionToggle from "./DivisionToggle";
// DISABLED_CIPHERS and QuoteData are used in SubtopicDropdown
import FavoriteHeart from "./FavoriteHeart";
// favorites helpers are used inside FavoriteHeart
import QuoteLengthSlider from "./QuoteLengthSlider";
import SubtopicDropdown from "./SubtopicDropdown";
import TestActions from "./TestActions";

interface TestConfigurationProps {
  selectedEvent: Event | null;
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  onGenerateTest: () => void;
  onUnlimited: () => void;
  generateLabel?: string;
  hideUnlimited?: boolean;
  forceBothDivision?: boolean;
}

export default function TestConfiguration({
  selectedEvent,
  settings,
  onSettingsChange,
  onGenerateTest,
  onUnlimited,
  generateLabel = "Generate Test",
  hideUnlimited = false,
  forceBothDivision = false,
}: TestConfigurationProps) {
  const { darkMode } = useTheme();
  const [isSubtopicDropdownOpen, setIsSubtopicDropdownOpen] = useState(false);
  const [isDifficultyDropdownOpen, setIsDifficultyDropdownOpen] = useState(false);
  const subtopicDropdownRef = useRef<HTMLDivElement>(null);
  const difficultyDropdownRef = useRef<HTMLDivElement>(null);

  // FavoriteHeart moved to its own component

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;

    if (id === "questionCount") {
      const questionCount = Number.parseInt(value);
      if (questionCount > 200) {
        toast.warning("You cannot select more than 200 questions");
        return;
      }
      if (questionCount < 1) {
        onSettingsChange({ ...settings, questionCount: 1 });

        if (!selectedEvent || selectedEvent.name !== "Codebusters") {
          SyncLocalStorage.setItem("defaultQuestionCount", "1");
        } else if (selectedEvent && selectedEvent.name === "Codebusters") {
          SyncLocalStorage.setItem("codebustersQuestionCount", "1");
        }
        return;
      }
      onSettingsChange({ ...settings, questionCount });

      if (!selectedEvent || selectedEvent.name !== "Codebusters") {
        SyncLocalStorage.setItem("defaultQuestionCount", questionCount.toString());
      } else if (selectedEvent && selectedEvent.name === "Codebusters") {
        SyncLocalStorage.setItem("codebustersQuestionCount", questionCount.toString());
      }
    } else if (id === "timeLimit") {
      const timeLimit = Number.parseInt(value);
      if (timeLimit < 1) {
        onSettingsChange({ ...settings, timeLimit: 1 });

        if (!selectedEvent || selectedEvent.name !== "Codebusters") {
          SyncLocalStorage.setItem("defaultTimeLimit", "1");
        } else if (selectedEvent && selectedEvent.name === "Codebusters") {
          SyncLocalStorage.setItem("codebustersTimeLimit", "1");
        }
      } else if (timeLimit > 120) {
        onSettingsChange({ ...settings, timeLimit: 120 });

        if (!selectedEvent || selectedEvent.name !== "Codebusters") {
          SyncLocalStorage.setItem("defaultTimeLimit", "120");
        } else if (selectedEvent && selectedEvent.name === "Codebusters") {
          SyncLocalStorage.setItem("codebustersTimeLimit", "120");
        }
      } else {
        onSettingsChange({ ...settings, timeLimit });

        if (!selectedEvent || selectedEvent.name !== "Codebusters") {
          SyncLocalStorage.setItem("defaultTimeLimit", timeLimit.toString());
        } else if (selectedEvent && selectedEvent.name === "Codebusters") {
          SyncLocalStorage.setItem("codebustersTimeLimit", timeLimit.toString());
        }
      }
    } else {
      onSettingsChange({
        ...settings,
        [id]: value,
      });
    }
  };

  const validateTimeLimit = () => {
    if (settings.timeLimit < 1) {
      onSettingsChange({ ...settings, timeLimit: 1 });
    } else if (settings.timeLimit > 120) {
      onSettingsChange({ ...settings, timeLimit: 120 });
    }
  };

  const handleSubtopicChange = (subtopic: string) => {
    const newSubtopics = settings.subtopics.includes(subtopic)
      ? settings.subtopics.filter((s: string) => s !== subtopic)
      : [...settings.subtopics, subtopic];

    onSettingsChange({ ...settings, subtopics: newSubtopics });
  };

  const getSubtopicDisplayText = (): string => {
    if (settings.subtopics.length === 0) {
      return "All Subtopics";
    }
    if (settings.subtopics.length === 1) {
      return settings.subtopics[0] || "All Subtopics";
    }
    return `${settings.subtopics.length} selected`;
  };

  const handleDifficultyChange = (difficultyId: string) => {
    const newDifficulties = settings.difficulties.includes(difficultyId)
      ? settings.difficulties.filter((d: string) => d !== difficultyId)
      : [...settings.difficulties, difficultyId];

    onSettingsChange({ ...settings, difficulties: newDifficulties });
  };

  useEffect(() => {
    if (!selectedEvent || selectedEvent.name !== "Codebusters") {
      const availableDivisions = selectedEvent?.divisions || ["B", "C"];
      const canShowB = availableDivisions.includes("B");
      const canShowC = availableDivisions.includes("C");
      const normalizedDivision =
        settings.division === "any"
          ? canShowB && canShowC
            ? "any"
            : canShowC
              ? "C"
              : "B"
          : settings.division === "B" && !canShowB
            ? "C"
            : settings.division === "C" && !canShowC
              ? "B"
              : settings.division;

      SyncLocalStorage.setItem("defaultDivision", normalizedDivision);

      const normalizedTypes = ["multiple-choice", "both", "free-response"].includes(settings.types)
        ? settings.types
        : "multiple-choice";
      SyncLocalStorage.setItem("defaultQuestionTypes", normalizedTypes);
    }
  }, [settings.division, settings.types, selectedEvent]);

  const getDifficultyDisplayText = (): string => {
    if (settings.difficulties.length === 0) {
      return "All Difficulties";
    }
    if (settings.difficulties.length === 1) {
      return settings.difficulties[0] || "All Difficulties";
    }
    return `${settings.difficulties.length} selected`;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        subtopicDropdownRef.current &&
        !subtopicDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSubtopicDropdownOpen(false);
      }
      if (
        difficultyDropdownRef.current &&
        !difficultyDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDifficultyDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isCodebusters = selectedEvent?.name === "Codebusters";
  const supportsPictureQuestions = (() => {
    const name = selectedEvent?.name || "";
    const base = name.split(" - ")[0] || "";
    const candidates = [
      "Rocks and Minerals",
      "Entomology",
      "Anatomy - Nervous",
      "Anatomy - Endocrine",
      "Anatomy - Sense Organs",
      "Anatomy & Physiology",
      "Dynamic Planet",
      "Dynamic Planet - Oceanography",
      "Water Quality",
      "Water Quality - Freshwater",
      "Remote Sensing",
      "Circuit Lab",
      "Astronomy",
      "Designer Genes",
      "Forensics",
      "Meteorology",
      "Potions and Poisons",
      "Solar System",
    ];
    return candidates.includes(name) || candidates.includes(base);
  })();

  const supportsIdentificationOnly = (() => {
    const name = selectedEvent?.name || "";
    const candidates = [
      "Rocks and Minerals",
      "Entomology",
      "Water Quality - Freshwater",
      "Astronomy",
      "Potions and Poisons",
      "Solar System",
    ];
    return candidates.includes(name);
  })();

  return (
    <div
      data-test-config={true}
      className={`w-full lg:w-96 rounded-xl flex-shrink-0 flex flex-col ${
        darkMode ? "bg-gray-800" : "bg-white shadow-md"
      }`}
    >
      <div className="p-6 flex-1 flex flex-col min-h-0 overflow-visible">
        <div className="flex items-start justify-between mb-6">
          <h3 className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
            Test Configuration
          </h3>
          <FavoriteHeart
            darkMode={!!darkMode}
            selectedEventName={selectedEvent?.name || null}
            settings={settings}
          />
        </div>
        <div className="space-y-5 flex-1">
          {/* Number of Questions and Time Limit on same line */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="questionCount"
                className={`block text-sm font-medium mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Number of Questions
              </label>
              <input
                type="number"
                id="questionCount"
                min="1"
                max="200"
                value={Number.isNaN(settings.questionCount) ? "" : settings.questionCount}
                onChange={handleChange}
                className={`block w-full rounded-md border-0 py-1.5 px-3 ${
                  darkMode
                    ? "bg-gray-700 text-white focus:ring-blue-500"
                    : "bg-gray-50 text-gray-900 focus:ring-blue-600"
                } shadow-sm focus:ring-1 focus:outline-none`}
              />
            </div>
            <div>
              <label
                htmlFor="timeLimit"
                className={`block text-sm font-medium mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Time Limit (minutes)
              </label>
              <input
                type="number"
                id="timeLimit"
                min="1"
                max="120"
                value={Number.isNaN(settings.timeLimit) ? "" : settings.timeLimit}
                onChange={handleChange}
                onBlur={validateTimeLimit}
                className={`block w-full rounded-md border-0 py-1.5 px-3 ${
                  darkMode
                    ? "bg-gray-700 text-white focus:ring-blue-500"
                    : "bg-gray-50 text-gray-900 focus:ring-blue-600"
                } shadow-sm focus:ring-1 focus:outline-none`}
              />
            </div>
          </div>

          {/* Question Types Toggle */}
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Question Types
            </label>
            <div
              className={`flex rounded-md border ${darkMode ? "border-gray-600" : "border-gray-300"}`}
            >
              <button
                type="button"
                onClick={() => {
                  onSettingsChange({ ...settings, types: "multiple-choice" });

                  if (!selectedEvent || selectedEvent.name !== "Codebusters") {
                    SyncLocalStorage.setItem("defaultQuestionTypes", "multiple-choice");
                  }
                }}
                disabled={isCodebusters}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-l-md border ${
                  isCodebusters
                    ? `opacity-50 cursor-not-allowed ${darkMode ? "border-gray-600 text-gray-500" : "border-gray-300 text-gray-400"}`
                    : settings.types === "multiple-choice"
                      ? darkMode
                        ? "border-blue-500 bg-blue-500 text-white"
                        : "border-blue-500 bg-blue-500 text-white"
                      : darkMode
                        ? "border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-400"
                        : "border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600"
                }`}
              >
                MCQ only
              </button>
              <button
                type="button"
                onClick={() => {
                  onSettingsChange({ ...settings, types: "both" });

                  if (!selectedEvent || selectedEvent.name !== "Codebusters") {
                    SyncLocalStorage.setItem("defaultQuestionTypes", "both");
                  }
                }}
                disabled={isCodebusters}
                className={`px-3 py-2 text-sm font-medium border-t border-b border-l border-r ${
                  isCodebusters
                    ? `opacity-50 cursor-not-allowed ${darkMode ? "border-gray-600 text-gray-500" : "border-gray-300 text-gray-400"}`
                    : settings.types === "both"
                      ? darkMode
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-green-500 bg-green-500 text-white"
                      : darkMode
                        ? "border-gray-600 text-gray-300 hover:border-green-500 hover:text-green-400"
                        : "border-gray-300 text-gray-700 hover:border-green-500 hover:text-green-600"
                }`}
              >
                MCQ + FRQ
              </button>
              <button
                type="button"
                onClick={() => {
                  onSettingsChange({ ...settings, types: "free-response" });

                  if (!selectedEvent || selectedEvent.name !== "Codebusters") {
                    SyncLocalStorage.setItem("defaultQuestionTypes", "free-response");
                  }
                }}
                disabled={isCodebusters}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-r-md border ${
                  isCodebusters
                    ? settings.types === "free-response" || settings.types === "frq-only"
                      ? darkMode
                        ? "border-blue-500 bg-blue-500 text-white"
                        : "border-blue-500 bg-blue-500 text-white"
                      : `opacity-50 cursor-not-allowed ${
                          darkMode
                            ? "border-gray-600 text-gray-500"
                            : "border-gray-300 text-gray-400"
                        }`
                    : settings.types === "free-response"
                      ? darkMode
                        ? "border-blue-500 bg-blue-500 text-white"
                        : "border-blue-500 bg-blue-500 text-white"
                      : darkMode
                        ? "border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-400"
                        : "border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600"
                }`}
              >
                FRQ only
              </button>
            </div>
          </div>

          {/* Identification slider for events with image ID */}
          {supportsPictureQuestions && (
            <div>
              <label
                htmlFor="idPercentage"
                className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
              >
                Picture Questions
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  id="idPercentage"
                  min={0}
                  max={
                    Number.isNaN(settings.questionCount) ? 1 : Math.max(1, settings.questionCount)
                  }
                  step={1}
                  value={(() => {
                    const questionCount = Number.isNaN(settings.questionCount)
                      ? 1
                      : Math.max(1, settings.questionCount);
                    return Math.round(((settings.idPercentage ?? 0) * questionCount) / 100);
                  })()}
                  onChange={(e) => {
                    const questionCount = Number.isNaN(settings.questionCount)
                      ? 1
                      : Math.max(1, settings.questionCount);
                    const pictureQuestions = Number.parseInt(e.target.value);
                    const percentage = Math.round((pictureQuestions / questionCount) * 100);
                    onSettingsChange({ ...settings, idPercentage: percentage });

                    if (typeof window !== "undefined") {
                      SyncLocalStorage.setItem("defaultIdPercentage", percentage.toString());
                    }
                  }}
                  className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${
                    darkMode ? "bg-gray-600 slider-thumb-dark" : "bg-gray-200 slider-thumb-light"
                  }`}
                  style={{
                    background: `linear-gradient(to right, ${
                      darkMode ? "#3b82f6" : "#2563eb"
                    } 0%, ${darkMode ? "#3b82f6" : "#2563eb"} ${(() => {
                      const questionCount = Number.isNaN(settings.questionCount)
                        ? 1
                        : Math.max(1, settings.questionCount);
                      return (
                        (Math.round(((settings.idPercentage ?? 0) * questionCount) / 100) /
                          questionCount) *
                        100
                      );
                    })()}%, ${darkMode ? "#4b5563" : "#e5e7eb"} ${(() => {
                      const questionCount = Number.isNaN(settings.questionCount)
                        ? 1
                        : Math.max(1, settings.questionCount);
                      return (
                        (Math.round(((settings.idPercentage ?? 0) * questionCount) / 100) /
                          questionCount) *
                        100
                      );
                    })()}%, ${darkMode ? "#4b5563" : "#e5e7eb"} 100%)`,
                  }}
                />
                <span
                  className={`text-sm font-medium min-w-[3rem] text-center ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                >
                  {(() => {
                    const questionCount = Number.isNaN(settings.questionCount)
                      ? 1
                      : Math.max(1, settings.questionCount);
                    return `${Math.round(((settings.idPercentage ?? 0) * questionCount) / 100)}/${questionCount}`;
                  })()}
                </span>
              </div>

              {/* Identification Only checkbox */}
              {supportsIdentificationOnly && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pureIdOnly"
                    checked={settings.pureIdOnly}
                    onChange={(e) => {
                      onSettingsChange({ ...settings, pureIdOnly: e.target.checked });
                      if (typeof window !== "undefined") {
                        SyncLocalStorage.setItem(
                          "defaultPureIdOnly",
                          e.target.checked ? "true" : "false"
                        );
                      }
                    }}
                    className={`w-4 h-4 rounded border ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                        : "bg-gray-50 border-gray-300 text-blue-600 focus:ring-blue-600"
                    } focus:ring-2 focus:ring-offset-0 cursor-pointer`}
                  />
                  <label
                    htmlFor="pureIdOnly"
                    className={`text-sm cursor-pointer ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Identification Only
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Character Length Range - Only for Codebusters */}
          {selectedEvent?.name === "Codebusters" && (
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
              >
                Quote Character Length Range
              </label>
              <QuoteLengthSlider
                min={1}
                max={200}
                value={[settings.charLengthMin || 1, settings.charLengthMax || 100]}
                onValueChange={([min, max]) => {
                  const newSettings = { ...settings, charLengthMin: min, charLengthMax: max };
                  onSettingsChange(newSettings);

                  if (typeof window !== "undefined") {
                    SyncLocalStorage.setItem("codebustersCharLengthMin", min.toString());
                    SyncLocalStorage.setItem("codebustersCharLengthMax", max.toString());
                  }
                }}
              />
            </div>
          )}

          <DivisionToggle
            darkMode={!!darkMode}
            selectedEvent={selectedEvent}
            settings={settings}
            onSettingsChange={onSettingsChange}
            forceBothDivision={forceBothDivision}
          />

          {/* Difficulty and Subtopic on same line */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Difficulty
              </label>
              <DifficultyDropdown
                darkMode={!!darkMode}
                isCodebusters={!!isCodebusters}
                settings={settings}
                isOpen={isDifficultyDropdownOpen}
                onToggleOpen={() => setIsDifficultyDropdownOpen(!isDifficultyDropdownOpen)}
                onToggleDifficulty={handleDifficultyChange}
                displayText={getDifficultyDisplayText()}
                dropdownRef={difficultyDropdownRef}
              />
            </div>

            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {isCodebusters ? "Cipher Types" : "Subtopics"}
              </label>
              <SubtopicDropdown
                darkMode={!!darkMode}
                isCodebusters={!!isCodebusters}
                selectedEvent={selectedEvent}
                settings={settings}
                isOpen={isSubtopicDropdownOpen}
                onToggleOpen={() => setIsSubtopicDropdownOpen(!isSubtopicDropdownOpen)}
                onToggleSubtopic={handleSubtopicChange}
                displayText={getSubtopicDisplayText()}
                dropdownRef={subtopicDropdownRef}
              />
            </div>
          </div>

          <TestActions
            darkMode={!!darkMode}
            selectedEvent={selectedEvent}
            generateLabel={generateLabel}
            hideUnlimited={hideUnlimited}
            onGenerateTest={onGenerateTest}
            onUnlimited={onUnlimited}
          />
        </div>
      </div>

      {/* Modern Slider Styles */}
      <style jsx={true}>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: ${darkMode ? "#3b82f6" : "#2563eb"};
          cursor: pointer;
          border: 2px solid ${darkMode ? "#1f2937" : "#ffffff"};
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }

        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }

        input[type="range"]::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: ${darkMode ? "#3b82f6" : "#2563eb"};
          cursor: pointer;
          border: 2px solid ${darkMode ? "#1f2937" : "#ffffff"};
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }

        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }

        input[type="range"]::-ms-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: ${darkMode ? "#3b82f6" : "#2563eb"};
          cursor: pointer;
          border: 2px solid ${darkMode ? "#1f2937" : "#ffffff"};
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }

        input[type="range"]::-ms-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }

        input[type="range"]::-webkit-slider-track {
          background: transparent;
          border: none;
        }

        input[type="range"]::-moz-range-track {
          background: transparent;
          border: none;
        }

        input[type="range"]::-ms-track {
          background: transparent;
          border: none;
        }
      `}</style>
    </div>
  );
}
