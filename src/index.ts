/**
 * OpenAI Assistants MCP Bridge
 *
 * This MCP server bridges MCP clients (like Cursor) to OpenAI's Assistants API,
 * exposing specialist tools for UX, UI, accessibility, and content review.
 */

// Load environment variables from .env file (must be first)
import "dotenv/config";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  type AssistantKey,
  type OpenAIThread,
  type OpenAIRun,
  type OpenAIMessage,
  type OpenAIVectorStore,
  type OpenAIFile,
  type OpenAIListResponse,
  type ToolResponse,
  type BridgeConfig,
} from "./types.js";
import {
  RUN_STATUS,
  FAILED_RUN_STATUSES,
  DEFAULTS,
  HTTP_STATUS,
  TOOL_NAMES,
  ENV_VARS,
  SERVER_INFO,
} from "./constants.js";
import { withRetry, HttpError } from "./utils/retry.js";
import { logger } from "./utils/logger.js";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Get a required environment variable or throw an error
 * @param name - The environment variable name
 * @returns The environment variable value
 * @throws Error if the environment variable is not set
 */
function mustEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Get an optional environment variable with a default value
 * @param name - The environment variable name
 * @param defaultValue - The default value if not set
 * @returns The environment variable value or default
 */
function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

/**
 * Get an optional numeric environment variable with a default value
 * @param name - The environment variable name
 * @param defaultValue - The default numeric value if not set
 * @returns The parsed number or default
 */
function optionalEnvNumber(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Bridge configuration loaded from environment
 */
const config: BridgeConfig = {
  openaiApiKey: mustEnv(ENV_VARS.OPENAI_API_KEY),
  openaiBaseUrl: optionalEnv(ENV_VARS.OPENAI_BASE_URL, DEFAULTS.OPENAI_BASE_URL),
  pollTimeoutMs: optionalEnvNumber(ENV_VARS.POLL_TIMEOUT_MS, DEFAULTS.POLL_TIMEOUT_MS),
  pollIntervalMs: DEFAULTS.POLL_INTERVAL_MS,
  maxRetries: DEFAULTS.MAX_RETRIES,
  maxCacheSize: DEFAULTS.MAX_CACHE_SIZE,
};

// ============================================================================
// Bounded Cache Implementation
// ============================================================================

/**
 * A Map with a maximum size that evicts oldest entries when full
 */
class BoundedMap<K, V> extends Map<K, V> {
  constructor(private readonly maxSize: number) {
    super();
  }

  override set(key: K, value: V): this {
    // If at capacity and key is new, delete oldest entry
    if (this.size >= this.maxSize && !this.has(key)) {
      const oldestKey = this.keys().next().value;
      if (oldestKey !== undefined) {
        this.delete(oldestKey);
        logger.debug("Cache eviction", { evictedKey: String(oldestKey), cacheSize: this.size });
      }
    }
    return super.set(key, value);
  }
}

// ============================================================================
// State Management
// ============================================================================

/** Map of tool name to thread ID for conversation persistence */
const threadByTool = new BoundedMap<string, string>(config.maxCacheSize);

/** Map of tool name to vector store ID for file search */
const vectorStoreByTool = new BoundedMap<string, string>(config.maxCacheSize);

/** Map of absolute file path to OpenAI file ID to avoid re-uploads */
const uploadedFileIdByPath = new BoundedMap<string, string>(config.maxCacheSize);

// ============================================================================
// OpenAI API Client
// ============================================================================

/**
 * Make a request to the OpenAI API with retry logic
 *
 * @param pathname - API endpoint path (e.g., "/threads")
 * @param body - Request body (will be JSON stringified unless isMultipart)
 * @param method - HTTP method (default: "POST")
 * @param isMultipart - Whether the body is FormData (default: false)
 * @returns The parsed JSON response
 * @throws HttpError if the request fails
 */
async function openaiFetch<T>(
  pathname: string,
  body?: unknown,
  method: string = "POST",
  isMultipart: boolean = false
): Promise<T> {
  return withRetry(async () => {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.openaiApiKey}`,
      "OpenAI-Beta": "assistants=v2",
    };

    // Set Content-Type for JSON requests (not for multipart)
    if (!isMultipart) {
      headers["Content-Type"] = "application/json";
    }

    const url = `${config.openaiBaseUrl}${pathname}`;
    logger.debug("OpenAI API request", { method, pathname });

    const response = await fetch(url, {
      method,
      headers,
      body: isMultipart ? (body as FormData) : body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const responseText = await response.text();
      logger.error("OpenAI API error", {
        status: response.status,
        pathname,
        response: responseText.slice(0, 500),
      });
      throw new HttpError(
        `OpenAI API error (${response.status}): ${responseText}`,
        response.status,
        responseText
      );
    }

    const result = await response.json();
    logger.debug("OpenAI API response", { pathname, status: response.status });
    return result as T;
  });
}

/**
 * Get the assistant ID from environment variables
 * @param key - The environment variable key for the assistant
 * @returns The assistant ID
 */
function getAssistantId(key: AssistantKey): string {
  return mustEnv(key);
}

// ============================================================================
// Thread Management
// ============================================================================

/**
 * Get an existing thread ID for a tool or create a new one
 *
 * @param toolName - The name of the tool
 * @returns The thread ID
 */
async function getOrCreateThreadId(toolName: string): Promise<string> {
  const existing = threadByTool.get(toolName);
  if (existing) {
    logger.debug("Using existing thread", { toolName, threadId: existing });
    return existing;
  }

  logger.info("Creating new thread", { toolName });
  const thread = await openaiFetch<OpenAIThread>("/threads", {});
  threadByTool.set(toolName, thread.id);
  logger.info("Thread created", { toolName, threadId: thread.id });
  return thread.id;
}

// ============================================================================
// Vector Store Management
// ============================================================================

/**
 * Get an existing vector store ID for a tool or create a new one
 *
 * @param toolName - The name of the tool
 * @returns The vector store ID
 */
async function getOrCreateVectorStoreId(toolName: string): Promise<string> {
  const existing = vectorStoreByTool.get(toolName);
  if (existing) {
    logger.debug("Using existing vector store", { toolName, vectorStoreId: existing });
    return existing;
  }

  logger.info("Creating new vector store", { toolName });
  const vectorStore = await openaiFetch<OpenAIVectorStore>("/vector_stores", {
    name: `cursor-${toolName}`,
  });

  vectorStoreByTool.set(toolName, vectorStore.id);
  logger.info("Vector store created", { toolName, vectorStoreId: vectorStore.id });
  return vectorStore.id;
}

// ============================================================================
// File Upload and Management
// ============================================================================

/**
 * Validate that a file path is within allowed directories
 * Currently restricts to the current working directory
 *
 * @param filePath - The file path to validate
 * @returns The resolved absolute path
 * @throws Error if the path is outside allowed directories
 */
function validateFilePath(filePath: string): string {
  const absolutePath = path.resolve(filePath);
  const workingDirectory = process.cwd();

  // Check if the resolved path starts with the working directory
  if (!absolutePath.startsWith(workingDirectory)) {
    throw new Error(
      `File path "${filePath}" is outside the allowed directory. ` +
        `Files must be within: ${workingDirectory}`
    );
  }

  return absolutePath;
}

/**
 * Upload a local file to OpenAI's Files API for use with Assistants
 *
 * @param filePath - Path to the local file
 * @returns The OpenAI file ID
 */
async function uploadFileForAssistants(filePath: string): Promise<string> {
  const absolutePath = validateFilePath(filePath);
  logger.info("Uploading file", { path: absolutePath });

  const fileBytes = await readFile(absolutePath);
  const form = new FormData();
  form.append("purpose", "assistants");
  form.append("file", new Blob([fileBytes]), path.basename(absolutePath));

  const file = await openaiFetch<OpenAIFile>("/files", form, "POST", true);
  logger.info("File uploaded", { path: absolutePath, fileId: file.id });
  return file.id;
}

/**
 * Add a file to a vector store for file search functionality
 *
 * @param vectorStoreId - The vector store ID
 * @param fileId - The OpenAI file ID
 */
async function addFileToVectorStore(vectorStoreId: string, fileId: string): Promise<void> {
  await openaiFetch(`/vector_stores/${vectorStoreId}/files`, {
    file_id: fileId,
  });
  logger.debug("File added to vector store", { vectorStoreId, fileId });
}

/**
 * Ensure files are uploaded and added to a tool's vector store
 * Uses parallel uploads for better performance
 *
 * @param toolName - The name of the tool
 * @param filePaths - Array of file paths to process
 * @returns The vector store ID
 */
async function ensureFilesInVectorStore(toolName: string, filePaths: string[]): Promise<string> {
  const vectorStoreId = await getOrCreateVectorStoreId(toolName);

  // Upload files in parallel
  const uploadPromises = filePaths.map(async (filePath) => {
    const absolutePath = validateFilePath(filePath);
    let fileId = uploadedFileIdByPath.get(absolutePath);

    if (!fileId) {
      fileId = await uploadFileForAssistants(absolutePath);
      uploadedFileIdByPath.set(absolutePath, fileId);
    }

    return { absolutePath, fileId };
  });

  const uploadedFiles = await Promise.all(uploadPromises);

  // Add files to vector store in parallel
  const addPromises = uploadedFiles.map(async ({ fileId }) => {
    try {
      await addFileToVectorStore(vectorStoreId, fileId);
    } catch (error) {
      // Handle "already attached" errors gracefully
      if (error instanceof HttpError && error.statusCode === HTTP_STATUS.CONFLICT) {
        logger.debug("File already attached to vector store", { fileId, vectorStoreId });
        return;
      }
      // Re-throw other errors
      throw error;
    }
  });

  await Promise.all(addPromises);
  logger.info("Files processed for vector store", {
    toolName,
    vectorStoreId,
    fileCount: filePaths.length,
  });

  return vectorStoreId;
}

// ============================================================================
// Assistant Run Execution
// ============================================================================

/**
 * Message content types for OpenAI Assistants API
 */
type MessageContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } };

/**
 * Run an assistant on a thread and wait for completion
 *
 * @param assistantId - The OpenAI assistant ID
 * @param threadId - The thread ID
 * @param userMessage - The message to send to the assistant
 * @param vectorStoreId - Optional vector store ID for file search
 * @param imageUrls - Optional array of image URLs to include in the message
 * @returns The assistant's text response
 */
async function runAssistantOnThread(
  assistantId: string,
  threadId: string,
  userMessage: string,
  vectorStoreId?: string,
  imageUrls?: string[]
): Promise<string> {
  logger.info("Running assistant", {
    assistantId,
    threadId,
    hasVectorStore: !!vectorStoreId,
    imageCount: imageUrls?.length ?? 0,
  });

  // 1. Build message content (text + optional images)
  const content: MessageContentPart[] = [];

  // Add images first (if any) so they appear before the text prompt
  if (imageUrls && imageUrls.length > 0) {
    for (const url of imageUrls) {
      content.push({
        type: "image_url",
        image_url: { url, detail: "auto" },
      });
    }
    logger.debug("Added images to message", { imageCount: imageUrls.length });
  }

  // Add text content
  content.push({ type: "text", text: userMessage });

  // 2. Add user message to thread
  await openaiFetch(`/threads/${threadId}/messages`, {
    role: "user",
    content,
  });

  // 2. Create run with optional vector store for file search
  const runBody: {
    assistant_id: string;
    tool_resources?: { file_search: { vector_store_ids: string[] } };
  } = { assistant_id: assistantId };

  if (vectorStoreId) {
    runBody.tool_resources = {
      file_search: { vector_store_ids: [vectorStoreId] },
    };
  }

  const run = await openaiFetch<OpenAIRun>(`/threads/${threadId}/runs`, runBody);
  const runId = run.id;
  logger.info("Run created", { runId, threadId });

  // 3. Poll for run completion
  const maxIterations = Math.ceil(config.pollTimeoutMs / config.pollIntervalMs);
  let currentStatus = run.status;

  for (let i = 0; i < maxIterations; i++) {
    await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));

    const runStatus = await openaiFetch<OpenAIRun>(
      `/threads/${threadId}/runs/${runId}`,
      undefined,
      "GET"
    );
    currentStatus = runStatus.status;

    if (currentStatus === RUN_STATUS.COMPLETED) {
      logger.info("Run completed", { runId, iterations: i + 1 });
      break;
    }

    if (FAILED_RUN_STATUSES.has(currentStatus)) {
      const errorDetails = runStatus.last_error
        ? JSON.stringify(runStatus.last_error)
        : "No error details";
      logger.error("Run failed", { runId, status: currentStatus, error: errorDetails });
      throw new Error(`Run ended with status: ${currentStatus}. ${errorDetails}`);
    }

    // Log progress periodically
    if (i > 0 && i % 20 === 0) {
      logger.debug("Run still in progress", { runId, status: currentStatus, iteration: i });
    }
  }

  if (currentStatus !== RUN_STATUS.COMPLETED) {
    logger.error("Run timed out", { runId, lastStatus: currentStatus });
    throw new Error(
      `Run timed out after ${config.pollTimeoutMs}ms (last status: ${currentStatus})`
    );
  }

  // 4. Fetch and return the assistant's response
  const messages = await openaiFetch<OpenAIListResponse<OpenAIMessage>>(
    `/threads/${threadId}/messages?limit=${DEFAULTS.MESSAGES_LIMIT}`,
    undefined,
    "GET"
  );

  const latestMessage = messages.data?.[0];
  const textContent = latestMessage?.content?.find((c) => c.type === "text");

  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response found from assistant");
  }

  return textContent.text.value;
}

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new McpServer({
  name: SERVER_INFO.NAME,
  version: SERVER_INFO.VERSION,
});

/**
 * Zod schema for specialist tool inputs
 */
const toolInputSchema = {
  prompt: z.string().min(1).describe("User request / content to send to the assistant"),
  context: z
    .string()
    .optional()
    .describe("Optional extra context (constraints, acceptance criteria, etc.)"),
  files: z
    .array(z.string())
    .optional()
    .describe("Local file paths to upload and add to file_search for this specialist"),
  image_urls: z
    .array(z.string().url())
    .optional()
    .describe(
      "Image URLs to include in the message for visual analysis (e.g., screenshots, design mockups)"
    ),
  reset_thread: z.boolean().optional().describe("If true, start a fresh thread for this tool"),
  reset_files: z
    .boolean()
    .optional()
    .describe("If true, start a fresh vector store for this tool (clears its file_search corpus)"),
};

/**
 * Create a specialist tool that connects to an OpenAI Assistant
 *
 * @param toolName - The MCP tool name
 * @param envKey - The environment variable key for the assistant ID
 */
function createSpecialistTool(toolName: string, envKey: AssistantKey): void {
  server.tool(
    toolName,
    toolInputSchema,
    async ({
      prompt,
      context,
      files,
      image_urls,
      reset_thread,
      reset_files,
    }): Promise<ToolResponse> => {
      logger.info("Tool invoked", {
        toolName,
        hasContext: !!context,
        fileCount: files?.length ?? 0,
        imageCount: image_urls?.length ?? 0,
      });

      const assistantId = getAssistantId(envKey);

      // Handle reset flags
      if (reset_thread) {
        threadByTool.delete(toolName);
        logger.info("Thread reset", { toolName });
      }
      if (reset_files) {
        vectorStoreByTool.delete(toolName);
        logger.info("Vector store reset", { toolName });
      }

      // Get or create thread
      const threadId = await getOrCreateThreadId(toolName);

      // Handle file uploads
      let vectorStoreId: string | undefined;
      if (files && files.length > 0) {
        vectorStoreId = await ensureFilesInVectorStore(toolName, files);
      } else {
        // Use existing vector store if available
        vectorStoreId = vectorStoreByTool.get(toolName);
      }

      // Combine context and prompt
      const combinedMessage = context ? `${context}\n\n---\n\n${prompt}` : prompt;

      // Run the assistant with optional images
      const response = await runAssistantOnThread(
        assistantId,
        threadId,
        combinedMessage,
        vectorStoreId,
        image_urls
      );

      logger.info("Tool completed", { toolName, responseLength: response.length });
      return { content: [{ type: "text", text: response }] };
    }
  );
}

// ============================================================================
// Register Specialist Tools
// ============================================================================

createSpecialistTool(TOOL_NAMES.UX_CONSULTANT, ENV_VARS.ASSISTANT_UX as AssistantKey);
createSpecialistTool(TOOL_NAMES.PERSONAS, ENV_VARS.ASSISTANT_PERSONAS as AssistantKey);
createSpecialistTool(TOOL_NAMES.UI_CRITIQUE, ENV_VARS.ASSISTANT_UI as AssistantKey);
createSpecialistTool(TOOL_NAMES.MICROCOPY, ENV_VARS.ASSISTANT_MICROCOPY as AssistantKey);
createSpecialistTool(TOOL_NAMES.A11Y, ENV_VARS.ASSISTANT_A11Y as AssistantKey);
createSpecialistTool(TOOL_NAMES.SUPER_AGENT, ENV_VARS.ASSISTANT_SUPER as AssistantKey);

// ============================================================================
// Utility Tools
// ============================================================================

/**
 * Reset all specialists - clears all threads and vector stores
 */
server.tool(
  TOOL_NAMES.RESET_ALL,
  { confirm: z.boolean().default(true) },
  async ({ confirm }): Promise<ToolResponse> => {
    if (confirm) {
      const threadCount = threadByTool.size;
      const vectorStoreCount = vectorStoreByTool.size;

      threadByTool.clear();
      vectorStoreByTool.clear();

      logger.info("All specialists reset", {
        threadsCleared: threadCount,
        vectorStoresCleared: vectorStoreCount,
      });
      return {
        content: [
          {
            type: "text",
            text: `All specialist threads (${threadCount}) and vector stores (${vectorStoreCount}) have been reset.`,
          },
        ],
      };
    }

    return {
      content: [{ type: "text", text: "Reset cancelled." }],
    };
  }
);

/**
 * List current status of all specialists
 */
server.tool(TOOL_NAMES.LIST_STATUS, {}, async (): Promise<ToolResponse> => {
  const status = {
    threads: Object.fromEntries(threadByTool),
    vectorStores: Object.fromEntries(vectorStoreByTool),
    uploadedFiles: uploadedFileIdByPath.size,
    config: {
      pollTimeoutMs: config.pollTimeoutMs,
      openaiBaseUrl: config.openaiBaseUrl,
      maxCacheSize: config.maxCacheSize,
    },
  };

  logger.info("Status requested", {
    threadCount: threadByTool.size,
    vectorStoreCount: vectorStoreByTool.size,
  });
  return {
    content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
  };
});

/**
 * Health check - verify OpenAI API connectivity
 */
server.tool(TOOL_NAMES.HEALTH_CHECK, {}, async (): Promise<ToolResponse> => {
  logger.info("Health check initiated");
  const startTime = Date.now();

  try {
    // Make a simple API call to verify connectivity
    await openaiFetch<{ data: unknown[] }>("/models", undefined, "GET");
    const latencyMs = Date.now() - startTime;

    logger.info("Health check passed", { latencyMs });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: "healthy",
              latencyMs,
              openaiBaseUrl: config.openaiBaseUrl,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("Health check failed", { latencyMs, error: errorMessage });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: "unhealthy",
              error: errorMessage,
              latencyMs,
              openaiBaseUrl: config.openaiBaseUrl,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
    };
  }
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

let isShuttingDown = false;

/**
 * Handle graceful shutdown
 */
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  logger.info("Shutdown initiated", { signal });

  try {
    // Close the MCP server connection
    await server.close();
    logger.info("Server closed successfully");
  } catch (error) {
    logger.error("Error during shutdown", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Log final state
  logger.info("Shutdown complete", {
    threadsActive: threadByTool.size,
    vectorStoresActive: vectorStoreByTool.size,
    uploadedFiles: uploadedFileIdByPath.size,
  });

  process.exit(0);
}

// Register signal handlers
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
  process.exit(1);
});

// ============================================================================
// Server Startup
// ============================================================================

logger.info("Starting MCP server", {
  name: SERVER_INFO.NAME,
  version: SERVER_INFO.VERSION,
  openaiBaseUrl: config.openaiBaseUrl,
  pollTimeoutMs: config.pollTimeoutMs,
});

const transport = new StdioServerTransport();
await server.connect(transport);

logger.info("MCP server connected and ready");
