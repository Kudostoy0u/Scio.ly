/**
 * Utility function to clean quotes by removing bracketed content
 * Removes any text within square brackets [], curly braces {}, or parentheses ()
 * Examples:
 * "Brownie Mix [10w] + {Couplet} Betwixt hell and the River Styx,I'll be shitting bricks."
 * becomes: "Brownie Mix + Betwixt hell and the River Styx,I'll be shitting bricks."
 */
export function cleanQuote(quote: string): string {
  // Remove content within square brackets []
  let cleaned = quote.replace(/\[[^\]]*\]/g, '');
  
  // Remove content within curly braces {}
  cleaned = cleaned.replace(/\{[^}]*\}/g, '');
  
  // Remove content within parentheses ()
  cleaned = cleaned.replace(/\([^)]*\)/g, '');
  
  // Clean up any extra whitespace that might be left behind
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}
