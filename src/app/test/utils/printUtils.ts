export interface TestPrintConfig {
  tournamentName: string;
  questionsHtml: string;
  questionPoints: { [key: number]: number };
}

export { createTestPrintStyles } from "./print/styles";
export { createTestPrintContent } from "./print/content";
export { setupTestPrintWindow } from "./print/setupWindow";

// Removed unused export: createTestInPagePrint
