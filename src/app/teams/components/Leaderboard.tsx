"use client";
import type { EloData, LeaderboardEntry } from "@/app/analytics/types/elo";
import { getLeaderboard } from "@/app/analytics/utils/eloDataProcessor";
import { useTheme } from "@/app/contexts/themeContext";
import logger from "@/lib/utils/logger";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Filters } from "./Leaderboard/components/Filters";
import { LeaderboardTable } from "./Leaderboard/components/LeaderboardTable";
import { Pagination } from "./Leaderboard/components/Pagination";
import { ResultsSummary } from "./Leaderboard/components/ResultsSummary";
import { SliderStyles } from "./Leaderboard/components/SliderStyles";
import { TimelineSlider } from "./Leaderboard/components/TimelineSlider";
import { EVENT_WHITELISTS } from "./leaderboard/constants";
import {
  type TournamentDate,
  buildTournamentDates,
  collectSeasons,
  collectStates,
  computeRankingChanges,
  eventsForSeason,
  formatRankingChange,
  rankColor,
} from "./leaderboard/utils";

interface LeaderboardProps {
  eloData: EloData;
  division: "b" | "c";
  metadata?: Record<string, unknown>;
  externalDate?: string;
}

// TournamentDate moved to utils

// Whitelists moved to constants

const Leaderboard: React.FC<LeaderboardProps> = ({
  eloData,
  division,
  metadata,
  externalDate,
}) => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 25;
  const { darkMode } = useTheme();
  const prevSearchTerm = useRef<string>("");
  const prevExternalDate = useRef<string | undefined>(undefined);
  const isManualChange = useRef<boolean>(false);

  const allSeasons = useMemo(() => collectSeasons(eloData), [eloData]);

  const allStates = useMemo(() => collectStates(eloData), [eloData]);

  const eventsForSelectedSeason = useMemo(
    () => eventsForSeason(eloData, selectedSeason, division, EVENT_WHITELISTS),
    [eloData, selectedSeason, division]
  );

  const getTournamentDatesForSeason = useCallback(
    (season: string): TournamentDate[] => buildTournamentDates(metadata ?? {}, season),
    [metadata]
  );

  const mostRecentSeason = allSeasons[allSeasons.length - 1] || "2024";

  useEffect(() => {
    if (!selectedSeason) {
      setSelectedSeason(mostRecentSeason);
    }
  }, [mostRecentSeason, selectedSeason]);

  const tournamentDates = useMemo(() => {
    return getTournamentDatesForSeason(selectedSeason);
  }, [selectedSeason, getTournamentDatesForSeason]);

  const lastTournamentDate = tournamentDates[tournamentDates.length - 1]?.date || "";

  // Update selectedDate when externalDate changes (from Charts tab timeline)
  // Only sync when externalDate actually changes to a new value (not when selectedDate changes manually)
  useEffect(() => {
    // Only update if externalDate changed to a new value and we're not in the middle of a manual change
    if (externalDate && externalDate !== prevExternalDate.current && !isManualChange.current) {
      setSelectedDate(externalDate);
      prevExternalDate.current = externalDate;
    }
  }, [externalDate]);

  // Initialize selectedDate with last tournament date if not set
  useEffect(() => {
    if (!selectedDate && lastTournamentDate) {
      setSelectedDate(lastTournamentDate);
    }
  }, [lastTournamentDate, selectedDate]);

  useEffect(() => {
    setSelectedEvent("");
  }, []);

  const rankingChanges = useMemo(() => {
    // Recalculate ranking changes to account for historical data
    // Pass the fallbackToPreviousSeason flag to computeRankingChanges
    return computeRankingChanges(
      eloData,
      selectedEvent,
      selectedSeason,
      selectedState,
      selectedDate,
      true
    );
  }, [eloData, selectedEvent, selectedSeason, selectedState, selectedDate]);

  const getRankingChange = (entry: LeaderboardEntry): number => {
    const key = `${entry.school}-${entry.state}`;
    return rankingChanges.get(key) || 0;
  };

  const formatChangeLocal = (change: number) => formatRankingChange(!!darkMode, change);

  const leaderboardDataMemo = useMemo(() => {
    try {
      let data = getLeaderboard(
        eloData,
        selectedEvent || undefined,
        selectedSeason,
        1000,
        selectedDate,
        true // Enable fallback to previous season
      );

      if (selectedState) {
        data = data.filter((entry) => entry.state === selectedState).sort((a, b) => b.elo - a.elo);
      }

      return data;
    } catch (error) {
      logger.error("Error loading leaderboard:", error);
      return [];
    }
  }, [eloData, selectedEvent, selectedSeason, selectedState, selectedDate]);

  useEffect(() => {
    setIsLoading(true);

    const timeout = setTimeout(() => {
      setLeaderboardData(leaderboardDataMemo);
      setIsLoading(false);
    }, 50);

    return () => clearTimeout(timeout);
  }, [leaderboardDataMemo]);

  useEffect(() => {
    if (selectedEvent && !eventsForSelectedSeason.includes(selectedEvent)) {
      setSelectedEvent("");
    }
  }, [selectedEvent, eventsForSelectedSeason]);

  const originalRankMap = useMemo(() => {
    const rankMap = new Map<string, number>();
    for (const [index, entry] of leaderboardData.entries()) {
      const key = `${entry.school}-${entry.state}-${entry.season}-${entry.event || "overall"}`;
      rankMap.set(key, index + 1);
    }
    return rankMap;
  }, [leaderboardData]);

  const filteredData = useMemo(() => {
    return leaderboardData.filter((entry) => {
      const matchesSearch =
        entry.school.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.state.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [leaderboardData, searchTerm]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  useEffect(() => {
    if (prevSearchTerm.current !== searchTerm) {
      prevSearchTerm.current = searchTerm;
      setCurrentPage(1);
    }
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, []);

  const getRankColor = (rank: number) => rankColor(!!darkMode, rank);

  return (
    <div
      className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-sm border ${darkMode ? "border-gray-700" : "border-gray-200"} p-6`}
    >
      <div className="text-center mb-6">
        <h2 className={`text-2xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
          🏆 Leaderboard
        </h2>
        <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
          Top teams by Elo rating - {selectedSeason} Season
        </p>
      </div>

      <div className="mb-6 space-y-4">
        <Filters
          allSeasons={allSeasons}
          allStates={allStates}
          eventsForSelectedSeason={eventsForSelectedSeason}
          selectedSeason={selectedSeason}
          selectedState={selectedState}
          selectedEvent={selectedEvent}
          searchTerm={searchTerm}
          darkMode={darkMode}
          onSeasonChange={setSelectedSeason}
          onStateChange={setSelectedState}
          onEventChange={setSelectedEvent}
          onSearchChange={setSearchTerm}
        />

        <TimelineSlider
          tournamentDates={tournamentDates}
          selectedDate={selectedDate}
          darkMode={darkMode}
          onDateChange={(date) => {
            isManualChange.current = true;
            setSelectedDate(date);
            // Reset manual change flag after a short delay
            setTimeout(() => {
              isManualChange.current = false;
            }, 100);
          }}
        />

        <ResultsSummary
          isLoading={isLoading}
          paginatedDataLength={paginatedData.length}
          filteredDataLength={filteredData.length}
          searchTerm={searchTerm}
          darkMode={darkMode}
        />
      </div>

      <LeaderboardTable
        isLoading={isLoading}
        paginatedData={paginatedData}
        selectedEvent={selectedEvent}
        darkMode={darkMode}
        originalRankMap={originalRankMap}
        getRankColor={getRankColor}
        getRankingChange={getRankingChange}
        formatChangeLocal={formatChangeLocal}
      />

      {!isLoading && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          darkMode={darkMode}
          onPageChange={setCurrentPage}
        />
      )}

      <SliderStyles />
    </div>
  );
};

export default Leaderboard;
