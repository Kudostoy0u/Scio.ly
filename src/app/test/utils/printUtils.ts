export interface TestPrintConfig {
  tournamentName: string;
  questionsHtml: string;
  questionPoints: { [key: number]: number };
}

export const createTestPrintStyles = (getStylesheets: () => string) => `
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
      margin-bottom: 25px; 
      margin-top: 15px;
      padding: 0;
      border: none;
      font-family: 'Times New Roman', serif;
    }
    
    .question-header {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 8px;
      line-height: 1.4;
    }
    
    .question-options {
      margin-left: 20px;
      margin-top: 8px;
    }
    
    .option {
      margin-bottom: 4px;
      font-size: 13px;
      line-height: 1.3;
    }
    
    .question-image {
      margin: 10px 0;
      text-align: center;
    }
    
    .question-image img {
      max-width: 300px;
      max-height: 200px;
      border: 1px solid #ccc;
    }
    
    .answer-space {
      margin-top: 10px;
      margin-left: 20px;
    }
    
    .answer-line {
      margin-bottom: 8px;
      font-size: 13px;
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
      gap: 20px;
    }
    
    .answer-column {
      flex: 1;
    }
    
    .answer-item {
      margin-bottom: 6px;
      font-size: 13px;
      line-height: 1.3;
    }
    
    /* Add extra spacing for the first question on each page */
    .question:first-of-type {
      margin-top: 25px;
    }
    
    /* Ensure questions at the top of pages have proper spacing */
    @page {
      margin-top: 0.75in;
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
      padding: 15px 0 5px 0;
      margin-top: 20px;
    }
    
    input { 
      border: 1px solid #000 !important; 
      background: white !important;
    }
    
    button { 
      display: none !important; 
    }
    
    .question-actions { 
      display: none !important; 
    }
    
    .floating-buttons { 
      display: none !important; 
    }
    
    /* Non-print styles for preview */
    body { 
      font-family: 'Times New Roman', serif; 
      margin: 0;
    }
    
    .question { 
      margin-bottom: 25px; 
      margin-top: 15px;
      padding: 0;
      border: none;
    }
    
    .question-header {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 8px;
      line-height: 1.4;
    }
    
    .question-options {
      margin-left: 20px;
      margin-top: 8px;
    }
    
    .option {
      margin-bottom: 4px;
      font-size: 13px;
      line-height: 1.3;
    }
    
    .question-image {
      margin: 10px 0;
      text-align: center;
    }
    
    .question-image img {
      max-width: 300px;
      max-height: 200px;
      border: 1px solid #ccc;
    }
    
    .answer-space {
      margin-top: 10px;
      margin-left: 20px;
    }
    
    .answer-line {
      margin-bottom: 8px;
      font-size: 13px;
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
      gap: 20px;
    }
    
    .answer-column {
      flex: 1;
    }
    
    .answer-item {
      margin-bottom: 6px;
      font-size: 13px;
      line-height: 1.3;
    }
    
    .tournament-header {
      text-align: center;
      font-size: 12px;
      font-weight: bold;
      color: #333;
      margin-bottom: 15px;
      margin-top: 20px;
      padding-top: 15px;
    }
  </style>
`;

export const createTestPrintContent = (config: TestPrintConfig, printStyles: string) => `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Science Olympiad Test</title>
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
              <p style="margin: 0 0 15px 0;">Your test has been prepared with page numbers and proper formatting.</p>
              <div style="display: flex; gap: 10px; justify-content: center; align-items: center;">
                <button onclick="window.print()" style="padding: 10px 20px; background: white; color: #007bff; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                  🖨️ Print Test
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

export const setupTestPrintWindow = (printContent: string): Promise<Window> => {
  return new Promise((resolve, reject) => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        reject(new Error('Please allow popups to print the test'));
        return;
      }


      printWindow.onerror = () => {
        reject(new Error('Failed to load print window'));
      };


      const timeout = setTimeout(() => {
        reject(new Error('Print window failed to load within 10 seconds'));
      }, 10000);

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


        if (printWindow.PagedPolyfill) {
          printWindow.PagedPolyfill.preview();
        } else {

          setTimeout(() => {
            const fallbackInstructions = printWindow.document.createElement('div');
            fallbackInstructions.innerHTML = `
              <div style="position: fixed; top: 0; left: 0; right: 0; background: #dc3545; color: white; padding: 15px; text-align: center; z-index: 9999; font-family: Arial, sans-serif;">
                <h3 style="margin: 0 0 10px 0;">Paged.js Failed to Load</h3>
                <p style="margin: 0 0 15px 0;">The test is ready but without advanced pagination. You can still print using the button below or Ctrl+P.</p>
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
          }, 500);
        }


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
          // prepend banner to body
          printWindow.document.body.prepend(banner);
          const pbtn = printWindow.document.getElementById('__paged_print_btn__');
          const cbtn = printWindow.document.getElementById('__paged_close_btn__');
          if (pbtn) pbtn.addEventListener('click', () => {
            try { printWindow.focus(); } catch {};
            printWindow.print();
          });
          if (cbtn) cbtn.addEventListener('click', () => printWindow.close());
        } catch (e) {
          // ignore dom injection errors
          console.error('Failed to inject banner into print window', e);
        }


        try { printWindow.focus(); } catch {}
        clearTimeout(timeout);
        resolve(printWindow);
      };

    } catch (error) {
      reject(new Error(`Failed to create print window: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
};

export const createTestInPagePrint = async (config: TestPrintConfig, printStyles: string): Promise<void> => {


  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Please allow popups to print the test');
  }


  const printHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Science Olympiad Test</title>
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
                <p style="margin: 0 0 15px 0;">Your test has been prepared with page numbers and proper formatting.</p>
                <div style="display: flex; gap: 10px; justify-content: center; align-items: center;">
                  <button onclick="window.print()" style="padding: 10px 20px; background: white; color: #007bff; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    🖨️ Print Test
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
        
        // Try to auto-focus after a delay
        setTimeout(() => {
          window.focus();
        }, 100);
      </script>
    </head>
    <body>
      <div class="tournament-header">${config.tournamentName}</div>
      ${config.questionsHtml}
    </body>
    </html>
  `;


  printWindow.document.write(printHtml);
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


    if (printWindow.PagedPolyfill) {
      printWindow.PagedPolyfill.preview();
    } else {

      setTimeout(() => {
        const fallbackInstructions = printWindow.document.createElement('div');
        fallbackInstructions.innerHTML = `
          <div style="position: fixed; top: 0; left: 0; right: 0; background: #dc3545; color: white; padding: 15px; text-align: center; z-index: 9999; font-family: Arial, sans-serif;">
            <h3 style="margin: 0 0 10px 0;">Paged.js Failed to Load</h3>
            <p style="margin: 0 0 15px 0;">The test is ready but without advanced pagination. You can still print using the button below or Ctrl+P.</p>
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
      }, 500);
    }


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
      if (pbtn) pbtn.addEventListener('click', () => {
        try { printWindow.focus(); } catch {};
        printWindow.print();
      });
      if (cbtn) cbtn.addEventListener('click', () => printWindow.close());
    } catch (e) {
      console.error('Failed to inject banner into print window', e);
    }


    try { printWindow.focus(); } catch {}
  };

  printWindow.onerror = () => {
    throw new Error('Failed to load print window');
  };


  await new Promise((res) => setTimeout(res, 100));
};
