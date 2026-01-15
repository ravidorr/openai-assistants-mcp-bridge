/**
 * Shared types for OpenAI Assistants configuration
 */

/**
 * JSON Schema definition for structured outputs
 */
export interface JsonSchema {
  name: string;
  strict?: boolean;
  schema: Record<string, unknown>;
}

/**
 * Response format configuration for structured outputs
 * @see https://platform.openai.com/docs/guides/structured-outputs
 */
export interface ResponseFormat {
  type: "json_schema" | "json_object" | "text";
  json_schema?: JsonSchema;
}

export interface AssistantConfig {
  name: string;
  model: string;
  tools: Array<{ type: "file_search" } | { type: "code_interpreter" }>;
  instructions: string;
  envVar: string;
  /** Optional structured output format - when set, assistant responses will be JSON */
  response_format?: ResponseFormat;
}

export interface OpenAIAssistant {
  id: string;
  object: "assistant";
  created_at: number;
  name: string | null;
  description: string | null;
  model: string;
  instructions: string | null;
  tools: Array<{ type: string }>;
}

export interface McpConfig {
  mcpServers?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface McpServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface McpJson {
  mcpServers?: Record<string, McpServerConfig>;
}
