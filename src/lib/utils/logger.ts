const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Centralized logger utility
 * - In development: logs everything to console
 * - In production: only logs warnings and errors
 * - In test: suppresses all logs
 */
const logger = {
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log('[LOG]', ...args);
    }
  },

  warn: (...args: unknown[]) => {
    if (!isTest) {
      console.warn('[WARN]', ...args);
    }
  },

  error: (...args: unknown[]) => {
    if (!isTest) {
      console.error('[ERROR]', ...args);
    }
  },

  info: (...args: unknown[]) => {
    if (isDev) {
      console.info('[INFO]', ...args);
    }
  },

  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug('[DEBUG]', ...args);
    }
  },
};

export default logger;
