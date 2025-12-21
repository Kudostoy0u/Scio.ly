/**
 * Gemini client management and initialization
 */

import logger from "@/lib/utils/logging/logger";
import { GoogleGenAI } from "@google/genai";

/**
 * Environment variable containing Gemini API key
 */
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

/**
 * Client information
 */
export interface ClientWithKey {
	client: GoogleGenAI;
	apiKey: string;
}

/**
 * Gemini client manager
 */
export class GeminiClientManager {
	/** Gemini AI client */
	private aiClient: GoogleGenAI | null = null;
	/** API key */
	private apiKey = "";

	/**
	 * Initializes the Gemini client manager with the API key
	 */
	constructor() {
		if (GEMINI_API_KEY) {
			this.aiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
			this.apiKey = GEMINI_API_KEY;

			if (process.env.NODE_ENV !== "production") {
				logger.log("Initialized Gemini client");
			}
		} else {
			logger.warn("No GEMINI_API_KEY provided, AI features will be disabled");
		}
	}

	/**
	 * Gets the Gemini client
	 * @returns {ClientWithKey} Client with key information
	 */
	public getClient(): ClientWithKey {
		if (!this.aiClient) {
			throw new Error("Gemini API client not initialized");
		}

		return {
			client: this.aiClient,
			apiKey: this.apiKey,
		};
	}

	/**
	 * Gets the masked API key
	 * @returns {string} API key (masked for security)
	 */
	public getMaskedApiKey(): string {
		if (!this.apiKey) {
			return "unknown";
		}
		// Mask the key for logging (show first 8 and last 4 characters)
		if (this.apiKey.length > 12) {
			return `${this.apiKey.substring(0, 8)}...${this.apiKey.substring(this.apiKey.length - 4)}`;
		}
		return "***";
	}

	/**
	 * Checks if client is available
	 * @returns {boolean} True if client is available
	 */
	public hasClient(): boolean {
		return this.aiClient !== null;
	}
}
