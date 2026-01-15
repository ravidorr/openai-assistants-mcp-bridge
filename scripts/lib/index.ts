// AUTO-GENERATED FILE - Do not edit manually
// Run: npm run generate:assistants
// Generated at: 2026-01-15T16:03:27.176Z

import type { AssistantConfig } from "./types.js";
import { a11yAgent } from "./assistants/a11y.js";
import { microcopyAgent } from "./assistants/microcopy.js";
import { personasAgent } from "./assistants/personas.js";
import { superAgent } from "./assistants/super.js";
import { uiAgent } from "./assistants/ui.js";
import { uxAgent } from "./assistants/ux.js";

export type {
  AssistantConfig,
  OpenAIAssistant,
  McpConfig,
  McpServerConfig,
  McpJson,
} from "./types.js";

/**
 * All available assistant configurations.
 * Add new assistants by creating a file in ./assistants/ and running npm run generate:assistants
 */
export const ASSISTANTS: AssistantConfig[] = [
  a11yAgent,
  microcopyAgent,
  personasAgent,
  superAgent,
  uiAgent,
  uxAgent,
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
