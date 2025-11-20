let __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      ((t) => {
        for (let s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (const p in s) {
            if (Object.prototype.hasOwnProperty.call(s, p)) {
              t[p] = s[p];
            }
          }
        }
        return t;
      });
    return __assign.apply(this, arguments);
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportsIdEvent = supportsIdEvent;
exports.fetchBaseQuestions = fetchBaseQuestions;
exports.fetchIdQuestions = fetchIdQuestions;
exports.dedupeById = dedupeById;
exports.finalizeQuestions = finalizeQuestions;
import * as questionUtils1 from "@/app/utils/questionUtils";
import * as storage1 from "@/app/utils/storage";
import * as normalizeTestText1 from "../utils/normalizeTestText.js";
import * as questionMedia1 from "../utils/questionMedia.js";
function supportsIdEvent(eventName) {
  if (!eventName) {
    return false;
  }
  const base = typeof eventName === "string" ? eventName.split(" - ")[0] : "";
  const supportedEvents = new Set([
    "Rocks and Minerals",
    "Entomology",
    "Anatomy & Physiology",
    "Dynamic Planet",
    "Water Quality",
    "Remote Sensing",
    "Circuit Lab",
    "Astronomy",
    "Designer Genes",
    "Forensics",
    "Meteorology",
    "Potions and Poisons",
    "Solar System",
  ]);
  if (base === "Anatomy") {
    return supportedEvents.has("Anatomy & Physiology");
  }
  return supportedEvents.has(eventName) || supportedEvents.has(base);
}
async function fetchBaseQuestions(routerParams, count) {
  const paramsObj = __assign({}, routerParams);
  // IMPORTANT: Do NOT rewrite hyphenated Anatomy event names here.
  // The DB/API expects the full hyphenated name (e.g., "Anatomy - Sense Organs").
  // Past attempts to map to a base event name caused empty results.
  const params = (0, questionUtils1.buildApiParams)(paramsObj, count);
  const apiUrl = `${api_1.default.questions}?${params}`;
  let apiResponse = null;
  const isOffline = typeof navigator !== "undefined" ? !navigator.onLine : false;
  if (isOffline) {
    const evt = routerParams.eventName;
    if (evt) {
      const slug = evt.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const cached = await (0, storage1.getEventOfflineQuestions)(slug);
      if (Array.isArray(cached) && cached.length > 0) {
        const typesSel = routerParams.types || "multiple-choice";
        const filtered =
          typesSel === "multiple-choice"
            ? cached.filter((q) => Array.isArray(q.options) && q.options.length > 0)
            : typesSel === "free-response"
              ? cached.filter((q) => !Array.isArray(q.options) || q.options.length === 0)
              : cached;
        apiResponse = { success: true, data: filtered };
      }
    }
    if (!apiResponse) {
      throw new Error("No offline data available for this event.");
    }
  } else {
    let response = null;
    try {
      response = await fetch(apiUrl);
    } catch {
      response = null;
    }
    if (response?.ok) {
      apiResponse = await response.json();
    } else {
      const evt = routerParams.eventName;
      if (evt) {
        const slug = evt.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const cached = await (0, storage1.getEventOfflineQuestions)(slug);
        if (Array.isArray(cached) && cached.length > 0) {
          const typesSel = routerParams.types || "multiple-choice";
          const filtered =
            typesSel === "multiple-choice"
              ? cached.filter((q) => Array.isArray(q.options) && q.options.length > 0)
              : typesSel === "free-response"
                ? cached.filter((q) => !Array.isArray(q.options) || q.options.length === 0)
                : cached;
          apiResponse = { success: true, data: filtered };
        }
      }
      if (!apiResponse) {
        throw new Error("Failed to load questions.");
      }
    }
  }
  const allQuestions = apiResponse.data || [];
  // Filter by requested question types
  const typesSel = routerParams.types || "multiple-choice";
  const filtered =
    typesSel === "multiple-choice"
      ? allQuestions.filter((q) => Array.isArray(q.options) && q.options.length > 0)
      : typesSel === "free-response"
        ? allQuestions.filter((q) => !Array.isArray(q.options) || q.options.length === 0)
        : allQuestions;
  return (0, questionMedia1.normalizeQuestionMedia)(filtered);
}
async function fetchIdQuestions(routerParams, idCount) {
  if (idCount <= 0) {
    return [];
  }
  const isOffline = typeof navigator !== "undefined" ? !navigator.onLine : false;
  let source = [];
  if (!isOffline) {
    try {
      const params = new URLSearchParams();
      params.set("event", routerParams.eventName || "");
      params.set("limit", String(idCount));
      if (routerParams.types) {
        if (routerParams.types === "multiple-choice") {
          params.set("question_type", "mcq");
        } else if (routerParams.types === "free-response") {
          params.set("question_type", "frq");
        }
      }
      if (routerParams.difficulties && routerParams.difficulties.length > 0) {
        const allRanges = routerParams.difficulties
          .map((d) => questionUtils1.difficultyRanges[d])
          .filter(Boolean);
        if (allRanges.length > 0) {
          const minValue = Math.min(...allRanges.map((r) => r.min));
          const maxValue = Math.max(...allRanges.map((r) => r.max));
          params.set("difficulty_min", minValue.toFixed(2));
          params.set("difficulty_max", maxValue.toFixed(2));
        }
      }
      if (routerParams.subtopics && routerParams.subtopics.length > 0) {
        params.set("subtopics", routerParams.subtopics.join(","));
      }
      if (
        routerParams.pureIdOnly === true ||
        routerParams.pureIdOnly === "true" ||
        routerParams.pureIdOnly === "1" ||
        routerParams.pureIdOnly === 1
      ) {
        params.set("pure_id_only", "true");
      }
      const resp = await fetch(`${api_1.default.idQuestions}?${params.toString()}`);
      const json = await resp.json();
      source = Array.isArray(json === null || json === void 0 ? void 0 : json.data)
        ? json.data
        : [];
    } catch {}
  }
  const idQuestions = source.map((row) => ({
    id: row.id,
    question: row.question,
    options: Array.isArray(row.options) ? row.options : [],
    answers: Array.isArray(row.answers) ? row.answers : [],
    difficulty: typeof row.difficulty === "number" ? row.difficulty : 0.5,
    event: row.event,
    subtopics: Array.isArray(row.subtopics) ? row.subtopics : [],
    imageData: (0, questionMedia1.buildAbsoluteUrl)(
      Array.isArray(row.images) && row.images.length > 0
        ? row.images[Math.floor(Math.random() * row.images.length)]
        : undefined
    ),
  }));
  return idQuestions;
}
function dedupeById(arr) {
  const seen = new Set();
  const out = [];
  for (const q of arr) {
    const id = q.id;
    if (id) {
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
    }
    out.push(q);
  }
  return out;
}
function finalizeQuestions(questions) {
  const finalized = (0, questionMedia1.normalizeQuestionMedia)(questions);
  finalized.forEach((question) => {
    if (question.question) {
      question.question = (0, normalizeTestText1.normalizeQuestionText)(question.question);
    }
    if (Array.isArray(question.options)) {
      question.options = question.options.map((option) =>
        typeof option === "string" ? (0, normalizeTestText1.normalizeTestText)(option) : option
      );
      const normalized = (0, normalizeTestText1.normalizeOptionAnswerLabels)(
        question.options,
        Array.isArray(question.answers) ? question.answers : []
      );
      question.options = normalized.options;
      if (Array.isArray(question.answers)) {
        question.answers = normalized.answers;
      }
    }
    if (Array.isArray(question.answers)) {
      question.answers = question.answers.map((answer) =>
        typeof answer === "string" ? (0, normalizeTestText1.normalizeTestText)(answer) : answer
      );
    }
  });
  return finalized;
}
