import type React from "react";
import { buildGridFromTokens } from "./gridBuilders";
import { findColIndex, findRowIndex } from "./indexFinders";
import { normalizeInputValue, normalizeToken } from "./normalizers";
import { parseTokensFromText } from "./tokenParsingUtils";

export function createColLabelChangeHandler(
  colLabels: string[],
  rowLabels: string[],
  setColLabels: React.Dispatch<React.SetStateAction<string[]>>,
  syncGridFromSolutions: (rows: string[], cols: string[]) => void
) {
  return (e: React.ChangeEvent<HTMLInputElement>, i: number) => {
    const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
    const normalized = v === "" ? "" : v.includes("I") || v.includes("J") ? "I/J" : v;
    e.target.value = normalized;
    const nextColLabels = [...colLabels];
    nextColLabels[i] = normalized;
    setColLabels(nextColLabels);
    syncGridFromSolutions(rowLabels, nextColLabels);
  };
}

export function createRowLabelChangeHandler(
  rowLabels: string[],
  colLabels: string[],
  setRowLabels: React.Dispatch<React.SetStateAction<string[]>>,
  syncGridFromSolutions: (rows: string[], cols: string[]) => void
) {
  return (e: React.ChangeEvent<HTMLInputElement>, ri: number) => {
    const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
    const normalized = v === "" ? "" : v.includes("I") || v.includes("J") ? "I/J" : v;
    e.target.value = normalized;
    const nextRowLabels = [...rowLabels];
    nextRowLabels[ri] = normalized;
    setRowLabels(nextRowLabels);
    syncGridFromSolutions(nextRowLabels, colLabels);
  };
}

export function createColLabelKeyDownHandler(
  colLabels: string[],
  setColLabels: React.Dispatch<React.SetStateAction<string[]>>
) {
  return (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === "Backspace" && colLabels[i] === "I/J") {
      e.preventDefault();
      setColLabels((prev) => {
        const n = [...prev];
        n[i] = "";
        return n;
      });
    }
  };
}

export function createRowLabelKeyDownHandler(
  rowLabels: string[],
  setRowLabels: React.Dispatch<React.SetStateAction<string[]>>
) {
  return (e: React.KeyboardEvent<HTMLInputElement>, ri: number) => {
    if (e.key === "Backspace" && rowLabels[ri] === "I/J") {
      e.preventDefault();
      setRowLabels((prev) => {
        const n = [...prev];
        n[ri] = "";
        return n;
      });
    }
  };
}

export function createGridCellChangeHandler(
  rowLabels: string[],
  colLabels: string[],
  text: string,
  quoteIndex: number,
  setGridValues: React.Dispatch<React.SetStateAction<string[][]>>,
  onSolutionChange: (quoteIndex: number, position: number, plainLetter: string) => void
) {
  return (e: React.ChangeEvent<HTMLInputElement>, ri: number, ci: number) => {
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
}

export function createGridCellKeyDownHandler(
  gridValues: string[][],
  setGridValues: React.Dispatch<React.SetStateAction<string[][]>>
) {
  return (e: React.KeyboardEvent<HTMLInputElement>, ri: number, ci: number) => {
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
}

export function createApplyTokenToGridHandler(
  colLabels: string[],
  rowLabels: string[],
  setGridValues: React.Dispatch<React.SetStateAction<string[][]>>
) {
  return (token: string, letter: string) => {
    if (!token || token.length < 2) {
      return;
    }
    const rowCh = token[0];
    const colCh = token[1];
    if (rowCh !== undefined && colCh !== undefined) {
      const ci = findColIndex(colCh, colLabels);
      const ri = findRowIndex(rowCh, rowLabels);
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
}

export function createSyncGridFromSolutions(
  tokens: string[],
  solution: { [key: number]: string } | undefined,
  setGridValues: React.Dispatch<React.SetStateAction<string[][]>>
) {
  return (rows: string[] = [], cols: string[] = []) => {
    setGridValues(() => buildGridFromTokens(tokens, rows, cols, solution));
  };
}
