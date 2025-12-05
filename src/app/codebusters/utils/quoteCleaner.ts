/**
 * Utility function to clean quotes by removing bracketed content
 * Removes any text within square brackets [], curly braces {}, or parentheses ()
 * Examples:
 * "Brownie Mix [10w] + {Couplet} Betwixt hell and the River Styx,I'll be shitting bricks."
 * becomes: "Brownie Mix + Betwixt hell and the River Styx,I'll be shitting bricks."
 */
export function cleanQuote(quote: string): string {
	let cleaned = quote.replace(/\[[^\]]*\]/g, "");

	cleaned = cleaned.replace(/\{[^}]*\}/g, "");

	cleaned = cleaned.replace(/\([^)]*\)/g, "");

	cleaned = cleaned.replace(/\s+/g, " ").trim();

	return cleaned;
}
