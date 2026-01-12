/**
 * Constants for the OpenAI Assistants MCP Bridge
 */

/**
 * Run status values returned by OpenAI Runs API
 */
export const RUN_STATUS = {
  QUEUED: "queued",
  IN_PROGRESS: "in_progress",
  REQUIRES_ACTION: "requires_action",
  CANCELLING: "cancelling",
  CANCELLED: "cancelled",
  FAILED: "failed",
  COMPLETED: "completed",
  INCOMPLETE: "incomplete",
  EXPIRED: "expired",
} as const;

/**
 * Terminal run statuses - when a run reaches these, it won't change
 */
export const TERMINAL_RUN_STATUSES = new Set([
  RUN_STATUS.COMPLETED,
  RUN_STATUS.FAILED,
  RUN_STATUS.CANCELLED,
  RUN_STATUS.EXPIRED,
  RUN_STATUS.INCOMPLETE,
]);

/**
 * Failed run statuses - when a run reaches these, it's considered failed
 */
export const FAILED_RUN_STATUSES: Set<string> = new Set([
  RUN_STATUS.FAILED,
  RUN_STATUS.CANCELLED,
  RUN_STATUS.EXPIRED,
]);

/**
 * Default configuration values
 */
export const DEFAULTS = {
  /** Default OpenAI API base URL */
  OPENAI_BASE_URL: "https://api.openai.com/v1",
  
  /** Default polling timeout in milliseconds (90 seconds) */
  POLL_TIMEOUT_MS: 90_000,
  
  /** Default polling interval in milliseconds */
  POLL_INTERVAL_MS: 500,
  
  /** Default max retries for API calls */
  MAX_RETRIES: 3,
  
  /** Default max cache size for Maps */
  MAX_CACHE_SIZE: 100,
  
  /** Default messages limit when fetching thread messages */
  MESSAGES_LIMIT: 10,
} as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Retryable HTTP status codes
 */
export const RETRYABLE_STATUS_CODES: Set<number> = new Set([
  HTTP_STATUS.TOO_MANY_REQUESTS,
  HTTP_STATUS.INTERNAL_SERVER_ERROR,
  HTTP_STATUS.SERVICE_UNAVAILABLE,
]);

/**
 * Tool names for the MCP bridge
 */
export const TOOL_NAMES = {
  UX_CONSULTANT: "ux_consultant_review",
  PERSONAS: "personas_and_journeys",
  UI_CRITIQUE: "ui_critique",
  MICROCOPY: "microcopy_rewrite",
  A11Y: "a11y_review",
  SUPER_AGENT: "super_agent_review",
  RESET_ALL: "reset_all_specialists",
  LIST_STATUS: "list_specialists_status",
  HEALTH_CHECK: "check_openai_connection",
} as const;

/**
 * Environment variable names
 */
export const ENV_VARS = {
  OPENAI_API_KEY: "OPENAI_API_KEY",
  OPENAI_BASE_URL: "OPENAI_BASE_URL",
  POLL_TIMEOUT_MS: "OPENAI_POLL_TIMEOUT_MS",
  ASSISTANT_UX: "OPENAI_ASSISTANT_UX",
  ASSISTANT_PERSONAS: "OPENAI_ASSISTANT_PERSONAS",
  ASSISTANT_UI: "OPENAI_ASSISTANT_UI",
  ASSISTANT_MICROCOPY: "OPENAI_ASSISTANT_MICROCOPY",
  ASSISTANT_A11Y: "OPENAI_ASSISTANT_A11Y",
  ASSISTANT_SUPER: "OPENAI_ASSISTANT_SUPER",
} as const;

/**
 * MCP server metadata
 */
export const SERVER_INFO = {
  NAME: "openai-assistants-bridge",
  VERSION: "1.1.0",
} as const;
