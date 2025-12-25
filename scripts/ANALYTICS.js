const fs = require("node:fs");
const path = require("node:path");
const glob = require("glob");
const yaml = require("js-yaml");

// --- configuration ---
const DEFAULT_HYPERPARAMS_PATH = path.join(__dirname, "HYPERPARAMS.json");
const DEFAULTS = {
  resultsDir: "results",
  outputDir: "./public",
  startingElo: 1500,
  eloFloor: 100,
  eloPerformanceScalingFactor: 140,
  tournamentCompetitivenessFactor: 0.5,
  firstTournamentVolatility: 1.5,
  secondTournamentVolatility: 1.1,
  normalVolatility: 1.0,
  stateTournamentMultiplier: 4.0,
  nationalTournamentMultiplier: 7.0,
  stateTrendMultiplier: 1.0,
  nationalTrendMultiplier: 1.0,
  trendSeasons: 0,
  pastSeasons: 0,
  eloDampingScale: 100,
  eloDampingStrength: 0.3,
  nationalLossWeight: 3.0,
  stateLossWeight: 1.0,
  rankWeightExponent: 1.0,
  maxEloLoss: 200,
  jvLossThreshold: 100,
  topTeamsFraction: 0.7,
  seasonTrendMultiplier: 0.2,
  trendWindow: 3,
  skipOutput: false,
  metricsOut: "",
  printLoss: false,
  enableLogging: false,
};

const hyperparamsPath = resolveHyperparamsPath(process.argv.slice(2), DEFAULT_HYPERPARAMS_PATH);
const config = loadConfig(DEFAULTS, hyperparamsPath);

/**
 * Logger function that only outputs if logging is enabled
 * @param {...any} args - Arguments to log (same as console.log)
 */
function log(..._args) {
  if (config.enableLogging) {
    console.log(..._args);
  }
}

function resolveHyperparamsPath(args, defaultPath) {
  const value = getArgValue(args, "hyperparamsPath");
  return value || defaultPath;
}

function getArgValue(args, keyName) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      continue;
    }
    const [rawKey, rawValue] = arg.slice(2).split("=");
    const key = toCamel(rawKey);
    if (key !== keyName) {
      continue;
    }
    if (rawValue !== undefined) {
      return rawValue;
    }
    const next = args[i + 1];
    if (next && !next.startsWith("--")) {
      return next;
    }
    return "";
  }
  return "";
}

function loadConfig(defaults, paramsPath) {
  const args = process.argv.slice(2);
  const configValues = { ...defaults };

  if (paramsPath && fs.existsSync(paramsPath)) {
    try {
      const fileConfig = JSON.parse(fs.readFileSync(paramsPath, "utf8"));
      if (fileConfig && typeof fileConfig === "object") {
        for (const [key, value] of Object.entries(fileConfig)) {
          if (key in configValues) {
            configValues[key] = value;
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to read ${paramsPath}: ${error.message}`);
    }
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      continue;
    }

    const [rawKey, rawValue] = arg.slice(2).split("=");
    let value = rawValue;
    if (value === undefined) {
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        value = next;
        i++;
      } else {
        value = "true";
      }
    }

    const key = toCamel(rawKey);
    if (!(key in configValues)) {
      continue;
    }

    if (value === "true" || value === "false") {
      configValues[key] = value === "true";
    } else if (!Number.isNaN(Number(value))) {
      configValues[key] = Number(value);
    } else {
      configValues[key] = value;
    }
  }

  return configValues;
}

function toCamel(input) {
  return input.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
}

const metadata = {
  teams: new Map(), // teamname -> id
  events: new Map(), // eventname -> id
  tournaments: new Map(), // tournamentname -> id
  teamIds: [], // [teamname, ...]
  eventIds: [], // [eventname, ...]
  tournamentIds: [], // [tournamentname, ...]
};

const predictionStats = {
  totalLoss: 0,
  tournamentCount: 0,
  stateLoss: 0,
  nationalLoss: 0,
};

let nextTeamId = 0;
let nextEventId = 0;
let nextTournamentId = 0;

// --- main execution ---
async function main() {
  log("=== Starting Analytics Processing ===");
  log("Processing divisions: B, C");
  for (const division of ["B", "C"]) {
    log(`\n--- Processing Division ${division} ---`);
    await processDivision(division);
  }
  log("\n=== Analytics Processing Complete ===");

  const metrics = buildMetricsSummary();
  if (config.printLoss) {
    console.log(`Prediction loss: ${metrics.totalLoss.toFixed(4)}`);
  }
  if (config.metricsOut) {
    fs.writeFileSync(config.metricsOut, JSON.stringify(metrics, null, 2));
  }
}

async function processDivision(division) {
  const eloData = {};

  const tournamentFiles = glob.sync(
    `${config.resultsDir}/**/*_${division.toLowerCase()}.yaml`
  );
  tournamentFiles.sort();

  log(`Found ${tournamentFiles.length} tournament files for Division ${division}`);
  if (tournamentFiles.length === 0) {
    log(`No tournament files found for Division ${division}, skipping...`);
    return;
  }
  log(`Tournament files: ${tournamentFiles.map((f) => path.basename(f)).join(", ")}`);

  let tournamentEntries = [];
  for (const file of tournamentFiles) {
    log(`\nProcessing ${path.basename(file)}...`);
    try {
      const fileContents = fs.readFileSync(file, "utf8");
      const fileContentsLower = fileContents.toLowerCase();
      const tournamentData = yaml.load(fileContents);
      if (tournamentData) {
        log(`  Loaded tournament data from ${path.basename(file)}`);
        const tournamentInfo = buildTournamentInfo(tournamentData, file);
        tournamentEntries.push({
          file,
          tournamentData,
          fileContentsLower,
          tournamentInfo,
        });
      } else {
        log(`  Warning: No tournament data found in ${path.basename(file)}`);
      }
    } catch (e) {
      log(`  Error processing ${path.basename(file)}: ${e.message}`);
      if (e.message.includes("missing state code")) {
        process.exit(1);
      }
    }
  }

  if (config.pastSeasons > 0) {
    const seasons = tournamentEntries
      .map((entry) => Number.parseInt(entry.tournamentInfo.season, 10))
      .filter((season) => Number.isFinite(season));
    const maxSeason = seasons.length > 0 ? Math.max(...seasons) : null;
    if (maxSeason !== null) {
      const minSeason = maxSeason - config.pastSeasons + 1;
      tournamentEntries = tournamentEntries.filter((entry) => {
        const season = Number.parseInt(entry.tournamentInfo.season, 10);
        return Number.isFinite(season) && season >= minSeason;
      });
      log(
        `Filtered tournaments to seasons ${minSeason}-${maxSeason} (pastSeasons=${config.pastSeasons})`
      );
    }
  }

  for (const entry of tournamentEntries) {
    processTournament(
      entry.tournamentData,
      eloData,
      entry.file,
      entry.fileContentsLower,
      entry.tournamentInfo
    );
  }

  const _optimizedData = {
    meta: {
      teams: metadata.teamIds,
      events: metadata.eventIds,
      tournaments: metadata.tournamentIds,
    },
    data: eloData,
  };

  if (!config.skipOutput) {
    generateStateFiles(eloData, division, metadata);
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
    filename: filename,
  };
}

function processTournament(data, eloData, filePath, fileContentsLower, tournamentInfo) {

  log(`  Tournament: ${tournamentInfo.name}`);
  log(`  Date: ${tournamentInfo.date}, Season: ${tournamentInfo.season}`);
  log(
    `  Input teams: ${data.Teams?.length || 0}, Events: ${data.Events?.length || 0}, Placings: ${data.Placings?.length || 0}`
  );

  if (!metadata.tournaments.has(tournamentInfo.name)) {
    metadata.tournaments.set(tournamentInfo.name, nextTournamentId);
    metadata.tournamentIds[nextTournamentId] = tournamentInfo.name;
    log(`  New tournament registered: ID ${nextTournamentId}`);
    nextTournamentId++;
  }

  const { canonicalTeamMap, overallRankings, eventRankingsMap, teamStateMap } =
    analyzeAndRankTeams(data);

  log(`  Processed teams: ${overallRankings.length} ranked teams`);
  log("  Processing overall rankings...");

  const tournamentType = getTournamentType(tournamentInfo, filePath, fileContentsLower);
  const importanceMultiplier = getTournamentImportanceMultiplier(tournamentType);
  const isStateOrNational = tournamentType !== null;

  updateEloForRanking(
    overallRankings,
    eloData,
    tournamentInfo,
    "__OVERALL__",
    teamStateMap,
    importanceMultiplier,
    isStateOrNational,
    tournamentType
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
      tournamentType
    );
  }
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
  const placeByTeamEvent = new Map();
  data.Placings.forEach((p) => {
    if (!placingsByTeam.has(p.team)) {
      placingsByTeam.set(p.team, []);
    }
    placingsByTeam.get(p.team).push(p);

    if (!placeByTeamEvent.has(p.team)) {
      placeByTeamEvent.set(p.team, new Map());
    }
    placeByTeamEvent.get(p.team).set(p.event, p.place);
  });

  log(
    `    Processing ${data.Placings?.length || 0} placings across ${data.Events?.length || 0} events`
  );

  const noShowTeams = new Set();
  for (const team of data.Teams) {
    const teamPlacings = placingsByTeam.get(team.number) || [];
    const hasAnyPlace = teamPlacings.some((p) => p.place !== null && p.place !== undefined);
    if (!hasAnyPlace) {
      noShowTeams.add(team.number);
      log(`    No-show detected: team ${team.number} (${team.school}) - no places in any events`);
    }
  }
  if (noShowTeams.size > 0) {
    log(`    Total no-show teams: ${noShowTeams.size}`);
  }

  const eventCompetitorSets = new Map();
  for (const placing of data.Placings) {
    if (!placing.place || noShowTeams.has(placing.team)) {
      continue;
    }
    if (!eventCompetitorSets.has(placing.event)) {
      eventCompetitorSets.set(placing.event, new Set());
    }
    eventCompetitorSets.get(placing.event).add(placing.team);
  }

  const eventCompetitorCounts = new Map();
  data.Events.forEach((event) => {
    eventCompetitorCounts.set(event.name, eventCompetitorSets.get(event.name)?.size || 0);
  });
  log(`    Event competitor counts calculated for ${eventCompetitorCounts.size} events`);

  const teamScores = new Map();
  for (const team of data.Teams) {
    if (noShowTeams.has(team.number)) {
      continue;
    }

    let totalScore = 0;
    const teamPlacings = placeByTeamEvent.get(team.number);
    for (const event of data.Events) {
      const place = teamPlacings?.get(event.name);
      if (place) {
        totalScore += place;
      } else {
        const competitorCount = eventCompetitorCounts.get(event.name) || 1;
        totalScore += competitorCount;
      }
    }
    teamScores.set(team.number, { teamData: team, score: totalScore });
  }

  const canonicalTeamMap = {};
  const teamStateMap = {};
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
  for (const event of data.Events) {
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
      const teamPlacings = placeByTeamEvent.get(team.number);
      const place = teamPlacings?.get(event.name);
      const score = place ? place : competitorCount + 1;
      eventScoreMap.set(team.number, { teamData: team, score });
    }
    eventRankingsMap.set(event.name, createRankedList(eventScoreMap));
  }
  if (newEventsCount > 0) {
    log(`    Registered ${newEventsCount} new events`);
  }

  return { canonicalTeamMap, overallRankings, eventRankingsMap, teamStateMap };
}

function updateEloForRanking(
  rankedTeams,
  eloData,
  tournamentInfo,
  category,
  teamStateMap,
  importanceMultiplier,
  isStateOrNational,
  tournamentType
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

  const initialRatings = {};
  const volatilityFactors = {};
  const trendMultipliers = {};

  for (const team of participatingTeams) {
    const stateCode = teamStateMap[team.name];
    const teamData = getOrInitializeTeam(
      eloData,
      team.name,
      tournamentInfo.season,
      category,
      stateCode
    );
    initialRatings[team.name] = teamData.rating;

    const tournamentCount = teamData.history.length;
    if (tournamentCount === 0) {
      volatilityFactors[team.name] = config.firstTournamentVolatility;
    } else if (tournamentCount === 1) {
      volatilityFactors[team.name] = config.secondTournamentVolatility;
    } else {
      volatilityFactors[team.name] = config.normalVolatility;
    }

    trendMultipliers[team.name] = calculateSeasonTrendMultiplier(teamData);
  }

  if (category === "__OVERALL__" && tournamentType) {
    recordPredictionLoss(participatingTeams, initialRatings, tournamentType);
  }

  const avgInitialRating =
    Object.values(initialRatings).reduce((sum, r) => sum + r, 0) /
    Object.keys(initialRatings).length;
  log(
    `        Initial ratings: avg=${avgInitialRating.toFixed(1)}, range=[${Math.min(...Object.values(initialRatings)).toFixed(1)}, ${Math.max(...Object.values(initialRatings)).toFixed(1)}]`
  );

  const sortedRatings = Object.values(initialRatings).sort((a, b) => b - a);
  const topTeamsCount = Math.max(
    1,
    Math.floor(participatingTeams.length * config.topTeamsFraction)
  );
  const topTeamRatings = sortedRatings.slice(0, topTeamsCount);
  const averageElo =
    topTeamRatings.reduce((sum, rating) => sum + rating, 0) / topTeamRatings.length;
  const competitivenessMultiplier =
    1 + (config.tournamentCompetitivenessFactor * (averageElo - 1500)) / 1500;
  log(
    `        Top ${topTeamsCount} teams avg Elo: ${averageElo.toFixed(1)}, competitiveness multiplier: ${competitivenessMultiplier.toFixed(3)}`
  );

  log(`        Tournament importance multiplier: ${importanceMultiplier.toFixed(1)}`);

  const eloChanges = {};
  const numOpponents = participatingTeams.length - 1;
  const qRatings = {};
  for (const team of participatingTeams) {
    qRatings[team.name] = 10 ** (initialRatings[team.name] / 400);
  }

  for (const teamA of participatingTeams) {
    let expectedScoreRaw = 0;
    let actualScoreRaw = 0;

    for (const teamB of participatingTeams) {
      if (teamA.name === teamB.name) {
        continue;
      }

      const qA = qRatings[teamA.name];
      const qB = qRatings[teamB.name];
      expectedScoreRaw += qA / (qA + qB);
      if (teamA.place < teamB.place) {
        actualScoreRaw += 1.0;
      } else if (teamA.place === teamB.place) {
        actualScoreRaw += 1.0;
      }
    }

    const actualPerformance = actualScoreRaw / numOpponents;
    const expectedPerformance = expectedScoreRaw / numOpponents;

    const baseEloChange =
      config.eloPerformanceScalingFactor * (actualPerformance - expectedPerformance);
    const scaledEloChange =
      baseEloChange *
      volatilityFactors[teamA.name] *
      competitivenessMultiplier *
      importanceMultiplier *
      trendMultipliers[teamA.name];

    const dampingFactor = calculateEloDampingFactor(scaledEloChange);
    eloChanges[teamA.name] = scaledEloChange * dampingFactor;
  }

  const totalEloChange = Object.values(eloChanges).reduce((sum, change) => sum + change, 0);
  const averageChange = totalEloChange / Object.keys(eloChanges).length;
  log(
    `        Total Elo change before zero-sum: ${totalEloChange.toFixed(2)}, average: ${averageChange.toFixed(2)}`
  );

  for (const teamName in eloChanges) {
    eloChanges[teamName] -= averageChange;
  }

  const eloChangeStats = Object.values(eloChanges);
  const maxGain = Math.max(...eloChangeStats);
  const maxLoss = Math.min(...eloChangeStats);
  log(
    `        Elo changes after zero-sum: max gain=${maxGain.toFixed(1)}, max loss=${maxLoss.toFixed(1)}`
  );

  const teamsToConvertToJV = [];
  const schoolsToCull = new Set();
  const MAX_ELO_LOSS = config.maxEloLoss;
  let cappedLosses = 0;

  for (const team of participatingTeams) {
    if (eloChanges[team.name] < -MAX_ELO_LOSS) {
      log(
        `        Capping Elo loss for ${team.name}: ${eloChanges[team.name].toFixed(1)} -> -${MAX_ELO_LOSS}`
      );
      eloChanges[team.name] = -MAX_ELO_LOSS;
      cappedLosses++;
    }

  }
  if (cappedLosses > 0) {
    log(`        Capped ${cappedLosses} team Elo losses`);
  }

  const bestTeamBySchool = new Map();
  for (const team of participatingTeams) {
    const schoolName = getSchoolName(team.name);
    const currentBest = bestTeamBySchool.get(schoolName);
    if (!currentBest || team.place < currentBest.place) {
      bestTeamBySchool.set(schoolName, team);
    }
  }

  for (const [schoolName, bestTeam] of bestTeamBySchool.entries()) {
    if (
      bestTeam.name.includes(" Varsity") &&
      eloChanges[bestTeam.name] < -config.jvLossThreshold &&
      !isStateOrNational
    ) {
      teamsToConvertToJV.push(bestTeam.name);
      schoolsToCull.add(schoolName);
      log(
        `        Marking ${bestTeam.name} for JV conversion (Elo: ${initialRatings[bestTeam.name].toFixed(1)}, change: ${eloChanges[bestTeam.name].toFixed(1)})`
      );
    }
  }

  if (teamsToConvertToJV.length > 0) {
    log(
      `        Converting ${teamsToConvertToJV.length} teams from Varsity to JV and recalculating...`
    );

    const filteredTeams = participatingTeams.filter((team) => !team.name.includes(" JV"));
    const schoolFilteredTeams =
      schoolsToCull.size > 0
        ? filteredTeams.filter(
            (team) =>
              !schoolsToCull.has(getSchoolName(team.name)) ||
              teamsToConvertToJV.includes(team.name)
          )
        : filteredTeams;

    const convertedTeams = schoolFilteredTeams.map((team) => {
      if (teamsToConvertToJV.includes(team.name)) {
        return {
          ...team,
          name: team.name.replace(" Varsity", " JV"),
        };
      }
      return team;
    });

    const recalculatedInitialRatings = {};
    for (const team of convertedTeams) {
      const originalName = team.name.replace(" JV", " Varsity");
      recalculatedInitialRatings[team.name] =
        initialRatings[originalName] || initialRatings[team.name];
    }

    const recalculatedSortedRatings = Object.values(recalculatedInitialRatings).sort(
      (a, b) => b - a
    );
    const recalculatedTopTeamsCount = Math.max(
      1,
      Math.floor(convertedTeams.length * config.topTeamsFraction)
    );
    const recalculatedTopTeamRatings = recalculatedSortedRatings.slice(
      0,
      recalculatedTopTeamsCount
    );
    const recalculatedAverageElo =
      recalculatedTopTeamRatings.reduce((sum, rating) => sum + rating, 0) /
      recalculatedTopTeamRatings.length;
    const recalculatedCompetitivenessMultiplier =
      1 + (config.tournamentCompetitivenessFactor * (recalculatedAverageElo - 1500)) / 1500;

    const recalculatedEloChanges = {};
    const recalculatedNumOpponents = convertedTeams.length - 1;
    const recalculatedQRatings = {};
    for (const team of convertedTeams) {
      recalculatedQRatings[team.name] = 10 ** (recalculatedInitialRatings[team.name] / 400);
    }

    for (const teamA of convertedTeams) {
      let expectedScoreRaw = 0;
      let actualScoreRaw = 0;

      for (const teamB of convertedTeams) {
        if (teamA.name === teamB.name) {
          continue;
        }

        const qA = recalculatedQRatings[teamA.name];
        const qB = recalculatedQRatings[teamB.name];
        expectedScoreRaw += qA / (qA + qB);
        if (teamA.place < teamB.place) {
          actualScoreRaw += 1.0;
        } else if (teamA.place === teamB.place) {
          actualScoreRaw += 0.5;
        }
      }

      const actualPerformance = actualScoreRaw / recalculatedNumOpponents;
      const expectedPerformance = expectedScoreRaw / recalculatedNumOpponents;

      const baseEloChange =
        config.eloPerformanceScalingFactor * (actualPerformance - expectedPerformance);
      const volatilityFactor =
        volatilityFactors[teamA.name.replace(" JV", " Varsity")] || volatilityFactors[teamA.name];
      const trendMultiplier =
        trendMultipliers[teamA.name.replace(" JV", " Varsity")] ||
        trendMultipliers[teamA.name] ||
        1;
      const scaledEloChange =
        baseEloChange *
        volatilityFactor *
        recalculatedCompetitivenessMultiplier *
        importanceMultiplier *
        trendMultiplier;

      const dampingFactor = calculateEloDampingFactor(scaledEloChange);
      let finalEloChange = scaledEloChange * dampingFactor;

      if (finalEloChange < -MAX_ELO_LOSS) {
        // console.log(`capping recalculated elo loss for ${teama.name} from ${finalelochange} to -${max_elo_loss}`);
        finalEloChange = -MAX_ELO_LOSS;
      }

      recalculatedEloChanges[teamA.name] = finalEloChange;
    }

    const recalculatedTotalEloChange = Object.values(recalculatedEloChanges).reduce(
      (sum, change) => sum + change,
      0
    );
    const recalculatedAverageChange =
      recalculatedTotalEloChange / Object.keys(recalculatedEloChanges).length;

    for (const teamName in recalculatedEloChanges) {
      recalculatedEloChanges[teamName] -= recalculatedAverageChange;
    }

    for (const team of convertedTeams) {
      const stateCode =
        teamStateMap[team.name.replace(" JV", " Varsity")] || teamStateMap[team.name];
      const teamData = getOrInitializeTeam(
        eloData,
        team.name,
        tournamentInfo.season,
        category,
        stateCode
      );
      let newElo =
        initialRatings[team.name.replace(" JV", " Varsity")] + recalculatedEloChanges[team.name];

      newElo = Math.max(config.eloFloor, newElo);

      teamData.rating = newElo;
      teamData.history.push({
        d: tournamentInfo.date,
        t: metadata.tournaments.get(tournamentInfo.name),
        p: team.place,
        e: Number.parseFloat(newElo.toFixed(2)),
        l: `https://www.duosmium.org/results/${tournamentInfo.filename}`,
        n: teamsToConvertToJV.includes(team.name.replace(" JV", " Varsity"))
          ? "Converted from Varsity due to large ELO drop"
          : undefined,
      });

      eloData[stateCode][team.name].meta.games += recalculatedNumOpponents;
      if (category !== "__OVERALL__") {
        const eventsSet = new Set(
          Object.keys(eloData[stateCode][team.name].seasons[tournamentInfo.season].events)
        );
        eventsSet.delete("__OVERALL__");
        eloData[stateCode][team.name].meta.events = eventsSet.size;
      }
    }
    log(`        Completed JV conversion and Elo updates for ${convertedTeams.length} teams`);
  } else {
    log(`        Updating Elo for ${participatingTeams.length} teams...`);

    for (const team of participatingTeams) {
      const stateCode = teamStateMap[team.name];
      const teamData = getOrInitializeTeam(
        eloData,
        team.name,
        tournamentInfo.season,
        category,
        stateCode
      );
      let newElo = initialRatings[team.name] + eloChanges[team.name];

      newElo = Math.max(config.eloFloor, newElo);

      teamData.rating = newElo;
      teamData.history.push({
        d: tournamentInfo.date,
        t: metadata.tournaments.get(tournamentInfo.name),
        p: team.place,
        e: Number.parseFloat(newElo.toFixed(2)),
        l: `https://www.duosmium.org/results/${tournamentInfo.filename}`,
      });

      eloData[stateCode][team.name].meta.games += numOpponents;
      if (category !== "__OVERALL__") {
        const eventsSet = new Set(
          Object.keys(eloData[stateCode][team.name].seasons[tournamentInfo.season].events)
        );
        eventsSet.delete("__OVERALL__");
        eloData[stateCode][team.name].meta.events = eventsSet.size;
      }
    }
  }
}

function getSchoolName(teamName) {
  return teamName.replace(/ (Varsity|JV)$/, "");
}

function recordPredictionLoss(participatingTeams, initialRatings, tournamentType) {
  const predictedPlaces = computePredictedPlaces(participatingTeams, initialRatings);
  let loss = 0;
  for (const team of participatingTeams) {
    const actualPlace = team.place;
    const predictedPlace = predictedPlaces[team.name];
    if (!Number.isFinite(actualPlace) || !Number.isFinite(predictedPlace)) {
      continue;
    }
    const rankWeight = 1 / Math.pow(actualPlace, config.rankWeightExponent);
    loss += rankWeight * Math.abs(predictedPlace - actualPlace);
  }

  const tournamentWeight =
    tournamentType === "national" ? config.nationalLossWeight : config.stateLossWeight;
  const weightedLoss = loss * tournamentWeight;

  predictionStats.totalLoss += weightedLoss;
  predictionStats.tournamentCount += 1;
  if (tournamentType === "national") {
    predictionStats.nationalLoss += weightedLoss;
  } else if (tournamentType === "state") {
    predictionStats.stateLoss += weightedLoss;
  }
}

function computePredictedPlaces(participatingTeams, initialRatings) {
  const sortedTeams = [...participatingTeams].sort(
    (a, b) => initialRatings[b.name] - initialRatings[a.name]
  );
  const predictedPlaces = {};
  let lastRating = null;
  let lastPlace = 0;
  for (let i = 0; i < sortedTeams.length; i++) {
    const teamName = sortedTeams[i].name;
    const rating = initialRatings[teamName];
    let place = i + 1;
    if (i > 0 && rating === lastRating) {
      place = lastPlace;
    }
    predictedPlaces[teamName] = place;
    lastRating = rating;
    lastPlace = place;
  }
  return predictedPlaces;
}

function buildMetricsSummary() {
  return {
    totalLoss: predictionStats.totalLoss,
    tournamentCount: predictionStats.tournamentCount,
    stateLoss: predictionStats.stateLoss,
    nationalLoss: predictionStats.nationalLoss,
    config: { ...config },
  };
}

/**
 * Calculate damping factor for ELO changes using a continuous function.
 * Uses a smooth curve that applies more damping to larger changes.
 */
function calculateEloDampingFactor(eloChange) {
  const absChange = Math.abs(eloChange);

  const normalizedChange = absChange / config.eloDampingScale;
  const dampingAmount =
    config.eloDampingStrength * (normalizedChange / (1 + normalizedChange));

  return 1 - dampingAmount;
}

function calculateSeasonTrendMultiplier(teamData) {
  if (!config.seasonTrendMultiplier) {
    return 1;
  }
  const history = teamData?.history || [];
  if (history.length < 2) {
    return 1;
  }

  const windowSize =
    Number.isFinite(config.trendWindow) && config.trendWindow > 1
      ? Math.floor(config.trendWindow)
      : history.length;
  const startIndex = Math.max(1, history.length - windowSize);
  let sum = 0;
  let count = 0;

  for (let i = startIndex; i < history.length; i++) {
    const prev = history[i - 1]?.e;
    const curr = history[i]?.e;
    if (!Number.isFinite(prev) || !Number.isFinite(curr)) {
      continue;
    }
    sum += curr - prev;
    count++;
  }

  if (!count) {
    return 1;
  }

  const scale =
    Number.isFinite(config.eloDampingScale) && config.eloDampingScale > 0
      ? config.eloDampingScale
      : 100;
  const normalized = (sum / count) / scale;
  const trend = Math.tanh(normalized);
  const multiplier = 1 + config.seasonTrendMultiplier * trend;
  return Math.min(1.5, Math.max(0.5, multiplier));
}

/**
 * Detect if a tournament is a state or national tournament based on name, filename, and content.
 * Returns the appropriate multiplier (1.0 for regular tournaments).
 */
function getTournamentType(tournamentInfo, filePath, _fileContentsLower) {
  const searchTerms = [
    tournamentInfo.name,
    tournamentInfo.filename,
    path.basename(filePath, ".yaml"),
  ];

  const combinedText = searchTerms.join(" ").toLowerCase();

  if (
    /\bnational tournament\b/.test(combinedText) ||
    /\bnationals\b/.test(combinedText) ||
    /\bnational championship\b/.test(combinedText)
  ) {
    return "national";
  }

  if (
    /\bstate tournament\b/.test(combinedText) ||
    /\bstates\b/.test(combinedText) ||
    /\bstate championship\b/.test(combinedText)
  ) {
    return "state";
  }

  return null;
}

/**
 * Detect if a tournament is a state or national tournament based on name, filename, and content.
 * Returns the appropriate multiplier (1.0 for regular tournaments).
 */
function getTournamentImportanceMultiplier(tournamentType) {
  if (tournamentType === "national") {
    const multiplier = config.nationalTournamentMultiplier * config.nationalTrendMultiplier;
    log(`        Detected national tournament (multiplier: ${multiplier})`);
    return multiplier;
  }

  if (tournamentType === "state") {
    const multiplier = config.stateTournamentMultiplier * config.stateTrendMultiplier;
    log(`        Detected state tournament (multiplier: ${multiplier})`);
    return multiplier;
  }

  return 1.0;
}

/**
 * Check if a tournament is a state or national tournament.
 * Returns true if it's a state or national tournament, false otherwise.
 */
function isStateOrNationalTournament(tournamentInfo, filePath, fileContentsLower) {
  return getTournamentType(tournamentInfo, filePath, fileContentsLower) !== null;
}

function getOrInitializeTeam(eloData, teamName, season, category, stateCode) {
  if (!eloData[stateCode]) {
    eloData[stateCode] = {};
  }

  if (!eloData[stateCode][teamName]) {
    eloData[stateCode][teamName] = { seasons: {}, meta: { games: 0, events: 0 } };
  }
  if (!eloData[stateCode][teamName].seasons[season]) {
    eloData[stateCode][teamName].seasons[season] = { events: {} };
  }

  if (!eloData[stateCode][teamName].seasons[season].events[category]) {
    let initialRating = config.startingElo;
    const currentSeasonInt = Number.parseInt(season, 10);

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

    eloData[stateCode][teamName].seasons[season].events[category] = {
      rating: initialRating,
      history: [],
    };
  }

  return eloData[stateCode][teamName].seasons[season].events[category];
}

/**
 * Generate state-based JSON files
 * Creates individual state files and metadata for better performance
 *
 * @param {Object} eloData - The complete Elo data object
 * @param {string} division - The division ('B' or 'C')
 * @param {Object} metadata - The metadata object with mappings
 */
function generateStateFiles(eloData, division, metadata) {
  const statesDir = path.join(config.outputDir, `states${division}`);
  log(`\n  Generating state files for Division ${division}...`);
  log(`  Output directory: ${statesDir}`);

  if (!fs.existsSync(statesDir)) {
    fs.mkdirSync(statesDir, { recursive: true });
    log(`  Created output directory: ${statesDir}`);
  }

  const stateCount = Object.keys(eloData).length;
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
    tournamentTimeline: tournamentTimeline,
  };

  log(
    `  Metadata: ${metadata.teamIds.length} teams, ${metadata.eventIds.length} events, ${metadata.tournamentIds.length} tournaments`
  );

  let totalTeamsInFiles = 0;
  for (const stateCode in eloData) {
    const stateData = eloData[stateCode];
    const stateFile = path.join(statesDir, `${stateCode}.json`);
    const teamsInState = Object.keys(stateData).length;
    totalTeamsInFiles += teamsInState;

    const stateJson = JSON.stringify(stateData);
    const fileSize = stateJson.length;
    fs.writeFileSync(stateFile, stateJson);

    metadataFile.states[stateCode] = getStateName(stateCode);

    log(`  Generated ${stateCode}.json: ${teamsInState} teams, ${(fileSize / 1024).toFixed(1)} KB`);
  }

  log(`  Total teams across all states: ${totalTeamsInFiles}`);

  const metaFile = path.join(statesDir, "meta.json");
  const metaJson = JSON.stringify(metadataFile, null, 2);
  const metaFileSize = metaJson.length;
  fs.writeFileSync(metaFile, metaJson);

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
  const stateNames = {
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

  return stateNames[stateCode] || stateCode;
}
main().catch(console.error);
