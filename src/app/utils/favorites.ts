"use client";

import type { Settings } from "@/app/practice/types";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";

/**
 * Favorites management utilities for Science Olympiad test configurations
 * Provides CRUD operations for user favorite test configurations with localStorage
 */

/**
 * Favorite configuration interface
 */
export interface FavoriteConfig {
	/** Science Olympiad event name */
	eventName: string;
	/** Test configuration settings */
	settings: Settings;
}

/** LocalStorage key for favorite configurations */
const FAVORITES_KEY = "scio_favorite_test_configs";
/** Maximum number of favorite configurations allowed */
const MAX_FAVORITES = 4;

/**
 * Normalizes an array of string values for consistent comparison
 * Sorts and filters empty values
 *
 * @param {string[] | undefined} values - Array of string values to normalize
 * @returns {string[]} Normalized and sorted array
 */
function normalizeArray(values: string[] | undefined): string[] {
	if (!values || values.length === 0) {
		return [];
	}
	return [...values]
		.map((v) => (v || "").toString())
		.sort((a, b) => a.localeCompare(b));
}

/**
 * Normalizes settings object for consistent comparison
 * Validates and constrains all settings values
 *
 * @param {Settings} settings - Settings object to normalize
 * @returns {Settings} Normalized settings object
 */
function normalizeSettings(settings: Settings): Settings {
	return {
		...settings,
		difficulties: normalizeArray(settings.difficulties),
		subtopics: normalizeArray(settings.subtopics),
		questionCount: Math.max(
			1,
			Math.min(200, Number(settings.questionCount || 0)),
		),
		timeLimit: Math.max(1, Math.min(120, Number(settings.timeLimit || 0))),
		idPercentage:
			typeof settings.idPercentage === "number"
				? Math.max(0, Math.min(100, settings.idPercentage))
				: settings.idPercentage,
		types: ["multiple-choice", "both", "free-response"].includes(settings.types)
			? settings.types
			: "multiple-choice",
		division: ["B", "C", "any"].includes(settings.division)
			? settings.division
			: "any",
		tournament: settings.tournament || "",
	} as Settings;
}

/**
 * Normalizes a favorite configuration for consistent comparison
 *
 * @param {FavoriteConfig} config - Configuration to normalize
 * @returns {FavoriteConfig} Normalized configuration
 */
function normalizeConfig(config: FavoriteConfig): FavoriteConfig {
	return {
		eventName: config.eventName,
		settings: normalizeSettings(config.settings),
	};
}

/**
 * Compares two favorite configurations for equality
 *
 * @param {FavoriteConfig} a - First configuration
 * @param {FavoriteConfig} b - Second configuration
 * @returns {boolean} True if configurations are equal
 */
function configsEqual(a: FavoriteConfig, b: FavoriteConfig): boolean {
	const na = normalizeConfig(a);
	const nb = normalizeConfig(b);
	return JSON.stringify(na) === JSON.stringify(nb);
}

/**
 * Retrieves all favorite configurations from localStorage
 * Returns up to MAX_FAVORITES configurations, normalized and validated
 *
 * @returns {FavoriteConfig[]} Array of favorite configurations
 * @example
 * ```typescript
 * const favorites = getFavoriteConfigs();
 * console.log(favorites); // [{ eventName: 'Anatomy & Physiology', settings: {...} }]
 * ```
 */
export function getFavoriteConfigs(): FavoriteConfig[] {
	try {
		const raw =
			typeof window !== "undefined"
				? SyncLocalStorage.getItem(FAVORITES_KEY)
				: null;
		if (!raw) {
			return [];
		}
		const parsed = JSON.parse(raw) as FavoriteConfig[];
		if (!Array.isArray(parsed)) {
			return [];
		}

		const cleaned = parsed
			.filter((x) => x && typeof x.eventName === "string" && x.settings)
			.map((x) => normalizeConfig(x));
		return cleaned.slice(0, MAX_FAVORITES);
	} catch {
		return [];
	}
}

/**
 * Saves favorite configurations to localStorage
 * Limits to MAX_FAVORITES configurations
 *
 * @param {FavoriteConfig[]} favorites - Array of favorite configurations to save
 */
function saveFavoriteConfigs(favorites: FavoriteConfig[]) {
	try {
		const capped = favorites.slice(0, MAX_FAVORITES);
		SyncLocalStorage.setItem(FAVORITES_KEY, JSON.stringify(capped));
	} catch {
		// Ignore localStorage errors
	}
}

/**
 * Checks if a configuration is already favorited
 *
 * @param {FavoriteConfig} config - Configuration to check
 * @returns {boolean} True if configuration is favorited
 * @example
 * ```typescript
 * const isFavorited = isConfigFavorited(config);
 * console.log(isFavorited); // true or false
 * ```
 */
export function isConfigFavorited(config: FavoriteConfig): boolean {
	const favorites = getFavoriteConfigs();
	return favorites.some((f) => configsEqual(f, config));
}

/**
 * Adds a configuration to favorites
 * Prevents duplicates and maintains MAX_FAVORITES limit
 *
 * @param {FavoriteConfig} config - Configuration to add to favorites
 * @returns {FavoriteConfig[]} Updated array of favorite configurations
 * @example
 * ```typescript
 * const updatedFavorites = addFavoriteConfig(config);
 * console.log(updatedFavorites); // Updated favorites array
 * ```
 */
export function addFavoriteConfig(config: FavoriteConfig): FavoriteConfig[] {
	const normalized = normalizeConfig(config);
	const favorites = getFavoriteConfigs();
	if (favorites.some((f) => configsEqual(f, normalized))) {
		return favorites;
	}
	const next = [normalized, ...favorites].slice(0, MAX_FAVORITES);
	saveFavoriteConfigs(next);
	return next;
}

/**
 * Removes a configuration from favorites
 *
 * @param {FavoriteConfig} config - Configuration to remove from favorites
 * @returns {FavoriteConfig[]} Updated array of favorite configurations
 * @example
 * ```typescript
 * const updatedFavorites = removeFavoriteConfig(config);
 * console.log(updatedFavorites); // Updated favorites array
 * ```
 */
export function removeFavoriteConfig(config: FavoriteConfig): FavoriteConfig[] {
	const favorites = getFavoriteConfigs();
	const next = favorites.filter((f) => !configsEqual(f, config));
	saveFavoriteConfigs(next);
	return next;
}

/**
 * Toggles a configuration's favorite status
 * Adds if not favorited, removes if already favorited
 *
 * @param {FavoriteConfig} config - Configuration to toggle
 * @returns {{ favorited: boolean; favorites: FavoriteConfig[] }} Object with favorited status and updated favorites
 * @example
 * ```typescript
 * const result = toggleFavoriteConfig(config);
 * console.log(result.favorited); // true or false
 * console.log(result.favorites); // Updated favorites array
 * ```
 */
export function toggleFavoriteConfig(config: FavoriteConfig): {
	favorited: boolean;
	favorites: FavoriteConfig[];
} {
	const normalized = normalizeConfig(config);
	const already = isConfigFavorited(normalized);
	const favorites = already
		? removeFavoriteConfig(normalized)
		: addFavoriteConfig(normalized);
	return { favorited: !already, favorites };
}
