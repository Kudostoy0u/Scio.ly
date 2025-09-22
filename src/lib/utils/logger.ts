const isDev = process.env.NODE_ENV === 'development';

const logger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log('[LOG]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn('[WARN]', ...args);
    }
  },
  error: (...args: any[]) => {
    if (isDev) {
      console.error('[ERROR]', ...args);
    }
  },
};

export default logger;
