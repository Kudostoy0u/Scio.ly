import type { BaconianScheme } from "./baconian-schemes";
import { convertBinaryPattern } from "./pattern-converter";

// Helper function to get cached or generate letter for zero set
function getCachedZeroLetter(cacheKey: string, zeroSet: string, char: string): void {
  if (zeroSet && zeroSet.length > 0) {
    categoryLetterCache.set(cacheKey, zeroSet[Math.floor(Math.random() * zeroSet.length)] || char);
  }
}

// Helper function to get cached or generate letter for one set
function getCachedOneLetter(cacheKey: string, oneSet: string, char: string): void {
  if (oneSet && oneSet.length > 0) {
    categoryLetterCache.set(cacheKey, oneSet[Math.floor(Math.random() * oneSet.length)] || char);
  }
}

// Helper function to process a single character in category type
function processCategoryChar(char: string, index: number, scheme: BaconianScheme): string {
  const cacheKey = `${scheme.type}_${char}_${index}`;
  if (!categoryLetterCache.has(cacheKey)) {
    if (char === "A") {
      const zeroSet = scheme.zero as string;
      getCachedZeroLetter(cacheKey, zeroSet, char);
    } else {
      const oneSet = scheme.one as string;
      getCachedOneLetter(cacheKey, oneSet, char);
    }
  }
  return categoryLetterCache.get(cacheKey) || char;
}

// Helper function to render category type
function renderCategoryType(binaryGroup: string, scheme: BaconianScheme): string {
  return binaryGroup
    .split("")
    .map((char, index) => processCategoryChar(char, index, scheme))
    .join("");
}

// Helper function to render set type
function renderSetType(binaryGroup: string, scheme: BaconianScheme): string {
  const zeroSet = (Array.isArray(scheme.zero) ? scheme.zero : [scheme.zero]).filter(
    Boolean
  ) as string[];
  const oneSet = (Array.isArray(scheme.one) ? scheme.one : [scheme.one]).filter(
    Boolean
  ) as string[];
  const pick = (arr: string[]) =>
    arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : "";
  return binaryGroup
    .split("")
    .map((char) => {
      return char === "A" ? pick(zeroSet) || zeroSet[0] || "" : pick(oneSet) || oneSet[0] || "";
    })
    .join("");
}

export function renderBinaryGroup(binaryGroup: string, scheme: BaconianScheme): string {
  switch (scheme.renderType) {
    case "direct":
      return binaryGroup.replace(/A/g, scheme.zero as string).replace(/B/g, scheme.one as string);

    case "category":
      return renderCategoryType(binaryGroup, scheme);

    case "set":
      return renderSetType(binaryGroup, scheme);

    case "formatting":
      return convertBinaryPattern(binaryGroup, scheme);

    default:
      return binaryGroup;
  }
}

export function getCssClassForFormatting(char: string, scheme: BaconianScheme): string {
  if (scheme.renderType !== "formatting") {
    return "";
  }

  if (scheme.type === "Accented vs Plain") {
    return "";
  }

  if (scheme.type === "Highlight vs Plain") {
    return "";
  }

  if (char === "A") {
    return scheme.cssClass || "";
  }
  return scheme.cssClassB || "";
}

const randomLetterCache = new Map<string, string>();
const categoryLetterCache = new Map<string, string>();

export function getDisplayLetter(char: string, position = "", scheme?: BaconianScheme): string {
  if (scheme?.type === "Accented vs Plain") {
    return char;
  }

  if (char === "A" || char === "B") {
    const cacheKey = `${char}_${position}`;
    if (!randomLetterCache.has(cacheKey)) {
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const randomIndex = Math.floor(Math.random() * letters.length);
      const randomChar = letters[randomIndex];
      if (randomChar) {
        randomLetterCache.set(cacheKey, randomChar);
      }
    }
    return randomLetterCache.get(cacheKey) || char;
  }
  return char;
}
