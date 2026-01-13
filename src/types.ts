/**
 * OpenAI Assistants API Type Definitions
 * These types represent the responses from OpenAI's Assistants v2 API.
 */

/**
 * Environment variable keys for assistant IDs
 */
export type AssistantKey =
  | "OPENAI_ASSISTANT_UX"
  | "OPENAI_ASSISTANT_PERSONAS"
  | "OPENAI_ASSISTANT_UI"
  | "OPENAI_ASSISTANT_MICROCOPY"
  | "OPENAI_ASSISTANT_A11Y"
  | "OPENAI_ASSISTANT_SUPER";

/**
 * OpenAI Thread object
 * @see https://platform.openai.com/docs/api-reference/threads/object
 */
export interface OpenAIThread {
  id: string;
  object: "thread";
  created_at: number;
  metadata: Record<string, string>;
  tool_resources?: {
    code_interpreter?: { file_ids: string[] };
    file_search?: { vector_store_ids: string[] };
  };
}

/**
 * OpenAI Run status values
 */
export type RunStatus =
  | "queued"
  | "in_progress"
  | "requires_action"
  | "cancelling"
  | "cancelled"
  | "failed"
  | "completed"
  | "incomplete"
  | "expired";

/**
 * OpenAI Run error object
 */
export interface RunError {
  code: string;
  message: string;
}

/**
 * OpenAI Run object
 * @see https://platform.openai.com/docs/api-reference/runs/object
 */
export interface OpenAIRun {
  id: string;
  object: "thread.run";
  created_at: number;
  thread_id: string;
  assistant_id: string;
  status: RunStatus;
  required_action?: {
    type: "submit_tool_outputs";
    submit_tool_outputs: {
      tool_calls: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    };
  };
  last_error: RunError | null;
  expires_at: number | null;
  started_at: number | null;
  cancelled_at: number | null;
  failed_at: number | null;
  completed_at: number | null;
  incomplete_details?: { reason: string };
  model: string;
  instructions: string | null;
  tools: Array<{ type: string }>;
  metadata: Record<string, string>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI Message content types
 */
export interface TextContent {
  type: "text";
  text: {
    value: string;
    annotations: Array<{
      type: string;
      text: string;
      start_index: number;
      end_index: number;
      file_citation?: { file_id: string };
      file_path?: { file_id: string };
    }>;
  };
}

export interface ImageFileContent {
  type: "image_file";
  image_file: {
    file_id: string;
    detail?: "auto" | "low" | "high";
  };
}

export interface ImageUrlContent {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
}

export type MessageContent = TextContent | ImageFileContent | ImageUrlContent;

/**
 * OpenAI Message object
 * @see https://platform.openai.com/docs/api-reference/messages/object
 */
export interface OpenAIMessage {
  id: string;
  object: "thread.message";
  created_at: number;
  thread_id: string;
  status: "in_progress" | "incomplete" | "completed";
  incomplete_details?: { reason: string };
  completed_at: number | null;
  incomplete_at: number | null;
  role: "user" | "assistant";
  content: MessageContent[];
  assistant_id: string | null;
  run_id: string | null;
  attachments: Array<{
    file_id: string;
    tools: Array<{ type: string }>;
  }>;
  metadata: Record<string, string>;
}

/**
 * OpenAI list response wrapper
 */
export interface OpenAIListResponse<T> {
  object: "list";
  data: T[];
  first_id?: string;
  last_id?: string;
  has_more: boolean;
}

/**
 * OpenAI Vector Store object
 * @see https://platform.openai.com/docs/api-reference/vector-stores/object
 */
export interface OpenAIVectorStore {
  id: string;
  object: "vector_store";
  created_at: number;
  name: string;
  usage_bytes: number;
  file_counts: {
    in_progress: number;
    completed: number;
    failed: number;
    cancelled: number;
    total: number;
  };
  status: "expired" | "in_progress" | "completed";
  expires_after?: {
    anchor: "last_active_at";
    days: number;
  };
  expires_at?: number;
  last_active_at: number | null;
  metadata: Record<string, string>;
}

/**
 * OpenAI File object
 * @see https://platform.openai.com/docs/api-reference/files/object
 */
export interface OpenAIFile {
  id: string;
  object: "file";
  bytes: number;
  created_at: number;
  filename: string;
  purpose:
    | "assistants"
    | "assistants_output"
    | "batch"
    | "batch_output"
    | "fine-tune"
    | "fine-tune-results"
    | "vision";
  status: "uploaded" | "processed" | "error";
  status_details?: string;
}

/**
 * OpenAI Vector Store File object
 */
export interface OpenAIVectorStoreFile {
  id: string;
  object: "vector_store.file";
  usage_bytes: number;
  created_at: number;
  vector_store_id: string;
  status: "in_progress" | "completed" | "cancelled" | "failed";
  last_error: { code: string; message: string } | null;
  chunking_strategy?: {
    type: "auto" | "static";
    static?: { max_chunk_size_tokens: number; chunk_overlap_tokens: number };
  };
}

/**
 * Tool input schema for specialist tools
 */
export interface ToolInput {
  prompt: string;
  context?: string;
  files?: string[];
  image_urls?: string[];
  reset_thread?: boolean;
  reset_files?: boolean;
}

/**
 * MCP tool response content
 * Uses index signature to be compatible with MCP SDK's CallToolResult
 */
export interface ToolResponse {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
}

/**
 * OpenAI API error response
 */
export interface OpenAIErrorResponse {
  error: {
    message: string;
    type: string;
    param: string | null;
    code: string | null;
  };
}

/**
 * Configuration for the MCP bridge
 */
export interface BridgeConfig {
  openaiApiKey: string;
  openaiBaseUrl: string;
  pollTimeoutMs: number;
  pollIntervalMs: number;
  maxRetries: number;
  maxCacheSize: number;
}
