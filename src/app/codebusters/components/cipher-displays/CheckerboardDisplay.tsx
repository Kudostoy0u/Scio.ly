import { useTheme } from "@/app/contexts/ThemeContext";
import React, { useState } from "react";
import type { QuoteData } from "@/app/codebusters/types";

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
  }, [quoteIndex, text]);

  // Parse tokens and respect block separators (3+ spaces) for visual gaps
  const tokens: string[] = [];
  const blockEnd: Set<number> = new Set();
  const blocks = text.trim().split(/\s{3,}/); // triple-or-more spaces are block boundaries
  let runningIndex = 0;
  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];
    if (!block) continue;
    const trimmed = block.trim();
    const compact = trimmed.replace(/\s+/g, "");
    for (let i = 0; i < compact.length; i += 2) {
      const a = compact[i];
      const b = compact[i + 1];
      if (a !== undefined) {
        tokens.push(b ? a + b : a);
        runningIndex++;
      }
    }
    if (bi < blocks.length - 1 && runningIndex > 0) {
      blockEnd.add(runningIndex - 1); // mark the last token in this block
    }
  }

  const normalizeIj = (s: string): string => s.replace(/J/g, "I");
  const normalizeToken = (t: string): string => (t || "").replace(/J/g, "I");

  const findColIndex = (ch: string): number => {
    const target = normalizeIj(ch.toUpperCase());
    for (let i = 0; i < 5; i++) {
      const colLabel = colLabels[i];
      if (!colLabel) continue;
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
      if (!rowLabel) continue;
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

  const syncGridFromSolutions = (rows: string[] = rowLabels, cols: string[] = colLabels) => {
    // Build temporary finders using provided labels
    const findCol = (ch: string) => {
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
    const findRow = (ch: string) => {
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
    setGridValues(() => {
      const next = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => ""));
      tokens.forEach((tok, idx) => {
        const normTok = normalizeToken(tok);
        const rCh = normTok[0];
        const cCh = normTok[1];
        if (rCh !== undefined && cCh !== undefined) {
          const ri = findRow(rCh);
          const ci = findCol(cCh);
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
    });
  };

  const getCheckerSquareLetter = (key: string, r: number, c: number): string => {
    const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const used = new Set<string>();
    const seq: string[] = [];
    const k = (key || "").toUpperCase().replace(/[^A-Z]/g, "");
    for (const ch0 of k) {
      const ch = ch0 === "J" ? "I" : ch0;
      if (!used.has(ch)) {
        used.add(ch);
        seq.push(ch);
      }
    }
    for (const ch0 of alpha) {
      const ch = ch0 === "J" ? "I" : ch0;
      if (!used.has(ch)) {
        used.add(ch);
        seq.push(ch);
      }
      if (seq.length >= 25) {
        break;
      }
    }
    const idx = r * 5 + c;
    return seq[idx] || "";
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
            {tokens.map((tok, idx) => (
              <div
                key={idx}
                className={`flex flex-col items-center ${blockEnd.has(idx) ? "mr-6 md:mr-10" : ""}`}
              >
                <div className={`text-xs mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  {tok}
                </div>
                <input
                  type="text"
                  maxLength={1}
                  value={solution?.[idx] || ""}
                  onChange={(e) => {
                    const up = e.target.value.toUpperCase();
                    onSolutionChange(quoteIndex, idx, up);
                    applyTokenToGrid(tok, up);
                  }}
                  autoComplete="off"
                  disabled={isTestSubmitted}
                  onFocus={() => setFocusedToken(tok)}
                  onBlur={() => setFocusedToken(null)}
                  className={`w-8 h-8 text-center border rounded text-sm outline-none focus:outline-none ${
                    isTestSubmitted
                      ? (
                          () => {
                            const isHinted = Boolean(quote?.checkerboardHinted?.[idx]);
                            if (isHinted) {
                              return "bg-transparent border-yellow-500";
                            }
                            return `bg-transparent ${
                              correctMapping[idx] === (solution?.[idx] || "").toUpperCase()
                                ? "border-green-500"
                                : "border-red-500"
                            }`;
                          }
                        )()
                      : darkMode
                        ? "bg-gray-800 border-gray-600 text-gray-300"
                        : "bg-white border-gray-300 text-gray-900"
                  } ${focusedToken === tok ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                />
                {isTestSubmitted && (
                  <div
                    className={`mt-1 text-[10px] ${
                      (solution?.[idx] || "").length === 0
                        ? "text-red-600"
                        : (solution?.[idx] || "").toUpperCase() !== (correctMapping[idx] || "")
                          ? "text-red-600"
                          : "text-transparent"
                    }`}
                  >
                    {(solution?.[idx] || "").length === 0 ||
                    (solution?.[idx] || "").toUpperCase() !== (correctMapping[idx] || "")
                      ? (correctMapping[idx] || "").toUpperCase()
                      : "."}
                  </div>
                )}
              </div>
            ))}
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
              {Array.from({ length: 5 }).map((_, i) =>
                isTestSubmitted ? (
                  <div
                    key={`cb-col-${i}`}
                    className={`w-8 h-8 text-center border rounded text-xs flex items-center justify-center ${darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"}`}
                  >
                    {(() => {
                      const expected = (colKey[i] || "").toUpperCase();
                      const user = (colLabels[i] || "").toUpperCase();
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
                    })()}
                  </div>
                ) : (
                  <input
                    key={`cb-col-${i}`}
                    type="text"
                    maxLength={2}
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
                      const normalized =
                        v === "" ? "" : v.includes("I") || v.includes("J") ? "I/J" : v;
                      e.target.value = normalized;
                      setColLabels((_prev) => {
                        const next = [...colLabels];
                        next[i] = normalized;
                        return next;
                      });
                      syncGridFromSolutions(
                        rowLabels,
                        (() => {
                          const n = [...colLabels];
                          n[i] = normalized;
                          return n;
                        })()
                      );
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && colLabels[i] === "I/J") {
                        e.preventDefault();
                        setColLabels((_prev) => {
                          const n = [...colLabels];
                          n[i] = "";
                          return n;
                        });
                      }
                    }}
                    className={`w-8 h-8 text-center border rounded text-xs outline-none focus:outline-none ring-1 ring-blue-200 ${darkMode ? "bg-gray-800 text-gray-200" : "bg-white text-gray-800"}`}
                  />
                )
              )}
              {Array.from({ length: 5 }).map((_, ri) => (
                <React.Fragment key={`cb-row-${ri}`}>
                  {isTestSubmitted ? (
                    <div
                      className={`w-8 h-8 text-center border rounded text-xs flex items-center justify-center ${darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"}`}
                    >
                      {(() => {
                        const expected = (rowKey[ri] || "").toUpperCase();
                        const user = (rowLabels[ri] || "").toUpperCase();
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
                      })()}
                    </div>
                  ) : (
                    <input
                      type="text"
                      maxLength={2}
                      onChange={(e) => {
                        const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
                        const normalized =
                          v === "" ? "" : v.includes("I") || v.includes("J") ? "I/J" : v;
                        e.target.value = normalized;
                        setRowLabels((_prev) => {
                          const next = [...rowLabels];
                          next[ri] = normalized;
                          return next;
                        });
                        syncGridFromSolutions(
                          (() => {
                            const n = [...rowLabels];
                            n[ri] = normalized;
                            return n;
                          })(),
                          colLabels
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && rowLabels[ri] === "I/J") {
                          e.preventDefault();
                          setRowLabels((_prev) => {
                            const n = [...rowLabels];
                            n[ri] = "";
                            return n;
                          });
                        }
                      }}
                      className={`w-8 h-8 text-center border rounded text-xs outline-none focus:outline-none ring-1 ring-blue-200 ${darkMode ? "bg-gray-800 text-gray-200" : "bg-white text-gray-800"}`}
                    />
                  )}
                  {Array.from({ length: 5 }).map((_, ci) =>
                    isTestSubmitted ? (
                      <div
                        key={`cb-cell-${ri}-${ci}`}
                        className={`w-8 h-8 border rounded-sm flex items-center justify-center ${darkMode ? "border-gray-600" : "border-gray-300"}`}
                      >
                        {(() => {
                          // Compute expected letter from Polybius key using 25-letter alphabet with I/J combined
                          const normalizeIjd = (s: string) =>
                            (s || "").toUpperCase().replace(/J/g, "I");
                          const expNorm = normalizeIjd(getCheckerSquareLetter(polybiusKey, ri, ci));
                          const expDisp = expNorm === "I" ? "I/J" : expNorm;
                          const userNorm = normalizeIjd(gridValues[ri]?.[ci] || "");
                          if (userNorm && userNorm === expNorm) {
                            return <span className="text-green-600 font-mono text-xs">{expDisp}</span>;
                          }
                          if (userNorm && userNorm !== expNorm) {
                            return (
                              <span className="font-mono text-[11px]">
                                <span className="text-red-600 line-through mr-1">
                                  {userNorm === "I" ? "I/J" : userNorm}
                                </span>
                                <span className="text-green-600">{expDisp}</span>
                              </span>
                            );
                          }
                          // empty
                          return <span className="text-red-600 font-mono text-xs">{expDisp}</span>;
                        })()}
                      </div>
                    ) : (
                      <input
                        key={`cb-cell-${ri}-${ci}`}
                        type="text"
                        maxLength={2}
                        value={gridValues[ri]?.[ci] || ""}
                        onChange={(e) => {
                          const raw = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
                          const val =
                            raw === "" ? "" : raw.includes("I") || raw.includes("J") ? "I/J" : raw;
                          setGridValues((prev) => {
                            const next = prev.map((row) => [...row]);
                            const row = next[ri];
                            if (row) {
                              row[ci] = val;
                            }
                            return next;
                          });
                          // Reverse sync back to cipher inputs
                          const rowLabel = rowLabels[ri]?.toUpperCase();
                          const colLabel = colLabels[ci]?.toUpperCase();
                          const rLab = rowLabel === "I/J" ? "I" : rowLabel;
                          const cLab = colLabel === "I/J" ? "I" : colLabel;
                          if (rLab && cLab) {
                            const desiredToken = (rLab + cLab).toUpperCase();
                            const blocks = text.trim().split(/\s{3,}/);
                            const tokensLocal: string[] = [];
                            blocks.forEach((block) => {
                              const compact = block.replace(/\s+/g, "");
                              for (let i = 0; i < compact.length; i += 2) {
                                const a = compact[i];
                                const b = compact[i + 1];
                                if (a !== undefined) {
                                  tokensLocal.push(b ? a + b : a);
                                }
                              }
                            });
                            tokensLocal.forEach((tok, idx) => {
                              if (normalizeToken(tok) === normalizeToken(desiredToken)) {
                                onSolutionChange(quoteIndex, idx, val);
                              }
                            });
                          }
                        }}
                        onKeyDown={(e) => {
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
                        }}
                        className={`w-8 h-8 text-center border rounded-sm ${darkMode ? "bg-gray-800 border-gray-600 text-gray-200" : "bg-white border-gray-300 text-gray-800"}`}
                      />
                    )
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
      {isTestSubmitted && (
        <div className={`mt-4 text-sm ${darkMode ? "text-gray-300" : "text-gray-800"}`}>
          <div className="font-semibold">Original quote:</div>
          <div className="whitespace-pre-wrap mt-1">{quote?.quote?.replace(/\[.*?\]/g, "") || ""}</div>
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
