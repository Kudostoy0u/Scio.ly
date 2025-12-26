const fs = require("node:fs");
const yaml = require("js-yaml");
const { parentPort } = require("node:worker_threads");

if (!parentPort) {
  throw new Error("Worker must be run as a worker thread");
}

parentPort.on("message", ({ index, file }) => {
  try {
    const fileContents = fs.readFileSync(file, "utf8");
    const data = yaml.load(fileContents);
    parentPort.postMessage({
      index,
      file,
      data,
      fileContentsLower: fileContents.toLowerCase(),
    });
  } catch (e) {
    parentPort.postMessage({
      index,
      file,
      error: e.message,
    });
  }
});
