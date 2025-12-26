const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const PARAMS_PATH = path.join(__dirname, "..", "PARAMS.json");
const DEFAULT_EPOCHS = 50;
const MUTATION_RATE = 0.4;
const MIN_MUTATION = 0.005;
const MAX_MUTATION = 0.01;

function readParams() {
  if (!fs.existsSync(PARAMS_PATH)) {
    return null;
  }
  const raw = fs.readFileSync(PARAMS_PATH, "utf8");
  return JSON.parse(raw);
}

function sanitizeParams(params) {
  const cleaned = { ...params };
  delete cleaned["loss-weight-power"];
  delete cleaned["top-weight-scale"];
  delete cleaned["top-rank-weight"];
  delete cleaned["surprise-weight"];
  delete cleaned["surprise-sharpness"];
  return cleaned;
}

function writeParams(params) {
  fs.writeFileSync(PARAMS_PATH, `${JSON.stringify(params, null, 2)}\n`);
}

function pickRunner() {
  const bunPath = "bun";
  const result = spawnSync(bunPath, ["--version"], { stdio: "ignore" });
  if (result.status === 0) {
    return bunPath;
  }
  return process.execPath;
}

function toFlagArgs(params) {
  const args = [];
  for (const [key, value] of Object.entries(params)) {
    args.push(`--${key}=${value}`);
  }
  return args;
}

function shouldSkipParam(key, value) {
  if (key === "seasons") {
    return true;
  }
  if (typeof value !== "number") {
    return true;
  }
  return (
    key === "loss-weight-power" ||
    key === "top-weight-scale" ||
    key === "top-rank-weight" ||
    key === "surprise-weight" ||
    key === "surprise-sharpness"
  );
}

function applyDelta(value, delta) {
  if (!Number.isFinite(value)) {
    return value;
  }
  if (value === 0) {
    return delta;
  }
  return value * (1 + delta);
}

function parseLoss(output) {
  const match = output.match(/LOSS_TOTAL=([0-9.]+)/);
  if (!match) {
    return null;
  }
  const value = Number.parseFloat(match[1]);
  return Number.isFinite(value) ? value : null;
}

function runAnalytics(params) {
  const runner = pickRunner();
  const scriptPath = path.join(__dirname, "ANALYTICS.js");
  const args = [
    scriptPath,
    ...toFlagArgs(params),
    "--write-output=false",
    "--report-nationals-loss=true",
    "--parallel-divisions=false",
    "--loss-output=total",
  ];

  const result = spawnSync(runner, args, { encoding: "utf8" });
  if (result.error) {
    return { loss: null, output: result.error.message };
  }
  const output = `${result.stdout}\n${result.stderr}`;
  return { loss: parseLoss(output), output };
}

function main() {
  const paramsFile = readParams();
  if (!paramsFile) {
    console.error("PARAMS.json not found.");
    process.exit(1);
  }

  const epochs = Number.parseInt(process.argv[2], 10) || DEFAULT_EPOCHS;
  let bestLoss = Number.isFinite(paramsFile.bestLoss)
    ? paramsFile.bestLoss
    : Number.POSITIVE_INFINITY;
  let bestParams = sanitizeParams(paramsFile.params || {});

  for (let epoch = 1; epoch <= epochs; epoch++) {
    let improvedInEpoch = false;
    const keys = Object.keys(bestParams);
    const candidate = { ...bestParams };

    for (const key of keys) {
      const baseValue = bestParams[key];
      if (shouldSkipParam(key, baseValue)) {
        continue;
      }
      if (Math.random() > MUTATION_RATE) {
        continue;
      }
      const step =
        MIN_MUTATION + Math.random() * (MAX_MUTATION - MIN_MUTATION);
      const direction = Math.random() < 0.5 ? -1 : 1;
      candidate[key] = applyDelta(baseValue, direction * step);
    }

    const { loss, output } = runAnalytics(candidate);
    if (!Number.isFinite(loss)) {
      console.log(`Epoch ${epoch}: loss=NA`);
      if (output) {
        console.log(output);
      }
      continue;
    }

    console.log(`Epoch ${epoch}: loss=${loss.toFixed(2)}`);

    if (loss < bestLoss) {
      bestLoss = loss;
      bestParams = sanitizeParams(candidate);
      writeParams({ bestLoss, params: bestParams });
      console.log(`New best loss: ${bestLoss.toFixed(2)}`);
      improvedInEpoch = true;
    }

    if (!improvedInEpoch) {
      console.log(`Epoch ${epoch}: no improvement`);
    }
  }
}

main();
