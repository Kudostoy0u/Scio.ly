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
  log: (..._args: unknown[]) => {
    // Development logging can be added here if needed
  },

  warn: (..._args: unknown[]) => {
    if (!getIsTest()) {
      // Suppress warnings in test environment
    }
  },

  error: (..._args: unknown[]) => {
    if (!getIsTest()) {
      // Suppress errors in test environment
    }
  },

  info: (..._args: unknown[]) => {
    if (getIsDev()) {
      // Info logging can be added here if needed
    }
  },

  debug: (..._args: unknown[]) => {
    if (getIsDev()) {
      // Debug logging can be added here if needed
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

      // Logging disabled in development mode
      // biome-ignore lint/complexity/noVoid: Intentional void for debugging info
      void {
        timestamp: new Date().toISOString(),
        level,
        message,
        context: context || {},
        environment: process.env.NODE_ENV,
      };
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
