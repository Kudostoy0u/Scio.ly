export interface EloHistoryEntry {
  date: string;
  tournament: string;
  place: number;
  elo: number;
  duosmiumLink: string;
}

export interface EloEvent {
  rating: number;
  history: EloHistoryEntry[];
}

export interface EloSeason {
  events: Record<string, EloEvent>;
}

export interface EloSchool {
  seasons: Record<string, EloSeason>;
  meta: {
    games: number;
    events: number;
  };
}

export interface EloData {
  [stateCode: string]: {
    [schoolName: string]: EloSchool;
  };
}

export type ChartType = 'overall' | 'event';

export type OverallSeasonData = {
  [schoolName: string]: {
    [season: string]: number;
  };
};

export type OverallTournamentData = {
  [schoolName: string]: Array<{
    date: string;
    tournament: string;
    elo: number;
    place: number;
    season?: string;
    duosmiumLink: string;
  }>;
};

export type EventSeasonData = {
  [schoolName: string]: {
    [event: string]: {
      [season: string]: number;
    };
  };
};

export type EventTournamentData = {
  [schoolName: string]: {
    [event: string]: Array<{
      date: string;
      tournament: string;
      elo: number;
      place: number;
      season?: string;
      duosmiumLink: string;
    }>;
  };
};

export type ChartData = OverallSeasonData | OverallTournamentData | EventSeasonData | EventTournamentData;

export interface LeaderboardEntry {
  school: string;
  state: string;
  elo: number;
  season: string;
  event?: string;
}

export interface ComparisonResult {
  event: string;
  school1WinPercentage: number;
  school1Elo: number;
  school2Elo: number;
  tournament?: string;
  date?: string;
}
