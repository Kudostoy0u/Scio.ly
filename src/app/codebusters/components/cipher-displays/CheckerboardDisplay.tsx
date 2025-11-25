import type { QuoteData } from "@/app/codebusters/types";
import { useTheme } from "@/app/contexts/themeContext";
import React, { useState } from "react";

// Top-level regex patterns
const TRIPLE_OR_MORE_SPACES_REGEX = /\s{3,}/;
const WHITESPACE_REGEX = /\s+/;

interface CheckerboardDisplayProps {
  text: string;
  rowKey: string;
  colKey: string;
  polybiusKey: string;
  usesIJ: boolean;
  quoteIndex: number;
  solution?: { [key: number]: string };
  isTestSubmitted: boolean;
  quotes: QuoteData[];
  onSolutionChange: (quoteIndex: number, position: number, plainLetter: string) => void;
}

export const CheckerboardDisplay = ({
  text,
  rowKey,
  colKey,
  polybiusKey,
  usesIJ,
  quoteIndex,
  solution,
  isTestSubmitted,
  quotes,
  onSolutionChange,
}: CheckerboardDisplayProps) => {
  const { darkMode } = useTheme();
  const quote = quotes[quoteIndex];
  const [focusedToken, setFocusedToken] = useState<string | null>(null);
  const [colLabels, setColLabels] = useState<string[]>(() => Array.from({ length: 5 }, () => ""));
  const [rowLabels, setRowLabels] = useState<string[]>(() => Array.from({ length: 5 }, () => ""));
  const [gridValues, setGridValues] = useState<string[][]>(() =>
    Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => ""))
  );

  // Reset labels/grid when question changes or test resets
  React.useEffect(() => {
    setColLabels(Array.from({ length: 5 }, () => ""));
    setRowLabels(Array.from({ length: 5 }, () => ""));
    setGridValues(Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => "")));
  }, []);

  // Helper function to parse tokens from a block
  const parseTokensFromBlock = (block: string): string[] => {
    const tokens: string[] = [];
    const trimmed = block.trim();
    const compact = trimmed.replace(/\s+/g, "");
    for (let i = 0; i < compact.length; i += 2) {
      const a = compact[i];
      const b = compact[i + 1];
      if (a !== undefined) {
        tokens.push(b ? a + b : a);
      }
    }
    return tokens;
  };

  // Helper function to parse tokens and block separators
  const parseTokensAndBlocks = (
    text: string
  ): {
    tokens: string[];
    blockEnd: Set<number>;
  } => {
    const tokens: string[] = [];
    const blockEnd: Set<number> = new Set();
    const blocks = text.trim().split(TRIPLE_OR_MORE_SPACES_REGEX);
    let runningIndex = 0;
    for (let bi = 0; bi < blocks.length; bi++) {
      const block = blocks[bi];
      if (!block) {
        continue;
      }
      const blockTokens = parseTokensFromBlock(block);
      tokens.push(...blockTokens);
      runningIndex += blockTokens.length;
      if (bi < blocks.length - 1 && runningIndex > 0) {
        blockEnd.add(runningIndex - 1);
      }
    }
    return { tokens, blockEnd };
  };

  // Parse tokens and respect block separators (3+ spaces) for visual gaps
  const { tokens, blockEnd } = parseTokensAndBlocks(text);

  const normalizeIj = (s: string): string => s.replace(/J/g, "I");
  const normalizeToken = (t: string): string => (t || "").replace(/J/g, "I");

  const findColIndex = (ch: string): number => {
    const target = normalizeIj(ch.toUpperCase());
    for (let i = 0; i < 5; i++) {
      const colLabel = colLabels[i];
      if (!colLabel) {
        continue;
      }
      const label = colLabel.toUpperCase();
      if (label === "I/J") {
        if (target === "I") {
          return i;
        }
      } else if (normalizeIj(label) === target) {
        return i;
      }
    }
    return -1;
  };

  const findRowIndex = (ch: string): number => {
    const target = normalizeIj(ch.toUpperCase());
    for (let i = 0; i < 5; i++) {
      const rowLabel = rowLabels[i];
      if (!rowLabel) {
        continue;
      }
      const label = rowLabel.toUpperCase();
      if (label === "I/J") {
        if (target === "I") {
          return i;
        }
      } else if (normalizeIj(label) === target) {
        return i;
      }
    }
    return -1;
  };

  const applyTokenToGrid = (token: string, letter: string) => {
    if (!token || token.length < 2) {
      return;
    }
    const rowCh = token[0];
    const colCh = token[1];
    if (rowCh !== undefined && colCh !== undefined) {
      const ci = findColIndex(colCh);
      const ri = findRowIndex(rowCh);
      if (ci !== -1 && ri !== -1) {
        setGridValues((prev) => {
          const next = prev.map((row) => [...row]);
          const row = next[ri];
          if (row) {
            row[ci] = (letter || "").toUpperCase();
          }
          return next;
        });
      }
    }
  };

  // Helper function to find column index (with explicit cols parameter)
  const findColIndexWithCols = (ch: string, cols: string[]): number => {
    const target = normalizeIj(ch.toUpperCase());
    for (let i = 0; i < 5; i++) {
      const label = cols[i]?.toUpperCase();
      if (label === "I/J") {
        if (target === "I") {
          return i;
        }
      } else if (normalizeIj(label || "") === target) {
        return i;
      }
    }
    return -1;
  };

  // Helper function to find row index (with explicit rows parameter)
  const findRowIndexWithRows = (ch: string, rows: string[]): number => {
    const target = normalizeIj(ch.toUpperCase());
    for (let i = 0; i < 5; i++) {
      const label = rows[i]?.toUpperCase();
      if (label === "I/J") {
        if (target === "I") {
          return i;
        }
      } else if (normalizeIj(label || "") === target) {
        return i;
      }
    }
    return -1;
  };

  // Helper function to build grid from tokens
  const buildGridFromTokens = (
    tokens: string[],
    rows: string[],
    cols: string[],
    solution: { [key: number]: string } | undefined
  ): string[][] => {
    const next = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => ""));
    tokens.forEach((tok, idx) => {
      const normTok = normalizeToken(tok);
      const rCh = normTok[0];
      const cCh = normTok[1];
      if (rCh !== undefined && cCh !== undefined) {
        const ri = findRowIndexWithRows(rCh, rows);
        const ci = findColIndexWithCols(cCh, cols);
        const val = (solution?.[idx] || "").toUpperCase();
        if (val && ri !== -1 && ci !== -1) {
          const row = next[ri];
          if (row) {
            row[ci] = val;
          }
        }
      }
    });
    return next;
  };

  const syncGridFromSolutions = (rows: string[] = rowLabels, cols: string[] = colLabels) => {
    setGridValues(() => buildGridFromTokens(tokens, rows, cols, solution));
  };

  // Helper function to normalize input value
  const normalizeInputValue = (raw: string): string => {
    if (raw === "") {
      return "";
    }
    return raw.includes("I") || raw.includes("J") ? "I/J" : raw;
  };

  // Helper function to parse tokens from text
  const parseTokensFromText = (text: string): string[] => {
    const tokensLocal: string[] = [];
    const blocks = text.trim().split(TRIPLE_OR_MORE_SPACES_REGEX);
    for (const block of blocks) {
      const compact = block.replace(WHITESPACE_REGEX, "");
      for (let i = 0; i < compact.length; i += 2) {
        const a = compact[i];
        const b = compact[i + 1];
        if (a !== undefined) {
          tokensLocal.push(b ? a + b : a);
        }
      }
    }
    return tokensLocal;
  };

  // Helper function to reverse sync grid value to cipher inputs
  const reverseSyncToCipherInputs = (
    ri: number,
    ci: number,
    val: string,
    rowLabels: string[],
    colLabels: string[],
    text: string
  ) => {
    const rowLabel = rowLabels[ri]?.toUpperCase();
    const colLabel = colLabels[ci]?.toUpperCase();
    const rLab = rowLabel === "I/J" ? "I" : rowLabel;
    const cLab = colLabel === "I/J" ? "I" : colLabel;
    if (!(rLab && cLab)) {
      return;
    }
    const desiredToken = (rLab + cLab).toUpperCase();
    const tokensLocal = parseTokensFromText(text);
    for (let idx = 0; idx < tokensLocal.length; idx++) {
      const tok = tokensLocal[idx];
      if (tok && normalizeToken(tok) === normalizeToken(desiredToken)) {
        onSolutionChange(quoteIndex, idx, val);
      }
    }
  };

  // Helper function to handle grid cell change
  const handleGridCellChange = (e: React.ChangeEvent<HTMLInputElement>, ri: number, ci: number) => {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
    const val = normalizeInputValue(raw);
    setGridValues((prev) => {
      const next = prev.map((row) => [...row]);
      const row = next[ri];
      if (row) {
        row[ci] = val;
      }
      return next;
    });
    reverseSyncToCipherInputs(ri, ci, val, rowLabels, colLabels, text);
  };

  // Helper function to handle column label change (extracted to reduce complexity)
  const handleColLabelChange = (e: React.ChangeEvent<HTMLInputElement>, i: number) => {
    const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
    const normalized = v === "" ? "" : v.includes("I") || v.includes("J") ? "I/J" : v;
    e.target.value = normalized;
    const nextColLabels = [...colLabels];
    nextColLabels[i] = normalized;
    setColLabels((_prev) => nextColLabels);
    syncGridFromSolutions(rowLabels, nextColLabels);
  };

  // Helper function to handle row label change (extracted to reduce complexity)
  const handleRowLabelChange = (e: React.ChangeEvent<HTMLInputElement>, ri: number) => {
    const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
    const normalized = v === "" ? "" : v.includes("I") || v.includes("J") ? "I/J" : v;
    e.target.value = normalized;
    const nextRowLabels = [...rowLabels];
    nextRowLabels[ri] = normalized;
    setRowLabels((_prev) => nextRowLabels);
    syncGridFromSolutions(nextRowLabels, colLabels);
  };

  // Helper function to handle column label key down (extracted to reduce complexity)
  const handleColLabelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === "Backspace" && colLabels[i] === "I/J") {
      e.preventDefault();
      setColLabels((_prev) => {
        const n = [...colLabels];
        n[i] = "";
        return n;
      });
    }
  };

  // Helper function to handle row label key down (extracted to reduce complexity)
  const handleRowLabelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, ri: number) => {
    if (e.key === "Backspace" && rowLabels[ri] === "I/J") {
      e.preventDefault();
      setRowLabels((_prev) => {
        const n = [...rowLabels];
        n[ri] = "";
        return n;
      });
    }
  };

  // Helper function to handle grid cell key down (extracted to reduce complexity)
  const handleGridCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    ri: number,
    ci: number
  ) => {
    if (e.key === "Backspace" && (gridValues[ri]?.[ci] || "") === "I/J") {
      e.preventDefault();
      setGridValues((prev) => {
        const n = prev.map((r) => [...r]);
        const row = n[ri];
        if (row) {
          row[ci] = "";
        }
        return n;
      });
    }
  };

  // Helper function to get token input className
  const getTokenInputClassName = (
    isTestSubmitted: boolean,
    isHinted: boolean,
    isCorrect: boolean,
    focusedToken: string | null,
    tok: string,
    darkMode: boolean
  ): string => {
    const baseClasses =
      "w-8 h-8 text-center border rounded text-sm outline-none focus:outline-none";
    if (isTestSubmitted) {
      if (isHinted) {
        return `${baseClasses} bg-transparent border-yellow-500`;
      }
      return `${baseClasses} bg-transparent ${isCorrect ? "border-green-500" : "border-red-500"}`;
    }
    const darkClasses = darkMode
      ? "bg-gray-800 border-gray-600 text-gray-300"
      : "bg-white border-gray-300 text-gray-900";
    const focusClasses = focusedToken === tok ? "ring-2 ring-blue-500 border-blue-500" : "";
    return `${baseClasses} ${darkClasses} ${focusClasses}`;
  };

  // Helper function to get correct letter display
  const getCorrectLetterDisplay = (
    solutionValue: string,
    correctValue: string
  ): { text: string; className: string } => {
    if (solutionValue.length === 0) {
      return { text: correctValue.toUpperCase(), className: "text-red-600" };
    }
    if (solutionValue.toUpperCase() !== correctValue) {
      return { text: correctValue.toUpperCase(), className: "text-red-600" };
    }
    return { text: ".", className: "text-transparent" };
  };

  // Helper function to render label display (extracted to reduce complexity)
  const renderLabelDisplay = (expected: string, user: string): React.ReactNode => {
    if (!user) {
      return <span className="text-red-600 font-mono">{expected}</span>;
    }
    if (user === expected) {
      return <span className="text-green-600 font-mono">{expected}</span>;
    }
    return (
      <span className="font-mono text-[11px]">
        <span className="text-red-600 line-through mr-1">{user}</span>
        <span className="text-green-600">{expected}</span>
      </span>
    );
  };

  // Column header component (extracted to reduce complexity)
  const ColumnHeader = ({ i }: { i: number }) => {
    if (isTestSubmitted) {
      return (
        <div
          key={`cb-col-header-${i}`}
          className={`w-8 h-8 text-center border rounded text-xs flex items-center justify-center ${darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"}`}
        >
          {renderLabelDisplay((colKey[i] || "").toUpperCase(), (colLabels[i] || "").toUpperCase())}
        </div>
      );
    }
    return (
      <input
        key={`cb-col-input-${i}`}
        type="text"
        maxLength={2}
        onChange={(e) => handleColLabelChange(e, i)}
        onKeyDown={(e) => handleColLabelKeyDown(e, i)}
        className={`w-8 h-8 text-center border rounded text-xs outline-none focus:outline-none ring-1 ring-blue-200 ${darkMode ? "bg-gray-800 text-gray-200" : "bg-white text-gray-800"}`}
      />
    );
  };

  // Row header component (extracted to reduce complexity)
  const RowHeader = ({ ri }: { ri: number }) => {
    if (isTestSubmitted) {
      return (
        <div
          className={`w-8 h-8 text-center border rounded text-xs flex items-center justify-center ${darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"}`}
        >
          {renderLabelDisplay(
            (rowKey[ri] || "").toUpperCase(),
            (rowLabels[ri] || "").toUpperCase()
          )}
        </div>
      );
    }
    return (
      <input
        type="text"
        maxLength={2}
        onChange={(e) => handleRowLabelChange(e, ri)}
        onKeyDown={(e) => handleRowLabelKeyDown(e, ri)}
        className={`w-8 h-8 text-center border rounded text-xs outline-none focus:outline-none ring-1 ring-blue-200 ${darkMode ? "bg-gray-800 text-gray-200" : "bg-white text-gray-800"}`}
      />
    );
  };

  // Grid cell component (extracted to reduce complexity)
  const GridCell = ({ ri, ci }: { ri: number; ci: number }) => {
    if (isTestSubmitted) {
      return (
        <div
          key={`cb-cell-${ri}-${ci}`}
          className={`w-8 h-8 border rounded-sm flex items-center justify-center ${darkMode ? "border-gray-600" : "border-gray-300"}`}
        >
          {gridValues[ri]?.[ci] || ""}
        </div>
      );
    }
    return (
      <input
        key={`cb-cell-input-${ri}-${ci}`}
        type="text"
        maxLength={2}
        value={gridValues[ri]?.[ci] || ""}
        onChange={(e) => handleGridCellChange(e, ri, ci)}
        onKeyDown={(e) => handleGridCellKeyDown(e, ri, ci)}
        className={`w-8 h-8 text-center border rounded-sm ${darkMode ? "bg-gray-800 border-gray-600 text-gray-200" : "bg-white border-gray-300 text-gray-800"}`}
      />
    );
  };

  // Helper grid component (rendered inline to avoid React Compiler memoization issues)

  // Token input component (extracted to reduce complexity)
  const TokenInput = ({
    tok,
    idx,
    value,
    isHinted,
    isCorrect,
    focusedToken,
    blockEnd,
    quoteIndex,
    onSolutionChange,
    applyTokenToGrid,
    setFocusedToken,
    isTestSubmitted,
    darkMode,
    correctMapping,
  }: {
    tok: string;
    idx: number;
    value: string;
    isHinted: boolean;
    isCorrect: boolean;
    focusedToken: string | null;
    blockEnd: Set<number>;
    quoteIndex: number;
    onSolutionChange: (quoteIndex: number, idx: number, val: string) => void;
    applyTokenToGrid: (tok: string, val: string) => void;
    setFocusedToken: (tok: string | null) => void;
    isTestSubmitted: boolean;
    darkMode: boolean;
    correctMapping: { [key: number]: string };
  }) => {
    const correctDisplay = getCorrectLetterDisplay(value, correctMapping[idx] || "");
    return (
      <div
        key={idx}
        className={`flex flex-col items-center ${blockEnd.has(idx) ? "mr-6 md:mr-10" : ""}`}
      >
        <div className={`text-xs mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>{tok}</div>
        <input
          type="text"
          maxLength={1}
          value={value}
          onChange={(e) => {
            const up = e.target.value.toUpperCase();
            onSolutionChange(quoteIndex, idx, up);
            applyTokenToGrid(tok, up);
          }}
          autoComplete="off"
          disabled={isTestSubmitted}
          onFocus={() => setFocusedToken(tok)}
          onBlur={() => setFocusedToken(null)}
          className={getTokenInputClassName(
            isTestSubmitted,
            isHinted,
            isCorrect,
            focusedToken,
            tok,
            darkMode
          )}
        />
        {isTestSubmitted && (
          <div className={`mt-1 text-[10px] ${correctDisplay.className}`}>
            {correctDisplay.text}
          </div>
        )}
      </div>
    );
  };

  const correctMapping: { [key: number]: string } = {};
  if (isTestSubmitted && quote?.quote) {
    const original = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
    for (let i = 0; i < Math.min(tokens.length, original.length); i++) {
      const origChar = original[i];
      if (origChar !== undefined) {
        correctMapping[i] = origChar;
      }
    }
  }

  // Create array with position data to avoid using map index in key
  const tokensWithPositions: Array<{ tok: string; position: number }> = [];
  for (let i = 0; i < tokens.length; i++) {
    tokensWithPositions.push({ tok: tokens[i] ?? "", position: i });
  }

  return (
    <div className={`mt-4 ${darkMode ? "text-gray-300" : "text-gray-900"}`}>
      {/* Parameters (hide row/column keys before submission) */}
      <div className={`mb-4 p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
        <div className="grid grid-cols-2 items-center text-sm">
          <div>
            <span className="font-semibold">Polybius key: </span>
            <span className="font-mono">{polybiusKey}</span>
          </div>
          <div className="text-xs text-right">
            <span className="font-semibold">Note:</span>{" "}
            {usesIJ ? "Using 25-letter alphabet (I/J same)." : "Using 26-letter alphabet."}
          </div>
        </div>
      </div>

      {/* Responsive layout: left inputs, right helper grid on md+; stacked on mobile */}
      <div className="mb-4 flex flex-col md:flex-row md:gap-6 items-start">
        {/* Left: token inputs (approx 80%) */}
        <div className="md:flex-[4] md:min-w-0">
          <div className="flex flex-wrap gap-2">
            {tokensWithPositions.map(({ tok, position }) => {
              const isHinted = Boolean(quote?.checkerboardHinted?.[position]);
              const isCorrect =
                correctMapping[position] === (solution?.[position] || "").toUpperCase();
              return (
                <TokenInput
                  key={`token-${tok}-${position}`}
                  tok={tok}
                  idx={position}
                  value={solution?.[position] || ""}
                  isHinted={isHinted}
                  isCorrect={isCorrect}
                  focusedToken={focusedToken}
                  blockEnd={blockEnd}
                  quoteIndex={quoteIndex}
                  onSolutionChange={onSolutionChange}
                  applyTokenToGrid={applyTokenToGrid}
                  setFocusedToken={setFocusedToken}
                  isTestSubmitted={isTestSubmitted}
                  darkMode={darkMode}
                  correctMapping={correctMapping}
                />
              );
            })}
          </div>
        </div>
        {/* Right: helper 5x5 grid (approx 20%) */}
        <div
          className={`mt-4 md:mt-0 md:flex-[1] md:max-w-xs ${darkMode ? "text-gray-300" : "text-gray-800"}`}
        >
          <div className="inline-block mx-auto md:mx-0">
            <div className="grid grid-cols-6 gap-1">
              {/* top-left corner spacer */}
              <div className="w-8 h-8" />
              {Array.from({ length: 5 }, (_, i) => i).map((i) => (
                <ColumnHeader key={`cb-col-${i}`} i={i} />
              ))}
              {Array.from({ length: 5 }, (_, ri) => ri).map((ri) => (
                <React.Fragment key={`cb-row-${ri}`}>
                  <RowHeader ri={ri} />
                  {Array.from({ length: 5 }, (_, ci) => ci).map((ci) => (
                    <GridCell key={`cb-grid-${ri}-${ci}`} ri={ri} ci={ci} />
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
      {isTestSubmitted && (
        <div className={`mt-4 text-sm ${darkMode ? "text-gray-300" : "text-gray-800"}`}>
          <div className="font-semibold">Original quote:</div>
          <div className="whitespace-pre-wrap mt-1">
            {quote?.quote?.replace(/\[.*?\]/g, "") || ""}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <div>
              <span className="font-semibold">Row key: </span>
              <span className="font-mono">{rowKey}</span>
            </div>
            <div>
              <span className="font-semibold">Column key: </span>
              <span className="font-mono">{colKey}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
