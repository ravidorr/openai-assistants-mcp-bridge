/**
 * Simple structured logger for the MCP bridge
 * Outputs JSON logs to stderr to avoid interfering with MCP stdio transport
 */

/**
 * Log levels in order of severity
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Log entry structure
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  /** Minimum log level to output */
  minLevel: LogLevel;
  /** Whether logging is enabled */
  enabled: boolean;
}

/**
 * Numeric values for log levels for comparison
 */
const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Global logger configuration
 */
const config: LoggerConfig = {
  minLevel: (process.env.LOG_LEVEL as LogLevel) || "info",
  enabled: process.env.LOG_ENABLED !== "false",
};

/**
 * Check if a log level should be output based on current configuration
 */
function shouldLog(level: LogLevel): boolean {
  if (!config.enabled) {
    return false;
  }
  return LOG_LEVEL_VALUES[level] >= LOG_LEVEL_VALUES[config.minLevel];
}

/**
 * Format and output a log entry
 */
function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (!shouldLog(level)) {
    return;
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }

  // Output to stderr to avoid interfering with MCP stdio transport on stdout
  console.error(JSON.stringify(entry));
}

/**
 * Logger interface for the MCP bridge
 */
export const logger = {
  /**
   * Log a debug message
   * @param message - The message to log
   * @param context - Optional context object
   */
  debug(message: string, context?: Record<string, unknown>): void {
    log("debug", message, context);
  },

  /**
   * Log an info message
   * @param message - The message to log
   * @param context - Optional context object
   */
  info(message: string, context?: Record<string, unknown>): void {
    log("info", message, context);
  },

  /**
   * Log a warning message
   * @param message - The message to log
   * @param context - Optional context object
   */
  warn(message: string, context?: Record<string, unknown>): void {
    log("warn", message, context);
  },

  /**
   * Log an error message
   * @param message - The message to log
   * @param context - Optional context object
   */
  error(message: string, context?: Record<string, unknown>): void {
    log("error", message, context);
  },

  /**
   * Configure the logger
   * @param options - Partial configuration to apply
   */
  configure(options: Partial<LoggerConfig>): void {
    if (options.minLevel !== undefined) {
      config.minLevel = options.minLevel;
    }
    if (options.enabled !== undefined) {
      config.enabled = options.enabled;
    }
  },

  /**
   * Get current logger configuration
   */
  getConfig(): Readonly<LoggerConfig> {
    return { ...config };
  },
};
