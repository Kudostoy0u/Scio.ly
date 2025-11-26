/**
 * Gemini client management and initialization
 */

import logger from "@/lib/utils/logger";
import { GoogleGenAI } from "@google/genai";

/**
 * Environment variable containing comma-separated Gemini API keys
 * Used for load balancing across multiple API keys
 */
const GEMINI_API_KEYS = process.env.GEMINI_API_KEYS?.split(",").map((key) => key.trim()) || [];

/**
 * Client and key information pair
 */
export interface ClientWithKey {
  client: GoogleGenAI;
  keyIndex: number;
  apiKey: string;
}

/**
 * Gemini client manager for load balancing and failover
 */
export class GeminiClientManager {
  /** Array of Gemini AI clients for load balancing */
  private aiClients: GoogleGenAI[] = [];
  /** Array of API keys corresponding to clients */
  private apiKeys: string[] = [];

  /**
   * Initializes the Gemini client manager with available API keys
   * Sets up multiple clients for load balancing and failover
   */
  constructor() {
    // Initialize AI clients with available API keys
    GEMINI_API_KEYS.forEach((apiKey, _index) => {
      if (apiKey) {
        this.aiClients.push(new GoogleGenAI({ apiKey }));
        this.apiKeys.push(apiKey);
      }
    });

    if (this.aiClients.length === 0) {
      logger.warn("No Gemini API keys provided, AI features will be disabled");
    } else if (process.env.NODE_ENV !== "production") {
      // Log initialization in non-production environments
      logger.log(`Initialized Gemini client with ${this.aiClients.length} API keys`);
    }
  }

  /**
   * Gets a random Gemini client
   * Provides random load balancing across multiple API keys
   * @returns {ClientWithKey} Client with key information
   */
  public getRandomClient(): ClientWithKey {
    if (this.aiClients.length === 0) {
      throw new Error("No Gemini API clients available");
    }

    const keyIndex = Math.floor(Math.random() * this.aiClients.length);
    const client = this.aiClients[keyIndex];
    const apiKey = this.apiKeys[keyIndex];
    if (!(client && apiKey)) {
      throw new Error("No AI client or API key available");
    }
    return {
      client,
      keyIndex,
      apiKey,
    };
  }

  /**
   * Gets the API key at a specific index
   * @param {number} keyIndex - Index of the API key
   * @returns {string} API key (masked for security)
   */
  public getApiKeyForIndex(keyIndex: number): string {
    if (keyIndex < 0 || keyIndex >= this.apiKeys.length) {
      return "unknown";
    }
    const key = this.apiKeys[keyIndex];
    if (!key) {
      return "unknown";
    }
    // Mask the key for logging (show first 8 and last 4 characters)
    if (key.length > 12) {
      return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
    }
    return "***";
  }

  /**
   * Gets all available clients
   * @returns {GoogleGenAI[]} Array of all Gemini clients
   */
  public getAllClients(): GoogleGenAI[] {
    return [...this.aiClients];
  }

  /**
   * Checks if any clients are available
   * @returns {boolean} True if clients are available
   */
  public hasClients(): boolean {
    return this.aiClients.length > 0;
  }

  /**
   * Gets the number of available clients
   * @returns {number} Number of available clients
   */
  public getClientCount(): number {
    return this.aiClients.length;
  }

  /**
   * Gets a client by index (for retry logic)
   * @param {number} keyIndex - Index of the API key
   * @returns {ClientWithKey} Client with key information
   */
  public getClientByIndex(keyIndex: number): ClientWithKey {
    if (this.aiClients.length === 0) {
      throw new Error("No Gemini API clients available");
    }

    const index = keyIndex % this.aiClients.length;
    const client = this.aiClients[index];
    const apiKey = this.apiKeys[index];
    if (!(client && apiKey)) {
      throw new Error("No AI client or API key available");
    }
    return {
      client,
      keyIndex: index,
      apiKey,
    };
  }
}
