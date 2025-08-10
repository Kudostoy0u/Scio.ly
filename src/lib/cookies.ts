import { toast } from 'react-toastify';

console.log('[cookies.ts] Cookie utility file loaded');

// Cookie utility functions for managing favorite configurations
// Cookies are more persistent than localStorage and survive browser restarts

const COOKIE_NAME = 'favoriteConfigs';
const COOKIE_EXPIRY_DAYS = 365; // 1 year

// Set a cookie with the given name, value, and expiration
export const setCookie = (name: string, value: string, days: number = COOKIE_EXPIRY_DAYS) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  const expiresString = expires.toUTCString();
  
  // Set cookie with secure attributes
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expiresString}; path=/; SameSite=Strict`;
  console.log(`[cookies.ts] Set cookie: ${name}=${encodeURIComponent(value).substring(0, 100)}...; expires=${expiresString}; path=/; SameSite=Strict`);
};

// Get a cookie value by name
export const getCookie = (name: string): string | null => {
  console.log(`[cookies.ts] Getting cookie for name: ${name}`);
  console.log(`[cookies.ts] All cookies: ${document.cookie}`);
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      const value = decodeURIComponent(c.substring(nameEQ.length, c.length));
      console.log(`[cookies.ts] Found cookie value for ${name}: ${value.substring(0, 100)}...`);
      return value;
    }
  }
  console.log(`[cookies.ts] Cookie "${name}" not found.`);
  return null;
};

// Delete a cookie by name
export const deleteCookie = (name: string) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  console.log(`[cookies.ts] Deleted cookie: ${name}`);
};

// Save favorite configurations to cookie
export const saveFavoriteConfigs = (configs: any[]) => {
  try {
    const configString = JSON.stringify(configs);
    console.log('[cookies.ts] Saving configs to cookie:', configs);
    console.log('[cookies.ts] Config string length:', configString.length);
    
    // Check if cookie size exceeds limit (4KB = 4096 bytes)
    if (configString.length > 4000) {
      console.warn('[cookies.ts] Cookie size too large, truncating to last 5 configs');
      const truncatedConfigs = configs.slice(-5); // Keep only last 5 configs
      const truncatedString = JSON.stringify(truncatedConfigs);
      setCookie(COOKIE_NAME, truncatedString);
      return true;
    }
    
    setCookie(COOKIE_NAME, configString);
    console.log('[cookies.ts] Cookie saved successfully');
    return true;
  } catch (error) {
    console.error('[cookies.ts] Error saving favorite configs to cookie:', error);
    toast.error('Error saving configuration to cookies.');
    return false;
  }
};

// Load favorite configurations from cookie
export const loadFavoriteConfigs = (): any[] => {
  try {
    const configString = getCookie(COOKIE_NAME);
    console.log('[cookies.ts] Loading from cookie, raw string:', configString);
    if (!configString) {
      console.log('[cookies.ts] No cookie found, returning empty array');
      return [];
    }
    
    const configs = JSON.parse(configString);
    console.log('[cookies.ts] Parsed configs:', configs);
    return Array.isArray(configs) ? configs : [];
  } catch (error) {
    console.error('[cookies.ts] Error parsing or loading favorite configs from cookie:', error);
    // If there's an error parsing the cookie, delete it and return empty array
    deleteCookie(COOKIE_NAME);
    toast.error('Error loading favorite configurations. Corrupted data cleared.');
    return [];
  }
};

// Check if cookies are supported/enabled
export const areCookiesEnabled = (): boolean => {
  try {
    // Try to set a test cookie
    setCookie('test', 'test', 1);
    const testValue = getCookie('test');
    deleteCookie('test');
    const enabled = testValue === 'test';
    console.log(`[cookies.ts] Cookies enabled: ${enabled}`);
    return enabled;
  } catch (error) {
    console.error('[cookies.ts] Error checking cookie support:', error);
    return false;
  }
};
