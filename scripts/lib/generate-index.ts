#!/usr/bin/env node
/**
 * Index Generator for Assistants Library
 *
 * This script scans the assistants/ directory and generates index.ts
 * with static imports for type-safe access to all assistant configs.
 *
 * Run with: npm run generate:assistants
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSISTANTS_DIR = path.join(__dirname, "assistants");
const OUTPUT_FILE = path.join(__dirname, "index.ts");

interface AssistantFile {
  filename: string;
  basename: string;
  exportName: string;
}

function toExportName(basename: string): string {
  // Convert filename to camelCase export name
  // e.g., "ux" -> "uxAgent", "a11y" -> "a11yAgent"
  return `${basename}Agent`;
}

function scanAssistantFiles(): AssistantFile[] {
  const files = fs.readdirSync(ASSISTANTS_DIR);

  return files
    .filter((file) => file.endsWith(".ts") && file !== "index.ts")
    .map((filename) => {
      const basename = path.basename(filename, ".ts");
      return {
        filename,
        basename,
        exportName: toExportName(basename),
      };
    })
    .sort((a, b) => a.basename.localeCompare(b.basename));
}

function generateIndexContent(assistants: AssistantFile[]): string {
  const imports = assistants
    .map((a) => `import { ${a.exportName} } from "./assistants/${a.basename}.js";`)
    .join("\n");

  const arrayItems = assistants.map((a) => `  ${a.exportName},`).join("\n");

  return `// AUTO-GENERATED FILE - Do not edit manually
// Run: npm run generate:assistants
// Generated at: ${new Date().toISOString()}

import type { AssistantConfig } from "./types.js";
${imports}

export type { AssistantConfig, OpenAIAssistant, McpConfig, McpServerConfig, McpJson } from "./types.js";

/**
 * All available assistant configurations.
 * Add new assistants by creating a file in ./assistants/ and running npm run generate:assistants
 */
export const ASSISTANTS: AssistantConfig[] = [
${arrayItems}
];

/**
 * Get a human-readable display name for an assistant by its environment variable name.
 */
export function getAssistantDisplayName(envVar: string): string {
  const assistant = ASSISTANTS.find((a) => a.envVar === envVar);
  return assistant?.name ?? envVar.replace("OPENAI_ASSISTANT_", "");
}

/**
 * Find an assistant configuration by its environment variable name.
 */
export function getAssistantByEnvVar(envVar: string): AssistantConfig | undefined {
  return ASSISTANTS.find((a) => a.envVar === envVar);
}

/**
 * Find an assistant configuration by its name.
 */
export function getAssistantByName(name: string): AssistantConfig | undefined {
  return ASSISTANTS.find((a) => a.name === name);
}
`;
}

function main() {
  console.log("Generating index.ts for assistants library...\n");

  // Scan for assistant files
  const assistants = scanAssistantFiles();

  if (assistants.length === 0) {
    console.error("Error: No assistant files found in", ASSISTANTS_DIR);
    process.exit(1);
  }

  console.log(`Found ${assistants.length} assistant(s):`);
  for (const a of assistants) {
    console.log(`  - ${a.basename}.ts -> ${a.exportName}`);
  }

  // Generate and write index.ts
  const content = generateIndexContent(assistants);
  fs.writeFileSync(OUTPUT_FILE, content);

  console.log(`\nGenerated: ${OUTPUT_FILE}`);
  console.log("Done!");
}

main();
