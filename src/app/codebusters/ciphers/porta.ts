import { FALLBACK_WORDS, getCustomWordBank } from "@/app/codebusters/utils/common";

export const encryptPorta = (text: string): { encrypted: string; keyword: string } => {
  const customWordBank = getCustomWordBank();
  const wordBank = customWordBank && customWordBank.length > 0 ? customWordBank : FALLBACK_WORDS;
  const portaKeywords = wordBank.map((w) => w.toUpperCase());

  const portaTable = {
    AB: "NOPQRSTUVWXYZABCDEFGHIJKLM",
    CD: "OPQRSTUVWXYZNABCDEFGHIJKLM",
    EF: "PQRSTUVWXYZNOABCDEFGHIJKLM",
    GH: "QRSTUVWXYZNOPABCDEFGHIJKLM",
    IJ: "RSTUVWXYZNOPQABCDEFGHIJKLM",
    KL: "STUVWXYZNOPQRABCDEFGHIJKLM",
    MN: "TUVWXYZNOPQRSABCDEFGHIJKLM",
    OP: "UVWXYZNOPQRSTABCDEFGHIJKLM",
    QR: "VWXYZNOPQRSTUABCDEFGHIJKLM",
    ST: "WXYZNOPQRSTUVABCDEFGHIJKLM",
    UV: "XYZNOPQRSTUVWABCDEFGHIJKLM",
    WX: "YZNOPQRSTUVWXABCDEFGHIJKLM",
    YZ: "ZNOPQRSTUVWXYABCDEFGHIJKLM",
  } as const;

  const keywordIndex = Math.floor(Math.random() * portaKeywords.length);
  const keyword = portaKeywords[keywordIndex];
  if (!keyword) {
    throw new Error("Failed to select keyword for Porta cipher");
  }

  const cleanText = text.toUpperCase().replace(/[^A-Z]/g, "");

  let encrypted = "";
  for (let i = 0; i < cleanText.length; i++) {
    const keywordChar = keyword[i % keyword.length];
    const textChar = cleanText[i];
    if (!keywordChar || !textChar) continue;

    const charToPair: { [key: string]: keyof typeof portaTable } = {
      A: "AB",
      B: "AB",
      C: "CD",
      D: "CD",
      E: "EF",
      F: "EF",
      G: "GH",
      H: "GH",
      I: "IJ",
      J: "IJ",
      K: "KL",
      L: "KL",
      M: "MN",
      N: "MN",
      O: "OP",
      P: "OP",
      Q: "QR",
      R: "QR",
      S: "ST",
      T: "ST",
      U: "UV",
      V: "UV",
      W: "WX",
      X: "WX",
      Y: "YZ",
      Z: "YZ",
    };

    const pair = charToPair[keywordChar];
    if (!pair) continue;
    const portaRow = portaTable[pair];
    if (!portaRow) continue;

    const charCode = textChar.charCodeAt(0);
    let cipherChar;
    if (charCode >= 65 && charCode <= 77) {
      const headerRow = "ABCDEFGHIJKLM";
      const headerIndex = headerRow.indexOf(textChar);
      cipherChar = portaRow[headerIndex];
    } else {
      const keyRowIndex = portaRow.indexOf(textChar);
      const headerRow = "ABCDEFGHIJKLM";
      cipherChar = headerRow[keyRowIndex];
    }
    encrypted += cipherChar;
  }

  const blockSizes = [3, 3, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6];
  const blockSize = blockSizes[Math.floor(Math.random() * blockSizes.length)];
  encrypted = encrypted.match(new RegExp(`.{1,${blockSize}}`, "g"))?.join(" ") || encrypted;

  return { encrypted, keyword };
};
