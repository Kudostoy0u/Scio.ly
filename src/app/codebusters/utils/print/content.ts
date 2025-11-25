import type { CodebustersPrintConfig } from "../printUtils";

export const createCodebustersPrintContent = (
  config: CodebustersPrintConfig,
  printStyles: string
) => `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Codebusters Test</title>
    ${printStyles}
    <script src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"></script>
    <script>
      window.PagedConfig = {
        auto: false,
        after: (flow) => {
          import('/lib/utils/logger').then(m => m.default.log('Rendered pages', flow.total)).catch(()=>{});
          window.focus();
        }
      };
      window.addEventListener('beforeprint', () => {
        const instructions = document.querySelector('div[style*="position: fixed"]');
        if (instructions) instructions.style.display = 'none';
      });
      window.addEventListener('afterprint', () => {
        const instructions = document.querySelector('div[style*="position: fixed"]');
        if (instructions) instructions.style.display = 'block';
      });
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
          e.preventDefault();
          window.print();
        }
      });
      setTimeout(() => { window.focus(); }, 100);
    </script>
  </head>
  <body>
    <div class="tournament-header">${config.tournamentName}</div>
    ${config.questionsHtml}
  </body>
  </html>
`;
