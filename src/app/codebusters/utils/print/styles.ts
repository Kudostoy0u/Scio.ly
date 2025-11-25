export const createCodebustersPrintStyles = (_getStylesheets: () => string) => `
  <style>
    ${_getStylesheets()}
    
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
    
    /* Cipher text display */
    .cipher-text {
      font-family: 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.6;
      word-break: break-word;
      margin: 10px 0;
    }
    
    .question-header {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 8px;
    }
    
    .author-info {
      font-size: 12px;
      font-style: italic;
      margin-bottom: 10px;
      color: #666;
    }
    
    .cipher-type {
      font-size: 11px;
      color: #666;
      margin-bottom: 8px;
    }
    
    /* Hill cipher matrix print styles */
    .hill-matrix {
      margin: 10px 0;
      border-collapse: collapse;
    }
    
    .hill-matrix td {
      border: 1px solid #000;
      padding: 4px 8px;
      text-align: center;
      min-width: 30px;
    }
    
    /* Porta table replacement for print */
    .porta-replacement-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
      margin: 10px 0;
    }
    
    .porta-replacement-table td {
      border: 1px solid #000;
      padding: 2px;
      text-align: center;
    }
    
    /* Baconian display print styles */
    .baconian-display {
      margin: 10px 0;
      font-family: 'Courier New', monospace;
      font-size: 12px;
    }
    
    /* Cryptarithm print styles */
    .cryptarithm-display {
      margin: 10px 0;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.8;
    }
    
    .question:first-of-type {
      margin-top: 25px;
    }
  </style>
`;
