"use client";
import SyncLocalStorage from "@/lib/database/localStorage-replacement";
import logger from "@/lib/utils/logger";

import Header from "@/app/components/Header";
import { useTheme } from "@/app/contexts/ThemeContext";
import { hasOfflineEvent } from "@/app/utils/storage";
import { EVENTS_2026 } from "@/lib/constants/events2026";
import { ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
//
import type { Event, Settings } from "@/app/practice/types";
import { NORMAL_DEFAULTS, savePreferences } from "@/app/practice/utils";
//
import EventList from "./EventList";
import TestConfiguration from "./TestConfiguration";
import { useOfflineDownloads } from "./hooks/useOfflineDownloads";
import { computeContinueInfo } from "./utils/continueBanner";
import {
  proceedWithTest as proceedWithTestNav,
  proceedWithUnlimited as proceedWithUnlimitedNav,
} from "./utils/navigate";

export default function PracticeDashboard() {
  const router = useRouter();
  const { darkMode } = useTheme();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState("alphabetical");
  const [continueInfo, setContinueInfo] = useState<{
    eventName: string;
    route: "/test" | "/codebusters";
    label: string;
  } | null>(null);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  const [isLarge, setIsLarge] = useState<boolean>(false);
  const { isOffline, downloadedSet } = useOfflineDownloads();
  const [viewMode, setViewMode] = useState<"current" | "all">("current");

  const [settings, setSettings] = useState<Settings>({
    questionCount: NORMAL_DEFAULTS.questionCount,
    timeLimit: NORMAL_DEFAULTS.timeLimit,
    difficulties: [],
    types: "multiple-choice",
    division: "any",
    tournament: "",
    subtopics: [],
    idPercentage: 0,
    pureIdOnly: false,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedQuestionCount = SyncLocalStorage.getItem("defaultQuestionCount");
      const storedTimeLimit = SyncLocalStorage.getItem("defaultTimeLimit");
      const storedDivision = SyncLocalStorage.getItem("defaultDivision") || "any";
      const storedQuestionTypes =
        SyncLocalStorage.getItem("defaultQuestionTypes") || "multiple-choice";
      const storedIdPercentage = SyncLocalStorage.getItem("defaultIdPercentage");
      const storedPureIdOnly = SyncLocalStorage.getItem("defaultPureIdOnly");
      const storedCharLengthMin = SyncLocalStorage.getItem("codebustersCharLengthMin");
      const storedCharLengthMax = SyncLocalStorage.getItem("codebustersCharLengthMax");

      const questionCount = storedQuestionCount
        ? Number.parseInt(storedQuestionCount)
        : NORMAL_DEFAULTS.questionCount;
      const timeLimit = storedTimeLimit
        ? Number.parseInt(storedTimeLimit)
        : NORMAL_DEFAULTS.timeLimit;
      const idPercentage = storedIdPercentage ? Number.parseInt(storedIdPercentage) : 0;
      const pureIdOnly = storedPureIdOnly === "true";
      const charLengthMin = storedCharLengthMin ? Number.parseInt(storedCharLengthMin) : 1;
      const charLengthMax = storedCharLengthMax ? Number.parseInt(storedCharLengthMax) : 100;

      setSettings((prev: Settings) => ({
        ...prev,
        questionCount: Number.isNaN(questionCount) ? NORMAL_DEFAULTS.questionCount : questionCount,
        timeLimit: Number.isNaN(timeLimit) ? NORMAL_DEFAULTS.timeLimit : timeLimit,
        division:
          storedDivision === "B" || storedDivision === "C" || storedDivision === "any"
            ? storedDivision
            : "any",
        types:
          storedQuestionTypes === "multiple-choice" ||
          storedQuestionTypes === "both" ||
          storedQuestionTypes === "free-response"
            ? storedQuestionTypes
            : "multiple-choice",
        idPercentage: Number.isNaN(idPercentage) ? 0 : idPercentage,
        pureIdOnly: pureIdOnly,
        charLengthMin: Number.isNaN(charLengthMin) ? 1 : charLengthMin,
        charLengthMax: Number.isNaN(charLengthMax) ? 100 : charLengthMax,
      }));
    }
  }, []);

  // offline/downloads handled by useOfflineDownloads

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsLarge(mq.matches);
    try {
      mq.addEventListener("change", apply);
    } catch {
      mq.addListener(apply);
    }
    apply();
    return () => {
      try {
        mq.removeEventListener("change", apply);
      } catch {
        mq.removeListener(apply);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const target = document.querySelector("[data-test-config]") as HTMLElement | null;
    if (!target) {
      return;
    }
    const update = () => {
      try {
        const rect = target.getBoundingClientRect();
        if (rect && rect.height > 0) {
          setPanelHeight(rect.height);
        }
      } catch {}
    };
    update();
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => update());
      ro.observe(target);
    } catch {
      window.addEventListener("resize", update);
    }
    return () => {
      if (ro) {
        try {
          ro.disconnect();
        } catch {}
      } else {
        window.removeEventListener("resize", update);
      }
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const target = document.querySelector("[data-test-config]") as HTMLElement | null;
      if (target) {
        const rect = target.getBoundingClientRect();
        if (rect && rect.height > 0) {
          setPanelHeight(rect.height);
        }
      }
    }, 0);
    return () => clearTimeout(t);
  }, [darkMode, selectedEvent]);

  useEffect(() => {
    setContinueInfo(computeContinueInfo());
  }, []);

  // const handlechange = (e: react.changeevent<htmlinputelement | htmlselectelement>) => {
  //   const { id, value } = e.target;
  //   setsettings(prev => ({
  //     ...prev,
  //     [id]: id === 'questioncount' || id === 'timelimit' ? parseint(value) : value
  //   }));
  // };

  const handleGenerateTest = () => {
    if (!selectedEvent) {
      toast.error("Please select an event first");
      return;
    }

    const selectedEventObj = events.find((event) => event.id === selectedEvent);
    if (!selectedEventObj) {
      toast.error("Selected event not found");
      return;
    }

    if (isOffline) {
      const slug = selectedEventObj.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      (async () => {
        const hasDownloaded = await hasOfflineEvent(slug);
        if (!hasDownloaded) {
          toast.error(
            "This event is not downloaded for offline use. Go to Offline page to download it."
          );
          return;
        }

        proceedWithTest(selectedEventObj);
      })();
      return;
    }

    proceedWithTest(selectedEventObj);
  };

  const proceedWithTest = (selectedEventObj: Event) => {
    proceedWithTestNav(selectedEventObj.name, settings, router.push);
  };

  const handleUnlimited = () => {
    if (!selectedEvent) {
      toast.error("Please select an event first");
      return;
    }

    const selectedEventObj = events.find((event) => event.id === selectedEvent);
    if (!selectedEventObj) {
      toast.error("Selected event not found");
      return;
    }

    if (isOffline) {
      const slug = selectedEventObj.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      (async () => {
        const hasDownloaded = await hasOfflineEvent(slug);
        if (!hasDownloaded) {
          toast.error(
            "This event is not downloaded for offline use. Go to Offline page to download it."
          );
          return;
        }

        proceedWithUnlimited(selectedEventObj);
      })();
      return;
    }

    proceedWithUnlimited(selectedEventObj);
  };

  const proceedWithUnlimited = (selectedEventObj: Event) => {
    savePreferences(selectedEventObj.name, settings.questionCount, settings.timeLimit);
    proceedWithUnlimitedNav(selectedEventObj.name, settings, router.push);
  };

  const selectEvent = (id: number) => {
    setSelectedEvent(id);
    const selectedEventObj = events.find((event) => event.id === id);

    if (selectedEventObj) {
      if (selectedEventObj.name === "Codebusters") {
        if (typeof window !== "undefined") {
          const codebustersQuestionCount = SyncLocalStorage.getItem("codebustersQuestionCount");
          const codebustersTimeLimit = SyncLocalStorage.getItem("codebustersTimeLimit");

          const questionCount = codebustersQuestionCount
            ? Number.parseInt(codebustersQuestionCount)
            : 3;
          const timeLimit = codebustersTimeLimit ? Number.parseInt(codebustersTimeLimit) : 15;

          if (!codebustersQuestionCount) {
            SyncLocalStorage.setItem("codebustersQuestionCount", "3");
          }
          if (!codebustersTimeLimit) {
            SyncLocalStorage.setItem("codebustersTimeLimit", "15");
          }

          const savedDivision = (() => {
            const stored = SyncLocalStorage.getItem("defaultDivision");
            return stored === "B" || stored === "C" || stored === "any" ? stored : "any";
          })();
          const availableDivisions = selectedEventObj.divisions || ["B", "C"];
          const canShowB = availableDivisions.includes("B");
          const canShowC = availableDivisions.includes("C");
          const divisionForEvent = (() => {
            if (savedDivision === "any") {
              return canShowB && canShowC ? "any" : canShowC ? "C" : "B";
            }
            if (savedDivision === "B" && !canShowB) {
              return "C";
            }
            if (savedDivision === "C" && !canShowC) {
              return "B";
            }
            return savedDivision;
          })();

          setSettings((prev: Settings) => ({
            ...prev,
            questionCount: Number.isNaN(questionCount) ? 3 : questionCount,
            timeLimit: Number.isNaN(timeLimit) ? 15 : timeLimit,
            difficulties: [],
            types: "free-response",
            division: divisionForEvent,
            subtopics: [],
          }));
        } else {
          const availableDivisions = selectedEventObj.divisions || ["B", "C"];
          const canShowB = availableDivisions.includes("B");
          const canShowC = availableDivisions.includes("C");
          const divisionForEvent = canShowB && canShowC ? "any" : canShowC ? "C" : "B";
          setSettings((prev: Settings) => ({
            ...prev,
            questionCount: 3,
            timeLimit: 15,
            difficulties: [],
            types: "free-response",
            division: divisionForEvent,
            subtopics: [],
          }));
        }
      } else {
        const defaultQuestionCount = (() => {
          if (typeof window === "undefined") {
            return NORMAL_DEFAULTS.questionCount;
          }
          const stored = SyncLocalStorage.getItem("defaultQuestionCount");
          const parsed = stored ? Number.parseInt(stored) : NORMAL_DEFAULTS.questionCount;
          return Number.isNaN(parsed) ? NORMAL_DEFAULTS.questionCount : parsed;
        })();
        const defaultTimeLimit = (() => {
          if (typeof window === "undefined") {
            return NORMAL_DEFAULTS.timeLimit;
          }
          const stored = SyncLocalStorage.getItem("defaultTimeLimit");
          const parsed = stored ? Number.parseInt(stored) : NORMAL_DEFAULTS.timeLimit;
          return Number.isNaN(parsed) ? NORMAL_DEFAULTS.timeLimit : parsed;
        })();
        const savedDivision = (() => {
          if (typeof window === "undefined") {
            return "any";
          }
          const stored = SyncLocalStorage.getItem("defaultDivision");
          return stored === "B" || stored === "C" || stored === "any" ? stored : "any";
        })();
        const savedTypes = (() => {
          if (typeof window === "undefined") {
            return "multiple-choice";
          }
          const stored = SyncLocalStorage.getItem("defaultQuestionTypes");
          return stored === "multiple-choice" || stored === "both" || stored === "free-response"
            ? stored
            : "multiple-choice";
        })();
        // Check if this event supports picture questions
        const supportsPictureQuestions = (() => {
          const name = selectedEventObj.name || "";
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

        // Check if this event supports identification-only questions
        const supportsIdentificationOnly = (() => {
          const name = selectedEventObj.name || "";
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

        const savedIdPercentage = (() => {
          if (typeof window === "undefined") {
            return 0;
          }
          const stored = SyncLocalStorage.getItem("defaultIdPercentage");
          const parsed = stored ? Number.parseInt(stored) : 0;
          // Only use the cached value if this event supports picture questions
          return supportsPictureQuestions && !Number.isNaN(parsed) ? parsed : 0;
        })();

        const savedPureIdOnly = (() => {
          if (typeof window === "undefined") {
            return false;
          }
          const stored = SyncLocalStorage.getItem("defaultPureIdOnly");
          // Only use the cached value if this event supports pure ID
          return supportsIdentificationOnly && stored === "true";
        })();

        const availableDivisions = selectedEventObj.divisions || ["B", "C"];
        const canShowB = availableDivisions.includes("B");
        const canShowC = availableDivisions.includes("C");
        const divisionForEvent = (() => {
          if (savedDivision === "any") {
            return canShowB && canShowC ? "any" : canShowC ? "C" : "B";
          }
          if (savedDivision === "B" && !canShowB) {
            return "C";
          }
          if (savedDivision === "C" && !canShowC) {
            return "B";
          }
          return savedDivision;
        })();

        setSettings((prev: Settings) => ({
          ...prev,
          questionCount: defaultQuestionCount,
          timeLimit: defaultTimeLimit,
          difficulties: [],
          types: savedTypes,
          division: divisionForEvent as Settings["division"],
          subtopics: [],
          idPercentage: savedIdPercentage,
          pureIdOnly: savedPureIdOnly,
        }));
      }
    }
  };

  useEffect(() => {
    const loadCurrentEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        const approvedEvents = EVENTS_2026;

        const eventsWithIds: Event[] = approvedEvents.map((event, index) => ({
          id: index + 1,
          ...event,
        }));

        setEvents(eventsWithIds);

        // Load subtopics from JSON file
        try {
          const subtopicsRes = await fetch("/subtopics.json");
          if (subtopicsRes.ok) {
            const eventSubtopics = await subtopicsRes.json();
            window.eventSubtopicsMapping = eventSubtopics;
          } else {
            // Fallback to empty object if fetch fails
            window.eventSubtopicsMapping = {};
          }
        } catch (err) {
          logger.error("Error loading subtopics:", err);
          // Fallback to empty object if fetch fails
          window.eventSubtopicsMapping = {};
        }
      } catch (err) {
        logger.error("Error fetching data:", err);
        setError("Failed to load events. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    const loadAllEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsRes, subtopicsRes] = await Promise.all([
          fetch("/api/meta/stats"),
          fetch("/subtopics.json"),
        ]);

        if (!statsRes.ok) {
          throw new Error("Failed to fetch stats");
        }
        const statsJson = await statsRes.json();
        const byEvent: Array<{ event: string; count: string }> = statsJson?.data?.byEvent || [];

        const filtered = byEvent.filter((e) => Number.parseInt(e.count || "0", 10) > 100);

        const mapped: Event[] = filtered.map((row, index) => ({
          id: index + 1,
          name: row.event,
          subject: "General",
          divisions: ["B", "C"],
        }));

        setEvents(mapped);
        setSelectedEvent(null);

        if (subtopicsRes.ok) {
          try {
            const subtopicsJson = await subtopicsRes.json();
            window.eventSubtopicsMapping = subtopicsJson as Record<string, string[]>;
          } catch {}
        }
      } catch (err) {
        logger.error("Error loading all events:", err);
        setError("Failed to load events. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (viewMode === "current") {
      loadCurrentEvents();
    } else {
      loadAllEvents();
    }
  }, [viewMode]);

  const selectedEventObj = selectedEvent
    ? events.find((event) => event.id === selectedEvent)
    : null;

  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div className={`fixed inset-0 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`} />

      <Header />

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20">
        <div className="mb-8 mt-8">
          <div className="flex items-center justify-between">
            <h2 className={`text-3xl font-bold  ${darkMode ? "text-white" : "text-gray-900"}`}>
              Practice
            </h2>
            {/* Mobile down arrow */}
            <button
              onClick={() => {
                const testConfigSection = document.querySelector("[data-test-config]");
                if (testConfigSection) {
                  testConfigSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }
              }}
              className="lg:hidden p-2 rounded-full"
              aria-label="Scroll to test configuration"
            >
              <svg
                className={`w-6 h-6 ${darkMode ? "text-gray-300" : "text-gray-600"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </button>
          </div>
          {continueInfo && (
            <button
              type="button"
              onClick={() => router.push(continueInfo.route)}
              className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm group transition-colors ${
                darkMode
                  ? "bg-transparent border-yellow-500/60 text-yellow-300 hover:border-yellow-400"
                  : "bg-transparent border-yellow-500/70 text-yellow-700 hover:border-yellow-500"
              }`}
            >
              <span>{continueInfo.label}</span>
              <ArrowUpRight className="w-4 h-4 transform transition-transform duration-200 rotate-45 group-hover:rotate-0" />
            </button>
          )}

          <p className={`mt-2 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Select an event from the 2026 events list and configure your practice session
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-stretch">
          {/* Event List */}
          <div
            className="flex-none lg:flex-1 overflow-hidden"
            style={{ height: isLarge && panelHeight ? `${panelHeight}px` : "48vh" }}
          >
            <EventList
              events={events}
              selectedEvent={selectedEvent}
              sortOption={sortOption}
              onEventSelect={selectEvent}
              onSortChange={setSortOption}
              loading={loading}
              error={error}
              isOffline={isOffline}
              downloadedSlugs={downloadedSet}
              viewMode={viewMode}
              onViewModeChange={(mode) => {
                if (mode !== viewMode) {
                  setSelectedEvent(null);
                  setViewMode(mode);
                }
              }}
            />
          </div>

          {/* Test Configuration */}
          <div className="w-full lg:w-auto">
            <TestConfiguration
              selectedEvent={selectedEventObj || null}
              settings={settings}
              onSettingsChange={setSettings}
              onGenerateTest={handleGenerateTest}
              onUnlimited={handleUnlimited}
            />
          </div>
        </div>
      </main>

      {/* No floating back button on practice page */}

      {/* Global ToastContainer handles notifications */}
      <style jsx={true} global={true}>{`
          /* Handle long words by breaking them */
          .break-words {
            word-break: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
          }
          
          /* Specifically target very long words (14+ characters) */
          .break-words * {
            word-break: break-word;
            overflow-wrap: break-word;
          }
          
          /* Ensure checkboxes stay aligned when text wraps */
          input[type="checkbox"] {
            flex-shrink: 0;
            margin-top: 0.125rem;
          }

          /* Responsive shared panel height for Practice panels */
          .practice-panel {
            height: 85vh;
          }
          @media (min-width: 640px) {
            .practice-panel { height: 86vh; }
          }
          @media (min-width: 1024px) {
            .practice-panel { height: 88vh; }
          }
          @media (min-width: 1280px) {
            .practice-panel { height: 82vh; }
          }
          @media (min-width: 1536px) {
            .practice-panel { height: 80vh; }
          }
        `}</style>
    </div>
  );
}
