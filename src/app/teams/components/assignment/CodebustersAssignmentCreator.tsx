"use client";

import { type ReactElement, useEffect, useState } from "react";
import { toast } from "react-toastify";
import type {
  AssignmentCreatorProps,
  AssignmentDetails,
  QuestionGenerationSettings,
  RosterMember,
} from "./assignmentTypes";
import { createAssignment, fetchRosterMembers } from "./assignmentUtils";

import { DISABLED_CIPHERS } from "@/app/codebusters/config";
import type { QuoteData } from "@/app/codebusters/types";

// Cipher types organized by division (same as practice page)
const DIVISION_B_ONLY_CIPHERS: QuoteData["cipherType"][] = ["Affine", "Atbash", "Caesar"];

const DIVISION_C_ONLY_CIPHERS: QuoteData["cipherType"][] = [
  "Hill 2x2",
  "Hill 3x3",
  "K3 Aristocrat",
];

const BOTH_DIVISIONS_CIPHERS: QuoteData["cipherType"][] = [
  "Baconian",
  "Checkerboard",
  "Complete Columnar",
  "Cryptarithm",
  "Fractionated Morse",
  "K1 Aristocrat",
  "K2 Aristocrat",
  "Random Aristocrat",
  "K1 Patristocrat",
  "K2 Patristocrat",
  "K1 Xenocrypt",
  "K2 Xenocrypt",
  "Nihilist",
  "Porta",
];

// Filter out disabled ciphers
const getAvailableCiphers = (division: string): QuoteData["cipherType"][] => {
  let allCiphers: QuoteData["cipherType"][] = [];

  if (division === "B") {
    allCiphers = [...DIVISION_B_ONLY_CIPHERS, ...BOTH_DIVISIONS_CIPHERS];
  } else if (division === "C") {
    allCiphers = [...DIVISION_C_ONLY_CIPHERS, ...BOTH_DIVISIONS_CIPHERS];
  } else {
    // 'any' or default - include all
    allCiphers = [
      ...DIVISION_B_ONLY_CIPHERS,
      ...DIVISION_C_ONLY_CIPHERS,
      ...BOTH_DIVISIONS_CIPHERS,
    ];
  }

  return allCiphers.filter((cipher) => !DISABLED_CIPHERS.includes(cipher));
};

interface CodebustersAssignmentCreatorProps extends AssignmentCreatorProps {
  darkMode?: boolean;
}

export default function CodebustersAssignmentCreator({
  teamId,
  subteamId,
  onAssignmentCreated,
  onCancel,
  darkMode = false,
  prefillEventName = "Codebusters",
}: CodebustersAssignmentCreatorProps) {
  const [step, setStep] = useState(1);
  const [_error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Assignment details
  const [details, setDetails] = useState<AssignmentDetails>({
    title: "",
    description: "",
    assignmentType: "homework",
    dueDate: "",
    timeLimitMinutes: 15,
    eventName: prefillEventName,
  });

  // Codebusters-specific settings
  const [settings, setSettings] = useState<QuestionGenerationSettings>({
    questionCount: 3,
    questionType: "frq",
    selectedSubtopics: [],
    idPercentage: 0,
    pureIdOnly: false,
    difficulties: ["any"], // Default to any difficulty
    cipherTypes: ["all"], // Default to "all"
    division: "any",
    charLengthMin: 50,
    charLengthMax: 200,
  });

  // Roster data
  const [rosterMembers, setRosterMembers] = useState<RosterMember[]>([]);
  const [selectedRoster, setSelectedRoster] = useState<string[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // Dropdown state
  const [cipherDropdownOpen, setCipherDropdownOpen] = useState(false);

  // Helper functions for member rendering
  const getMemberTextColor = (member: RosterMember): string => {
    return member.isLinked
      ? darkMode
        ? "text-white"
        : "text-gray-900"
      : darkMode
        ? "text-gray-400"
        : "text-gray-500";
  };

  const renderMemberInfo = (member: RosterMember): ReactElement | null => {
    if (member.userEmail || member.username) {
      return (
        <div className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          {member.userEmail && <div>{member.userEmail}</div>}
          {member.username && <div>@{member.username}</div>}
        </div>
      );
    }
    return null;
  };

  // Available events

  // Load roster members when component mounts
  useEffect(() => {
    const loadRosterMembers = async () => {
      setLoadingRoster(true);
      try {
        const members = await fetchRosterMembers(teamId, subteamId);
        setRosterMembers(members);
      } catch (_error) {
        setError("Failed to load roster members");
      } finally {
        setLoadingRoster(false);
      }
    };

    loadRosterMembers();
  }, [teamId, subteamId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cipherDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest(".cipher-dropdown")) {
          setCipherDropdownOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [cipherDropdownOpen]);

  const handleDetailsChange = (newDetails: Partial<AssignmentDetails>) => {
    setDetails((prev) => ({ ...prev, ...newDetails }));
  };

  const handleSettingsChange = (newSettings: Partial<QuestionGenerationSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Special handler for division changes that also updates cipher types
  const handleDivisionChange = (division: "B" | "C" | "any") => {
    setSettings((prev) => ({
      ...prev,
      division,
      cipherTypes: ["all"], // Reset to "all" when division changes
    }));
  };

  const handleCreateAssignment = async () => {
    // Validate all requirements for assignment creation
    const validationError = validateAssignmentCreation();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const assignment = await createAssignment(teamId, subteamId, {
        title: details.title,
        description: details.description,
        assignment_type: details.assignmentType,
        due_date: details.dueDate,
        time_limit_minutes: details.timeLimitMinutes,
        event_name: details.eventName,
        questions: [], // Empty array - questions will be generated dynamically
        roster_members: selectedRoster,
        // Include Codebusters-specific parameters for dynamic generation
        codebusters_params: {
          questionCount: settings.questionCount,
          cipherTypes: settings.cipherTypes?.includes("all")
            ? getAvailableCiphers(settings.division || "any")
            : settings.cipherTypes || [],
          division: settings.division || "any",
          charLengthMin: settings.charLengthMin || 50,
          charLengthMax: settings.charLengthMax || 200,
        },
      });

      toast.success("Codebusters assignment created successfully!");
      onAssignmentCreated(assignment);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create assignment");
    } finally {
      setLoading(false);
    }
  };

  const validateDetails = (): string | null => {
    if (!details.title.trim()) {
      return "Title is required";
    }
    if (!details.eventName) {
      return "Event is required";
    }
    return null;
  };

  const validateSettings = (): string | null => {
    if (settings.questionCount <= 0 || settings.questionCount > 10) {
      return "Question count must be between 1 and 10";
    }
    if (details.timeLimitMinutes <= 0) {
      return "Time limit must be greater than 0";
    }
    if (!settings.cipherTypes || settings.cipherTypes.length === 0) {
      return "At least one cipher type must be selected";
    }
    return null;
  };

  const validateRoster = (): string | null => {
    if (selectedRoster.length === 0) {
      return "At least one person must be selected";
    }
    return null;
  };

  const validateAssignmentCreation = (): string | null => {
    const detailsError = validateDetails();
    if (detailsError) {
      return detailsError;
    }

    const settingsError = validateSettings();
    if (settingsError) {
      return settingsError;
    }

    const rosterError = validateRoster();
    if (rosterError) {
      return rosterError;
    }

    return null;
  };

  const handleNext = () => {
    const error = validateDetails();
    if (error) {
      setError(error);
      return;
    }
    setError(null);
    setStep((prev) => prev + 1);
  };

  // Helper functions to reduce cognitive complexity
  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
        Assignment Details
      </h2>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="assignment-title"
            className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
          >
            Title *
          </label>
          <input
            id="assignment-title"
            type="text"
            value={details.title}
            onChange={(e) => handleDetailsChange({ title: e.target.value })}
            className={`mt-1 block w-full rounded-md border px-3 py-2 ${
              darkMode
                ? "border-gray-600 bg-gray-700 text-white"
                : "border-gray-300 bg-white text-gray-900"
            }`}
            placeholder="Enter assignment title"
          />
        </div>

        <div>
          <label
            htmlFor="assignment-description"
            className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
          >
            Description
          </label>
          <textarea
            id="assignment-description"
            value={details.description}
            onChange={(e) => handleDetailsChange({ description: e.target.value })}
            rows={3}
            className={`mt-1 block w-full rounded-md border px-3 py-2 ${
              darkMode
                ? "border-gray-600 bg-gray-700 text-white"
                : "border-gray-300 bg-white text-gray-900"
            }`}
            placeholder="Enter assignment description"
          />
        </div>

        <div>
          <label
            htmlFor="assignment-due-date"
            className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
          >
            Due Date
          </label>
          <input
            id="assignment-due-date"
            type="datetime-local"
            value={details.dueDate}
            onChange={(e) => handleDetailsChange({ dueDate: e.target.value })}
            className={`mt-1 block w-full rounded-md border px-3 py-2 ${
              darkMode
                ? "border-gray-600 bg-gray-700 text-white"
                : "border-gray-300 bg-white text-gray-900"
            }`}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleNext}
          disabled={!details.title.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Next: Configure Settings
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
        Codebusters Configuration
      </h2>

      <div className="space-y-4">
        {renderFormInputs()}
        {renderDivisionSelect()}
        {renderCipherDropdown()}
        {renderCharacterLimits()}
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`px-4 py-2 border rounded-lg ${
            darkMode
              ? "border-gray-600 text-gray-300 hover:bg-gray-800"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleCreateAssignment}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Assignment"}
        </button>
      </div>
    </div>
  );

  const renderFormInputs = () => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label
          htmlFor="num-questions"
          className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
        >
          Number of Questions *
        </label>
        <input
          id="num-questions"
          type="number"
          value={details.timeLimitMinutes}
          onChange={(e) =>
            handleDetailsChange({
              timeLimitMinutes: Number.parseInt(e.target.value) || 0,
            })
          }
          min="1"
          max="50"
          className={`mt-1 block w-full rounded-md border px-3 py-2 ${
            darkMode
              ? "border-gray-600 bg-gray-700 text-white"
              : "border-gray-300 bg-white text-gray-900"
          }`}
        />
      </div>

      <div>
        <label
          htmlFor="time-limit"
          className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
        >
          Time Limit (minutes) *
        </label>
        <input
          id="time-limit"
          type="number"
          value={details.timeLimitMinutes}
          onChange={(e) =>
            handleDetailsChange({
              timeLimitMinutes: Number.parseInt(e.target.value) || 0,
            })
          }
          min="1"
          className={`mt-1 block w-full rounded-md border px-3 py-2 ${
            darkMode
              ? "border-gray-600 bg-gray-700 text-white"
              : "border-gray-300 bg-white text-gray-900"
          }`}
        />
      </div>
    </div>
  );

  const renderDivisionSelect = () => (
    <div>
      <label
        htmlFor="division-select"
        className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
      >
        Division
      </label>
      <select
        id="division-select"
        value={settings.division}
        onChange={(e) => handleDivisionChange(e.target.value as "B" | "C" | "any")}
        className={`mt-1 block w-full rounded-md border px-3 py-2 ${
          darkMode
            ? "border-gray-600 bg-gray-700 text-white"
            : "border-gray-300 bg-white text-gray-900"
        }`}
      >
        <option value="any">Any Division</option>
        <option value="B">Division B</option>
        <option value="C">Division C</option>
      </select>
    </div>
  );

  const renderCipherDropdown = () => (
    <div>
      <label
        htmlFor="cipher-types-button"
        className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
      >
        Cipher Types *
      </label>
      <div className="mt-1 relative cipher-dropdown">
        <button
          id="cipher-types-button"
          type="button"
          onClick={() => setCipherDropdownOpen(!cipherDropdownOpen)}
          className={`relative w-full rounded-md border px-3 py-2 text-left cursor-pointer ${
            darkMode
              ? "border-gray-600 bg-gray-700 text-white"
              : "border-gray-300 bg-white text-gray-900"
          }`}
        >
          <span className="block truncate">
            {settings.cipherTypes?.includes("all")
              ? "All Available Ciphers"
              : settings.cipherTypes && settings.cipherTypes.length > 0
                ? `${settings.cipherTypes.length} ciphers selected`
                : "Select cipher types"}
          </span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              role="img"
              aria-label="Dropdown arrow"
            >
              <title>Dropdown arrow</title>
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </button>
        {/* Dropdown content would go here */}
      </div>
    </div>
  );

  const renderCharacterLimits = () => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label
          htmlFor="min-char-length"
          className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
        >
          Min Character Length
        </label>
        <input
          id="min-char-length"
          type="number"
          value={settings.charLengthMin || 50}
          onChange={(e) =>
            handleSettingsChange({ charLengthMin: Number.parseInt(e.target.value) || 50 })
          }
          className={`mt-1 block w-full rounded-md border px-3 py-2 ${
            darkMode
              ? "border-gray-600 bg-gray-700 text-white"
              : "border-gray-300 bg-white text-gray-900"
          }`}
        />
      </div>

      <div>
        <label
          htmlFor="max-char-length"
          className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
        >
          Max Character Length
        </label>
        <input
          id="max-char-length"
          type="number"
          value={settings.charLengthMax || 200}
          onChange={(e) =>
            handleSettingsChange({
              charLengthMax: Number.parseInt(e.target.value) || 200,
            })
          }
          className={`mt-1 block w-full rounded-md border px-3 py-2 ${
            darkMode
              ? "border-gray-600 bg-gray-700 text-white"
              : "border-gray-300 bg-white text-gray-900"
          }`}
        />
      </div>
    </div>
  );

  const renderStep3 = () => {
    if (loadingRoster) {
      return (
        <div className="text-center py-8">
          <div className={`text-lg font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            Loading roster members...
          </div>
        </div>
      );
    }

    if (rosterMembers.length === 0) {
      return (
        <div className="text-center py-8">
          <div className={`text-lg font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            No roster members found
          </div>
          <div className={`text-sm mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Make sure team members are properly linked to their accounts.
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
          {rosterMembers.map((member) => (
            <button
              key={member.student_name}
              type="button"
              className={`p-3 border rounded-lg transition-colors text-left w-full ${
                selectedRoster.includes(member.student_name)
                  ? darkMode
                    ? "border-blue-400 bg-blue-900/20"
                    : "border-blue-500 bg-blue-50"
                  : darkMode
                    ? "border-gray-600 bg-gray-700 hover:bg-gray-600"
                    : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
              onClick={() => {
                if (selectedRoster.includes(member.student_name)) {
                  setSelectedRoster((prev) => prev.filter((name) => name !== member.student_name));
                } else {
                  setSelectedRoster((prev) => [...prev, member.student_name]);
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedRoster.includes(member.student_name)}
                    onChange={() => {
                      // Handled by parent button click
                    }}
                    className={`rounded ${darkMode ? "accent-blue-400" : "accent-blue-600"}`}
                  />
                  <span className={`font-medium ${getMemberTextColor(member)}`}>
                    {member.student_name}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <div
                    className={`w-2 h-2 rounded-full ${member.isLinked ? "bg-green-500" : "bg-red-500"}`}
                  />
                  <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {member.isLinked ? "Linked" : "Unlinked"}
                  </span>
                </div>
              </div>
              {renderMemberInfo(member)}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={onCancel}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onCancel();
        }
      }}
      tabIndex={-1}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: This div prevents event propagation and is not keyboard interactive */}
      <div
        className={`max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-lg ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
            Create Codebusters Assignment
          </h1>
          <button
            type="button"
            onClick={onCancel}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
              darkMode ? "text-gray-400 hover:text-white" : ""
            }`}
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              role="img"
              aria-label="Close"
            >
              <title>Close</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6">{renderStep()}</div>
      </div>
    </div>
  );
}
