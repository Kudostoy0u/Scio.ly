interface LangObject {
  en: Array<{ id: string; author: string; quote: string }>;
  es: Array<{ id: string; author: string; quote: string }>;
}

export const isLangObject = (val: unknown): val is LangObject => {
  if (!val || typeof val !== "object") {
    return false;
  }
  const obj = val as Record<string, unknown>;
  return (
    "en" in obj &&
    "es" in obj &&
    Array.isArray(obj.en) &&
    Array.isArray(obj.es)
  );
};
