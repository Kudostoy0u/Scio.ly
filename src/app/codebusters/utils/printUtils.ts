export interface CodebustersPrintConfig {
  tournamentName: string;
  questionsHtml: string;
  questionPoints: { [key: number]: number };
}

export { createCodebustersPrintStyles } from "./print/styles";
export { createCodebustersPrintContent } from "./print/content";
export { setupCodebustersPrintWindow } from "./print/setupWindow";

