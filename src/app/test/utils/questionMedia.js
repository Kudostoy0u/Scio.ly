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
exports.normalizeQuestionMedia = exports.buildAbsoluteUrl = void 0;
const buildAbsoluteUrl = (src, origin) => {
  if (!src) {
    return undefined;
  }
  try {
    if (/^https?:\/\//i.test(src)) {
      return src;
    }
    if (origin && src.startsWith("/")) {
      return `${origin}${src}`;
    }
    if (typeof window !== "undefined" && src.startsWith("/")) {
      return `${window.location.origin}${src}`;
    }
    return src;
  } catch {
    return src;
  }
};
exports.buildAbsoluteUrl = buildAbsoluteUrl;
const normalizeQuestionMedia = (qs, origin) => {
  return qs.map((q) => {
    const out = __assign({}, q);
    let candidate = out.imageData || out.imageUrl;
    if (!candidate && Array.isArray(out.images) && out.images.length > 0) {
      const pick = out.images[Math.floor(Math.random() * out.images.length)];
      if (typeof pick === "string") {
        candidate = pick;
      }
    }
    const abs = (0, exports.buildAbsoluteUrl)(candidate, origin);
    if (abs) {
      out.imageData = abs;
      if (!out.imageUrl) {
        out.imageUrl = abs;
      }
    }
    return out;
  });
};
exports.normalizeQuestionMedia = normalizeQuestionMedia;
