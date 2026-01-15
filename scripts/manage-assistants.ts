#!/usr/bin/env node
/**
 * OpenAI Assistants Manager
 *
 * Unified script for creating and updating OpenAI Assistants.
 * Intelligently detects which assistants exist and need updates.
 *
 * Run with: npm run assistants
 *
 * Features:
 * - Checks existing assistants on OpenAI
 * - Compares with local config to detect changes
 * - Creates missing assistants
 * - Updates changed assistants
 * - Selection wizard for choosing which assistants to manage
 * - Auto-configures Cursor's mcp.json
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as readline from "readline";
import {
  ASSISTANTS,
  type AssistantConfig,
  type OpenAIAssistant,
  type McpConfig,
} from "./lib/index";

// ============================================================================
// Configuration
// ============================================================================

let OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

// ============================================================================
// Types
// ============================================================================

type AssistantStatus = "missing" | "up_to_date" | "changed";

interface AssistantState {
  config: AssistantConfig;
  status: AssistantStatus;
  existing?: OpenAIAssistant;
}

// ============================================================================
// Readline Utilities
// ============================================================================

function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function promptYesNo(
  rl: readline.Interface,
  question: string,
  defaultYes = true
): Promise<boolean> {
  const hint = defaultYes ? "[Y/n]" : "[y/N]";
  const answer = await prompt(rl, `${question} ${hint}: `);
  if (answer === "") {
    return defaultYes;
  }
  return answer.toLowerCase().startsWith("y");
}

async function promptForApiKey(rl: readline.Interface): Promise<string> {
  console.log("\nOpenAI API Key not found in environment.");
  console.log("Get your API key from: https://platform.openai.com/api-keys\n");

  const apiKey = await prompt(rl, "Enter your OpenAI API key: ");

  if (!apiKey || !apiKey.startsWith("sk-")) {
    console.error("\nError: Invalid API key. It should start with 'sk-'");
    process.exit(1);
  }

  return apiKey;
}

// ============================================================================
// Progress Indicator
// ============================================================================

class Spinner {
  private frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private currentFrame = 0;
  private interval: NodeJS.Timeout | null = null;
  private message: string;

  constructor(message: string) {
    this.message = message;
  }

  start(): void {
    process.stdout.write(`${this.frames[0]} ${this.message}`);
    this.interval = setInterval(() => {
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(`${this.frames[this.currentFrame]} ${this.message}`);
    }, 80);
  }

  stop(finalMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    if (finalMessage) {
      console.log(finalMessage);
    }
  }
}

// ============================================================================
// API Functions
// ============================================================================

async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${OPENAI_BASE_URL}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.status === 401) {
      return false;
    }

    return response.ok;
  } catch {
    return false;
  }
}

async function listAssistants(): Promise<OpenAIAssistant[]> {
  const response = await fetch(`${OPENAI_BASE_URL}/assistants?limit=100`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "OpenAI-Beta": "assistants=v2",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to list assistants: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as { data: OpenAIAssistant[] };
  return data.data;
}

async function createAssistant(config: AssistantConfig): Promise<OpenAIAssistant> {
  const response = await fetch(`${OPENAI_BASE_URL}/assistants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "OpenAI-Beta": "assistants=v2",
    },
    body: JSON.stringify({
      name: config.name,
      model: config.model,
      tools: config.tools,
      instructions: config.instructions,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create assistant: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function updateAssistant(
  assistantId: string,
  config: AssistantConfig
): Promise<OpenAIAssistant> {
  const response = await fetch(`${OPENAI_BASE_URL}/assistants/${assistantId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "OpenAI-Beta": "assistants=v2",
    },
    body: JSON.stringify({
      name: config.name,
      model: config.model,
      tools: config.tools,
      instructions: config.instructions,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update assistant: ${response.status} ${errorText}`);
  }

  return response.json();
}

// ============================================================================
// Status Detection
// ============================================================================

function detectStatus(config: AssistantConfig, existing?: OpenAIAssistant): AssistantStatus {
  if (!existing) {
    return "missing";
  }

  // Check if name or instructions have changed
  if (existing.name !== config.name) {
    return "changed";
  }

  if (existing.instructions !== config.instructions) {
    return "changed";
  }

  return "up_to_date";
}

function getStatusIcon(status: AssistantStatus): string {
  switch (status) {
    case "missing":
      return "✗";
    case "changed":
      return "⚡";
    case "up_to_date":
      return "✓";
  }
}

function getStatusLabel(status: AssistantStatus): string {
  switch (status) {
    case "missing":
      return "not created";
    case "changed":
      return "config changed";
    case "up_to_date":
      return "up to date";
  }
}

// ============================================================================
// Cursor mcp.json Utilities
// ============================================================================

function getCursorMcpPath(): string {
  const homeDir = os.homedir();

  const possiblePaths = [
    path.join(homeDir, ".cursor", "mcp.json"),
    path.join(homeDir, "Library", "Application Support", "Cursor", "User", "mcp.json"),
    path.join(homeDir, "AppData", "Roaming", "Cursor", "User", "mcp.json"),
    path.join(homeDir, ".config", "Cursor", "User", "mcp.json"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return path.join(homeDir, ".cursor", "mcp.json");
}

function readExistingMcpConfig(mcpPath: string): McpConfig {
  try {
    if (fs.existsSync(mcpPath)) {
      const content = fs.readFileSync(mcpPath, "utf-8");
      return JSON.parse(content) as McpConfig;
    }
  } catch {
    // If we can't read/parse, start fresh
  }
  return {};
}

function writeMcpConfig(mcpPath: string, config: McpConfig): void {
  const dir = path.dirname(mcpPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(mcpPath, JSON.stringify(config, null, 2) + "\n");
}

// ============================================================================
// Main Wizard
// ============================================================================

async function main() {
  console.log("\n========================================");
  console.log("  OpenAI Assistants Manager");
  console.log("========================================\n");

  const rl = createReadlineInterface();

  try {
    // Step 1: Get API Key
    if (!OPENAI_API_KEY) {
      OPENAI_API_KEY = await promptForApiKey(rl);
    } else {
      console.log("Using OpenAI API key from environment.\n");
    }

    // Validate API key
    const validationSpinner = new Spinner("Validating API key...");
    validationSpinner.start();

    const isValid = await validateApiKey(OPENAI_API_KEY);

    if (!isValid) {
      validationSpinner.stop("✗ API key validation failed.\n");
      console.error("Error: The API key is invalid or your account doesn't have access.");
      process.exit(1);
    }

    validationSpinner.stop("✓ API key validated.\n");

    // Step 2: Fetch existing assistants
    const fetchSpinner = new Spinner("Checking existing assistants on OpenAI...");
    fetchSpinner.start();

    const existingAssistants = await listAssistants();
    const existingByName = new Map<string, OpenAIAssistant>();
    for (const assistant of existingAssistants) {
      if (assistant.name) {
        existingByName.set(assistant.name, assistant);
      }
    }

    fetchSpinner.stop("✓ Fetched existing assistants.\n");

    // Step 3: Determine status of each assistant
    const states: AssistantState[] = ASSISTANTS.map((config) => {
      const existing = existingByName.get(config.name);
      return {
        config,
        status: detectStatus(config, existing),
        existing,
      };
    });

    // Count by status
    const missing = states.filter((s) => s.status === "missing");
    const changed = states.filter((s) => s.status === "changed");
    const _upToDate = states.filter((s) => s.status === "up_to_date");

    // Display status
    console.log("Status:");
    for (const state of states) {
      const icon = getStatusIcon(state.status);
      const label = getStatusLabel(state.status);
      const name = state.config.name.substring(0, 40).padEnd(40);
      console.log(`  ${icon} ${name} [${label}]`);
    }
    console.log("");

    // If everything is up to date
    if (missing.length === 0 && changed.length === 0) {
      console.log("All assistants are up to date! Nothing to do.\n");

      const updateMcp = await promptYesNo(rl, "Would you like to update Cursor's mcp.json anyway?");
      if (updateMcp) {
        await configureCursor(rl, states);
      }

      rl.close();
      return;
    }

    // Step 4: Show options
    console.log("What would you like to do?\n");

    const options: string[] = [];
    let optionNum = 1;

    if (missing.length > 0) {
      options.push(`create_missing`);
      console.log(`  ${optionNum}) Create missing assistants (${missing.length})`);
      optionNum++;
    }

    if (changed.length > 0) {
      options.push(`update_changed`);
      console.log(`  ${optionNum}) Update changed assistants (${changed.length})`);
      optionNum++;
    }

    if (missing.length > 0 && changed.length > 0) {
      options.push(`create_and_update`);
      console.log(
        `  ${optionNum}) Create missing + Update changed (${missing.length + changed.length} total)`
      );
      optionNum++;
    }

    options.push(`select_specific`);
    console.log(`  ${optionNum}) Select specific assistants to manage`);
    optionNum++;

    options.push(`sync_all`);
    console.log(`  ${optionNum}) Sync ALL assistants to match config (${states.length} total)`);
    optionNum++;

    options.push(`exit`);
    console.log(`  ${optionNum}) Exit`);
    console.log("");

    const selection = await prompt(rl, `Select option (1-${optionNum}): `);
    const selectedIndex = parseInt(selection, 10) - 1;

    if (selectedIndex < 0 || selectedIndex >= options.length) {
      console.log("\nInvalid selection. Exiting.");
      rl.close();
      return;
    }

    const selectedOption = options[selectedIndex];

    // Handle selection
    let toProcess: AssistantState[] = [];

    switch (selectedOption) {
      case "create_missing":
        toProcess = missing;
        break;

      case "update_changed":
        toProcess = changed;
        break;

      case "create_and_update":
        toProcess = [...missing, ...changed];
        break;

      case "select_specific":
        toProcess = await selectSpecificAssistants(rl, states);
        break;

      case "sync_all":
        toProcess = states;
        break;

      case "exit":
        console.log("\nExiting.");
        rl.close();
        return;
    }

    if (toProcess.length === 0) {
      console.log("\nNo assistants selected. Exiting.");
      rl.close();
      return;
    }

    // Step 5: Process selected assistants
    console.log("");
    const results = await processAssistants(toProcess);

    // Step 6: Show results
    console.log("\n========================================");
    console.log("  Operations Complete!");
    console.log("========================================\n");

    const created = results.filter((r) => r.action === "created");
    const updated = results.filter((r) => r.action === "updated");
    const failed = results.filter((r) => r.action === "failed");

    if (created.length > 0) {
      console.log("Created:");
      for (const r of created) {
        console.log(`  ✓ ${r.name.substring(0, 40).padEnd(40)} ${r.id}`);
      }
      console.log("");
    }

    if (updated.length > 0) {
      console.log("Updated:");
      for (const r of updated) {
        console.log(`  ✓ ${r.name.substring(0, 40).padEnd(40)} ${r.id}`);
      }
      console.log("");
    }

    if (failed.length > 0) {
      console.log("Failed:");
      for (const r of failed) {
        console.log(`  ✗ ${r.name}: ${r.error}`);
      }
      console.log("");
    }

    // Step 7: Configure Cursor
    if (created.length > 0 || updated.length > 0) {
      // Update states with new IDs
      for (const result of results) {
        if (result.action !== "failed") {
          const state = states.find((s) => s.config.name === result.name);
          if (state && !state.existing) {
            state.existing = { id: result.id } as OpenAIAssistant;
          }
        }
      }

      await configureCursor(rl, states);
    }

    rl.close();
  } catch (error) {
    console.error("\nError:", error instanceof Error ? error.message : error);
    rl.close();
    process.exit(1);
  }
}

async function selectSpecificAssistants(
  rl: readline.Interface,
  states: AssistantState[]
): Promise<AssistantState[]> {
  console.log("\nSelect assistants to manage (enter numbers separated by commas):\n");

  for (let i = 0; i < states.length; i++) {
    const state = states[i];
    const icon = state.status === "missing" ? "[+]" : state.status === "changed" ? "[⚡]" : "[ ]";
    const statusHint =
      state.status === "missing"
        ? "will create"
        : state.status === "changed"
          ? "needs update"
          : "up to date";
    console.log(`  ${i + 1}) ${icon} ${state.config.name.substring(0, 45)} (${statusHint})`);
  }

  console.log("");
  const input = await prompt(rl, "Enter selection (e.g., 1,3,5) or 'all': ");

  if (input.toLowerCase() === "all") {
    return states;
  }

  const indices = input
    .split(",")
    .map((s) => parseInt(s.trim(), 10) - 1)
    .filter((i) => i >= 0 && i < states.length);

  return indices.map((i) => states[i]);
}

interface ProcessResult {
  name: string;
  action: "created" | "updated" | "failed";
  id: string;
  error?: string;
}

async function processAssistants(states: AssistantState[]): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];

  for (const state of states) {
    const isCreate = state.status === "missing";
    const actionWord = isCreate ? "Creating" : "Updating";

    const spinner = new Spinner(`${actionWord}: ${state.config.name}...`);
    spinner.start();

    try {
      let assistant: OpenAIAssistant;

      if (isCreate) {
        assistant = await createAssistant(state.config);
        state.existing = assistant;
      } else {
        assistant = await updateAssistant(state.existing!.id, state.config);
      }

      spinner.stop(`✓ ${isCreate ? "Created" : "Updated"}: ${state.config.name}`);
      console.log(`  ID: ${assistant.id}`);

      results.push({
        name: state.config.name,
        action: isCreate ? "created" : "updated",
        id: assistant.id,
      });
    } catch (error) {
      spinner.stop(`✗ Failed: ${state.config.name}`);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  Error: ${errorMessage}`);

      results.push({
        name: state.config.name,
        action: "failed",
        id: "",
        error: errorMessage,
      });
    }
  }

  return results;
}

async function configureCursor(rl: readline.Interface, states: AssistantState[]): Promise<void> {
  const shouldConfigure = await promptYesNo(rl, "\nWould you like to update Cursor's mcp.json?");

  if (!shouldConfigure) {
    console.log("\nSkipping Cursor configuration.");
    printManualConfig(states);
    return;
  }

  const mcpPath = getCursorMcpPath();
  const existingConfig = readExistingMcpConfig(mcpPath);

  // Build assistant IDs map
  const assistantEnvVars: Record<string, string> = {};
  for (const state of states) {
    if (state.existing) {
      assistantEnvVars[state.config.envVar] = state.existing.id;
    }
  }

  const projectPath = process.cwd();

  const bridgeConfig = {
    command: "node",
    args: [`${projectPath}/dist/index.js`],
    env: {
      OPENAI_API_KEY: OPENAI_API_KEY,
      ...assistantEnvVars,
    },
  };

  const mergedConfig: McpConfig = {
    ...existingConfig,
    mcpServers: {
      ...(existingConfig.mcpServers || {}),
      "openai-assistants-bridge": bridgeConfig,
    },
  };

  writeMcpConfig(mcpPath, mergedConfig);
  console.log(`\n✓ Configuration written to: ${mcpPath}`);
  console.log("\nNext step: Restart Cursor and you're ready to go!");
}

function printManualConfig(states: AssistantState[]): void {
  console.log("\n========================================");
  console.log("Manual Configuration");
  console.log("========================================\n");

  console.log("Environment Variables:");
  for (const state of states) {
    if (state.existing) {
      console.log(`  ${state.config.envVar}=${state.existing.id}`);
    }
  }

  console.log("\nTo configure Cursor manually:");
  console.log("1. Open Cursor Settings (Cmd+, on Mac)");
  console.log("2. Search for 'MCP' and click 'Edit in mcp.json'");
  console.log("3. Add the openai-assistants-bridge configuration");
  console.log("4. Save the file and restart Cursor");
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
