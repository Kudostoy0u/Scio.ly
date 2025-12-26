const fs = require("node:fs");
const fsp = fs.promises;
const os = require("node:os");
const path = require("node:path");
const { Worker, isMainThread, parentPort, workerData } = require("node:worker_threads");
const glob = require("glob");
const yaml = require("js-yaml");

// --- configuration ---
const RESULTS_DIR = "results";
const OUTPUT_DIR = "./public";
let STARTING_ELO = 1500;
let ELO_FLOOR = 173;

/**
 * This is the single most important constant for the new algorithm.
 * It controls the magnitude of Elo changes based on performance.
 * A higher value leads to more volatile ratings. 800 is a robust, stable starting point.
 */
let ELO_PERFORMANCE_SCALING_FACTOR = 140;

/**
 * Tournament competitiveness weighting factor.
 * Higher values make competitive tournaments (with high average Elo) more impactful.
 */
let TOURNAMENT_COMPETITIVENESS_FACTOR = 0.5;

/**
 * Tournament volatility scaling factors for new seasons.
 * Teams get more volatile Elo changes in their first few tournaments of a new season.
 */
let FIRST_TOURNAMENT_VOLATILITY = 1.5; // 2x more volatile for first tournament
let SECOND_TOURNAMENT_VOLATILITY = 0.96; // 1.5x more volatile for second tournament
let NORMAL_VOLATILITY = 1.0;

/**
 * Tournament importance multipliers for state and national tournaments.
 */
let STATE_TOURNAMENT_MULTIPLIER = 4.0; // 4x multiplier for state tournaments
let NATIONAL_TOURNAMENT_MULTIPLIER = 7.0; // 7x multiplier for national tournaments

/**
 * ELO change damping parameters for continuous damping function.
 * Uses a sigmoid-like function to smoothly damp large changes.
 */
let ELO_DAMPING_SCALE = 100;
let ELO_DAMPING_STRENGTH = 0.3;

// --- logging configuration ---
const ENABLE_LOGGING = false; // Set to false to disable all logging
const DEBUG_OUTPUT = false;
let PARALLEL_DIVISIONS = true;
let DIVISIONS_TO_PROCESS = ["B", "C"]; // Set to ["B"], ["C"], or ["B", "C"]
let SEASONS_TO_INCLUDE = 0; // 0 = all seasons
let WRITE_OUTPUT = true; // Write JSON output to public/
let REPORT_NATIONALS_LOSS = true; // Log nationals loss metrics
let LOSS_WEIGHT_POWER = 2; // Higher = more weight for top finishers
let TOP_WEIGHT_SCALE = 12; // Lower = sharper emphasis near the top
let TOP_RANK_WEIGHT = 2.5;
let SURPRISE_WEIGHT = 4.0;
let SURPRISE_SHARPNESS = 8;
let MOMENTUM_VOLATILITY_SCALE = 150;
let MAX_MOMENTUM_VOLATILITY = 2.156;
let SCORE_NORMALIZATION_SCALE = 1;
let LOSS_OUTPUT = "none"; // none | total
let JV_CONVERSION_LOSS_RATIO = 0.02;
let NATIONALS_LOSS_YEAR_WHITELIST = new Set([2025]);
const NATIONALS_LOSS_DEBUG_YEARS = new Set([]);
let ELO_EXPECTED_SCALE = 400;
let TOP_TEAMS_FRACTION = 0.7;
let MISSING_PLACEMENT_PENALTY_FACTOR = 0.2;
let DEADLAST_PLACEMENT_PENALTY_FACTOR = 0.273261;
let MOMENTUM_WINDOW_SIZE = 0;
let JV_CONVERSION_MIN_TOURNAMENTS = 0;
let SATELLITE_TOURNAMENT_MULTIPLIER = 1;
let NATIONALS_ATTENDANCE_WEIGHT = 0;
let NATIONALS_RECENT_GAIN_WEIGHT = 0;
const DEBUG_TOURNAMENT_FILENAMES = new Set([]);
const DEBUG_TEAM_NAMES = new Set([]);

const cliArgs = parseArgs(process.argv.slice(2));
const hasCliOverrides = Object.keys(cliArgs).length > 0;
if (!hasCliOverrides) {
  applyParamsFile();
}
applyCliOverrides(cliArgs);

/**
 * Logger function that only outputs if logging is enabled
 * @param {...any} args - Arguments to log (same as console.log)
 */
function log(..._args) {
  if (ENABLE_LOGGING) {
  }
}

function debugLog(...args) {
  if (DEBUG_OUTPUT) {
    console.log(...args);
  }
}

function parseArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    const raw = args[i];
    if (!raw.startsWith("--")) {
      continue;
    }
    const [key, value] = raw.replace(/^--/, "").split("=");
    if (value !== undefined) {
      parsed[key] = value;
    } else if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
      parsed[key] = args[i + 1];
      i++;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}

function applyParamsFile() {
  const paramsPath = path.join(__dirname, "..", "PARAMS.json");
  if (!fs.existsSync(paramsPath)) {
    return;
  }
  try {
    const raw = fs.readFileSync(paramsPath, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed?.params) {
      console.log("Using params from PARAMS.json");
      applyCliOverrides(parsed.params);
    }
  } catch (_e) {}
}

function parseBool(value, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }
  if (typeof value === "boolean") {
    return value;
  }
  return value === "true" || value === "1";
}

function parseNumber(value, defaultValue) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function parseYearSet(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const raw = String(value).trim();
  if (!raw) {
    return new Set();
  }
  return new Set(
    raw
      .split(",")
      .map((entry) => Number.parseInt(entry.trim(), 10))
      .filter((year) => Number.isFinite(year))
  );
}

function applyCliOverrides(args) {
  if (args.divisions) {
    DIVISIONS_TO_PROCESS = String(args.divisions)
      .split(",")
      .map((d) => d.trim().toUpperCase())
      .filter(Boolean);
  }
  if (args.seasons !== undefined) {
    SEASONS_TO_INCLUDE = Number.parseInt(args.seasons, 10) || SEASONS_TO_INCLUDE;
  }
  if (args["write-output"] !== undefined) {
    WRITE_OUTPUT = parseBool(args["write-output"], WRITE_OUTPUT);
  }
  if (args["report-nationals-loss"] !== undefined) {
    REPORT_NATIONALS_LOSS = parseBool(
      args["report-nationals-loss"],
      REPORT_NATIONALS_LOSS
    );
  }
  if (args["parallel-divisions"] !== undefined) {
    PARALLEL_DIVISIONS = parseBool(args["parallel-divisions"], PARALLEL_DIVISIONS);
  }
  if (args["loss-output"]) {
    LOSS_OUTPUT = String(args["loss-output"]);
  }
  if (args["nationals-loss-years"] !== undefined) {
    const parsedYears = parseYearSet(args["nationals-loss-years"]);
    if (parsedYears) {
      NATIONALS_LOSS_YEAR_WHITELIST = parsedYears;
    }
  }

  STARTING_ELO = parseNumber(args["starting-elo"], STARTING_ELO);
  // ELO_FLOOR is fixed
  ELO_PERFORMANCE_SCALING_FACTOR = parseNumber(
    args["elo-performance-scaling-factor"],
    ELO_PERFORMANCE_SCALING_FACTOR
  );
  TOURNAMENT_COMPETITIVENESS_FACTOR = parseNumber(
    args["tournament-competitiveness-factor"],
    TOURNAMENT_COMPETITIVENESS_FACTOR
  );
  FIRST_TOURNAMENT_VOLATILITY = parseNumber(
    args["first-tournament-volatility"],
    FIRST_TOURNAMENT_VOLATILITY
  );
  // SECOND_TOURNAMENT_VOLATILITY is fixed
  NORMAL_VOLATILITY = parseNumber(args["normal-volatility"], NORMAL_VOLATILITY);
  STATE_TOURNAMENT_MULTIPLIER = parseNumber(
    args["state-tournament-multiplier"],
    STATE_TOURNAMENT_MULTIPLIER
  );
  NATIONAL_TOURNAMENT_MULTIPLIER = parseNumber(
    args["national-tournament-multiplier"],
    NATIONAL_TOURNAMENT_MULTIPLIER
  );
  ELO_DAMPING_SCALE = parseNumber(args["elo-damping-scale"], ELO_DAMPING_SCALE);
  ELO_DAMPING_STRENGTH = parseNumber(
    args["elo-damping-strength"],
    ELO_DAMPING_STRENGTH
  );
  LOSS_WEIGHT_POWER = parseNumber(args["loss-weight-power"], LOSS_WEIGHT_POWER);
  TOP_WEIGHT_SCALE = parseNumber(args["top-weight-scale"], TOP_WEIGHT_SCALE);
  TOP_RANK_WEIGHT = parseNumber(args["top-rank-weight"], TOP_RANK_WEIGHT);
  SURPRISE_WEIGHT = parseNumber(args["surprise-weight"], SURPRISE_WEIGHT);
  SURPRISE_SHARPNESS = parseNumber(args["surprise-sharpness"], SURPRISE_SHARPNESS);
  MOMENTUM_VOLATILITY_SCALE = parseNumber(
    args["momentum-volatility-scale"],
    MOMENTUM_VOLATILITY_SCALE
  );
  // MAX_MOMENTUM_VOLATILITY is fixed
  SCORE_NORMALIZATION_SCALE = parseNumber(
    args["score-normalization-scale"],
    SCORE_NORMALIZATION_SCALE
  );
  JV_CONVERSION_LOSS_RATIO = parseNumber(
    args["jv-conversion-loss-ratio"],
    JV_CONVERSION_LOSS_RATIO
  );
  ELO_EXPECTED_SCALE = parseNumber(args["elo-expected-scale"], ELO_EXPECTED_SCALE);
  TOP_TEAMS_FRACTION = parseNumber(args["top-teams-fraction"], TOP_TEAMS_FRACTION);
  MISSING_PLACEMENT_PENALTY_FACTOR = parseNumber(
    args["missing-placement-penalty-factor"],
    MISSING_PLACEMENT_PENALTY_FACTOR
  );
  // DEADLAST_PLACEMENT_PENALTY_FACTOR is fixed
  // SEASON_QUINTILE_WEIGHT_* are removed
  if (args["momentum-window-size"] !== undefined) {
    const parsed = Number.parseInt(args["momentum-window-size"], 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      MOMENTUM_WINDOW_SIZE = parsed;
    }
  }
  if (args["jv-conversion-min-tournaments"] !== undefined) {
    const parsed = Number.parseInt(args["jv-conversion-min-tournaments"], 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      JV_CONVERSION_MIN_TOURNAMENTS = parsed;
    }
  }
  SATELLITE_TOURNAMENT_MULTIPLIER = parseNumber(
    args["satellite-tournament-multiplier"],
    SATELLITE_TOURNAMENT_MULTIPLIER
  );
  NATIONALS_ATTENDANCE_WEIGHT = parseNumber(
    args["nationals-attendance-weight"],
    NATIONALS_ATTENDANCE_WEIGHT
  );
  NATIONALS_RECENT_GAIN_WEIGHT = parseNumber(
    args["nationals-recent-gain-weight"],
    NATIONALS_RECENT_GAIN_WEIGHT
  );
}

const metadata = {
  teams: new Map(), // teamname -> id
  events: new Map(), // eventname -> id
  tournaments: new Map(), // tournamentname -> id
  teamIds: [], // [teamname, ...]
  eventIds: [], // [eventname, ...]
  tournamentIds: [], // [tournamentname, ...]
};
const nationalTournamentIds = new Set();
const eventCountCache = new Map();
const lastRatingByCategoryCache = new Map();
const tournamentNameCache = new Map();
const STATE_NAMES = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
};

let nextTeamId = 0;
let nextEventId = 0;
let nextTournamentId = 0;

// --- main execution ---
async function main() {
  log("=== Starting Analytics Processing ===");
  log(`Processing divisions: ${DIVISIONS_TO_PROCESS.join(", ")}`);
  const divisions = DIVISIONS_TO_PROCESS;
  if (PARALLEL_DIVISIONS) {
    await Promise.all(divisions.map((division) => runDivisionWorker(division)));
  } else {
    for (const division of divisions) {
      log(`\n--- Processing Division ${division} ---`);
      await processDivision(division);
    }
  }
  log("\n=== Analytics Processing Complete ===");
  debugLog("Completed analytics processing.");
}

async function processDivision(division) {
  const eloData = {};
  eventCountCache.clear();
  lastRatingByCategoryCache.clear();
  let nationalsLossTotal = 0;

  const tournamentFiles = glob.sync(`${RESULTS_DIR}/**/*_${division.toLowerCase()}.yaml`);
  tournamentFiles.sort();

  log(`Found ${tournamentFiles.length} tournament files for Division ${division}`);
  debugLog(
    `Division ${division}: found ${tournamentFiles.length} files.`,
    tournamentFiles.slice(0, 3)
  );
  if (tournamentFiles.length === 0) {
    log(`No tournament files found for Division ${division}, skipping...`);
    debugLog(`Division ${division}: no files found.`);
    return;
  }
  log(`Tournament files: ${tournamentFiles.map((f) => path.basename(f)).join(", ")}`);

  debugLog(`Division ${division}: parsing tournaments...`);
  const parsedTournaments = await parseTournamentFiles(tournamentFiles);
  debugLog(`Division ${division}: parsed ${parsedTournaments.length} tournaments.`);

  const seasonNumbers = parsedTournaments
    .map((result) => {
      if (!result?.data) {
        return null;
      }
      return getSeasonFromTournament(result.data, result.file);
    })
    .filter((season) => season !== null && !Number.isNaN(season));
  const maxSeason = seasonNumbers.length > 0 ? Math.max(...seasonNumbers) : null;

  for (const result of parsedTournaments) {
    if (!result) {
      continue;
    }

    const { file, data, fileContentsLower, error } = result;
    debugLog(`Processing ${path.basename(file)}...`);

    if (error) {
      debugLog(`  Error processing ${path.basename(file)}: ${error}`);
      if (error.includes("missing state code")) {
        process.exit(1);
      }
      continue;
    }

    if (data) {
      const season = getSeasonFromTournament(data, file);
      if (maxSeason !== null && !shouldIncludeSeason(season, maxSeason, SEASONS_TO_INCLUDE)) {
        continue;
      }
      debugLog(`  Loaded tournament data from ${path.basename(file)}`);
      nationalsLossTotal += processTournament(data, eloData, file, fileContentsLower);
    } else {
      debugLog(`  Warning: No tournament data found in ${path.basename(file)}`);
    }
  }

  const _optimizedData = {
    meta: {
      teams: metadata.teamIds,
      events: metadata.eventIds,
      tournaments: metadata.tournamentIds,
    },
    data: eloData,
  };

  if (REPORT_NATIONALS_LOSS) {
    const lossLine = `[Nationals Loss Total] Division ${division}: ${nationalsLossTotal.toFixed(2)}`;
    console.log(lossLine);
    if (LOSS_OUTPUT === "total") {
      console.log(`LOSS_TOTAL=${nationalsLossTotal.toFixed(2)}`);
    }
  }

  if (WRITE_OUTPUT) {
    await generateStateFiles(eloData, division, metadata);
  }
}

/**
 * Process tournament name to replace state codes and "nationals" with proper tournament names
 * @param {string} tournamentName - The original tournament name
 * @returns {string} The processed tournament name
 */
function processTournamentName(tournamentName) {
  if (!tournamentName) {
    return tournamentName;
  }

  const cachedName = tournamentNameCache.get(tournamentName);
  if (cachedName) {
    return cachedName;
  }

  let processedName = tournamentName;

  processedName = processedName.replace(/\bnationals\b/gi, "Science Olympiad National Tournament");

  const stateCodePattern = /\[([^,]+),\s*([A-Z]{2})\]/g;
  processedName = processedName.replace(stateCodePattern, (_match, _prefix, stateCode) => {
    const stateName = getStateName(stateCode);
    return `${stateName} Science Olympiad State Tournament`;
  });

  const stateStatesPattern = /\b([a-z]?)([A-Z]{2})\s+states\b/gi;
  processedName = processedName.replace(stateStatesPattern, (_match, prefix, stateCode) => {
    let stateName = getStateName(stateCode);

    if (stateCode.toUpperCase() === "CA") {
      if (prefix.toLowerCase() === "s") {
        stateName = "Southern California";
      } else if (prefix.toLowerCase() === "n") {
        stateName = "Northern California";
      }
    }

    return `${stateName} Science Olympiad State Tournament`;
  });

  tournamentNameCache.set(tournamentName, processedName);
  return processedName;
}

function buildTournamentInfo(data, filePath) {
  const filename = path.basename(filePath, ".yaml");
  const rawTournamentName =
    data.Tournament.name ||
    (() => {
      const parts = filename.split("_");
      return parts.slice(1, -1).join(" ");
    })();

  return {
    name: processTournamentName(rawTournamentName),
    date: data.Tournament["start date"]
      ? (() => {
          const originalDate = new Date(data.Tournament["start date"]);
          originalDate.setDate(originalDate.getDate() + 1);
          return originalDate.toISOString().split("T")[0];
        })()
      : (() => {
          const originalDate = new Date(filename.split("_")[0]);
          originalDate.setDate(originalDate.getDate() + 1);
          return originalDate.toISOString().split("T")[0];
        })(),
    season: data.Tournament.year
      ? data.Tournament.year.toString()
      : new Date(data.Tournament["start date"]).getFullYear().toString(),
    filename,
  };
}

function processTournament(data, eloData, filePath, fileContentsLower) {
  const tournamentInfo = buildTournamentInfo(data, filePath);

  log(`  Tournament: ${tournamentInfo.name}`);
  log(`  Date: ${tournamentInfo.date}, Season: ${tournamentInfo.season}`);
  log(
    `  Input teams: ${data.Teams?.length || 0}, Events: ${data.Events?.length || 0}, Placings: ${data.Placings?.length || 0}`
  );

  const tournamentSearchTextLower = buildTournamentSearchText(
    tournamentInfo,
    filePath,
    fileContentsLower
  );
  const importanceMultiplier = getTournamentImportanceMultiplierFromText(tournamentSearchTextLower);
  const isStateOrNational = isStateOrNationalTournamentFromText(tournamentSearchTextLower);
  const isNationalTournament = isNationalTournamentFromText(tournamentSearchTextLower);
  const isSatelliteTournament = tournamentSearchTextLower.includes("satellite");
  const satelliteMultiplier = isSatelliteTournament ? SATELLITE_TOURNAMENT_MULTIPLIER : 1;

  if (!metadata.tournaments.has(tournamentInfo.name)) {
    metadata.tournaments.set(tournamentInfo.name, nextTournamentId);
    metadata.tournamentIds[nextTournamentId] = tournamentInfo.name;
    log(`  New tournament registered: ID ${nextTournamentId}`);
    nextTournamentId++;
  }
  const tournamentId = metadata.tournaments.get(tournamentInfo.name);
  if (isNationalTournament) {
    nationalTournamentIds.add(tournamentId);
  }

  const worstPlacingsDropped =
    Number.parseInt(data?.Tournament?.["worst placings dropped"], 10) || 0;

  const trackSplits = shouldSplitByTrack(data);
  const trackGroups = trackSplits ? getTracksForSplitting(data) : [null];
  let nationalsLossTotal = 0;

  for (const track of trackGroups) {
    const scopedData = track ? filterTournamentByTrack(data, track) : data;
    const scopedLabel = track ? `track ${track}` : "all tracks";

    const {
      overallRankings,
      eventRankingsMap,
      teamStateMap,
      placingsByTeam,
      eventCompetitorCounts,
      eligibleEvents,
      teamNumberByName,
      teamAvgPlacements,
      teamPlacementCounts,
    } = analyzeAndRankTeams(scopedData, worstPlacingsDropped);

    log(`  Processed teams (${scopedLabel}): ${overallRankings.length} ranked teams`);
    log(`  Processing overall rankings (${scopedLabel})...`);

    if (
      !track &&
      REPORT_NATIONALS_LOSS &&
      isNationalTournament &&
      shouldIncludeNationalsLossYear(tournamentInfo.season)
    ) {
      nationalsLossTotal += reportNationalsLoss(
        overallRankings,
        eloData,
        tournamentInfo,
        teamStateMap
      );
    }

    updateEloForRanking(
      overallRankings,
      eloData,
      tournamentInfo,
      "__OVERALL__",
      teamStateMap,
      importanceMultiplier * satelliteMultiplier,
      isStateOrNational,
      isNationalTournament,
      {
        type: "overall",
        placingsByTeam,
        eventCompetitorCounts,
        eligibleEvents,
        teamNumberByName,
        teamAvgPlacements,
        teamPlacementCounts,
        worstPlacingsDropped,
      }
    );

    log(`  Processing ${eventRankingsMap.size} event rankings (${scopedLabel})...`);
    for (const [eventName, eventRankings] of eventRankingsMap.entries()) {
      updateEloForRanking(
        eventRankings,
        eloData,
        tournamentInfo,
        eventName,
        teamStateMap,
        importanceMultiplier * satelliteMultiplier,
        isStateOrNational,
        isNationalTournament,
        {
          type: "event",
          eventName,
          eventCompetitorCounts,
        }
      );
    }
  }

  return nationalsLossTotal;
}

function shouldSplitByTrack(data) {
  const teams = data?.Teams || [];
  const activeTeams = teams.filter((team) => !team.exhibition);
  const trackSet = new Set(activeTeams.map((team) => team.track).filter(Boolean));
  if (trackSet.size <= 1) {
    return false;
  }

  const teamTrack = new Map();
  for (const team of activeTeams) {
    teamTrack.set(team.number, team.track);
  }

  const placingsByEvent = new Map();
  for (const placing of data.Placings || []) {
    if (placing.place === null || placing.place === undefined) {
      continue;
    }
    const track = teamTrack.get(placing.team);
    if (!track) {
      continue;
    }
    let eventPlacings = placingsByEvent.get(placing.event);
    if (!eventPlacings) {
      eventPlacings = [];
      placingsByEvent.set(placing.event, eventPlacings);
    }
    eventPlacings.push({ place: placing.place, track });
  }

  for (const eventPlacings of placingsByEvent.values()) {
    const placeTracks = new Map();
    for (const entry of eventPlacings) {
      const tracks = placeTracks.get(entry.place);
      if (tracks) {
        tracks.add(entry.track);
      } else {
        placeTracks.set(entry.place, new Set([entry.track]));
      }
    }
    for (const tracks of placeTracks.values()) {
      if (tracks.size > 1) {
        return true;
      }
    }
  }

  return false;
}

function getTracksForSplitting(data) {
  const tracks = new Set();
  for (const team of data?.Teams || []) {
    if (team.exhibition) {
      continue;
    }
    if (team.track) {
      tracks.add(team.track);
    }
  }
  return Array.from(tracks);
}

function filterTournamentByTrack(data, track) {
  const teams = (data.Teams || []).filter(
    (team) => !team.exhibition && team.track === track
  );
  const teamIds = new Set(teams.map((team) => team.number));
  const placings = (data.Placings || []).filter((placing) =>
    teamIds.has(placing.team)
  );
  return {
    Tournament: data.Tournament,
    Events: data.Events,
    Teams: teams,
    Placings: placings,
  };
}

function getSeasonFromTournament(data, filePath) {
  if (data?.Tournament?.year) {
    return Number.parseInt(data.Tournament.year.toString(), 10);
  }
  if (data?.Tournament?.["start date"]) {
    const date = new Date(data.Tournament["start date"]);
    return date.getFullYear();
  }
  const filename = path.basename(filePath, ".yaml");
  const fileDate = filename.split("_")[0];
  const fileYear = Number.parseInt(fileDate.split("-")[0], 10);
  return Number.isNaN(fileYear) ? null : fileYear;
}

function shouldIncludeSeason(season, maxSeason, seasonsToInclude) {
  if (season === null || maxSeason === null || seasonsToInclude <= 0) {
    return true;
  }
  const minSeason = maxSeason - (seasonsToInclude - 1);
  return season >= minSeason;
}

function analyzeAndRankTeams(data, worstPlacingsDropped) {
  log(`    Analyzing ${data.Teams?.length || 0} teams...`);

  for (const team of data.Teams) {
    if (!team.state) {
      throw new Error(
        `Team ${team.number} (${team.school}) in tournament data is missing state code`
      );
    }
  }

  const placingsByTeam = new Map();
  const placingsByEvent = new Map();
  const teamsWithPlaces = new Set();
  const exhibitionTeams = new Set();
  for (const team of data.Teams || []) {
    if (team.exhibition) {
      exhibitionTeams.add(team.number);
    }
  }
  for (const placing of data.Placings || []) {
    let teamPlacings = placingsByTeam.get(placing.team);
    if (!teamPlacings) {
      teamPlacings = new Map();
      placingsByTeam.set(placing.team, teamPlacings);
    }
    teamPlacings.set(placing.event, placing);

    let eventPlacings = placingsByEvent.get(placing.event);
    if (!eventPlacings) {
      eventPlacings = [];
      placingsByEvent.set(placing.event, eventPlacings);
    }
    eventPlacings.push(placing);

    if (placing.place !== null && placing.place !== undefined) {
      teamsWithPlaces.add(placing.team);
    }
  }

  log(
    `    Processing ${data.Placings?.length || 0} placings across ${data.Events?.length || 0} events`
  );

  const noShowTeams = new Set();
  for (const team of data.Teams) {
    if (team.exhibition) {
      continue;
    }
    if (!teamsWithPlaces.has(team.number)) {
      noShowTeams.add(team.number);
      log(`    No-show detected: team ${team.number} (${team.school}) - no places in any events`);
    }
  }
  if (noShowTeams.size > 0) {
    log(`    Total no-show teams: ${noShowTeams.size}`);
  }

  const eventCompetitorCounts = new Map();
  const eligibleEvents = data.Events
    .map((event) => ({
      name: event.name,
      trial: event.trial,
      weight: event.trial ? 0 : 1,
    }))
    .filter((event) => event.weight > 0);
  const adjustedPlacingsByTeam = new Map();

  eligibleEvents.forEach((event) => {
    const placings = (placingsByEvent.get(event.name) || []).filter(
      (placing) =>
        placing.place !== null &&
        placing.place !== undefined &&
        !exhibitionTeams.has(placing.team) &&
        !noShowTeams.has(placing.team)
    );
    placings.sort((a, b) => a.place - b.place);

    let nextPlace = 1;
    let previousRawPlace = null;
    let previousAdjustedPlace = 1;
    for (const placing of placings) {
      const rawPlace = placing.place;
      if (previousRawPlace !== null && rawPlace !== previousRawPlace) {
        previousAdjustedPlace = nextPlace;
      }
      let teamPlacings = adjustedPlacingsByTeam.get(placing.team);
      if (!teamPlacings) {
        teamPlacings = new Map();
        adjustedPlacingsByTeam.set(placing.team, teamPlacings);
      }
      teamPlacings.set(event.name, previousAdjustedPlace);

      previousRawPlace = rawPlace;
      nextPlace += 1;
    }
    eventCompetitorCounts.set(event.name, placings.length);
  });
  log(`    Event competitor counts calculated for ${eventCompetitorCounts.size} events`);

  const teamScores = new Map();
  const teamAvgPlacements = new Map();
  const teamPlacementCounts = new Map();
  const activeTeams = data.Teams.filter(
    (team) => !team.exhibition && !noShowTeams.has(team.number)
  );
  const activeTeamCount = activeTeams.length;
  for (const team of activeTeams) {
    const teamPlacings = adjustedPlacingsByTeam.get(team.number) || new Map();
    let sumPlacements = 0;
    let countPlacements = 0;
    for (const event of eligibleEvents) {
      const placing = teamPlacings.get(event.name);
      if (placing !== null && placing !== undefined) {
        sumPlacements += placing * event.weight;
        countPlacements += event.weight;
      }
    }
    if (countPlacements > 0) {
      teamAvgPlacements.set(team.number, sumPlacements / countPlacements);
      teamPlacementCounts.set(team.number, countPlacements);
    } else {
      teamPlacementCounts.set(team.number, 0);
    }
  }
  for (const team of activeTeams) {
    if (noShowTeams.has(team.number)) {
      continue;
    }

    let totalScore = 0;
    const teamPlacings = adjustedPlacingsByTeam.get(team.number) || new Map();
    const averagePlacement = teamAvgPlacements.get(team.number);
    const eventScores = [];
    for (const event of eligibleEvents) {
      const placing = teamPlacings.get(event.name);
      const competitorCount = eventCompetitorCounts.get(event.name);
      const effectiveCompetitorCount =
        competitorCount && competitorCount > 0 ? competitorCount : activeTeamCount;
      const missingPenalty = Math.round(
        MISSING_PLACEMENT_PENALTY_FACTOR * effectiveCompetitorCount
      );
      const deadLastPenalty = Math.round(
        DEADLAST_PLACEMENT_PENALTY_FACTOR * effectiveCompetitorCount
      );
      if (placing !== null && placing !== undefined) {
        if (placing >= effectiveCompetitorCount) {
          eventScores.push(
            ((averagePlacement ?? effectiveCompetitorCount) + deadLastPenalty) * event.weight
          );
        } else {
          eventScores.push(placing * event.weight);
        }
      } else {
        eventScores.push(
          ((averagePlacement ?? effectiveCompetitorCount) + missingPenalty) * event.weight
        );
      }
    }
    if (worstPlacingsDropped > 0 && eventScores.length > 0) {
      eventScores.sort((a, b) => b - a);
      eventScores.splice(0, Math.min(worstPlacingsDropped, eventScores.length));
    }
    for (const score of eventScores) {
      totalScore += score;
    }
    teamScores.set(team.number, { teamData: team, score: totalScore });
  }

  const canonicalTeamMap = {};
  const teamStateMap = {};
  const teamNumberByName = {};
  const teamsBySchool = data.Teams.reduce((acc, team) => {
    if (team.exhibition) {
      return acc;
    }
    if (!acc[team.school]) {
      acc[team.school] = [];
    }
    acc[team.school].push(team);
    return acc;
  }, {});
  let newTeamsCount = 0;
  for (const school in teamsBySchool) {
    const schoolTeams = teamsBySchool[school]
      .map((t) => teamScores.get(t.number))
      .filter(Boolean)
      .sort((a, b) => a.score - b.score);
    if (schoolTeams[0]) {
      const teamName = `${school} Varsity`;
      canonicalTeamMap[schoolTeams[0].teamData.number] = teamName;
      teamStateMap[teamName] = schoolTeams[0].teamData.state;
      teamNumberByName[teamName] = schoolTeams[0].teamData.number;

      if (!metadata.teams.has(teamName)) {
        metadata.teams.set(teamName, nextTeamId);
        metadata.teamIds[nextTeamId] = teamName;
        newTeamsCount++;
        nextTeamId++;
      }
    }
    if (schoolTeams[1]) {
      const teamName = `${school} JV`;
      canonicalTeamMap[schoolTeams[1].teamData.number] = teamName;
      teamStateMap[teamName] = schoolTeams[1].teamData.state;
      teamNumberByName[teamName] = schoolTeams[1].teamData.number;

      if (!metadata.teams.has(teamName)) {
        metadata.teams.set(teamName, nextTeamId);
        metadata.teamIds[nextTeamId] = teamName;
        newTeamsCount++;
        nextTeamId++;
      }
    }
  }
  if (newTeamsCount > 0) {
    log(`    Registered ${newTeamsCount} new teams`);
  }

  const createRankedList = (scoreMap) => {
    return [...scoreMap.values()]
      .filter((t) => canonicalTeamMap[t.teamData.number])
      .map((t) => ({ name: canonicalTeamMap[t.teamData.number], score: t.score }))
      .sort((a, b) => a.score - b.score)
      .map((team, index, arr) => {
        const place =
          index > 0 && team.score === arr[index - 1].score ? arr[index - 1].place : index + 1;
        return { ...team, place };
      });
  };

  const overallRankings = createRankedList(teamScores);
  log(`    Overall rankings: ${overallRankings.length} teams ranked`);
  const eventRankingsMap = new Map();
  let newEventsCount = 0;
  for (const event of eligibleEvents) {
    if (!metadata.events.has(event.name)) {
      metadata.events.set(event.name, nextEventId);
      metadata.eventIds[nextEventId] = event.name;
      newEventsCount++;
      nextEventId++;
    }

    const eventScoreMap = new Map();
    const competitorCount = eventCompetitorCounts.get(event.name);
    if (!competitorCount) {
      continue;
    }
    for (const team of activeTeams) {
      const teamPlacing = (adjustedPlacingsByTeam.get(team.number) || new Map()).get(
        event.name
      );
      const place = teamPlacing ?? competitorCount + 1;
      eventScoreMap.set(team.number, { teamData: team, score: place });
    }
    eventRankingsMap.set(event.name, createRankedList(eventScoreMap));
  }
  if (newEventsCount > 0) {
    log(`    Registered ${newEventsCount} new events`);
  }

  const totalEventWeight = eligibleEvents.reduce((sum, event) => sum + event.weight, 0);

  return {
    canonicalTeamMap,
    overallRankings,
    eventRankingsMap,
    teamStateMap,
    placingsByTeam: adjustedPlacingsByTeam,
    eventCompetitorCounts,
    eligibleEvents,
    totalEventWeight,
    teamNumberByName,
    teamAvgPlacements,
    teamPlacementCounts,
  };
}

function updateEloForRanking(
  rankedTeams,
  eloData,
  tournamentInfo,
  category,
  teamStateMap,
  importanceMultiplier,
  isStateOrNational,
  isNationalTournament,
  scoreContext
) {
  if (rankedTeams.length < 2) {
    log(`      Skipping ${category}: insufficient teams (${rankedTeams.length})`);
    return;
  }

  const participatingTeams = rankedTeams.filter(
    (team) => team.place !== null && team.place !== undefined
  );
  if (participatingTeams.length < 2) {
    log(
      `      Skipping ${category}: insufficient participating teams (${participatingTeams.length})`
    );
    return;
  }
  log(`      Processing ${category}: ${participatingTeams.length} teams`);

  const tournamentId = metadata.tournaments.get(tournamentInfo.name);
  const resultLink = tournamentInfo.filename;

  const teamCount = participatingTeams.length;
  const numOpponents = teamCount - 1;
  const eventCount =
    scoreContext?.type === "overall"
      ? scoreContext.eligibleEvents.length
      : 1;
  const effectiveEventCount =
    scoreContext?.type === "overall" && scoreContext.worstPlacingsDropped > 0
      ? Math.max(1, eventCount - scoreContext.worstPlacingsDropped)
      : eventCount;

  if (!eventCount || eventCount < 1) {
    log(`      Skipping ${category}: no eligible events`);
    return;
  }
  const names = new Array(teamCount);
  const places = new Array(teamCount);
  const stateCodes = new Array(teamCount);
  const teamDataList = new Array(teamCount);
  const initialRatings = new Array(teamCount);
  const volatilityFactors = new Array(teamCount);
  const nameToIndex = new Map();

  let ratingSum = 0;
  let minRating = Number.POSITIVE_INFINITY;
  let maxRating = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < teamCount; i++) {
    const team = participatingTeams[i];
    const stateCode = teamStateMap[team.name];
    const teamData = getOrInitializeTeam(
      eloData,
      team.name,
      tournamentInfo.season,
      category,
      stateCode
    );

    names[i] = team.name;
    places[i] = team.place;
    stateCodes[i] = stateCode;
    teamDataList[i] = teamData;
    initialRatings[i] = Number.isFinite(teamData.rating) ? teamData.rating : STARTING_ELO;
    nameToIndex.set(team.name, i);

    ratingSum += initialRatings[i];
    if (initialRatings[i] < minRating) {
      minRating = initialRatings[i];
    }
    if (initialRatings[i] > maxRating) {
      maxRating = initialRatings[i];
    }

    const tournamentCount = teamData.history.length;
    if (tournamentCount === 0) {
      volatilityFactors[i] = FIRST_TOURNAMENT_VOLATILITY;
    } else if (tournamentCount === 1) {
      volatilityFactors[i] = SECOND_TOURNAMENT_VOLATILITY;
    } else {
      volatilityFactors[i] = NORMAL_VOLATILITY;
    }

    const momentumFactor = calculateMomentumVolatility(teamData.history);
    volatilityFactors[i] *= momentumFactor;
  }

  const avgInitialRating = ratingSum / teamCount;
  log(
    `        Initial ratings: avg=${avgInitialRating.toFixed(1)}, range=[${minRating.toFixed(1)}, ${maxRating.toFixed(1)}]`
  );

  const sortedRatings = initialRatings.slice().sort((a, b) => b - a);
  const clampedTopFraction = Math.min(1, Math.max(0.1, TOP_TEAMS_FRACTION));
  const topTeamsCount = Math.max(1, Math.floor(teamCount * clampedTopFraction));
  let topRatingsSum = 0;
  for (let i = 0; i < topTeamsCount; i++) {
    topRatingsSum += sortedRatings[i];
  }
  const averageElo = topRatingsSum / topTeamsCount;
  const competitivenessMultiplier =
    1 + (TOURNAMENT_COMPETITIVENESS_FACTOR * (averageElo - 1500)) / 1500;
  log(
    `        Top ${topTeamsCount} teams avg Elo: ${averageElo.toFixed(1)}, competitiveness multiplier: ${competitivenessMultiplier.toFixed(3)}`
  );

  log(`        Tournament importance multiplier: ${importanceMultiplier.toFixed(1)}`);

  const expRatings = new Array(teamCount);
  for (let i = 0; i < teamCount; i++) {
    expRatings[i] = 10 ** (initialRatings[i] / ELO_EXPECTED_SCALE);
  }

  const expectedRanks = new Array(teamCount);
  for (let i = 0; i < teamCount; i++) {
    let expectedScoreRaw = 0;
    const expA = expRatings[i];
    for (let j = 0; j < teamCount; j++) {
      if (i === j) {
        continue;
      }
      expectedScoreRaw += expA / (expA + expRatings[j]);
    }
    expectedRanks[i] = 1 + (numOpponents - expectedScoreRaw);
  }

  const actualScores = new Array(teamCount);
  if (scoreContext?.type === "overall") {
    for (let i = 0; i < teamCount; i++) {
      const teamNumber = scoreContext.teamNumberByName[names[i]];
      const teamPlacings = scoreContext.placingsByTeam.get(teamNumber) || new Map();
      const averagePlacement = scoreContext.teamAvgPlacements.get(teamNumber);
      const placementCount = scoreContext.teamPlacementCounts.get(teamNumber) ?? 0;
      let missingPlacings = 0;
      let deadLastPlacings = 0;
      let totalScore = 0;
      const eventScores = [];
      for (const event of scoreContext.eligibleEvents) {
        const placing = teamPlacings.get(event.name);
        const competitorCount = scoreContext.eventCompetitorCounts.get(event.name);
        const effectiveCompetitorCount =
          competitorCount && competitorCount > 0 ? competitorCount : teamCount;
        const missingPenalty = Math.round(
          MISSING_PLACEMENT_PENALTY_FACTOR * effectiveCompetitorCount
        );
        const deadLastPenalty = Math.round(
          DEADLAST_PLACEMENT_PENALTY_FACTOR * effectiveCompetitorCount
        );
        if (placing !== null && placing !== undefined) {
          if (placing >= effectiveCompetitorCount) {
            deadLastPlacings++;
            eventScores.push((averagePlacement ?? effectiveCompetitorCount) + deadLastPenalty);
          } else {
            eventScores.push(placing);
          }
        } else {
          missingPlacings++;
          eventScores.push((averagePlacement ?? effectiveCompetitorCount) + missingPenalty);
        }
      }
      if (scoreContext.worstPlacingsDropped > 0 && eventScores.length > 0) {
        eventScores.sort((a, b) => b - a);
        eventScores.splice(
          0,
          Math.min(scoreContext.worstPlacingsDropped, eventScores.length)
        );
      }
      for (const score of eventScores) {
        totalScore += score;
      }
      actualScores[i] = totalScore;
      if (
        DEBUG_TOURNAMENT_FILENAMES.has(tournamentInfo.filename) &&
        DEBUG_TEAM_NAMES.has(names[i])
      ) {
        console.log(
          `[Debug Score] ${tournamentInfo.filename} ${names[i]} score=${totalScore} missing=${missingPlacings} deadLast=${deadLastPlacings} avg=${averagePlacement} counted=${placementCount} dropped=${scoreContext.worstPlacingsDropped}`
        );
      }
    }
  } else {
    const competitorCount =
      scoreContext?.eventCompetitorCounts?.get(scoreContext.eventName) || teamCount;
    for (let i = 0; i < teamCount; i++) {
      const place = places[i];
      if (place === competitorCount) {
        actualScores[i] = Math.min(competitorCount, Math.max(1, expectedRanks[i]));
      } else {
        actualScores[i] = place;
      }
    }
  }

  const eloChanges = new Array(teamCount);
  let totalEloChange = 0;

  for (let i = 0; i < teamCount; i++) {
    const expectedTotalScore = expectedRanks[i] * effectiveEventCount;
    const actualTotalScore = actualScores[i];
    const actualAverageScore =
      scoreContext?.type === "overall"
        ? actualTotalScore / Math.max(1, effectiveEventCount)
        : actualTotalScore;
    const expectedAverageScore =
      scoreContext?.type === "overall" ? expectedRanks[i] : expectedTotalScore;
    const scoreDiff = expectedAverageScore - actualAverageScore;
    const normalization =
      scoreContext?.type === "overall"
        ? Math.max(1, numOpponents) * SCORE_NORMALIZATION_SCALE
        : Math.max(1, effectiveEventCount * numOpponents) * SCORE_NORMALIZATION_SCALE;
    let baseEloChange = ELO_PERFORMANCE_SCALING_FACTOR * (scoreDiff / normalization);
    if (category === "__OVERALL__") {
      const { attendanceCount, averageDelta } = getNationalsHistoryStats(
        eloData,
        stateCodes[i],
        names[i]
      );
      const attendanceScale = 1 + NATIONALS_ATTENDANCE_WEIGHT * Math.min(1, attendanceCount / 5);
      const averageDeltaNormalized = Math.max(-1, Math.min(1, averageDelta / 100));
      if (baseEloChange < 0 && averageDeltaNormalized > 0) {
        baseEloChange /= 1 + NATIONALS_RECENT_GAIN_WEIGHT * averageDeltaNormalized;
      } else if (baseEloChange > 0 && averageDeltaNormalized < 0) {
        baseEloChange /= 1 + NATIONALS_RECENT_GAIN_WEIGHT * Math.abs(averageDeltaNormalized);
      }
      baseEloChange /= attendanceScale;
    }
    const scaledEloChange =
      baseEloChange *
      volatilityFactors[i] *
      competitivenessMultiplier *
      importanceMultiplier;

    const dampingFactor = calculateEloDampingFactor(scaledEloChange);
    const change = scaledEloChange * dampingFactor;
    eloChanges[i] = change;
    totalEloChange += change;

    if (
      DEBUG_TOURNAMENT_FILENAMES.has(tournamentInfo.filename) &&
      DEBUG_TEAM_NAMES.has(names[i])
    ) {
      console.log(
        `[Debug Elo] ${tournamentInfo.filename} ${names[i]} expected=${expectedAverageScore.toFixed(
          2
        )} actual=${actualAverageScore.toFixed(2)} diff=${scoreDiff.toFixed(
          2
        )} base=${baseEloChange.toFixed(2)} vol=${volatilityFactors[i].toFixed(
          3
        )} comp=${competitivenessMultiplier.toFixed(3)} imp=${importanceMultiplier.toFixed(
          2
        )} change=${change.toFixed(2)}`
      );
    }

  }

  const averageChange = totalEloChange / teamCount;
  log(
    `        Total Elo change before zero-sum: ${totalEloChange.toFixed(2)}, average: ${averageChange.toFixed(2)}`
  );

  if (scoreContext?.type !== "overall") {
    for (let i = 0; i < teamCount; i++) {
      eloChanges[i] -= averageChange;
    }
  }

  let maxGain = Number.NEGATIVE_INFINITY;
  let maxLoss = Number.POSITIVE_INFINITY;
  for (let i = 0; i < teamCount; i++) {
    const change = eloChanges[i];
    if (change > maxGain) {
      maxGain = change;
    }
    if (change < maxLoss) {
      maxLoss = change;
    }
  }
  log(
    `        Elo changes after zero-sum: max gain=${maxGain.toFixed(1)}, max loss=${maxLoss.toFixed(1)}`
  );

  const teamsToConvertToJV = [];
  const MAX_ELO_LOSS = 200;
  let cappedLosses = 0;

  for (let i = 0; i < teamCount; i++) {
    if (eloChanges[i] < -MAX_ELO_LOSS) {
      log(
        `        Capping Elo loss for ${names[i]}: ${eloChanges[i].toFixed(1)} -> -${MAX_ELO_LOSS}`
      );
      eloChanges[i] = -MAX_ELO_LOSS;
      cappedLosses++;
    }

    if (
      names[i].includes(" Varsity") &&
      initialRatings[i] > 0 &&
      (eloChanges[i] / initialRatings[i]) <= -JV_CONVERSION_LOSS_RATIO &&
      !isStateOrNational
    ) {
      const teamData = teamDataList[i];
      if (
        JV_CONVERSION_MIN_TOURNAMENTS > 0 &&
        (teamData?.history?.length || 0) < JV_CONVERSION_MIN_TOURNAMENTS
      ) {
        continue;
      }
      teamsToConvertToJV.push(names[i]);
      log(
        `        Marking ${names[i]} for JV conversion (Elo: ${initialRatings[i].toFixed(1)}, change: ${eloChanges[i].toFixed(1)})`
      );
      if (
        DEBUG_TOURNAMENT_FILENAMES.has(tournamentInfo.filename) &&
        DEBUG_TEAM_NAMES.has(names[i])
      ) {
        console.log(
          `[Debug JV] ${tournamentInfo.filename} ${names[i]} ratio=${(
            eloChanges[i] / initialRatings[i]
          ).toFixed(4)} threshold=${JV_CONVERSION_LOSS_RATIO}`
        );
      }
    }
  }
  if (cappedLosses > 0) {
    log(`        Capped ${cappedLosses} team Elo losses`);
  }

  if (category === "__OVERALL__" && teamsToConvertToJV.length > 0) {
    log(
      `        Converting ${teamsToConvertToJV.length} teams from Varsity to JV and recalculating...`
    );

    const teamsToConvertSet = new Set(teamsToConvertToJV);
    const convertedTeams = [];
    for (const team of participatingTeams) {
      if (team.name.includes(" JV")) {
        continue;
      }
      const convertedName = teamsToConvertSet.has(team.name)
        ? team.name.replace(" Varsity", " JV")
        : team.name;
      convertedTeams.push({ name: convertedName, place: team.place });
    }

    const convertedCount = convertedTeams.length;
    const convertedNames = new Array(convertedCount);
    const convertedPlaces = new Array(convertedCount);
    const convertedActualScores = new Array(convertedCount);
    const recalculatedInitialRatings = new Array(convertedCount);
    const recalculatedVolatilityFactors = new Array(convertedCount);
    const convertedBaseRatings = new Array(convertedCount);

    for (let i = 0; i < convertedCount; i++) {
      const team = convertedTeams[i];
      const originalName = team.name.replace(" JV", " Varsity");
      const originalIndex = nameToIndex.get(originalName) ?? nameToIndex.get(team.name);

      convertedNames[i] = team.name;
      convertedPlaces[i] = team.place;
      recalculatedInitialRatings[i] = initialRatings[originalIndex];
      recalculatedVolatilityFactors[i] = volatilityFactors[originalIndex];
      convertedActualScores[i] = actualScores[originalIndex];

      const convertedStateCode =
        teamStateMap[team.name] || teamStateMap[originalName] || stateCodes[originalIndex];
      const convertedTeamData = getOrInitializeTeam(
        eloData,
        team.name,
        tournamentInfo.season,
        category,
        convertedStateCode
      );
      convertedBaseRatings[i] = convertedTeamData.rating;
    }

    const recalculatedSortedRatings = recalculatedInitialRatings.slice().sort((a, b) => b - a);
    const recalculatedTopTeamsCount = Math.max(1, Math.floor(convertedCount * 0.7));
    let recalculatedTopSum = 0;
    for (let i = 0; i < recalculatedTopTeamsCount; i++) {
      recalculatedTopSum += recalculatedSortedRatings[i];
    }
    const recalculatedAverageElo = recalculatedTopSum / recalculatedTopTeamsCount;
    const recalculatedCompetitivenessMultiplier =
      1 + (TOURNAMENT_COMPETITIVENESS_FACTOR * (recalculatedAverageElo - 1500)) / 1500;

    const recalculatedNumOpponents = convertedCount - 1;

    const convertedExpRatings = new Array(convertedCount);
    for (let i = 0; i < convertedCount; i++) {
      convertedExpRatings[i] = 10 ** (recalculatedInitialRatings[i] / 400);
    }

    const convertedExpectedRanks = new Array(convertedCount);
    for (let i = 0; i < convertedCount; i++) {
      let expectedScoreRaw = 0;
      const expA = convertedExpRatings[i];
      for (let j = 0; j < convertedCount; j++) {
        if (i === j) {
          continue;
        }
        expectedScoreRaw += expA / (expA + convertedExpRatings[j]);
      }
      convertedExpectedRanks[i] = 1 + (recalculatedNumOpponents - expectedScoreRaw);
    }

    const recalculatedEloChanges = new Array(convertedCount);
    let recalculatedTotalEloChange = 0;

    for (let i = 0; i < convertedCount; i++) {
      const expectedTotalScore = convertedExpectedRanks[i] * eventCount;
      const actualTotalScore = convertedActualScores[i];
      const scoreDiff = expectedTotalScore - actualTotalScore;
      const normalization =
        Math.max(1, eventCount * recalculatedNumOpponents) * SCORE_NORMALIZATION_SCALE;
      let baseEloChange = ELO_PERFORMANCE_SCALING_FACTOR * (scoreDiff / normalization);
      if (category === "__OVERALL__") {
        const stateCode = teamStateMap[convertedNames[i]] || stateCodes[i];
        const { attendanceCount, averageDelta } = getNationalsHistoryStats(
          eloData,
          stateCode,
          convertedNames[i]
        );
        const attendanceScale =
          1 + NATIONALS_ATTENDANCE_WEIGHT * Math.min(1, attendanceCount / 5);
        const averageDeltaNormalized = Math.max(-1, Math.min(1, averageDelta / 100));
        if (baseEloChange < 0 && averageDeltaNormalized > 0) {
          baseEloChange /= 1 + NATIONALS_RECENT_GAIN_WEIGHT * averageDeltaNormalized;
        } else if (baseEloChange > 0 && averageDeltaNormalized < 0) {
          baseEloChange /= 1 + NATIONALS_RECENT_GAIN_WEIGHT * Math.abs(averageDeltaNormalized);
        }
        baseEloChange /= attendanceScale;
      }
      const scaledEloChange =
        baseEloChange *
        recalculatedVolatilityFactors[i] *
        recalculatedCompetitivenessMultiplier *
        importanceMultiplier;

      const dampingFactor = calculateEloDampingFactor(scaledEloChange);
      let finalEloChange = scaledEloChange * dampingFactor;

      if (finalEloChange < -MAX_ELO_LOSS) {
        finalEloChange = -MAX_ELO_LOSS;
      }

      recalculatedEloChanges[i] = finalEloChange;
      recalculatedTotalEloChange += finalEloChange;
    }

    const recalculatedAverageChange = recalculatedTotalEloChange / convertedCount;

    if (scoreContext?.type !== "overall") {
      for (let i = 0; i < convertedCount; i++) {
        recalculatedEloChanges[i] -= recalculatedAverageChange;
      }
    }

    for (let i = 0; i < convertedCount; i++) {
      const teamName = convertedNames[i];
      const originalName = teamName.replace(" JV", " Varsity");
      const originalIndex = nameToIndex.get(originalName) ?? nameToIndex.get(teamName);
      const stateCode = teamStateMap[teamName] || teamStateMap[originalName];
      const teamData = getOrInitializeTeam(
        eloData,
        teamName,
        tournamentInfo.season,
        category,
        stateCode
      );
      let newElo = convertedBaseRatings[i] + recalculatedEloChanges[i];

      if (!Number.isFinite(newElo)) {
        newElo = convertedBaseRatings[i];
      }

      newElo = Math.max(ELO_FLOOR, newElo);

      const roundedElo = Math.round(newElo);
      teamData.rating = roundedElo;
      lastRatingByCategoryCache.set(`${stateCode}|${teamName}|${category}`, roundedElo);
      teamData.history.push({
        d: tournamentInfo.date,
        t: tournamentId,
        p: convertedPlaces[i],
        e: roundedElo,
        c: recalculatedEloChanges[i],
        l: resultLink,
        n: teamsToConvertSet.has(originalName)
          ? "Converted from Varsity due to large ELO drop"
          : undefined,
      });

      eloData[stateCode][teamName].meta.games += recalculatedNumOpponents;
      updateEventCount(eloData, stateCode, teamName, tournamentInfo.season, category);
    }
    log(`        Completed JV conversion and Elo updates for ${convertedTeams.length} teams`);
  } else {
    log(`        Updating Elo for ${participatingTeams.length} teams...`);

    for (let i = 0; i < teamCount; i++) {
      const stateCode = stateCodes[i];
      const teamData = teamDataList[i];
      let newElo = initialRatings[i] + eloChanges[i];

      if (!Number.isFinite(newElo)) {
        newElo = initialRatings[i];
      }

      newElo = Math.max(ELO_FLOOR, newElo);

      const roundedElo = Math.round(newElo);
      teamData.rating = roundedElo;
      lastRatingByCategoryCache.set(
        `${stateCode}|${names[i]}|${category}`,
        roundedElo
      );
      teamData.history.push({
        d: tournamentInfo.date,
        t: tournamentId,
        p: places[i],
        e: roundedElo,
        c: eloChanges[i],
        l: resultLink,
      });

      eloData[stateCode][names[i]].meta.games += numOpponents;
      updateEventCount(eloData, stateCode, names[i], tournamentInfo.season, category);
    }
  }
}

/**
 * Calculate damping factor for ELO changes using a continuous function.
 * Uses a smooth curve that applies more damping to larger changes.
 */
function calculateEloDampingFactor(eloChange) {
  const absChange = Math.abs(eloChange);

  const normalizedChange = absChange / ELO_DAMPING_SCALE;
  const dampingAmount = ELO_DAMPING_STRENGTH * (normalizedChange / (1 + normalizedChange));

  return 1 - dampingAmount;
}

function buildTournamentSearchText(tournamentInfo, filePath, fileContentsLower) {
  const searchTerms = [
    tournamentInfo.name,
    tournamentInfo.filename,
    path.basename(filePath, ".yaml"),
  ];

  if (fileContentsLower) {
    searchTerms.push(fileContentsLower);
  } else {
    try {
      const fileContents = fs.readFileSync(filePath, "utf8").toLowerCase();
      searchTerms.push(fileContents);
    } catch (e) {
      log(
        `        Warning: Could not read file contents for importance detection: ${e.message}`
      );
    }
  }

  return searchTerms.join(" ").toLowerCase();
}

/**
 * Detect if a tournament is a state or national tournament based on name, filename, and content.
 * Returns the appropriate multiplier (1.0 for regular tournaments).
 */
function getTournamentImportanceMultiplierFromText(combinedText) {
  if (
    combinedText.includes("national tournament") ||
    combinedText.includes("nationals") ||
    combinedText.includes("national championship")
  ) {
    log(`        Detected national tournament (multiplier: ${NATIONAL_TOURNAMENT_MULTIPLIER})`);
    return NATIONAL_TOURNAMENT_MULTIPLIER;
  }

  if (
    combinedText.includes("state tournament") ||
    combinedText.includes("states") ||
    combinedText.includes("state championship")
  ) {
    log(`        Detected state tournament (multiplier: ${STATE_TOURNAMENT_MULTIPLIER})`);
    return STATE_TOURNAMENT_MULTIPLIER;
  }

  return 1.0;
}

/**
 * Check if a tournament is a state or national tournament.
 * Returns true if it's a state or national tournament, false otherwise.
 */
function isStateOrNationalTournamentFromText(combinedText) {
  return (
    combinedText.includes("national tournament") ||
    combinedText.includes("nationals") ||
    combinedText.includes("national championship") ||
    combinedText.includes("state tournament") ||
    combinedText.includes("states") ||
    combinedText.includes("state championship")
  );
}

function isNationalTournamentFromText(combinedText) {
  return (
    combinedText.includes("national tournament") ||
    combinedText.includes("nationals") ||
    combinedText.includes("national championship")
  );
}

function shouldIncludeNationalsLossYear(season) {
  if (NATIONALS_LOSS_YEAR_WHITELIST.size === 0) {
    return true;
  }
  const year = Number.parseInt(season, 10);
  if (!Number.isFinite(year)) {
    return false;
  }
  return NATIONALS_LOSS_YEAR_WHITELIST.has(year);
}

function reportNationalsLoss(overallRankings, eloData, tournamentInfo, teamStateMap) {
  const entries = [];
  for (const team of overallRankings) {
    if (!Number.isFinite(team.place)) {
      continue;
    }
    const stateCode = teamStateMap[team.name];
    if (!stateCode) {
      continue;
    }
    const teamData = getOrInitializeTeam(
      eloData,
      team.name,
      tournamentInfo.season,
      "__OVERALL__",
      stateCode
    );
    if (!Number.isFinite(teamData.rating)) {
      continue;
    }
    entries.push({
      name: team.name,
      actualPlace: team.place,
      rating: teamData.rating,
    });
  }

  if (entries.length === 0) {
    console.log(
      `[Nationals Loss] ${tournamentInfo.name} (${tournamentInfo.date}) teams=0 loss=0.00`
    );
    return 0;
  }

  const totalTeams = Math.max(
    overallRankings.length,
    ...entries.map((entry) => Number(entry.actualPlace) || 0)
  );

  const year = Number.parseInt(tournamentInfo.season, 10);
  const debugEnabled =
    Number.isFinite(year) && NATIONALS_LOSS_DEBUG_YEARS.has(year);

  entries.sort((a, b) => b.rating - a.rating);
  const predictedPlace = new Map();
  for (let i = 0; i < entries.length; i++) {
    const basePredicted = i + 1;
    predictedPlace.set(entries[i].name, basePredicted);
  }

  if (debugEnabled) {
    const predictedRankings = [...entries]
      .map((entry) => ({
        name: entry.name,
        rating: entry.rating,
        predicted: predictedPlace.get(entry.name),
      }))
      .sort((a, b) => a.predicted - b.predicted);
    console.log(
      `[Nationals Loss Debug] ${tournamentInfo.name} (${tournamentInfo.date}) predicted rankings: ${predictedRankings
        .map(
          (entry, index) =>
            `${index + 1}. ${entry.name} (pred=${entry.predicted})`
        )
        .join(" | ")}`
    );
    const actualRankings = [...entries].sort(
      (a, b) => a.actualPlace - b.actualPlace
    );
    console.log(
      `[Nationals Loss Debug] ${tournamentInfo.name} (${tournamentInfo.date}) actual rankings: ${actualRankings
        .map(
          (entry) => `${entry.actualPlace}. ${entry.name} (${entry.rating.toFixed(1)})`
        )
        .join(" | ")}`
    );
  }

  let totalLoss = 0;
  const count = entries.length;
  const debugContributions = [];
  for (const entry of entries) {
    const predicted = predictedPlace.get(entry.name);
    const actualPlace = Number(entry.actualPlace);
    if (!predicted || !Number.isFinite(actualPlace)) {
      continue;
    }
    const diff = Math.abs(predicted - actualPlace);
    const placeBase = Math.max(1, totalTeams - actualPlace + 1);
    let weight = placeBase ** LOSS_WEIGHT_POWER;
    const topReference = Math.min(predicted, actualPlace);
    const topDepth = Math.exp(-Math.max(1, topReference) / TOP_WEIGHT_SCALE);
    weight *= 1 + TOP_RANK_WEIGHT * topDepth;

    const predictedScore = 1 / (1 + Math.exp((predicted - topReference) / SURPRISE_SHARPNESS));
    const actualScore = 1 / (1 + Math.exp((actualPlace - topReference) / SURPRISE_SHARPNESS));
    const surprise = Math.abs(predictedScore - actualScore);
    weight *= 1 + SURPRISE_WEIGHT * surprise;
    const contribution = weight * diff;
    totalLoss += contribution;

    if (debugEnabled) {
      debugContributions.push({
        name: entry.name,
        predicted,
        actual: actualPlace,
        diff,
        weight,
        contribution,
      });
    }
  }

  if (debugEnabled) {
    for (const entry of debugContributions) {
      console.log(
        `[Nationals Loss Debug] ${tournamentInfo.name} (${tournamentInfo.date}) ${entry.name} predicted=${entry.predicted} actual=${entry.actual} diff=${entry.diff.toFixed(
          2
        )} weight=${entry.weight.toFixed(
          3
        )} contribution=${entry.contribution.toFixed(2)}`
      );
    }
  }

  if (!Number.isFinite(totalLoss)) {
    totalLoss = 0;
  }

  console.log(
    `[Nationals Loss] ${tournamentInfo.name} (${tournamentInfo.date}) teams=${count} loss=${totalLoss.toFixed(
      2
    )}`
  );
  return totalLoss;
}

function calculateMomentumVolatility(history) {
  if (!history || history.length < 2) {
    return 1;
  }

  const windowSize = Math.max(0, MOMENTUM_WINDOW_SIZE);
  const sliceStart =
    windowSize > 0 && history.length > windowSize
      ? history.length - windowSize
      : 0;
  const recentHistory = history.slice(sliceStart);
  if (recentHistory.length < 2) {
    return 1;
  }

  let sum = 0;
  for (let i = 1; i < recentHistory.length; i++) {
    const current = recentHistory[i]?.e;
    const previous = recentHistory[i - 1]?.e;
    if (Number.isFinite(current) && Number.isFinite(previous)) {
      sum += Math.abs(current - previous);
    }
  }

  const avg = sum / (recentHistory.length - 1);
  const scaled = avg / MOMENTUM_VOLATILITY_SCALE;
  const clamped = Math.min(scaled, MAX_MOMENTUM_VOLATILITY - 1);
  return 1 + Math.max(0, clamped);
}

function getNationalsHistoryStats(eloData, stateCode, teamName) {
  const team = eloData?.[stateCode]?.[teamName];
  if (!team?.seasons) {
    return { attendanceCount: 0, averageDelta: 0 };
  }

  const nationalHistory = [];
  for (const season of Object.keys(team.seasons)) {
    const history = team.seasons[season]?.events?.__OVERALL__?.history || [];
    for (const entry of history) {
      if (nationalTournamentIds.has(entry.t) && Number.isFinite(entry.c)) {
        nationalHistory.push(entry);
      }
    }
  }

  if (nationalHistory.length === 0) {
    return { attendanceCount: 0, averageDelta: 0 };
  }

  nationalHistory.sort((a, b) => {
    const aTime = a.d ? new Date(a.d).getTime() : 0;
    const bTime = b.d ? new Date(b.d).getTime() : 0;
    return aTime - bTime;
  });

  const attendanceCount = nationalHistory.length;
  if (attendanceCount < 3) {
    return { attendanceCount, averageDelta: 0 };
  }
  const recent = nationalHistory.slice(-3);
  let sum = 0;
  for (const entry of recent) {
    sum += entry.c;
  }
  return {
    attendanceCount,
    averageDelta: sum / recent.length,
  };
}

function getOrInitializeTeam(eloData, teamName, season, category, stateCode) {
  if (!eloData[stateCode]) {
    eloData[stateCode] = {};
  }

  if (!eloData[stateCode][teamName]) {
    eloData[stateCode][teamName] = {
      seasons: {},
      meta: { games: 0, events: 0 },
    };
  }
  if (!eloData[stateCode][teamName].seasons[season]) {
    eloData[stateCode][teamName].seasons[season] = { events: {} };
  }

  if (!eloData[stateCode][teamName].seasons[season].events[category]) {
    let initialRating = STARTING_ELO;
    const currentSeasonInt = Number.parseInt(season, 10);
    const cacheKey = `${stateCode}|${teamName}|${category}`;
    const cachedRating = lastRatingByCategoryCache.get(cacheKey);

    if (Number.isFinite(cachedRating)) {
      initialRating = cachedRating;
    } else {
      const availableSeasons = Object.keys(eloData[stateCode][teamName].seasons)
        .map((s) => Number.parseInt(s, 10))
        .filter((s) => s < currentSeasonInt)
        .sort((a, b) => b - a);

      if (availableSeasons.length > 0) {
        for (const prevSeason of availableSeasons) {
          const prevSeasonStr = prevSeason.toString();
          if (eloData[stateCode][teamName].seasons[prevSeasonStr]?.events[category]) {
            const previousRating =
              eloData[stateCode][teamName].seasons[prevSeasonStr].events[category].rating;
            if (Number.isFinite(previousRating)) {
              initialRating = previousRating;
            }
            break;
          }
        }
      }
    }

    eloData[stateCode][teamName].seasons[season].events[category] = {
      rating: initialRating,
      history: [],
    };
  }

  return eloData[stateCode][teamName].seasons[season].events[category];
}

function updateEventCount(eloData, stateCode, teamName, season, category) {
  if (category === "__OVERALL__") {
    return;
  }

  const cacheKey = `${stateCode}|${teamName}|${season}`;
  let eventSet = eventCountCache.get(cacheKey);
  if (!eventSet) {
    eventSet = new Set();
    eventCountCache.set(cacheKey, eventSet);
  }
  if (!eventSet.has(category)) {
    eventSet.add(category);
  }

  eloData[stateCode][teamName].meta.events = eventSet.size;
}

/**
 * Generate state-based JSON files
 * Creates individual state files and metadata for better performance
 *
 * @param {Object} eloData - The complete Elo data object
 * @param {string} division - The division ('B' or 'C')
 * @param {Object} metadata - The metadata object with mappings
 */
async function generateStateFiles(eloData, division, metadata) {
  const statesDir = path.join(OUTPUT_DIR, `states${division}`);
  log(`\n  Generating state files for Division ${division}...`);
  log(`  Output directory: ${statesDir}`);

  await fsp.mkdir(statesDir, { recursive: true });
  log(`  Ensured output directory exists: ${statesDir}`);

  const stateCount = Object.keys(eloData).filter((stateCode) => STATE_NAMES[stateCode]).length;
  log(`  Processing ${stateCount} states...`);

  const tournamentTimeline = precalculateTournamentTimeline(eloData, metadata);
  const timelineSeasons = Object.keys(tournamentTimeline).length;
  const totalTournaments = Object.values(tournamentTimeline).reduce(
    (sum, tournaments) => sum + tournaments.length,
    0
  );
  log(`  Tournament timeline: ${totalTournaments} tournaments across ${timelineSeasons} seasons`);

  const metadataFile = {
    teams: metadata.teamIds,
    events: metadata.eventIds,
    tournaments: metadata.tournamentIds,
    states: {},
    stateToGroup: {},
    stateGroups: {},
    tournamentTimeline: tournamentTimeline,
  };

  log(
    `  Metadata: ${metadata.teamIds.length} teams, ${metadata.eventIds.length} events, ${metadata.tournamentIds.length} tournaments`
  );
  debugLog(
    `Division ${division}: writing state groups for ${Object.keys(eloData).length} states.`
  );

  const validStateCodes = Object.keys(eloData).filter((stateCode) => STATE_NAMES[stateCode]);
  validStateCodes.sort();

  let totalTeamsInFiles = 0;
  const writePromises = [];
  const groupSize = 10;
  let groupIndex = 0;

  for (let i = 0; i < validStateCodes.length; i += groupSize) {
    const groupStates = validStateCodes.slice(i, i + groupSize);
    const groupId = `group-${groupIndex}`;
    const groupFile = path.join(statesDir, `${groupId}.json`);
    const groupData = {};

    for (const stateCode of groupStates) {
      const stateData = eloData[stateCode];
      const teamsInState = Object.keys(stateData).length;
      totalTeamsInFiles += teamsInState;

      groupData[stateCode] = stateData;
      metadataFile.states[stateCode] = getStateName(stateCode);
      metadataFile.stateToGroup[stateCode] = groupId;
    }

    metadataFile.stateGroups[groupId] = groupStates;

    const groupJson = JSON.stringify(groupData);
    const fileSize = groupJson.length;
    writePromises.push(fsp.writeFile(groupFile, groupJson));

    log(
      `  Generated ${groupId}.json: ${groupStates.length} states, ${(fileSize / 1024).toFixed(1)} KB`
    );
    groupIndex++;
  }

  await Promise.all(writePromises);
  debugLog(`Division ${division}: wrote ${writePromises.length} group files.`);
  log(`  Total teams across all states: ${totalTeamsInFiles}`);

  const metaFile = path.join(statesDir, "meta.json");
  const metaJson = JSON.stringify(metadataFile);
  const metaFileSize = metaJson.length;
  await fsp.writeFile(metaFile, metaJson);

  log(`  Generated meta.json: ${(metaFileSize / 1024).toFixed(1)} KB`);
  log(`  State-based files created in: ${statesDir}`);
}

/**
 * Precalculate tournament timeline data for all seasons
 * This creates a comprehensive list of all tournaments with their dates and links
 *
 * @param {Object} eloData - The complete Elo data object
 * @param {Object} metadata - The metadata object with mappings
 * @returns {Object} Tournament timeline data organized by season
 */
function precalculateTournamentTimeline(eloData, metadata) {
  const timeline = {};
  const seenTournaments = new Set();

  for (const stateCode in eloData) {
    if (!STATE_NAMES[stateCode]) {
      continue;
    }
    for (const schoolName in eloData[stateCode]) {
      const school = eloData[stateCode][schoolName];

      Object.entries(school.seasons).forEach(([season, seasonData]) => {
        if (!timeline[season]) {
          timeline[season] = [];
        }

        const overallEvent = seasonData.events.__OVERALL__;
        if (overallEvent?.history) {
          overallEvent.history.forEach((entry) => {
            if (entry.d && entry.t !== undefined && entry.l) {
              const tournamentKey = `${entry.d}-${entry.t}`;

              if (!seenTournaments.has(tournamentKey)) {
                seenTournaments.add(tournamentKey);

                const timelineEntry = {
                  date: entry.d,
                  tournamentId: entry.t,
                  tournamentName:
                    processTournamentName(metadata.tournamentIds[entry.t]) ||
                    `Tournament ${entry.t}`,
                  link: entry.l,
                  season: season,
                };

                timeline[season].push(timelineEntry);
              }
            }
          });
        }
      });
    }
  }

  for (const season in timeline) {
    timeline[season].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  return timeline;
}

/**
 * Get state name from state code
 * @param {string} stateCode - Two-letter state code
 * @returns {string} Full state name
 */
function getStateName(stateCode) {
  return STATE_NAMES[stateCode] || stateCode;
}
if (isMainThread) {
  main().catch(console.error);
} else {
  processDivision(workerData.division)
    .then(() => {
      parentPort?.postMessage({ division: workerData.division, ok: true });
    })
    .catch((error) => {
      parentPort?.postMessage({
        division: workerData.division,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    });
}

function runDivisionWorker(division) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, { workerData: { division } });

    worker.on("message", (message) => {
      if (message?.ok) {
        resolve(undefined);
      } else {
        reject(new Error(message?.error || `Division ${division} failed`));
      }
    });

    worker.on("error", (error) => {
      reject(error);
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Division ${division} exited with code ${code}`));
      }
    });
  });
}

function parseTournamentFiles(tournamentFiles) {
  const results = new Array(tournamentFiles.length);
  if (tournamentFiles.length === 0) {
    return Promise.resolve(results);
  }

  const workerPath = path.join(__dirname, "analyticsWorker.js");
  const maxWorkers = Math.min(
    Math.max(1, os.cpus().length - 1),
    8,
    tournamentFiles.length
  );

  let nextIndex = 0;
  let completed = 0;
  let activeWorkers = 0;
  let done = false;

  return new Promise((resolve) => {
    const workers = new Set();
    let fallbackTriggered = false;
    let fallbackTimer = null;
    const startWorker = () => {
      if (nextIndex >= tournamentFiles.length) {
        return;
      }

      const worker = new Worker(workerPath);
      activeWorkers++;
      workers.add(worker);
      let currentIndex = null;
      let terminated = false;

      const assignTask = () => {
        if (nextIndex >= tournamentFiles.length) {
          terminated = true;
          terminated = true;
          worker.terminate().finally(() => {
            workers.delete(worker);
            activeWorkers--;
            if (!done && completed >= tournamentFiles.length && activeWorkers === 0) {
              resolveResults();
            }
          });
          return;
        }

        const index = nextIndex++;
        const file = tournamentFiles[index];
        currentIndex = index;
        worker.postMessage({ index, file });
      };

      worker.on("message", (message) => {
        currentIndex = null;
        results[message.index] = message;
        completed++;

        if (completed >= tournamentFiles.length) {
          terminated = true;
          terminated = true;
          worker.terminate().finally(() => {
            workers.delete(worker);
            activeWorkers--;
            if (!done && activeWorkers === 0) {
              resolveResults();
            }
          });
          return;
        }

        assignTask();
      });

      worker.on("error", (err) => {
        if (currentIndex !== null) {
          results[currentIndex] = {
            index: currentIndex,
            file: tournamentFiles[currentIndex],
            error: err.message,
          };
          completed++;
          currentIndex = null;
          if (completed >= tournamentFiles.length) {
            worker.terminate().finally(() => {
              activeWorkers--;
              if (!done && activeWorkers === 0) {
                resolveResults();
              }
            });
            return;
          }
          assignTask();
        }
      });

      worker.on("exit", (code) => {
        if (terminated) {
          return;
        }
        workers.delete(worker);
        activeWorkers--;
        if (code === 0 || done) {
          if (!done && activeWorkers === 0 && completed >= tournamentFiles.length) {
            resolveResults();
          }
          return;
        }
        if (currentIndex !== null) {
          results[currentIndex] = {
            index: currentIndex,
            file: tournamentFiles[currentIndex],
            error: `worker exited with code ${code}`,
          };
          completed++;
          currentIndex = null;
        }
        if (completed >= tournamentFiles.length && activeWorkers === 0 && !done) {
          resolveResults();
          return;
        }
        if (nextIndex < tournamentFiles.length && !done) {
          startWorker();
        }
      });

      assignTask();
    };

    const resolveResults = async () => {
      if (done) {
        return;
      }
      done = true;
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
      for (const worker of workers) {
        worker.terminate();
      }

      const fallbackPromises = [];
      for (let i = 0; i < results.length; i++) {
        if (!results[i] || results[i].error) {
          const file = tournamentFiles[i];
          fallbackPromises.push(
            fsp
              .readFile(file, "utf8")
              .then((fileContents) => ({
                index: i,
                file,
                data: yaml.load(fileContents),
                fileContentsLower: fileContents.toLowerCase(),
              }))
              .catch((e) => ({
                index: i,
                file,
                error: e.message,
              }))
          );
        }
      }

      if (fallbackPromises.length > 0) {
        const fallbackResults = await Promise.all(fallbackPromises);
        for (const fallback of fallbackResults) {
          results[fallback.index] = fallback;
        }
      }

      resolve(results);
    };

    fallbackTimer = setTimeout(() => {
      if (done) {
        return;
      }
      fallbackTriggered = true;
      debugLog("Worker parsing stalled; falling back to in-process parsing.");
      resolveResults();
    }, 10000);

    for (let i = 0; i < maxWorkers; i++) {
      startWorker();
    }

  });
}
