// Dynamic environment detection for better testability
const getIsDev = () => process.env.NODE_ENV === "development";
const getIsTest = () => process.env.NODE_ENV === "test";
const getIsDeveloperMode = () => getIsDev() || process.env.DEVELOPER_MODE === "true";

/**
 * Centralized logger utility with enhanced developer mode support
 * - In development: logs everything to console with enhanced formatting
 * - In developer mode: includes structured logging, timing, and detailed context
 * - In production: only logs warnings and errors
 * - In test: suppresses all logs
 */
const logger = {
  log: (...args: unknown[]) => {
    if (getIsDev()) {
      console.log(...args);
    }
  },

  warn: (...args: unknown[]) => {
    if (!getIsTest()) {
      console.warn(...args);
    }
  },

  error: (...args: unknown[]) => {
    if (!getIsTest()) {
      console.error(...args);
    }
  },

  info: (...args: unknown[]) => {
    if (getIsDev()) {
      console.info("[INFO]", ...args);
    }
  },

  debug: (...args: unknown[]) => {
    if (getIsDev()) {
      console.debug(...args);
    }
  },

  // Enhanced developer mode logging
  dev: {
    // Structured logging with context
    structured: (
      level: "info" | "warn" | "error" | "debug",
      message: string,
      context?: Record<string, unknown>
    ) => {
      if (!getIsDeveloperMode()) {
        return;
      }

      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        message,
        context: context || {},
        environment: process.env.NODE_ENV,
      };
      
      const prefix = `[DEV-${level.toUpperCase()}]`;
      console.log(prefix, JSON.stringify(logEntry, null, 2));
    },

    // Request/Response logging
    request: (method: string, url: string, body?: unknown, headers?: Record<string, string>) => {
      if (!getIsDeveloperMode()) {
        return;
      }

      logger.dev.structured("info", `API Request: ${method} ${url}`, {
        method,
        url,
        body: body ? JSON.stringify(body, null, 2) : undefined,
        headers: headers
          ? Object.keys(headers).reduce(
              (acc, key) => {
                // Mask sensitive headers
                if (
                  key.toLowerCase().includes("authorization") ||
                  key.toLowerCase().includes("token")
                ) {
                  acc[key] = "[REDACTED]";
                } else {
                  acc[key] = headers[key] || "";
                }
                return acc;
              },
              {} as Record<string, string>
            )
          : undefined,
      });
    },

    response: (status: number, body?: unknown, timing?: number) => {
      if (!getIsDeveloperMode()) {
        return;
      }

      logger.dev.structured("info", `API Response: ${status}`, {
        status,
        body: body ? JSON.stringify(body, null, 2) : undefined,
        timing: timing ? `${timing}ms` : undefined,
      });
    },

    // Performance timing
    timing: (operation: string, startTime: number, context?: Record<string, unknown>) => {
      if (!getIsDeveloperMode()) {
        return;
      }

      const duration = Date.now() - startTime;
      logger.dev.structured("debug", `Timing: ${operation}`, {
        operation,
        duration: `${duration}ms`,
        ...context,
      });
    },

    // Error with full context
    error: (message: string, error: Error, context?: Record<string, unknown>) => {
      if (!getIsDeveloperMode()) {
        return;
      }

      logger.dev.structured("error", message, {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        ...context,
      });
    },

    // Database operation logging
    db: (operation: string, table: string, query?: string, params?: unknown[]) => {
      if (!getIsDeveloperMode()) {
        return;
      }

      logger.dev.structured("debug", `DB ${operation}: ${table}`, {
        operation,
        table,
        query,
        params,
      });
    },

    // AI service logging
    ai: (
      service: string,
      operation: string,
      request?: unknown,
      response?: unknown,
      timing?: number
    ) => {
      if (!getIsDeveloperMode()) {
        return;
      }

      logger.dev.structured("info", `AI ${service}: ${operation}`, {
        service,
        operation,
        request: request ? JSON.stringify(request, null, 2) : undefined,
        response: response ? JSON.stringify(response, null, 2) : undefined,
        timing: timing ? `${timing}ms` : undefined,
      });
    },
  },
};

export default logger;
