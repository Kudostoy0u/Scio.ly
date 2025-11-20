"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import * as Icons from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { Event } from "@/app/practice/types";

interface EventListProps {
  events: Event[];
  selectedEvent: number | null;
  sortOption: string;
  onEventSelect: (id: number) => void;
  onSortChange: (option: string) => void;
  loading: boolean;
  error: string | null;

  isOffline?: boolean;
  downloadedSlugs?: Set<string>;
  viewMode: "current" | "all";
  onViewModeChange: (mode: "current" | "all") => void;
}

export default function EventList({
  events,
  selectedEvent,
  sortOption,
  onEventSelect,
  onSortChange,
  loading,
  error,
  isOffline = false,
  downloadedSlugs,
  viewMode,
  onViewModeChange,
}: EventListProps) {
  const { darkMode } = useTheme();

  const sortedEvents = [...events].sort((a, b) => {
    if (sortOption === "alphabetical") {
      return a.name.localeCompare(b.name);
    }
    if (sortOption === "subject") {
      return a.subject.localeCompare(b.subject);
    }
    return 0;
  });

  return (
    <div
      className={`h-full rounded-xl flex flex-col ${darkMode ? "bg-gray-800" : "bg-white shadow-md"}`}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
        <h3 className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>Available Events</h3>
        <div className="flex items-center space-x-3">
          <label htmlFor="sort" className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            Sort:
          </label>
          <select
            id="sort"
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value)}
            className={`text-xs rounded-md border-0 py-1.5 pl-3 pr-8 ${
              darkMode
                ? "bg-gray-700 text-white focus:ring-blue-500"
                : "bg-gray-50 text-gray-900 focus:ring-blue-600"
            } focus:ring-1 focus:outline-none`}
          >
            <option value="alphabetical">Alphabetical</option>
            <option value="subject">Subject</option>
          </select>
          <div className={`flex rounded-md border ${darkMode ? "border-gray-600" : "border-gray-300"}`}>
            {(() => {
              const CurrentIcon =
                ("ClockArrowDown" in Icons ? Icons.ClockArrowDown : undefined) ||
                ("History" in Icons ? Icons.History : undefined) ||
                Icons.Clock;
              const AllIcon =
                ("ClockFading" in Icons ? Icons.ClockFading : undefined) ||
                ("Archive" in Icons ? Icons.Archive : undefined) ||
                Icons.Clock;
              return (
                <>
                  <button
                    type="button"
                    onClick={() => onViewModeChange("current")}
                    className={`py-1.5 px-2.5 text-xs font-medium rounded-l-md border ${
                      viewMode === "current"
                        ? darkMode
                          ? "border-blue-500 text-blue-400"
                          : "border-blue-500 text-blue-600"
                        : darkMode
                          ? "border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-400"
                          : "border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600"
                    } bg-transparent`}
                    title="Current"
                  >
                    <CurrentIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewModeChange("all")}
                    className={`py-1.5 px-2.5 text-xs font-medium rounded-r-md border ${
                      viewMode === "all"
                        ? darkMode
                          ? "border-blue-500 text-blue-400"
                          : "border-blue-500 text-blue-600"
                        : darkMode
                          ? "border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-400"
                          : "border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600"
                    } bg-transparent`}
                    title="All"
                  >
                    <AllIcon className="w-4 h-4" />
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-3 min-h-0 practice-events-scroll relative">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div
              className={`animate-pulse text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
            >
              Loading events...
            </div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-red-500 text-sm">{error}</div>
          </div>
        ) : events.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              No events match the criteria.
            </div>
          </div>
        ) : (
          <ScrollBarAlwaysVisible>
            <ul className="space-y-2">
              {sortedEvents.map((event) => {
                const slug = event.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                const isDownloaded = downloadedSlugs ? downloadedSlugs.has(slug) : true;
                const isDisabled = isOffline && !isDownloaded;
                return (
                  <li
                    key={event.id}
                    id={`event-${event.id}`}
                    onClick={() => {
                      if (!isDisabled) {
                        onEventSelect(event.id);
                      }
                    }}
                    className={`p-4 rounded-lg transition-all duration-200 ${
                      isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    } ${
                      selectedEvent === event.id
                        ? darkMode
                          ? "bg-blue-600/20 border-l-4 border-blue-500"
                          : "bg-blue-50 border-l-4 border-blue-500"
                        : darkMode
                          ? "hover:bg-gray-700"
                          : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <h4
                        className={`font-medium text-sm md:text-base ${
                          darkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {event.name}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-xs md:text-xs text-[10px] px-3 py-1 rounded-full ${
                            darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {event.subject}
                        </span>
                        {isOffline && !isDownloaded && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${darkMode ? "bg-red-900 text-red-200" : "bg-red-100 text-red-600"}`}
                          >
                            Not downloaded
                          </span>
                        )}
                        {event.divisions && (
                          <span
                            className={`hidden lg:inline-block text-xs px-3 py-1 rounded-full ${
                              darkMode ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-600"
                            }`}
                          >
                            Div {event.divisions.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollBarAlwaysVisible>
        )}
      </div>
    </div>
  );
}

function ScrollBarAlwaysVisible({ children }: { children: ReactNode }) {
  const { darkMode } = useTheme();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [thumbTop, setThumbTop] = useState(0);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const rafPendingRef = useRef(false);

  const recalc = () => {
    const el = scrollContainerRef.current;
    if (!el) {
      return;
    }
    const trackHeight = el.clientHeight; // visible area height
    const total = el.scrollHeight;
    const minThumb = 24; // px
    const hasOverflow = total > trackHeight + 1; // tolerate off-by-1
    setIsScrollable(hasOverflow);

    if (!hasOverflow) {
      setThumbHeight(0);
      setThumbTop(0);
      if (thumbRef.current) {
        thumbRef.current.style.height = "0px";
        thumbRef.current.style.transform = "translateY(0px)";
      }
      return;
    }

    const computedThumbHeight = Math.max(minThumb, Math.floor((trackHeight / total) * trackHeight));
    const maxScroll = Math.max(1, total - trackHeight);
    const maxTop = Math.max(0, trackHeight - computedThumbHeight);

    let newTop = Math.round((el.scrollTop / maxScroll) * maxTop);
    if (el.scrollTop >= maxScroll - 1) {
      newTop = maxTop; // clamp at bottom to avoid gap
    }

    setThumbHeight(computedThumbHeight);
    setThumbTop(newTop);
    if (thumbRef.current) {
      thumbRef.current.style.transform = `translateY(${newTop}px)`;
      thumbRef.current.style.height = `${computedThumbHeight}px`;
    }
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) {
      return;
    }
    recalc();
    const onScroll = () => {
      if (rafPendingRef.current) {
        return;
      }
      rafPendingRef.current = true;
      requestAnimationFrame(() => {
        rafPendingRef.current = false;
        recalc();
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => recalc());
      ro.observe(el);
    } catch {}
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (ro) {
        try {
          ro.disconnect();
        } catch {}
      }
    };
  }, []);

  useEffect(() => {
    recalc();
  });

  return (
    <div className="h-full relative">
      <div ref={scrollContainerRef} className="h-full overflow-y-auto pr-2 native-scroll-hidden">
        {children}
      </div>
      {isScrollable && (
        <div className="pointer-events-none absolute inset-y-0 right-1 w-1.5">
          <div
            className={`absolute inset-y-0 right-0 w-1.5 rounded-full ${
              darkMode ? "bg-gray-700" : "bg-gray-200"
            }`}
          />
          <div
            ref={thumbRef}
            className={`absolute right-0 w-1.5 rounded-full will-change-transform ${
              darkMode ? "bg-gray-500" : "bg-gray-400"
            }`}
            style={{ transform: `translateY(${thumbTop}px)`, height: `${thumbHeight}px` }}
          />
        </div>
      )}
    </div>
  );
}
