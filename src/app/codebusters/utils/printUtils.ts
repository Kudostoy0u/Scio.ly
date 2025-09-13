

export interface PrintConfig {
  tournamentName: string;
  questionsHtml: string;
  questionPoints: { [key: number]: number };
}

export const createPrintStyles = (getStylesheets: () => string) => `
  <style>
    ${getStylesheets()}
    
    @page {
      margin: 0.5in;
      size: letter;
      
      @top-center {
        content: element(tournament-header);
      }
      
      @bottom-center {
        content: counter(page);
      }
    }
    
    body { 
      margin: 0; 
      font-family: Arial, sans-serif;
      counter-reset: page 1;
    }
    
    .question { 
      page-break-inside: avoid; 
      page-break-after: auto;
      margin-bottom: 20px; 
      border: 1px solid #ddd; 
      padding: 15px; 
      border-radius: 5px;
    }
    
    .page-break { 
      display: block; 
      page-break-before: always; 
    }
    
    .tournament-header {
      position: running(tournament-header);
      text-align: center;
      font-size: 12px;
      font-weight: bold;
      color: #333;
      padding: 5px 0;
    }
    
    input { 
      border: 1px solid #000 !important; 
      background: white !important;
    }
    
    button { 
      display: none !important; 
    }
    
    .hint-button, .info-button { 
      display: none !important; 
    }
    
    .floating-buttons { 
      display: none !important; 
    }
    
    /* Hide Porta table in print */
    .porta-table { 
      display: none !important; 
    }
    
    /* Replacement table print styles */
    .replacement-table-container {
      page-break-inside: avoid;
      margin: 10px 0;
    }
    
    .replacement-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      page-break-inside: auto;
    }
    
    .replacement-table td {
      border: 1px solid #000;
      padding: 2px;
      text-align: center;
      min-width: 20px;
      max-width: 25px;
      word-wrap: break-word;
    }
    
    /* Allow table to break across pages if needed */
    .replacement-table tbody {
      page-break-inside: auto;
    }
    
    .replacement-table tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    
    /* If table is too wide, allow horizontal scrolling in print */
    .replacement-table-wrapper {
      overflow-x: auto;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    /* Answer Key Styles */
    .answer-key-section {
      page-break-before: always;
      margin-top: 40px;
      padding-top: 20px;
    }
    
    .answer-key-header {
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 20px;
      text-decoration: underline;
    }
    
    .answer-key-content {
      display: flex;
      justify-content: space-between;
      gap: 30px;
    }
    
    .answer-column {
      flex: 1;
    }
    
    .answer-item {
      margin-bottom: 12px;
      font-size: 12px;
      line-height: 1.4;
      text-align: left;
    }
    
    /* Non-print styles for preview */
    body { 
      font-family: Arial, sans-serif; 
      margin: 0;
    }
    
    .question { 
      border: 1px solid #ddd; 
      padding: 15px; 
      border-radius: 5px; 
      margin-bottom: 20px; 
    }
    
    .tournament-header {
      text-align: center;
      font-size: 12px;
      font-weight: bold;
      color: #333;
      margin-bottom: 15px;
    }
    
    /* Answer Key Styles for Preview */
    .answer-key-section {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #333;
    }
    
    .answer-key-header {
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 20px;
      text-decoration: underline;
    }
    
    .answer-key-content {
      display: flex;
      justify-content: space-between;
      gap: 30px;
    }
    
    .answer-column {
      flex: 1;
    }
    
    .answer-item {
      margin-bottom: 12px;
      font-size: 12px;
      line-height: 1.4;
      text-align: left;
    }
  </style>
`;

export const createPrintContent = (config: PrintConfig, printStyles: string) => `
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
          console.log("Rendered", flow.total, "pages.");
          
          // Create a prominent print instruction
          const printInstructions = document.createElement('div');
          printInstructions.innerHTML = \`
            <div style="position: fixed; top: 0; left: 0; right: 0; background: #007bff; color: white; padding: 15px; text-align: center; z-index: 9999; font-family: Arial, sans-serif;">
              <h3 style="margin: 0 0 10px 0;">Ready to Print!</h3>
              <p style="margin: 0 0 15px 0;">Your document has been prepared with page numbers and proper formatting.</p>
              <div style="display: flex; gap: 10px; justify-content: center; align-items: center;">
                <button onclick="window.print()" style="padding: 10px 20px; background: white; color: #007bff; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                  🖨️ Print Document
                </button>
                <span style="margin: 0 10px;">or press</span>
                <kbd style="background: rgba(255,255,255,0.2); padding: 5px 8px; border-radius: 3px;">Ctrl+P</kbd>
                <button onclick="window.close()" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 20px;">
                  ✕ Close
                </button>
              </div>
            </div>
          \`;
          document.body.appendChild(printInstructions);
          
          // Focus the window to ensure it's active
          window.focus();
        }
      };
      
      // Handle print dialog events
      window.addEventListener('beforeprint', () => {
        console.log('Print dialog opened');
        // Hide the instructions when printing
        const instructions = document.querySelector('div[style*="position: fixed"]');
        if (instructions) instructions.style.display = 'none';
      });
      
      window.addEventListener('afterprint', () => {
        console.log('Print dialog closed');
        // Show the instructions again after printing
        const instructions = document.querySelector('div[style*="position: fixed"]');
        if (instructions) instructions.style.display = 'block';
      });
      
      // Add keyboard shortcut for printing
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
          e.preventDefault();
          window.print();
        }
      });
      
      // Try to auto-focus and print after a delay (user gesture required)
      setTimeout(() => {
        window.focus();
        // Don't auto-print, let user click the button
      }, 100);
    </script>
  </head>
  <body>
    <div class="tournament-header">${config.tournamentName}</div>
    ${config.questionsHtml}
  </body>
  </html>
`;

export const setupPrintWindow = (printContent: string): Promise<Window> => {
  return new Promise((resolve, reject) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      reject(new Error('Please allow popups to print the questions'));
      return;
    }

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    printWindow.onload = () => {

        setTimeout(() => {
        try { 
          printWindow.focus(); 
          printWindow.print(); 
        } catch (e) { 
          console.warn('Immediate auto-print failed', e); 
        }
      }, 200);


      const start = Date.now();
      const maxWaitMs = 15000; // 15s max wait

      const tryRenderAndPrint = async () => {
        try {

          if ((printWindow as any).PagedPolyfill && typeof (printWindow as any).PagedPolyfill.preview === 'function') {
            try {
              (printWindow as any).PagedPolyfill.preview();
            } catch (e) {
              console.warn('Paged preview threw', e);
            }


            await new Promise((res) => setTimeout(res, 600));


            try { printWindow.focus(); } catch {}
            try { printWindow.print(); } catch (e) { console.warn('Auto-print failed', e); }
            resolve(printWindow);
            return;
          }


          const fallbackInstructions = printWindow.document.createElement('div');
          fallbackInstructions.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; background: #dc3545; color: white; padding: 15px; text-align: center; z-index: 9999; font-family: Arial, sans-serif;">
              <h3 style="margin: 0 0 10px 0;">Paged.js Failed to Load</h3>
              <p style="margin: 0 0 15px 0;">The document is ready but without advanced pagination. You can still print using the button below or Ctrl+P.</p>
              <button id="__print_btn__" style="padding: 10px 20px; background: white; color: #dc3545; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                🖨️ Print Anyway
              </button>
              <button id="__close_btn__" style="padding: 10px 20px; background: #333; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; margin-left: 10px;">
                ✕ Close
              </button>
            </div>
          `;
          printWindow.document.body.appendChild(fallbackInstructions);
          const printBtn = printWindow.document.getElementById('__print_btn__');
          const closeBtn = printWindow.document.getElementById('__close_btn__');
          if (printBtn) printBtn.addEventListener('click', () => printWindow.print());
          if (closeBtn) closeBtn.addEventListener('click', () => printWindow.close());
          

      try {
        const banner = printWindow.document.createElement('div');
        banner.setAttribute('id', '__paged_banner__');
        banner.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; background: #007bff; color: white; padding: 12px; text-align: center; z-index: 99999; font-family: Arial, sans-serif;';
        banner.innerHTML = `
          <div style="display:flex; justify-content:center; align-items:center; gap:12px;">
                <div style="font-weight:600;">Ready to print — click Print or press Ctrl/Cmd+P</div>
                <button id="__paged_print_btn__" style="padding:8px 14px; background:white; color:#007bff; border:none; border-radius:6px; cursor:pointer; font-weight:700;">🖨️ Print</button>
            <button id="__paged_close_btn__" style="padding:8px 14px; background:#333; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:700;">✕ Close</button>
          </div>
        `;
        printWindow.document.body.prepend(banner);
        const pbtn = printWindow.document.getElementById('__paged_print_btn__');
        const cbtn = printWindow.document.getElementById('__paged_close_btn__');
            if (pbtn) pbtn.addEventListener('click', () => { try { printWindow.focus(); } catch {}; printWindow.print(); });
        if (cbtn) cbtn.addEventListener('click', () => printWindow.close());
          } catch (e) { console.error('Failed to inject banner into print window', e); }
        
          try { printWindow.focus(); } catch {}
          resolve(printWindow);
        } catch {

          if (Date.now() - start > maxWaitMs) {
      try { printWindow.focus(); } catch {}
      resolve(printWindow);
          } else {
            // retry shortly
            setTimeout(tryRenderAndPrint, 250);
          }
        }
      };

      tryRenderAndPrint();
    };

    printWindow.onerror = () => {
      reject(new Error('Failed to load print window'));
    };
  });
};

export const createInPagePrint = async (config: PrintConfig, printStyles: string): Promise<void> => {

  (window as any).__originalBody = document.body.innerHTML;
  (window as any).__originalTitle = document.title;


  const printHtml = `
    ${printStyles}
    <div class="tournament-header">${config.tournamentName}</div>
    ${config.questionsHtml}
    <script src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"></script>
    <script>
      // Do not auto-print here; we'll trigger paged.js preview from the parent scope if available
      window.PagedConfig = { auto: false };
    <\/script>
  `;


  document.title = 'Codebusters Test';
  document.body.innerHTML = printHtml;


  const restore = () => {
    try {
      if ((window as any).__originalBody) {
        document.body.innerHTML = (window as any).__originalBody;
        if ((window as any).__originalTitle) document.title = (window as any).__originalTitle;
        delete (window as any).__originalBody;
        delete (window as any).__originalTitle;
      }
    } catch (e) {
      console.error('Failed to restore original content', e);
    }
  };


  const banner = document.createElement('div');
  banner.setAttribute('id', '__inpage_banner__');
  banner.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; background: #007bff; color: white; padding: 12px; text-align: center; z-index: 99999; font-family: Arial, sans-serif; display:flex; justify-content:center; gap:12px; align-items:center;';
  banner.innerHTML = `
    <div style="font-weight:600;">Ready to print — click Print or press Ctrl/Cmd+P</div>
    <button id="__inpage_print_btn__" style="padding:8px 14px; background:white; color:#007bff; border:none; border-radius:6px; cursor:pointer; font-weight:700;">🖨️ Print</button>
    <button id="__inpage_close_btn__" style="padding:8px 14px; background:#333; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:700;">✕ Close</button>
  `;
  document.body.prepend(banner);

  const pbtn = document.getElementById('__inpage_print_btn__');
  const cbtn = document.getElementById('__inpage_close_btn__');
  if (pbtn) pbtn.addEventListener('click', () => {
    try { window.focus(); } catch {}

    const b = document.getElementById('__inpage_banner__'); if (b) (b as HTMLElement).style.display = 'none';
    window.print();
  });
  if (cbtn) cbtn.addEventListener('click', () => restore());


  const beforePrintHandler = () => {
    try {

      banner.style.display = 'none';
    } catch (e) { console.error(e); }
  };

  const afterPrintHandler = () => {
    try {

      banner.style.display = 'flex';
      restore();
    } catch (e) { console.error(e); }
    window.removeEventListener('beforeprint', beforePrintHandler);
    window.removeEventListener('afterprint', afterPrintHandler);
  };

  window.addEventListener('beforeprint', beforePrintHandler);
  window.addEventListener('afterprint', afterPrintHandler);


  const keyHandler = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
      try { banner.style.display = 'none'; } catch {}
    }
  };
  document.addEventListener('keydown', keyHandler);


  const cleanupOnRestore = () => { document.removeEventListener('keydown', keyHandler); };
  // also call on afterprint
  window.addEventListener('afterprint', cleanupOnRestore);


  try {
    if ((window as any).PagedPolyfill && typeof (window as any).PagedPolyfill.preview === 'function') {
      (window as any).PagedPolyfill.preview();
    }
  } catch (e) {
    // ignore preview errors; user can still print
    console.error('Paged preview failed', e);
  }


  await new Promise((res) => setTimeout(res, 200));
  

  try { 
    window.focus(); 
    window.print(); 
  } catch (e) { 
    console.warn('Auto-print failed', e); 
  }
};
