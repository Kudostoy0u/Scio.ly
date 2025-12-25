const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const HYPERPARAMS_PATH = path.join(__dirname, "HYPERPARAMS.json");
const DEFAULTS = {
  iterations: 25,
  seed: 0,
  metricsDir: path.join("results", "analytics-tune"),
  pastSeasons: 0,
  strategy: "local",
  explorationRate: 0.15,
  stepScale: 0.2,
};

const ranges = {
  stateTournamentMultiplier: [2.0, 6.0],
  nationalTournamentMultiplier: [4.0, 10.0],
  stateTrendMultiplier: [0.8, 1.2],
  nationalTrendMultiplier: [0.8, 1.2],
  startingElo: [1350, 1650],
  eloFloor: [50, 200],
  eloPerformanceScalingFactor: [100, 200],
  tournamentCompetitivenessFactor: [0.2, 0.8],
  firstTournamentVolatility: [1.0, 2.0],
  secondTournamentVolatility: [1.0, 1.4],
  normalVolatility: [0.8, 1.2],
  eloDampingScale: [80, 160],
  eloDampingStrength: [0.1, 0.5],
  rankWeightExponent: [0.8, 1.5],
  maxEloLoss: [120, 260],
  jvLossThreshold: [80, 140],
  topTeamsFraction: [0.5, 0.9],
};

const config = loadConfig(DEFAULTS);
const strategy = config.strategy || "local";
const explorationRate = config.explorationRate ?? 0.15;
const stepScale = config.stepScale ?? 0.2;
const rng = createRng(config.seed);
const { params: baseParams, bestLoss: baseBestLoss } = readParamsFile(HYPERPARAMS_PATH);

if (!fs.existsSync(config.metricsDir)) {
  fs.mkdirSync(config.metricsDir, { recursive: true });
}

let best = { loss: Number.isFinite(baseBestLoss) ? baseBestLoss : Infinity, params: baseParams };

for (let i = 0; i < config.iterations; i++) {
  const params =
    strategy === "random"
      ? sampleParams(ranges, rng)
      : sampleAround(best.params || baseParams, ranges, rng, stepScale, explorationRate);
  const metricsPath = path.join(config.metricsDir, `metrics-${i}.json`);
  const runParams = { ...baseParams, ...params };
  writeParamsFile(HYPERPARAMS_PATH, runParams);

  const args = buildArgs(metricsPath, config.pastSeasons);
  const result = spawnSync("node", args, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`Run ${i} failed with exit code ${result.status}`);
    continue;
  }

  const metrics = JSON.parse(fs.readFileSync(metricsPath, "utf8"));
  if (metrics.totalLoss < best.loss) {
    best = { loss: metrics.totalLoss, params: runParams };
    writeParamsFile(HYPERPARAMS_PATH, best.params, best.loss);
    fs.writeFileSync(
      path.join(config.metricsDir, "best.json"),
      JSON.stringify({ loss: best.loss, params: best.params }, null, 2)
    );
  }

  console.log(`Run ${i}: loss=${metrics.totalLoss.toFixed(4)}`);
}

if (best.params) {
  writeParamsFile(HYPERPARAMS_PATH, best.params, best.loss);
  console.log(`Best loss: ${best.loss.toFixed(4)}`);
  console.log(JSON.stringify(best.params, null, 2));
}

function buildArgs(metricsPath, pastSeasons) {
  const args = [
    path.join("scripts", "ANALYTICS.js"),
    "--skip-output=true",
    `--metrics-out=${metricsPath}`,
  ];

  if (pastSeasons > 0) {
    args.push(`--past-seasons=${pastSeasons}`);
  }

  return args;
}

function sampleParams(rangesMap, rngInstance) {
  const params = {};
  for (const [key, [min, max]] of Object.entries(rangesMap)) {
    const value = min + (max - min) * rngInstance();
    params[key] = Number.isInteger(min) && Number.isInteger(max) ? Math.round(value) : value;
  }
  return params;
}

function sampleAround(centerParams, rangesMap, rngInstance, stepScaleValue, exploreRate) {
  const params = {};
  for (const [key, [min, max]] of Object.entries(rangesMap)) {
    const center =
      typeof centerParams?.[key] === "number" ? centerParams[key] : min + (max - min) * 0.5;
    const range = max - min;
    const span = range * stepScaleValue;
    let value;
    if (rngInstance() < exploreRate) {
      value = min + range * rngInstance();
    } else {
      value = center + (rngInstance() * 2 - 1) * span;
    }
    value = Math.min(max, Math.max(min, value));
    params[key] = Number.isInteger(min) && Number.isInteger(max) ? Math.round(value) : value;
  }
  return params;
}

function createRng(seed) {
  let state = Number.isFinite(seed) ? seed : 0;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

function loadConfig(defaults) {
  const args = process.argv.slice(2);
  const configValues = { ...defaults };

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

function toKebab(input) {
  return input.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function readParamsFile(paramsPath) {
  if (!paramsPath || !fs.existsSync(paramsPath)) {
    return { params: {}, bestLoss: null };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(paramsPath, "utf8"));
    if (!parsed || typeof parsed !== "object") {
      return { params: {}, bestLoss: null };
    }
    const { bestLoss, ...params } = parsed;
    return { params, bestLoss };
  } catch (error) {
    console.warn(`Failed to read ${paramsPath}: ${error.message}`);
    return { params: {}, bestLoss: null };
  }
}

function writeParamsFile(paramsPath, params, bestLoss) {
  if (!paramsPath) {
    return;
  }
  const payload = { ...params };
  if (Number.isFinite(bestLoss)) {
    payload.bestLoss = bestLoss;
  }
  fs.writeFileSync(paramsPath, JSON.stringify(payload, null, 2));
}
