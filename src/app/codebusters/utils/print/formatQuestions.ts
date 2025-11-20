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
  alphabet.split("").forEach((letter) => {
    tableHtml += `<td style="font-weight: bold;">${letter}</td>`;
  });
  tableHtml += "</tr>";
  tableHtml += '<tr><td style="font-weight: bold;">Replacement</td>';
  alphabet.split("").forEach((letter) => {
    tableHtml += '<td><input type="text" maxlength="1" style="width: 100%; text-align: center; border: 1px solid #000; padding: 2px;" /></td>';
  });
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
  tableHtml += '<div style="font-weight: bold; margin-bottom: 5px;">Porta Table (Keyword: ' + keyword + ')</div>';
  tableHtml += '<table class="porta-replacement-table">';
  tableHtml += '<tr><td style="font-weight: bold;">Pair</td><td style="font-weight: bold;">Alphabet</td></tr>';
  
  Object.entries(portaTable).forEach(([pair, alphabet]) => {
    tableHtml += `<tr><td style="font-weight: bold;">${pair}</td><td>${alphabet}</td></tr>`;
  });
  
  tableHtml += "</table></div>";
  return tableHtml;
};

const formatHillMatrix = (matrix: number[][]): string => {
  let matrixHtml = '<div style="margin: 10px 0;">';
  matrixHtml += '<div style="font-weight: bold; margin-bottom: 5px;">Hill Cipher Matrix</div>';
  matrixHtml += '<table class="hill-matrix">';
  
  matrix.forEach((row) => {
    matrixHtml += "<tr>";
    row.forEach((cell) => {
      matrixHtml += `<td>${cell}</td>`;
    });
    matrixHtml += "</tr>";
  });
  
  matrixHtml += "</table></div>";
  return matrixHtml;
};

export const formatCodebustersQuestionsForPrint = (
  quotes: QuoteData[],
  questionPoints: { [key: number]: number }
): string => {
  let questionsHtml = "";

  quotes.forEach((quote, index) => {
    const points = resolveQuestionPoints(quote, index, questionPoints);
    const processedAuthor = processAuthor(quote.author);
    
    questionsHtml += '<div class="question">';
    questionsHtml += `<div class="question-header">Question ${index + 1} [${points} pts]</div>`;
    
    if (quote.cipherType !== "Cryptarithm") {
      questionsHtml += `<div class="author-info">${processedAuthor}</div>`;
    }
    
    questionsHtml += `<div class="cipher-type">Cipher Type: ${quote.cipherType}</div>`;
    
    // Format cipher text
    questionsHtml += `<div class="cipher-text">${quote.encrypted}</div>`;
    
    // Format based on cipher type
    if (
      [
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
      ].includes(quote.cipherType)
    ) {
      // Substitution ciphers - show replacement table
      questionsHtml += formatReplacementTable(quote);
      
      // Show additional info for specific ciphers
      if (quote.cipherType === "Caesar" && quote.caesarShift !== undefined) {
        questionsHtml += `<div style="margin-top: 10px; font-size: 12px;">Shift: ${quote.caesarShift}</div>`;
      }
      if (quote.cipherType === "Affine" && quote.affineA !== undefined && quote.affineB !== undefined) {
        questionsHtml += `<div style="margin-top: 10px; font-size: 12px;">a = ${quote.affineA}, b = ${quote.affineB}</div>`;
      }
    } else if (quote.cipherType === "Porta") {
      // Porta cipher - show Porta table
      if (quote.portaKeyword) {
        questionsHtml += formatPortaTable(quote.portaKeyword);
      }
      questionsHtml += formatReplacementTable(quote);
    } else if (quote.cipherType === "Hill 2x2" || quote.cipherType === "Hill 3x3") {
      // Hill cipher - show matrix
      if (quote.matrix) {
        questionsHtml += formatHillMatrix(quote.matrix);
      }
      questionsHtml += '<div style="margin-top: 10px;">Decryption Matrix:</div>';
      questionsHtml += '<table class="hill-matrix"><tr><td>__</td><td>__</td></tr>';
      if (quote.cipherType === "Hill 3x3") {
        questionsHtml += '<tr><td>__</td><td>__</td><td>__</td></tr>';
        questionsHtml += '<tr><td>__</td><td>__</td><td>__</td></tr>';
      } else {
        questionsHtml += '<tr><td>__</td><td>__</td></tr>';
      }
      questionsHtml += "</table>";
      questionsHtml += '<div style="margin-top: 10px;">Plaintext:</div>';
      questionsHtml += '<div class="cipher-text" style="border: 1px solid #ddd; padding: 10px; min-height: 50px;">_________________________________________________</div>';
    } else if (quote.cipherType === "Baconian") {
      // Baconian - show binary representation
      questionsHtml += '<div style="margin-top: 10px;">Binary Type: ' + (quote.baconianBinaryType || "A/B") + '</div>';
      questionsHtml += '<div style="margin-top: 10px;">Plaintext:</div>';
      questionsHtml += '<div class="cipher-text" style="border: 1px solid #ddd; padding: 10px; min-height: 50px;">_________________________________________________</div>';
    } else if (quote.cipherType === "Nihilist") {
      // Nihilist - show keys
      if (quote.nihilistPolybiusKey) {
        questionsHtml += `<div style="margin-top: 10px; font-size: 12px;">Polybius Key: ${quote.nihilistPolybiusKey}</div>`;
      }
      if (quote.nihilistCipherKey) {
        questionsHtml += `<div style="margin-top: 5px; font-size: 12px;">Cipher Key: ${quote.nihilistCipherKey}</div>`;
      }
      questionsHtml += '<div style="margin-top: 10px;">Plaintext:</div>';
      questionsHtml += '<div class="cipher-text" style="border: 1px solid #ddd; padding: 10px; min-height: 50px;">_________________________________________________</div>';
    } else if (quote.cipherType === "Checkerboard") {
      // Checkerboard - show keys
      if (quote.checkerboardRowKey) {
        questionsHtml += `<div style="margin-top: 10px; font-size: 12px;">Row Key: ${quote.checkerboardRowKey}</div>`;
      }
      if (quote.checkerboardColKey) {
        questionsHtml += `<div style="margin-top: 5px; font-size: 12px;">Column Key: ${quote.checkerboardColKey}</div>`;
      }
      if (quote.checkerboardPolybiusKey) {
        questionsHtml += `<div style="margin-top: 5px; font-size: 12px;">Polybius Key: ${quote.checkerboardPolybiusKey}</div>`;
      }
      questionsHtml += formatReplacementTable(quote);
    } else if (quote.cipherType === "Fractionated Morse") {
      // Fractionated Morse
      if (quote.fractionationTable) {
        questionsHtml += '<div style="margin-top: 10px; font-size: 12px;">Fractionation Table provided</div>';
      }
      questionsHtml += formatReplacementTable(quote);
    } else if (quote.cipherType === "Complete Columnar") {
      // Columnar Transposition
      if (quote.columnarKey) {
        questionsHtml += `<div style="margin-top: 10px; font-size: 12px;">Key: ${quote.columnarKey}</div>`;
      }
      questionsHtml += '<div style="margin-top: 10px;">Plaintext:</div>';
      questionsHtml += '<div class="cipher-text" style="border: 1px solid #ddd; padding: 10px; min-height: 50px;">_________________________________________________</div>';
    } else if (quote.cipherType === "Cryptarithm") {
      // Cryptarithm
      if (quote.cryptarithmData) {
        questionsHtml += `<div style="margin-top: 10px; font-size: 13px; font-family: 'Courier New', monospace;">${quote.cryptarithmData.equation}</div>`;
        if (quote.cryptarithmData.numericExample) {
          questionsHtml += `<div style="margin-top: 5px; font-size: 12px;">Example: ${quote.cryptarithmData.numericExample}</div>`;
        }
        questionsHtml += '<div style="margin-top: 10px;">Solution:</div>';
        quote.cryptarithmData.digitGroups.forEach((group) => {
          questionsHtml += `<div style="margin-top: 5px; font-size: 12px;">${group.word}: ________________________________</div>`;
        });
      }
    }
    
    questionsHtml += "</div>";
  });

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

