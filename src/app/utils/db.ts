"use client";

import Dexie, { type Table } from "dexie";

/**
 * Offline database utilities for Science Olympiad platform
 * Provides IndexedDB storage for offline question access
 */

/**
 * Question entry interface for offline storage
 * Represents cached questions for a specific event
 */
export interface QuestionEntry {
	/** URL-friendly event identifier */
	eventSlug: string;
	/** Array of cached questions */
	questions: unknown[];
	/** Timestamp when questions were last updated */
	updatedAt: number;
}

/**
 * ScioDatabase class for offline question storage
 * Extends Dexie to provide offline question access
 */
export class ScioDatabase extends Dexie {
	/** Questions table for offline storage */
	questions!: Table<QuestionEntry, string>;

	/**
	 * Initialize the offline database
	 * Sets up IndexedDB schema for question caching
	 */
	constructor() {
		super("scio-offline");

		// Define database schema
		this.version(1).stores({
			questions: "&eventSlug, updatedAt",
		});
	}
}

/** Default database instance for offline storage */
export const db = new ScioDatabase();
