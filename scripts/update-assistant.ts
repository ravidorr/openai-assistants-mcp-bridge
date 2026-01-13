#!/usr/bin/env node
/**
 * OpenAI Assistant Update Wizard
 *
 * Interactive script to update an existing OpenAI Assistant.
 * Run with: npx tsx scripts/update-assistant.ts
 *
 * Prerequisites:
 * - OPENAI_API_KEY environment variable (or enter interactively)
 */

import "dotenv/config";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ============================================================================
// Configuration
// ============================================================================

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

// Possible locations for mcp.json
const MCP_JSON_PATHS = [
  path.join(os.homedir(), ".cursor", "mcp.json"),
  path.join(os.homedir(), ".config", "cursor", "mcp.json"),
];

// ============================================================================
// Types
// ============================================================================

interface UpdateAssistantPayload {
  name?: string;
  instructions?: string;
}

interface OpenAIAssistant {
  id: string;
  object: "assistant";
  created_at: number;
  name: string | null;
  description: string | null;
  model: string;
  instructions: string | null;
  tools: Array<{ type: string }>;
}

interface McpServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface McpJson {
  mcpServers?: Record<string, McpServerConfig>;
}

interface AssistantFromConfig {
  envVar: string;
  id: string;
}

// ============================================================================
// MCP Config Helper
// ============================================================================

function findMcpJson(): string | null {
  for (const mcpPath of MCP_JSON_PATHS) {
    if (fs.existsSync(mcpPath)) {
      return mcpPath;
    }
  }
  return null;
}

function readAssistantsFromMcpJson(): {
  assistants: AssistantFromConfig[];
  apiKey: string | null;
  mcpPath: string;
} | null {
  const mcpPath = findMcpJson();
  if (!mcpPath) {
    return null;
  }

  try {
    const content = fs.readFileSync(mcpPath, "utf-8");
    const mcpJson: McpJson = JSON.parse(content);

    // Look for openai-assistants-bridge server
    const bridgeConfig = mcpJson.mcpServers?.["openai-assistants-bridge"];
    if (!bridgeConfig?.env) {
      return null;
    }

    const env = bridgeConfig.env;
    const assistants: AssistantFromConfig[] = [];
    let apiKey: string | null = null;

    // Extract assistant IDs and API key from env
    for (const [key, value] of Object.entries(env)) {
      if (key === "OPENAI_API_KEY" && value && !value.includes("paste")) {
        apiKey = value;
      } else if (key.startsWith("OPENAI_ASSISTANT_") && value?.startsWith("asst_")) {
        assistants.push({ envVar: key, id: value });
      }
    }

    return { assistants, apiKey, mcpPath };
  } catch {
    return null;
  }
}

function getAssistantDisplayName(envVar: string): string {
  // Convert OPENAI_ASSISTANT_UX -> UX Consultant, etc.
  const nameMap: Record<string, string> = {
    OPENAI_ASSISTANT_UX: "UX Consultant",
    OPENAI_ASSISTANT_PERSONAS: "Personas & Journeys",
    OPENAI_ASSISTANT_UI: "UI Critique",
    OPENAI_ASSISTANT_MICROCOPY: "Microcopy Editor",
    OPENAI_ASSISTANT_A11Y: "Accessibility Reviewer",
    OPENAI_ASSISTANT_SUPER: "Super Agent",
  };
  return nameMap[envVar] || envVar.replace("OPENAI_ASSISTANT_", "");
}

// ============================================================================
// Readline Helper
// ============================================================================

function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function promptMultiline(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    console.log(question);
    console.log('(Enter your text. Type "END" on a new line when done)\n');

    const lines: string[] = [];
    const originalPrompt = rl.getPrompt();

    rl.setPrompt("");
    rl.prompt();

    const lineHandler = (line: string) => {
      if (line.trim().toUpperCase() === "END") {
        rl.removeListener("line", lineHandler);
        rl.setPrompt(originalPrompt);
        resolve(lines.join("\n"));
      } else {
        lines.push(line);
      }
    };

    rl.on("line", lineHandler);
  });
}

// ============================================================================
// API Functions
// ============================================================================

async function getAssistant(apiKey: string, assistantId: string): Promise<OpenAIAssistant> {
  const response = await fetch(`${OPENAI_BASE_URL}/assistants/${assistantId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "OpenAI-Beta": "assistants=v2",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get assistant: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function updateAssistant(
  apiKey: string,
  assistantId: string,
  payload: UpdateAssistantPayload
): Promise<OpenAIAssistant> {
  const response = await fetch(`${OPENAI_BASE_URL}/assistants/${assistantId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "OpenAI-Beta": "assistants=v2",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update assistant: ${response.status} ${errorText}`);
  }

  return response.json();
}

// ============================================================================
// Main Wizard
// ============================================================================

async function main() {
  console.log("\n========================================");
  console.log("  OpenAI Assistant Update Wizard");
  console.log("========================================\n");

  const rl = createReadline();

  try {
    // Try to read from mcp.json
    const mcpConfig = readAssistantsFromMcpJson();

    // Step 1: Get API Key
    let apiKey = process.env.OPENAI_API_KEY || mcpConfig?.apiKey || "";
    if (apiKey) {
      if (mcpConfig?.apiKey && !process.env.OPENAI_API_KEY) {
        console.log(`Using OPENAI_API_KEY from ${mcpConfig.mcpPath}\n`);
      } else {
        console.log("Using OPENAI_API_KEY from environment.\n");
      }
    } else {
      apiKey = await prompt(rl, "Enter your OpenAI API Key (sk-...): ");
      if (!apiKey) {
        console.error("\nError: API key is required.");
        process.exit(1);
      }
      console.log("");
    }

    // Step 2: Get Assistant ID (show list from mcp.json if available)
    let assistantId = "";

    if (mcpConfig && mcpConfig.assistants.length > 0) {
      console.log(`Found ${mcpConfig.assistants.length} assistants in ${mcpConfig.mcpPath}:\n`);

      mcpConfig.assistants.forEach((assistant, index) => {
        const displayName = getAssistantDisplayName(assistant.envVar);
        console.log(`  ${index + 1}) ${displayName}`);
        console.log(`     ${assistant.id}\n`);
      });

      console.log(
        `  ${mcpConfig.assistants.length + 1}) Enter a different assistant ID manually\n`
      );

      const selection = await prompt(
        rl,
        `Select an assistant (1-${mcpConfig.assistants.length + 1}): `
      );
      const selectionNum = parseInt(selection, 10);

      if (selectionNum >= 1 && selectionNum <= mcpConfig.assistants.length) {
        assistantId = mcpConfig.assistants[selectionNum - 1].id;
      } else if (selectionNum === mcpConfig.assistants.length + 1) {
        assistantId = await prompt(rl, "\nEnter the Assistant ID (asst_...): ");
      } else {
        console.error("\nError: Invalid selection.");
        process.exit(1);
      }
    } else {
      if (mcpConfig === null) {
        console.log("Could not find mcp.json. Enter assistant ID manually.\n");
      }
      assistantId = await prompt(rl, "Enter the Assistant ID (asst_...): ");
    }

    if (!assistantId || !assistantId.startsWith("asst_")) {
      console.error("\nError: Valid assistant ID is required (should start with asst_).");
      process.exit(1);
    }

    // Fetch current assistant details
    console.log("\nFetching current assistant details...\n");
    const currentAssistant = await getAssistant(apiKey, assistantId);

    console.log("Current Assistant:");
    console.log(`  ID:    ${currentAssistant.id}`);
    console.log(`  Name:  ${currentAssistant.name || "(no name)"}`);
    console.log(`  Model: ${currentAssistant.model}`);
    console.log(
      `  Instructions: ${currentAssistant.instructions ? `${currentAssistant.instructions.substring(0, 100)}...` : "(none)"}`
    );
    console.log("");

    // Step 3: Get new name (optional)
    const newName = await prompt(
      rl,
      `Enter new name (press Enter to keep "${currentAssistant.name || ""}"): `
    );

    // Step 4: Get new instructions (optional)
    console.log("");
    const updateInstructions = await prompt(rl, "Do you want to update the instructions? (y/N): ");

    let newInstructions = "";
    if (updateInstructions.toLowerCase() === "y") {
      newInstructions = await promptMultiline(rl, "\nEnter the new instructions:");
    }

    // Build update payload
    const payload: UpdateAssistantPayload = {};
    if (newName) {
      payload.name = newName;
    }
    if (newInstructions) {
      payload.instructions = newInstructions;
    }

    // Check if there's anything to update
    if (Object.keys(payload).length === 0) {
      console.log("\nNo changes specified. Nothing to update.");
      rl.close();
      return;
    }

    // Confirm update
    console.log("\n========================================");
    console.log("Review Changes:");
    console.log("========================================");
    if (payload.name) {
      console.log(`  Name: "${currentAssistant.name}" -> "${payload.name}"`);
    }
    if (payload.instructions) {
      console.log(`  Instructions: (will be updated - ${payload.instructions.length} chars)`);
    }
    console.log("");

    const confirm = await prompt(rl, "Proceed with update? (y/N): ");
    if (confirm.toLowerCase() !== "y") {
      console.log("\nUpdate cancelled.");
      rl.close();
      return;
    }

    // Perform update
    console.log("\nUpdating assistant...");
    const updatedAssistant = await updateAssistant(apiKey, assistantId, payload);

    console.log("\n========================================");
    console.log("  Update Successful!");
    console.log("========================================");
    console.log(`  ID:    ${updatedAssistant.id}`);
    console.log(`  Name:  ${updatedAssistant.name || "(no name)"}`);
    console.log(`  Model: ${updatedAssistant.model}`);
    console.log("");

    rl.close();
  } catch (error) {
    console.error("\nError:", error instanceof Error ? error.message : error);
    rl.close();
    process.exit(1);
  }
}

main();
