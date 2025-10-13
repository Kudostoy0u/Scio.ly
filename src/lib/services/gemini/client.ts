/**
 * Gemini client management and initialization
 */

import { GoogleGenAI } from "@google/genai";

/**
 * Environment variable containing comma-separated Gemini API keys
 * Used for load balancing across multiple API keys
 */
const GEMINI_API_KEYS = process.env.GEMINI_API_KEYS?.split(',').map(key => key.trim()) || [];

/**
 * Gemini client manager for load balancing and failover
 */
export class GeminiClientManager {
  /** Array of Gemini AI clients for load balancing */
  private aiClients: GoogleGenAI[] = [];
  /** Current index for round-robin client selection */
  private currentKeyIndex = 0;

  /**
   * Initializes the Gemini client manager with available API keys
   * Sets up multiple clients for load balancing and failover
   */
  constructor() {
    // Initialize AI clients with available API keys
    GEMINI_API_KEYS.forEach(apiKey => {
      if (apiKey) {
        this.aiClients.push(new GoogleGenAI({ apiKey }));
      }
    });

    if (this.aiClients.length === 0) {
      console.warn('No Gemini API keys provided, AI features will be disabled');
    } else {
      // Log initialization in non-production environments
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Initialized Gemini client with ${this.aiClients.length} API keys`);
      }
    }
  }

  /**
   * Gets the current Gemini client using round-robin selection
   * Provides load balancing across multiple API keys
   * @returns {GoogleGenAI} Current Gemini client
   */
  public getCurrentClient(): GoogleGenAI {
    if (this.aiClients.length === 0) {
      throw new Error('No Gemini API clients available');
    }

    const client = this.aiClients[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.aiClients.length;
    return client;
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
}
