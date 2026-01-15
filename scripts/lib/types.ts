/**
 * Shared types for OpenAI Assistants configuration
 */

export interface AssistantConfig {
  name: string;
  model: string;
  tools: Array<{ type: "file_search" } | { type: "code_interpreter" }>;
  instructions: string;
  envVar: string;
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
