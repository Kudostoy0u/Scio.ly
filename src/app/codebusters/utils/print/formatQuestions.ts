import type { QuoteData } from "@/app/codebusters/types";
import { resolveQuestionPoints } from "../gradingUtils";

const processAuthor = (author: string): string => {
  const commaIndex = author.indexOf(",");
  if (commaIndex !== -1) {
    const textAfterComma = author.substring(commaIndex + 1).trim();
    if (textAfterComma.length > 28) {
      return author.substring(0, commaIndex);
    }
  }
  return author;
};

const formatReplacementTable = (quote: QuoteData): string => {
  const isXenocrypt = quote.cipherType.includes("Xenocrypt");
  const alphabet = isXenocrypt ? "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  let tableHtml = '<div class="replacement-table-container">';
  tableHtml += '<div style="font-weight: bold; margin-bottom: 5px;">Replacement Table</div>';
  tableHtml += '<table class="replacement-table">';
  tableHtml += '<tr><td style="font-weight: bold;">Cipher</td>';
  for (const letter of alphabet.split("")) {
    tableHtml += `<td style="font-weight: bold;">${letter}</td>`;
  }
  tableHtml += "</tr>";
  tableHtml += '<tr><td style="font-weight: bold;">Replacement</td>';
  for (const _letter of alphabet.split("")) {
    tableHtml +=
      '<td><input type="text" maxlength="1" style="width: 100%; text-align: center; border: 1px solid #000; padding: 2px;" /></td>';
  }
  tableHtml += "</tr>";
  tableHtml += "</table></div>";

  return tableHtml;
};

const formatPortaTable = (keyword: string): string => {
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
  };

  let tableHtml = '<div style="margin: 10px 0;">';
  tableHtml += `<div style="font-weight: bold; margin-bottom: 5px;">Porta Table (Keyword: ${keyword})</div>`;
  tableHtml += '<table class="porta-replacement-table">';
  tableHtml +=
    '<tr><td style="font-weight: bold;">Pair</td><td style="font-weight: bold;">Alphabet</td></tr>';

  for (const [pair, alphabet] of Object.entries(portaTable)) {
    tableHtml += `<tr><td style="font-weight: bold;">${pair}</td><td>${alphabet}</td></tr>`;
  }

  tableHtml += "</table></div>";
  return tableHtml;
};

const formatHillMatrix = (matrix: number[][]): string => {
  let matrixHtml = '<div style="margin: 10px 0;">';
  matrixHtml += '<div style="font-weight: bold; margin-bottom: 5px;">Hill Cipher Matrix</div>';
  matrixHtml += '<table class="hill-matrix">';

  for (const row of matrix) {
    matrixHtml += "<tr>";
    for (const cell of row) {
      matrixHtml += `<td>${cell}</td>`;
    }
    matrixHtml += "</tr>";
  }

  matrixHtml += "</table></div>";
  return matrixHtml;
};

// Helper functions to reduce complexity
const isSubstitutionCipherType = (cipherType: string): boolean => {
  return [
    "K1 Aristocrat",
    "K2 Aristocrat",
    "K3 Aristocrat",
    "Random Aristocrat",
    "K1 Patristocrat",
    "K2 Patristocrat",
    "K3 Patristocrat",
    "Random Patristocrat",
    "Caesar",
    "Atbash",
    "Affine",
    "Random Xenocrypt",
    "K1 Xenocrypt",
    "K2 Xenocrypt",
    "K3 Xenocrypt",
  ].includes(cipherType);
};

const formatSubstitutionCipher = (quote: QuoteData): string => {
  let html = formatReplacementTable(quote);
  if (quote.cipherType === "Caesar" && quote.caesarShift !== undefined) {
    html += `<div style="margin-top: 10px; font-size: 12px;">Shift: ${quote.caesarShift}</div>`;
  }
  if (quote.cipherType === "Affine" && quote.affineA !== undefined && quote.affineB !== undefined) {
    html += `<div style="margin-top: 10px; font-size: 12px;">a = ${quote.affineA}, b = ${quote.affineB}</div>`;
  }
  return html;
};

const formatPortaCipher = (quote: QuoteData): string => {
  let html = "";
  if (quote.portaKeyword) {
    html += formatPortaTable(quote.portaKeyword);
  }
  html += formatReplacementTable(quote);
  return html;
};

const formatHillCipher = (quote: QuoteData): string => {
  let html = "";
  if (quote.matrix) {
    html += formatHillMatrix(quote.matrix);
  }
  html += '<div style="margin-top: 10px;">Decryption Matrix:</div>';
  html += '<table class="hill-matrix"><tr><td>__</td><td>__</td></tr>';
  if (quote.cipherType === "Hill 3x3") {
    html += "<tr><td>__</td><td>__</td><td>__</td></tr>";
    html += "<tr><td>__</td><td>__</td><td>__</td></tr>";
  } else {
    html += "<tr><td>__</td><td>__</td></tr>";
  }
  html += "</table>";
  html += '<div style="margin-top: 10px;">Plaintext:</div>';
  html +=
    '<div class="cipher-text" style="border: 1px solid #ddd; padding: 10px; min-height: 50px;">_________________________________________________</div>';
  return html;
};

const formatBaconianCipher = (quote: QuoteData): string => {
  let html = `<div style="margin-top: 10px;">Binary Type: ${quote.baconianBinaryType || "A/B"}</div>`;
  html += '<div style="margin-top: 10px;">Plaintext:</div>';
  html +=
    '<div class="cipher-text" style="border: 1px solid #ddd; padding: 10px; min-height: 50px;">_________________________________________________</div>';
  return html;
};

const formatNihilistCipher = (quote: QuoteData): string => {
  let html = "";
  if (quote.nihilistPolybiusKey) {
    html += `<div style="margin-top: 10px; font-size: 12px;">Polybius Key: ${quote.nihilistPolybiusKey}</div>`;
  }
  if (quote.nihilistCipherKey) {
    html += `<div style="margin-top: 5px; font-size: 12px;">Cipher Key: ${quote.nihilistCipherKey}</div>`;
  }
  html += '<div style="margin-top: 10px;">Plaintext:</div>';
  html +=
    '<div class="cipher-text" style="border: 1px solid #ddd; padding: 10px; min-height: 50px;">_________________________________________________</div>';
  return html;
};

const formatCheckerboardCipher = (quote: QuoteData): string => {
  let html = "";
  if (quote.checkerboardRowKey) {
    html += `<div style="margin-top: 10px; font-size: 12px;">Row Key: ${quote.checkerboardRowKey}</div>`;
  }
  if (quote.checkerboardColKey) {
    html += `<div style="margin-top: 5px; font-size: 12px;">Column Key: ${quote.checkerboardColKey}</div>`;
  }
  if (quote.checkerboardPolybiusKey) {
    html += `<div style="margin-top: 5px; font-size: 12px;">Polybius Key: ${quote.checkerboardPolybiusKey}</div>`;
  }
  html += formatReplacementTable(quote);
  return html;
};

const formatFractionatedMorseCipher = (quote: QuoteData): string => {
  let html = "";
  if (quote.fractionationTable) {
    html += '<div style="margin-top: 10px; font-size: 12px;">Fractionation Table provided</div>';
  }
  html += formatReplacementTable(quote);
  return html;
};

const formatColumnarCipher = (quote: QuoteData): string => {
  let html = "";
  if (quote.columnarKey) {
    html += `<div style="margin-top: 10px; font-size: 12px;">Key: ${quote.columnarKey}</div>`;
  }
  html += '<div style="margin-top: 10px;">Plaintext:</div>';
  html +=
    '<div class="cipher-text" style="border: 1px solid #ddd; padding: 10px; min-height: 50px;">_________________________________________________</div>';
  return html;
};

const formatCryptarithmCipher = (quote: QuoteData): string => {
  let html = "";
  if (quote.cryptarithmData) {
    html += `<div style="margin-top: 10px; font-size: 13px; font-family: 'Courier New', monospace;">${quote.cryptarithmData.equation}</div>`;
    if (quote.cryptarithmData.numericExample) {
      html += `<div style="margin-top: 5px; font-size: 12px;">Example: ${quote.cryptarithmData.numericExample}</div>`;
    }
    html += '<div style="margin-top: 10px;">Solution:</div>';
    for (const group of quote.cryptarithmData.digitGroups) {
      html += `<div style="margin-top: 5px; font-size: 12px;">${group.word}: ________________________________</div>`;
    }
  }
  return html;
};

const formatCipherSpecificContent = (quote: QuoteData): string => {
  if (isSubstitutionCipherType(quote.cipherType)) {
    return formatSubstitutionCipher(quote);
  }
  if (quote.cipherType === "Porta") {
    return formatPortaCipher(quote);
  }
  if (quote.cipherType === "Hill 2x2" || quote.cipherType === "Hill 3x3") {
    return formatHillCipher(quote);
  }
  if (quote.cipherType === "Baconian") {
    return formatBaconianCipher(quote);
  }
  if (quote.cipherType === "Nihilist") {
    return formatNihilistCipher(quote);
  }
  if (quote.cipherType === "Checkerboard") {
    return formatCheckerboardCipher(quote);
  }
  if (quote.cipherType === "Fractionated Morse") {
    return formatFractionatedMorseCipher(quote);
  }
  if (quote.cipherType === "Complete Columnar") {
    return formatColumnarCipher(quote);
  }
  if (quote.cipherType === "Cryptarithm") {
    return formatCryptarithmCipher(quote);
  }
  return "";
};

const formatQuestion = (
  quote: QuoteData,
  index: number,
  questionPoints: { [key: number]: number }
): string => {
  const points = resolveQuestionPoints(quote, index, questionPoints);
  const processedAuthor = processAuthor(quote.author);
  let html = '<div class="question">';
  html += `<div class="question-header">Question ${index + 1} [${points} pts]</div>`;
  if (quote.cipherType !== "Cryptarithm") {
    html += `<div class="author-info">${processedAuthor}</div>`;
  }
  html += `<div class="cipher-type">Cipher Type: ${quote.cipherType}</div>`;
  html += `<div class="cipher-text">${quote.encrypted}</div>`;
  html += formatCipherSpecificContent(quote);
  html += "</div>";
  return html;
};

export const formatCodebustersQuestionsForPrint = (
  quotes: QuoteData[],
  questionPoints: { [key: number]: number }
): string => {
  let questionsHtml = "";
  for (let index = 0; index < quotes.length; index++) {
    const quote = quotes[index];
    if (quote) {
      questionsHtml += formatQuestion(quote, index, questionPoints);
    }
  }
  return questionsHtml;
};

export const createCodebustersAnswerKey = (quotes: QuoteData[]): string => {
  let answerKeyHtml = '<div class="answer-key-section">';
  answerKeyHtml += '<div class="answer-key-header">ANSWER KEY</div>';
  answerKeyHtml += '<div class="answer-key-content">';

  const totalQuestions = quotes.length;
  const columns = Math.min(5, Math.ceil(totalQuestions / 20)); // 20 questions per column max
  const questionsPerColumn = Math.ceil(totalQuestions / columns);

  for (let col = 0; col < columns; col++) {
    answerKeyHtml += '<div class="answer-column">';

    for (
      let i = col * questionsPerColumn;
      i < Math.min((col + 1) * questionsPerColumn, totalQuestions);
      i++
    ) {
      const quote = quotes[i];
      if (!quote) {
        continue;
      }
      const questionNumber = i + 1;

      // Get the plaintext quote (solution)
      const solution = quote.quote || "[solution]";
      answerKeyHtml += `<div class="answer-item">${questionNumber}. ${solution}</div>`;
    }

    answerKeyHtml += "</div>";
  }

  answerKeyHtml += "</div>";
  answerKeyHtml += "</div>";

  return answerKeyHtml;
};
