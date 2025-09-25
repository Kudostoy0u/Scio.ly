export const createTestPrintStyles = (_getStylesheets: () => string) => `
  <style>
    ${_getStylesheets()}
    @page { margin: 0.5in; size: letter; @top-center { content: element(tournament-header); } @bottom-center { content: counter(page); } }
    body { margin: 0; font-family: Arial, sans-serif; counter-reset: page 1; }
    .question { page-break-inside: avoid; page-break-after: auto; margin-bottom: 25px; margin-top: 15px; padding: 0; border: none; font-family: 'Times New Roman', serif; }
    .question-header { font-weight: bold; font-size: 14px; margin-bottom: 8px; line-height: 1.4; }
    .question-options { margin-left: 20px; margin-top: 8px; }
    .option { margin-bottom: 4px; font-size: 13px; line-height: 1.3; }
    .question-image { margin: 10px 0; text-align: center; }
    .question-image img { max-width: 300px; max-height: 200px; border: 1px solid #ccc; }
    .answer-space { margin-top: 10px; margin-left: 20px; }
    .answer-line { margin-bottom: 8px; font-size: 13px; }
    .answer-key-section { page-break-before: always; margin-top: 40px; padding-top: 20px; }
    .answer-key-header { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 20px; text-decoration: underline; }
    .answer-key-content { display: flex; justify-content: space-between; gap: 20px; }
    .answer-column { flex: 1; }
    .answer-item { margin-bottom: 6px; font-size: 13px; line-height: 1.3; }
    .question:first-of-type { margin-top: 25px; }
    @page { margin-top: 0.75in; }
    .page-break { page-break-before: always; }
  </style>
`;


