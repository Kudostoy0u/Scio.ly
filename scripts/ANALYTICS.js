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
let ELO_FLOOR = 100;

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
let SECOND_TOURNAMENT_VOLATILITY = 1.1; // 1.5x more volatile for second tournament
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
let DIVISIONS_TO_PROCESS = ["C"]; // Set to ["B"], ["C"], or ["B", "C"]
let SEASONS_TO_INCLUDE = 4; // 0 = all seasons
let WRITE_OUTPUT = true; // Write JSON output to public/
let REPORT_NATIONALS_LOSS = true; // Log nationals loss metrics
let LOSS_WEIGHT_POWER = 2; // Higher = more weight for top finishers
let TOP_WEIGHT_SCALE = 12; // Lower = sharper emphasis near the top
let TOP_RANK_WEIGHT = 2.5;
let SURPRISE_WEIGHT = 4.0;
let SURPRISE_SHARPNESS = 8;
let MOMENTUM_VOLATILITY_SCALE = 150;
let MAX_MOMENTUM_VOLATILITY = 3;
let SCORE_NORMALIZATION_SCALE = 1;
let LOSS_OUTPUT = "none"; // none | total
let JV_CONVERSION_LOSS_RATIO = 0.02;
const DEBUG_TOURNAMENT_FILENAMES = new Set(["2024-11-08_monta_vista_invitational_c"]);
const DEBUG_TEAM_NAMES = new Set([
  "Monta Vista High School Varsity",
  "Monta Vista High School JV",
]);

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

  STARTING_ELO = parseNumber(args["starting-elo"], STARTING_ELO);
  ELO_FLOOR = parseNumber(args["elo-floor"], ELO_FLOOR);
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
  SECOND_TOURNAMENT_VOLATILITY = parseNumber(
    args["second-tournament-volatility"],
    SECOND_TOURNAMENT_VOLATILITY
  );
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
  MAX_MOMENTUM_VOLATILITY = parseNumber(
    args["max-momentum-volatility"],
    MAX_MOMENTUM_VOLATILITY
  );
  SCORE_NORMALIZATION_SCALE = parseNumber(
    args["score-normalization-scale"],
    SCORE_NORMALIZATION_SCALE
  );
  JV_CONVERSION_LOSS_RATIO = parseNumber(
    args["jv-conversion-loss-ratio"],
    JV_CONVERSION_LOSS_RATIO
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

function processTournament(data, eloData, filePath, fileContentsLower) {
  const filename = path.basename(filePath, ".yaml");
  const rawTournamentName =
    data.Tournament.name ||
    (() => {
      const parts = filename.split("_");
      return parts.slice(1, -1).join(" ");
    })();

  const tournamentInfo = {
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
    filename: filename,
  };

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

  if (!metadata.tournaments.has(tournamentInfo.name)) {
    metadata.tournaments.set(tournamentInfo.name, nextTournamentId);
    metadata.tournamentIds[nextTournamentId] = tournamentInfo.name;
    log(`  New tournament registered: ID ${nextTournamentId}`);
    nextTournamentId++;
  }

  const {
    canonicalTeamMap,
    overallRankings,
    eventRankingsMap,
    teamStateMap,
    placingsByTeam,
    eventCompetitorCounts,
    eligibleEvents,
    teamNumberByName,
    teamAvgPlacements,
    teamPlacementCounts,
  } = analyzeAndRankTeams(data);

  log(`  Processed teams: ${overallRankings.length} ranked teams`);
  log("  Processing overall rankings...");

  let nationalsLoss = 0;
  if (REPORT_NATIONALS_LOSS && isNationalTournament) {
    nationalsLoss = reportNationalsLoss(overallRankings, eloData, tournamentInfo, teamStateMap);
  }

  updateEloForRanking(
    overallRankings,
    eloData,
    tournamentInfo,
    "__OVERALL__",
    teamStateMap,
      importanceMultiplier,
      isStateOrNational,
      {
        type: "overall",
        placingsByTeam,
        eventCompetitorCounts,
        eligibleEvents,
        teamNumberByName,
        teamAvgPlacements,
        teamPlacementCounts,
      }
    );

  log(`  Processing ${eventRankingsMap.size} event rankings...`);
  for (const [eventName, eventRankings] of eventRankingsMap.entries()) {
    updateEloForRanking(
      eventRankings,
      eloData,
      tournamentInfo,
      eventName,
      teamStateMap,
      importanceMultiplier,
      isStateOrNational,
      {
        type: "event",
        eventName,
        eventCompetitorCounts,
      }
    );
  }

  return nationalsLoss;
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

function analyzeAndRankTeams(data) {
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
    if (!teamsWithPlaces.has(team.number)) {
      noShowTeams.add(team.number);
      log(`    No-show detected: team ${team.number} (${team.school}) - no places in any events`);
    }
  }
  if (noShowTeams.size > 0) {
    log(`    Total no-show teams: ${noShowTeams.size}`);
  }

  const eventCompetitorCounts = new Map();
  const eligibleEvents = data.Events.filter((event) => !event.trial);

  eligibleEvents.forEach((event) => {
    const placings = placingsByEvent.get(event.name) || [];
    const competitors = new Set();
    for (const placing of placings) {
      if (placing.place && !noShowTeams.has(placing.team)) {
        competitors.add(placing.team);
      }
    }
    eventCompetitorCounts.set(event.name, competitors.size);
  });
  log(`    Event competitor counts calculated for ${eventCompetitorCounts.size} events`);

  const teamScores = new Map();
  const teamAvgPlacements = new Map();
  const teamPlacementCounts = new Map();
  const activeTeamCount = data.Teams.length - noShowTeams.size;
  for (const team of data.Teams) {
    if (noShowTeams.has(team.number)) {
      continue;
    }
    const teamPlacings = placingsByTeam.get(team.number) || new Map();
    let sumPlacements = 0;
    let countPlacements = 0;
    for (const event of eligibleEvents) {
      const placing = teamPlacings.get(event.name);
      if (placing?.place) {
        sumPlacements += placing.place;
        countPlacements++;
      }
    }
    if (countPlacements > 0) {
      teamAvgPlacements.set(team.number, sumPlacements / countPlacements);
      teamPlacementCounts.set(team.number, countPlacements);
    } else {
      teamPlacementCounts.set(team.number, 0);
    }
  }
  for (const team of data.Teams) {
    if (noShowTeams.has(team.number)) {
      continue;
    }

    let totalScore = 0;
    const teamPlacings = placingsByTeam.get(team.number) || new Map();
    const averagePlacement = teamAvgPlacements.get(team.number);
    for (const event of eligibleEvents) {
      const placing = teamPlacings.get(event.name);
      const competitorCount = eventCompetitorCounts.get(event.name);
      const effectiveCompetitorCount =
        competitorCount && competitorCount > 0 ? competitorCount : activeTeamCount;
      const penalty = Math.round(0.2 * effectiveCompetitorCount);
      if (placing?.place) {
        if (placing.place >= effectiveCompetitorCount) {
          totalScore += (averagePlacement ?? effectiveCompetitorCount) + penalty;
        } else {
          totalScore += placing.place;
        }
      } else {
        totalScore += (averagePlacement ?? effectiveCompetitorCount) + penalty;
      }
    }
    teamScores.set(team.number, { teamData: team, score: totalScore });
  }

  const canonicalTeamMap = {};
  const teamStateMap = {};
  const teamNumberByName = {};
  const teamsBySchool = data.Teams.reduce((acc, team) => {
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
    for (const team of data.Teams) {
      if (noShowTeams.has(team.number)) {
        continue;
      }
      const teamPlacing = (placingsByTeam.get(team.number) || new Map()).get(event.name);
      const place = teamPlacing?.place ? teamPlacing.place : competitorCount + 1;
      eventScoreMap.set(team.number, { teamData: team, score: place });
    }
    eventRankingsMap.set(event.name, createRankedList(eventScoreMap));
  }
  if (newEventsCount > 0) {
    log(`    Registered ${newEventsCount} new events`);
  }

  return {
    canonicalTeamMap,
    overallRankings,
    eventRankingsMap,
    teamStateMap,
    placingsByTeam,
    eventCompetitorCounts,
    eligibleEvents,
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
    initialRatings[i] = teamData.rating;
    nameToIndex.set(team.name, i);

    ratingSum += teamData.rating;
    if (teamData.rating < minRating) {
      minRating = teamData.rating;
    }
    if (teamData.rating > maxRating) {
      maxRating = teamData.rating;
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
  const topTeamsCount = Math.max(1, Math.floor(teamCount * 0.7));
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
    expRatings[i] = 10 ** (initialRatings[i] / 400);
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
      for (const event of scoreContext.eligibleEvents) {
        const placing = teamPlacings.get(event.name);
        const competitorCount = scoreContext.eventCompetitorCounts.get(event.name);
        const effectiveCompetitorCount =
          competitorCount && competitorCount > 0 ? competitorCount : teamCount;
        const penalty = Math.round(0.2 * effectiveCompetitorCount);
        if (placing?.place) {
          if (placing.place >= effectiveCompetitorCount) {
            deadLastPlacings++;
            totalScore += (averagePlacement ?? effectiveCompetitorCount) + penalty;
          } else {
            totalScore += placing.place;
          }
        } else {
          missingPlacings++;
          totalScore += (averagePlacement ?? effectiveCompetitorCount) + penalty;
        }
      }
      actualScores[i] = totalScore;
      if (
        DEBUG_TOURNAMENT_FILENAMES.has(tournamentInfo.filename) &&
        DEBUG_TEAM_NAMES.has(names[i])
      ) {
        console.log(
          `[Debug Score] ${tournamentInfo.filename} ${names[i]} score=${totalScore} missing=${missingPlacings} deadLast=${deadLastPlacings} avg=${averagePlacement} counted=${placementCount}`
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
    const expectedTotalScore = expectedRanks[i] * eventCount;
    const actualTotalScore = actualScores[i];
    const scoreDiff = expectedTotalScore - actualTotalScore;
    const normalization = Math.max(1, eventCount * numOpponents) * SCORE_NORMALIZATION_SCALE;
    const baseEloChange = ELO_PERFORMANCE_SCALING_FACTOR * (scoreDiff / normalization);
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
        `[Debug Elo] ${tournamentInfo.filename} ${names[i]} expected=${expectedTotalScore.toFixed(
          2
        )} actual=${actualTotalScore.toFixed(2)} diff=${scoreDiff.toFixed(2)} base=${baseEloChange.toFixed(
          2
        )} vol=${volatilityFactors[i].toFixed(3)} comp=${competitivenessMultiplier.toFixed(
          3
        )} imp=${importanceMultiplier.toFixed(2)} change=${change.toFixed(2)}`
      );
    }
  }

  const averageChange = totalEloChange / teamCount;
  log(
    `        Total Elo change before zero-sum: ${totalEloChange.toFixed(2)}, average: ${averageChange.toFixed(2)}`
  );

  for (let i = 0; i < teamCount; i++) {
    eloChanges[i] -= averageChange;
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
      const baseEloChange = ELO_PERFORMANCE_SCALING_FACTOR * (scoreDiff / normalization);
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

    for (let i = 0; i < convertedCount; i++) {
      recalculatedEloChanges[i] -= recalculatedAverageChange;
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

      newElo = Math.max(ELO_FLOOR, newElo);

      const roundedElo = Math.round(newElo);
      teamData.rating = roundedElo;
      lastRatingByCategoryCache.set(`${stateCode}|${teamName}|${category}`, roundedElo);
      teamData.history.push({
        d: tournamentInfo.date,
        t: tournamentId,
        p: convertedPlaces[i],
        e: roundedElo,
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

  entries.sort((a, b) => b.rating - a.rating);
  const predictedPlace = new Map();
  for (let i = 0; i < entries.length; i++) {
    predictedPlace.set(entries[i].name, i + 1);
  }

  let totalLoss = 0;
  const count = entries.length;
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
    totalLoss += weight * diff;
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

  let sum = 0;
  for (let i = 1; i < history.length; i++) {
    const current = history[i]?.e;
    const previous = history[i - 1]?.e;
    if (Number.isFinite(current) && Number.isFinite(previous)) {
      sum += Math.abs(current - previous);
    }
  }

  const avg = sum / (history.length - 1);
  const scaled = avg / MOMENTUM_VOLATILITY_SCALE;
  const clamped = Math.min(scaled, MAX_MOMENTUM_VOLATILITY - 1);
  return 1 + Math.max(0, clamped);
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

    if (cachedRating !== undefined) {
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
            initialRating =
              eloData[stateCode][teamName].seasons[prevSeasonStr].events[category].rating;
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
