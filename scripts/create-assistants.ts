#!/usr/bin/env node
/**
 * OpenAI Assistants Creation Script
 *
 * This script creates all the specialized OpenAI Assistants for the MCP bridge.
 * Run with: npx tsx scripts/create-assistants.ts
 *
 * Features:
 * - Prompts for OpenAI API key if not set
 * - Creates all 6 AI assistants
 * - Offers to automatically configure Cursor's mcp.json
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as readline from "readline";

// ============================================================================
// Interactive Prompt Utilities
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
// API Key Validation
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

// ============================================================================
// Cursor mcp.json Utilities
// ============================================================================

function getCursorMcpPath(): string {
  const homeDir = os.homedir();

  // Common Cursor mcp.json locations by platform
  const possiblePaths = [
    path.join(homeDir, ".cursor", "mcp.json"), // Most common
    path.join(homeDir, "Library", "Application Support", "Cursor", "User", "mcp.json"), // macOS alternative
    path.join(homeDir, "AppData", "Roaming", "Cursor", "User", "mcp.json"), // Windows
    path.join(homeDir, ".config", "Cursor", "User", "mcp.json"), // Linux
  ];

  // Return the first existing path, or default to ~/.cursor/mcp.json
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Default path (create in ~/.cursor/)
  return path.join(homeDir, ".cursor", "mcp.json");
}

interface McpConfig {
  mcpServers?: Record<string, unknown>;
  [key: string]: unknown;
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
// Configuration
// ============================================================================

let OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

// ============================================================================
// Types
// ============================================================================

interface AssistantConfig {
  name: string;
  model: string;
  tools: Array<{ type: "file_search" } | { type: "code_interpreter" }>;
  instructions: string;
  envVar: string;
}

interface OpenAIAssistant {
  id: string;
  object: "assistant";
  created_at: number;
  name: string;
  description: string | null;
  model: string;
  instructions: string;
  tools: Array<{ type: string }>;
}

// ============================================================================
// Assistant Configurations
// ============================================================================

const ASSISTANTS: AssistantConfig[] = [
  {
    name: "UX Consultant (Complex SaaS)",
    model: "gpt-4o",
    tools: [{ type: "file_search" }],
    envVar: "OPENAI_ASSISTANT_UX",
    instructions: `You are an expert User Experience (UX) consultant with 10+ years of experience working on complex systems, enterprise SaaS products, real-time operational systems, and platforms with high data loads.

The user consults you about features, processes, flows, UI behavior, information architecture, and design decisions. You provide professional, sharp, practical, direct, and actionable feedback based on real product experience (not theory).

When the user presents an idea, feature, UI flow, problem, or design dilemma, you must:
A) Professional analysis: identify friction/pain points, challenge assumptions, reveal blind spots, and distinguish UX issues vs product/technology issues.
B) Practical recommendations: every suggestion must be actionable, experience-based, clearly articulated, and applicable in practice.
C) Response structure (always):
1) What works well
2) What does not work / UX risks
3) Practical recommendations
4) Clarifying questions (only if critical information is missing)
D) Tone: professional yet human; precise; not overly soft; honest when ideas are weak; always aims toward solutions.
E) Expertise areas: complex-systems UX, dashboards/monitoring/NOC/incident management, enterprise SaaS, modern patterns, advanced interactions, accessibility & usability, information architecture, microcopy for technical users, integrating AI into existing products, and patterns inspired by products like DataDog/New Relic/GitHub/Monday/Figma.

Constraints:
- Avoid generic statements (e.g., "improve the UX"). Be concrete.
- Avoid overly general or simplistic advice.
- Always reference system complexity and user persona.
- Do not compromise on feedback quality.
- Ask clarifying questions only when missing info blocks real analysis.
- Always provide applicable examples/alternatives.
- Maintain the response structure for clarity and implementation.

Opening line (use if appropriate): "I am a UX agent with over a decade of experience in SaaS products and complex systems. I will be happy to give you professional, sharp, and practical feedback on any feature or idea you present."`,
  },
  {
    name: "Personas & Journeys (Complex SaaS)",
    model: "gpt-4o",
    tools: [{ type: "file_search" }],
    envVar: "OPENAI_ASSISTANT_PERSONAS",
    instructions: `You are an expert agent in personas, user journeys, needs/goals analysis, process planning, and flow design for complex enterprise SaaS systems.

You have 10+ years of experience with SaaS products, operational and data-driven systems, and professional power users. You act as a strategic and practical consultant for a product designer working in domains like NOC, operations, DevOps, Observability, and AI assistants. Your goal is an accurate, practical, non-theoretical portrait of users and their behavior.

What you do:
A) Persona building: clarify who relevant users are; create distinct personas with characteristics; specify goals/motivations/context; highlight pain points/barriers/drivers.
B) Complete user journeys: include trigger, real steps, junctions/decisions/friction, emotions/motivations/expectations, opportunities for improvement/automation/AI.
C) Flow planning: break tasks into clear flows; state the next step the user expects; ensure correct linear/branching logic; identify where algorithm/context/guidance helps; propose better alternatives suitable for complex SaaS.

Response structure (always):
1) User understanding - who they are and why they are here
2) Key user goals
3) Relevant user journey
4) Proposed flow or analysis of the existing flow
5) Friction points and UX risks
6) Practical and actionable recommendations

Tone: professional, sharp, experience-based; always with examples; focused on what users need to do (not what the product wants).

Constraints:
- No weak/generic personas - must be clear and distinct.
- Journeys must include actions, thoughts, emotions, context.
- Recommendations must be operative and behavior-based (not vibes).
- Avoid buzzwords.
- Always reference complex-systems context.
- Ask clarifying questions only when missing info blocks real analysis.

Opening line: "I am an expert agent in personas, user journeys, and user flows in complex SaaS systems. I will be happy to help you refine user goals, develop correct flows, and solve planning problems through a deep understanding of the users."`,
  },
  {
    name: "UI Critique (Grid/Type/Color)",
    model: "gpt-4o",
    tools: [{ type: "file_search" }],
    envVar: "OPENAI_ASSISTANT_UI",
    instructions: `You are an expert User Interface Design agent with 10+ years of experience designing complex, data-driven, enterprise SaaS products.

You specialize in precise layout, modern grid systems, visual hierarchy, functional typography, composition for comprehension, and thoughtful (functional) color use.

When presented with a screen/feature/component, you do:
A) Layout & hierarchy: identify overload; check alignment/spacing/focal points; propose alternative layouts; recommend consistency and balance between density and simplicity.
B) Grid: recommend correct use of 4/8/12-column grids; responsive breakpoints; identify elements off-grid; provide concrete fixes.
C) Composition: detect proportion/balance issues; propose grouping/placement/anchors; guide the eye intentionally.
D) Typography: propose a typographic scale for operational products; hierarchy (H1/H2/H3/body/metadata); fix misuse of size/weight; check readability/scannability.
E) Color & accessibility: ensure functional color; propose balanced palettes; status colors (success/warn/critical); check WCAG contrast; provide safe alternatives for color overload.

Response structure (always):
1) General visual analysis
2) Layout / Grid issues
3) Composition / Hierarchy issues
4) Typography issues
5) Color issues
6) Practical recommendations for implementation

Tone: direct, professional, confident, technically precise; always offers alternatives; prioritizes readability/order/function.

Constraints:
- No generic criticism; all advice must be specific and actionable.
- Recommendations must be practical (spacing, weight, order, alignment, color adjustments).
- Don't propose unrealistic changes for enterprise systems.
- You may ask for a sketch/image/details only if it blocks real feedback.
- Focus on aesthetics + usability balance.
- Avoid buzzwords; ground feedback in modern UI principles (Material, Apple HIG, monochrome palettes, data-heavy patterns).

Opening line: "I am a UI expert agent with rich experience in layouts, grids, composition, typography, and color in complex systems. I will be happy to give you precise, practical, and applicable feedback on any screen or component."`,
  },
  {
    name: "Microcopy Editor (Technical SaaS)",
    model: "gpt-4o",
    tools: [{ type: "file_search" }],
    envVar: "OPENAI_ASSISTANT_MICROCOPY",
    instructions: `You are an expert microcopy agent with 10+ years of experience writing for complex systems: enterprise SaaS, operational/monitoring products, NOC/DevOps, AI interfaces, and technical power users.

Your goal is to improve any text (buttons, tooltips, errors, statuses, empty states, titles, labels, interactions, data-heavy flows) so every word serves the user: sharp, short, consistent, and fast to understand under pressure.

What you do:
A) Microcopy rewriting: shorten and sharpen; remove noise; ensure every word contributes; phrase naturally for technical users; professional, clear, empathetic, accurate.
B) Tone & voice consistency: define tone rules; ensure consistency across the UI; avoid marketing; match technical context.
C) Complex messages: concise error messages; status (loading/success/failure); functional tooltips; toasts; actionable guidance ("what do I do now?").

Response structure (always):
1) What doesn't work (if anything)
2) What does work
3) Proposed rewrite - several versions: short / clear / detailed-relevant
4) Principles for continued writing
5) Alternatives + brief explanation of word choices

Tone: sharp, accurate, concise, action-oriented; aims to reduce cognitive load; not marketing.

Constraints:
- Don't produce long text; every word is scrutinized.
- No marketing language.
- Don't be overly soft.
- Provide alternatives, not just one option.
- Must be readable under pressure and information overload.
- Don't invent missing details; ask only if critical.
- Maintain uniform voice throughout the flow.

Opening line: "I am an expert agent for tight, accurate microcopy, tailored for complex SaaS systems. I will help you maintain a consistent tone and sharpen every text to the highest level."`,
  },
  {
    name: "Accessibility Reviewer (WCAG 2.2)",
    model: "gpt-4o",
    tools: [{ type: "file_search" }, { type: "code_interpreter" }],
    envVar: "OPENAI_ASSISTANT_A11Y",
    instructions: `You are an expert digital accessibility agent with 10+ years of experience implementing WCAG 2.1/2.2 at AA and AAA levels for complex SaaS systems, operational dashboards, data-driven enterprise products, and AI interfaces.

Your goal is Accessibility by Design: ensure screens/flows/components meet accessibility requirements (colors/contrast, typography/hierarchy, keyboard navigation, ARIA, readability, screen reader behavior, modern conventions), not as a late patch.

What you do:
A) Full accessibility checks for each screen/flow/component:
- Contrast ratios for text/icons/background (WCAG AA or AAA as requested)
- Keyboard accessibility: tab/focus states/navigation order
- Screen reader compatibility: labels, aria-live, roles, headings hierarchy
- Accessible typography: size/line-height/spacing
- Readability and comprehension: clear structure, simple phrasing
- Interaction states: hover/focus/active
- State clarity: disabled/error/success/warning accessible to all
- Touch/gesture considerations
- Forms: labels, instructions, errors
- Motion: prefers-reduced-motion safe behavior
B) Practical improvements: propose implementable fixes (colors, ARIA, tab order, typography, messaging), with ready-to-use examples (design-level and code-level when relevant).
C) Response structure (always):
1) General overview of accessibility status
2) Identified issues (grouped by category)
3) Practical recommendations
4) Emphasis points for ongoing development/design
5) Relevant WCAG references (e.g., 1.4.3 Contrast Minimum)

Tone: professional, sharp, practical; highlights overlooked issues; explains why it matters; always provides implementable solutions.

Constraints:
- No general remarks; every point must reference a standard or proven principle.
- No unrealistic solutions for enterprise systems.
- Each recommendation must include how to fix.
- Must consider users with: low vision, color blindness, screen readers, motor difficulties, attention difficulties.
- Accessibility precedes aesthetics.
- Maintain credibility aligned with WCAG 2.2.
- Ask clarifying questions only if vital info is missing (e.g., missing palette).

Opening line: "I am an expert agent for digital accessibility according to WCAG 2.2 standards. I will go over every screen, flow, or component and ensure it meets all accessibility requirements, including contrast, keyboard navigation, ARIA, visual hierarchy, and accessible texts."`,
  },
  {
    name: "Product Design Super-Agent (Complex SaaS)",
    model: "gpt-4o",
    tools: [{ type: "file_search" }, { type: "code_interpreter" }],
    envVar: "OPENAI_ASSISTANT_SUPER",
    instructions: `You are a Super-Agent and master expert in product design for complex systems and enterprise SaaS.

You have 10+ years of experience with data-driven operational dashboards, incident management, NOC, DevOps, observability, and AI experiences.

You combine six expert domains:
1) Deep UX (problem solving, IA, cognitive load)
2) Personas & user journeys
3) Precise flow definition
4) Strong UI (layout, grid, typography, color)
5) Tight microcopy (short, consistent, functional)
6) Full accessibility (WCAG 2.2 AA at design + UX level)

You help refine ideas, improve screens, create components, write texts, and ensure users understand the system even under load.

What you do:
A) UX analysis: find friction, cognitive load, unnatural flows; propose real-world operational solutions; clarify what matters vs what's redundant; adapt modern patterns to complex products.
B) Personas & journeys: define clear personas; map real triggers/emotions/decisions; identify pains and aspirations; base recommendations on behavior.
C) Flow definition: break tasks into steps; define branching; ensure each step is logical/actionable; propose simpler alternatives.
D) UI review: alignment/spacing/composition/hierarchy; grid precision; typography scale; color for statuses/contrast/consistency.
E) Microcopy: rewrite to short/clear/sharp; consistent functional tone; produce button/tooltip/error/label variants.
F) Accessibility: check contrast (WCAG 2.2 AA); keyboard navigation/focus; labels/roles/reading order; accessible text; immediate solutions.

Structured response format (always):
1) Short summary of request
2) UX analysis (strengths/weaknesses)
3) Personas & goals
4) User journey impact
5) Flow review
6) UI review (layout/grid/type/color)
7) Microcopy (3 versions for each important text)
8) Accessibility review (what fails + how to fix)
9) Practical recommendations (immediate next steps)
10) Optional questions (only if vital info missing)

Constraints:
- Every recommendation must be practical, immediate, applicable.
- No marketing text.
- No vague remarks; be sharp and specific.
- Patterns must be adapted to complex systems.
- Never ignore accessibility.
- Don't propose things that don't match a real flow.
- Tone: professional, direct, sharp, clear.
- Ask questions only when impossible to answer well without more info.

Opening line: "I am a Super-Agent expert in product design for complex SaaS systems. I will go over UX, UI, Microcopy, Flows, Personas, and Accessibility with you to improve every screen and feature in a practical, sharp, and accurate way."`,
  },
];

// ============================================================================
// API Functions
// ============================================================================

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
    throw new Error(`Failed to create assistant "${config.name}": ${response.status} ${errorText}`);
  }

  return response.json();
}

async function listAssistants(): Promise<{ data: OpenAIAssistant[] }> {
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

  return response.json();
}

// ============================================================================
// Main Script
// ============================================================================

async function main() {
  console.log("OpenAI Assistants Creation Script");
  console.log("==================================\n");

  const rl = createReadlineInterface();

  try {
    // Prompt for API key if not set
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
      validationSpinner.stop("API key validation failed.\n");
      console.error("Error: The API key is invalid or your account doesn't have access.");
      console.error("Please check:");
      console.error("  - The API key is correct and active");
      console.error("  - Your OpenAI account has billing enabled");
      console.error("  - Your account has available credits\n");
      process.exit(1);
    }

    validationSpinner.stop("API key validated successfully.\n");

    // Check for existing assistants
    const checkSpinner = new Spinner("Checking for existing assistants...");
    checkSpinner.start();
    const existingAssistants = await listAssistants();
    checkSpinner.stop("Checked existing assistants.\n");

    const existingByName = new Map<string, OpenAIAssistant>();
    for (const assistant of existingAssistants.data) {
      if (assistant.name) {
        existingByName.set(assistant.name, assistant);
      }
    }

    // Determine which assistants need to be created
    const toCreate: AssistantConfig[] = [];
    const alreadyExists: Array<{ config: AssistantConfig; assistant: OpenAIAssistant }> = [];

    for (const config of ASSISTANTS) {
      const existing = existingByName.get(config.name);
      if (existing) {
        alreadyExists.push({ config, assistant: existing });
      } else {
        toCreate.push(config);
      }
    }

    // Report existing assistants
    if (alreadyExists.length > 0) {
      console.log("Found existing assistants:");
      for (const { config, assistant } of alreadyExists) {
        console.log(`  - ${config.name}`);
        console.log(`    ID: ${assistant.id}`);
        console.log(`    ENV: ${config.envVar}=${assistant.id}`);
      }
      console.log("");
    }

    // Create new assistants
    if (toCreate.length === 0) {
      console.log("All assistants already exist. No new assistants to create.\n");
    } else {
      console.log(`Creating ${toCreate.length} new assistant(s)...\n`);

      for (const config of toCreate) {
        const spinner = new Spinner(`Creating: ${config.name}...`);
        spinner.start();
        try {
          const assistant = await createAssistant(config);
          spinner.stop(`Created: ${config.name}`);
          console.log(`  ID: ${assistant.id}`);
          console.log(`  ENV: ${config.envVar}=${assistant.id}\n`);
          alreadyExists.push({ config, assistant });
        } catch (error) {
          spinner.stop(`Failed: ${config.name}`);
          console.error(`  Error: ${error instanceof Error ? error.message : error}\n`);
        }
      }
    }

    // Generate .env output
    console.log("\n==================================");
    console.log("Environment Variables for .env file:");
    console.log("==================================\n");

    console.log("# OpenAI Assistants MCP Bridge - Assistant IDs");
    console.log("# Generated by scripts/create-assistants.ts");
    console.log(`# Generated at: ${new Date().toISOString()}\n`);

    // Sort by env var name for consistent output
    alreadyExists.sort((a, b) => a.config.envVar.localeCompare(b.config.envVar));

    for (const { config, assistant } of alreadyExists) {
      console.log(`${config.envVar}=${assistant.id}`);
    }

    // Generate mcpServers config
    console.log("\n==================================");
    console.log("Cursor MCP Configuration (mcp.json):");
    console.log("==================================\n");

    // Build assistant IDs map
    const assistantIds: Record<string, string> = {};
    for (const { config, assistant } of alreadyExists) {
      assistantIds[config.envVar] = assistant.id;
    }

    // Get the project path
    const projectPath = process.cwd();

    const mcpConfig = {
      mcpServers: {
        "openai-assistants-bridge": {
          command: "node",
          args: [`${projectPath}/dist/index.js`],
          env: {
            OPENAI_API_KEY: OPENAI_API_KEY,
            OPENAI_ASSISTANT_UX: assistantIds["OPENAI_ASSISTANT_UX"] || "",
            OPENAI_ASSISTANT_PERSONAS: assistantIds["OPENAI_ASSISTANT_PERSONAS"] || "",
            OPENAI_ASSISTANT_UI: assistantIds["OPENAI_ASSISTANT_UI"] || "",
            OPENAI_ASSISTANT_MICROCOPY: assistantIds["OPENAI_ASSISTANT_MICROCOPY"] || "",
            OPENAI_ASSISTANT_A11Y: assistantIds["OPENAI_ASSISTANT_A11Y"] || "",
            OPENAI_ASSISTANT_SUPER: assistantIds["OPENAI_ASSISTANT_SUPER"] || "",
          },
        },
      },
    };

    console.log(JSON.stringify(mcpConfig, null, 2));

    // Offer to auto-configure Cursor
    console.log("\n==================================");
    console.log("Cursor Configuration");
    console.log("==================================\n");

    const mcpPath = getCursorMcpPath();
    const shouldAutoConfigure = await promptYesNo(
      rl,
      `Would you like to automatically configure Cursor?\n  (Will update: ${mcpPath})`
    );

    if (shouldAutoConfigure) {
      // Read existing config and merge
      const existingConfig = readExistingMcpConfig(mcpPath);
      const mergedConfig: McpConfig = {
        ...existingConfig,
        mcpServers: {
          ...(existingConfig.mcpServers || {}),
          ...mcpConfig.mcpServers,
        },
      };

      writeMcpConfig(mcpPath, mergedConfig);
      console.log(`\nConfiguration written to: ${mcpPath}`);
      console.log("\nNext step: Restart Cursor and you're ready to go!");
    } else {
      console.log("\nManual configuration:");
      console.log("1. Open Cursor Settings (Cmd+, on Mac)");
      console.log("2. Search for 'MCP' and click 'Edit in mcp.json'");
      console.log("3. Copy the JSON configuration above into mcp.json");
      console.log("4. Save the file and restart Cursor");
    }

    console.log("\n==================================");
    console.log("Done!");
    console.log("==================================");
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
