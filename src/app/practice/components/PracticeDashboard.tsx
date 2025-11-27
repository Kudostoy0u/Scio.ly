"use client";
import Header from "@/app/components/Header";
import { useTheme } from "@/app/contexts/themeContext";
import type { Event } from "@/app/practice/types";
import { savePreferences } from "@/app/practice/utils";
import { hasOfflineEvent } from "@/app/utils/storage";
import { ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import EventList from "./EventList";
import TestConfiguration from "./TestConfiguration";
import { useEventLoader } from "./hooks/useEventLoader";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useOfflineDownloads } from "./hooks/useOfflineDownloads";
import { usePanelHeight } from "./hooks/usePanelHeight";
import { usePracticeSettings } from "./hooks/usePracticeSettings";
import { computeContinueInfo } from "./utils/continueBanner";
import { getSettingsForEvent } from "./utils/eventSelection";
import {
  proceedWithTest as proceedWithTestNav,
  proceedWithUnlimited as proceedWithUnlimitedNav,
} from "./utils/navigate";

export default function PracticeDashboard() {
  const router = useRouter();
  const { darkMode } = useTheme();
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [sortOption, setSortOption] = useState("alphabetical");
  const [continueInfo, setContinueInfo] = useState<{
    eventName: string;
    route: "/test" | "/codebusters";
    label: string;
  } | null>(null);
  const [viewMode, setViewMode] = useState<"current" | "all">("current");

  const [settings, setSettings] = usePracticeSettings();
  const { isOffline, downloadedSet } = useOfflineDownloads();
  const isLarge = useMediaQuery("(min-width: 1024px)");
  const panelHeight = usePanelHeight();
  const { events, loading, error } = useEventLoader(viewMode);

  useEffect(() => {
    setContinueInfo(computeContinueInfo());
  }, []);

  useEffect(() => {
    if (viewMode === "all") {
      setSelectedEvent(null);
    }
  }, [viewMode]);

  const getSelectedEventObj = (): Event | null => {
    if (!selectedEvent) {
      return null;
    }
    return events.find((event) => event.id === selectedEvent) || null;
  };

  const checkOfflineEvent = async (event: Event): Promise<boolean> => {
    const slug = event.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const hasDownloaded = await hasOfflineEvent(slug);
    if (!hasDownloaded) {
      toast.error(
        "This event is not downloaded for offline use. Go to Offline page to download it."
      );
    }
    return hasDownloaded;
  };

  const handleGenerateTest = async () => {
    const selectedEventObj = getSelectedEventObj();
    if (!selectedEventObj) {
      toast.error("Please select an event first");
      return;
    }

    if (isOffline && !(await checkOfflineEvent(selectedEventObj))) {
      return;
    }

    proceedWithTestNav(selectedEventObj.name, settings, router.push);
  };

  const handleUnlimited = async () => {
    const selectedEventObj = getSelectedEventObj();
    if (!selectedEventObj) {
      toast.error("Please select an event first");
      return;
    }

    if (isOffline && !(await checkOfflineEvent(selectedEventObj))) {
      return;
    }

    savePreferences(selectedEventObj.name, settings.questionCount, settings.timeLimit);
    proceedWithUnlimitedNav(selectedEventObj.name, settings, router.push);
  };

  const selectEvent = (id: number) => {
    setSelectedEvent(id);
    const selectedEventObj = events.find((event) => event.id === id);
    if (selectedEventObj) {
      const eventSettings = getSettingsForEvent(selectedEventObj);
      setSettings((prev) => ({ ...prev, ...eventSettings }));
    }
  };

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
              type="button"
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
                aria-label="Scroll down"
              >
                <title>Scroll down</title>
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
    </div>
  );
}
