export interface TestPrintConfig {
  tournamentName: string;
  questionsHtml: string;
  questionPoints: { [key: number]: number };
}

export { createTestPrintStyles } from './print/styles';
export { createTestPrintContent } from './print/content';
export { setupTestPrintWindow } from './print/setupWindow';

export const createTestInPagePrint = async (config: TestPrintConfig, printStyles: string): Promise<void> => {
  const { createTestPrintContent } = await import('./print/content');
  const { setupTestPrintWindow } = await import('./print/setupWindow');
  const html = createTestPrintContent(config, printStyles);
  await setupTestPrintWindow(html);
};
