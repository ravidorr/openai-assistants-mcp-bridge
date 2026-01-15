# OpenAI Assistants MCP Bridge

Get expert AI feedback on your product designs directly in Cursor. This tool connects Cursor to specialized OpenAI Assistants that can review your UX, UI, accessibility, and content.

## What Does This Do?

When you install this MCP (Model Context Protocol) server, you get access to six AI design experts inside Cursor:

| Expert | What They Help With |
|--------|---------------------|
| **UX Consultant** | Reviews user experience, identifies friction points, suggests improvements |
| **Personas & Journeys** | Helps define user personas and map user journeys |
| **UI Critique** | Reviews visual design - layout, typography, colors, spacing |
| **Microcopy Editor** | Improves button labels, error messages, tooltips, and other UI text |
| **Accessibility Reviewer** | Checks WCAG 2.2 compliance and accessibility issues |
| **Product Design Super-Agent** | Comprehensive review covering all of the above |

Each expert remembers your conversation, so you can have back-and-forth discussions about your designs.

---

## Quick Start

```bash
git clone https://github.com/ravidorr/openai-assistants-mcp-bridge.git
cd openai-assistants-mcp-bridge
npm install && npm run build
npm run assistants
```

The setup wizard handles everything: prompts for your API key, creates the assistants, and configures Cursor. Just restart Cursor when done.

---

## Detailed Setup Guide

### Prerequisites

- **Node.js 18+**: Download from [nodejs.org](https://nodejs.org/) (LTS version recommended)
- **OpenAI API key**: Get one from [platform.openai.com/api-keys](https://platform.openai.com/api-keys). Make sure you are using your OpenAI work account.
- **Cursor IDE**: Download from [cursor.sh](https://cursor.sh/)

### Step 1: Download and Build

```bash
git clone https://github.com/ravidorr/openai-assistants-mcp-bridge.git
cd openai-assistants-mcp-bridge
npm install
npm run build
```

### Step 2: Create Assistants and Configure Cursor

Run the assistants manager:

```bash
npm run assistants
```

The wizard will:
1. Prompt for your OpenAI API key (if not already set via `OPENAI_API_KEY` environment variable)
2. Check which assistants already exist on your OpenAI account
3. Show you a status of each assistant (missing, up to date, or changed)
4. Let you choose which assistants to create or update
5. Offer to automatically configure Cursor's `mcp.json` file

If you prefer manual configuration, the wizard will also display the environment variables you need.

### Step 3: Restart Cursor and Start Using It!

In Cursor's chat, you can now ask the AI to use any of the design experts. Try these example prompts:

- "Use the UX consultant to review this login flow"
- "Ask the accessibility reviewer to check this form"
- "Get microcopy suggestions for these error messages"
- "Have the super agent do a full review of this dashboard design"

---

## Troubleshooting

### "Command not found: node"

Install Node.js from [nodejs.org](https://nodejs.org/) (LTS version).

### "Invalid API key" during setup

- Get a valid key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Ensure your OpenAI account has billing enabled
- The key should start with `sk-`

### "API key validation failed"

The setup script validates your API key before creating assistants. If validation fails:
- Check your internet connection
- Verify the API key is correct and active
- Ensure your OpenAI account has available credits

### Tools not showing in Cursor

1. Verify `mcp.json` was configured (check `~/.cursor/mcp.json`)
2. Restart Cursor completely (quit and reopen)
3. Run `npm run assistants` again and choose to update Cursor's mcp.json

### The assistants aren't responding

1. Check that your OpenAI account has available credits
2. Verify the assistant IDs in `mcp.json` match your OpenAI account
3. Try restarting Cursor

---

## Managing Assistants

The unified assistants manager handles both creation and updates:

```bash
npm run assistants
```

The wizard intelligently detects:
- **Missing assistants** - Not yet created on OpenAI
- **Changed assistants** - Local config differs from OpenAI
- **Up to date** - Already synced

Example:
```
========================================
  OpenAI Assistants Manager
========================================

Checking existing assistants on OpenAI...

Status:
  ✓ Expert UX Agent                    [up to date]
  ⚡ Expert UI Agent                    [config changed]
  ✗ Expert Agent in Personas           [not created]
  ✓ Expert Microcopy Agent             [up to date]
  ✗ Expert Accessibility Agent         [not created]
  ✓ Super-Agent                        [up to date]

What would you like to do?

  1) Create missing assistants (2)
  2) Update changed assistants (1)
  3) Create missing + Update changed (3 total)
  4) Select specific assistants to manage
  5) Sync ALL assistants to match config
  6) Exit

Select option (1-6):
```

### Modifying Assistant Instructions

Assistant configurations are stored in individual files under `scripts/lib/assistants/`:

```
scripts/lib/assistants/
├── ux.ts           # UX Agent
├── ui.ts           # UI Agent
├── personas.ts     # Personas & Journeys Agent
├── microcopy.ts    # Microcopy Agent
├── a11y.ts         # Accessibility Agent
└── super.ts        # Super-Agent
```

To modify an assistant:
1. Edit the relevant file in `scripts/lib/assistants/`
2. Run `npm run generate:assistants` to update the index
3. Run `npm run assistants` and select "Update changed assistants"

### Adding a New Assistant

1. Create a new file in `scripts/lib/assistants/` (e.g., `newagent.ts`)
2. Export an `AssistantConfig` object following the existing pattern
3. Run `npm run generate:assistants` to add it to the index
4. Run `npm run assistants` to create it on OpenAI

---

## Available Tools

Once connected, these tools are available in Cursor:

| Tool Name | What It Does |
|-----------|--------------|
| `ux_consultant_review` | Get UX feedback and recommendations |
| `personas_and_journeys` | Work on user personas and journey maps |
| `ui_critique` | Get visual design feedback |
| `microcopy_rewrite` | Improve UI text and copy |
| `a11y_review` | Check accessibility compliance |
| `super_agent_review` | Get comprehensive design feedback |
| `reset_all_specialists` | Start fresh conversations with all experts |
| `list_specialists_status` | See current session status |
| `check_openai_connection` | Verify the connection is working |

### Tool Options

When using any of the design expert tools, you can include:

| Option | Description |
|--------|-------------|
| `prompt` | Your question or what you want reviewed (required) |
| `context` | Additional background information |
| `files` | File paths to include in the review (for document search) |
| `image_urls` | URLs of screenshots or mockups to review |
| `image_files` | Local image file paths to upload for visual analysis (PNG, JPG, GIF, WEBP) |
| `image_base64` | Base64-encoded image data for visual analysis |
| `image_detail` | Detail level for image analysis: `"auto"` (default), `"low"` (faster/cheaper), or `"high"` (more detailed) |
| `reset_thread` | Start a fresh conversation (forgets previous context) |
| `reset_files` | Clear previously uploaded files |

#### Image Input Examples

You can provide images in three ways:

```typescript
// 1. Via URL (external images)
{
  prompt: "Review this design",
  image_urls: ["https://example.com/screenshot.png"]
}

// 2. Via local file path (uploaded automatically)
{
  prompt: "Review this mockup",
  image_files: ["./designs/homepage.png", "./designs/mobile.jpg"]
}

// 3. Via base64 data (inline images)
{
  prompt: "Analyze this chart",
  image_base64: ["iVBORw0KGgoAAAANSUhEUgAAAAUA..."]
}

// Combine multiple sources with custom detail level
{
  prompt: "Compare these designs",
  image_urls: ["https://cdn.example.com/v1.png"],
  image_files: ["./designs/v2.png"],
  image_detail: "high"
}
```

---

## For Developers

<details>
<summary>Click to expand development documentation</summary>

### Architecture

```mermaid
flowchart TB
    subgraph MCPClient [MCP Client - Cursor]
        CursorAgent[Cursor Agent]
    end
    
    subgraph Bridge [OpenAI Assistants MCP Bridge]
        StdioTransport[StdioServerTransport]
        McpServer[McpServer]
        
        subgraph Tools [Specialist Tools]
            UX[ux_consultant_review]
            Personas[personas_and_journeys]
            UI[ui_critique]
            Microcopy[microcopy_rewrite]
            A11y[a11y_review]
            Super[super_agent_review]
        end
        
        subgraph State [In-Memory State]
            ThreadMap["threadByTool Map"]
            VectorMap["vectorStoreByTool Map"]
            FileMap["uploadedFileIdByPath Map"]
        end
        
        OpenAIFetch[openaiFetch Helper]
    end
    
    subgraph OpenAI [OpenAI API]
        Threads[Threads API]
        Runs[Runs API]
        Messages[Messages API]
        Files[Files API]
        VectorStores[Vector Stores API]
        Assistants[6 Pre-configured Assistants]
    end
    
    CursorAgent <-->|stdio| StdioTransport
    StdioTransport <--> McpServer
    McpServer --> Tools
    Tools --> State
    Tools --> OpenAIFetch
    OpenAIFetch --> Threads
    OpenAIFetch --> Runs
    OpenAIFetch --> Messages
    OpenAIFetch --> Files
    OpenAIFetch --> VectorStores
    Runs --> Assistants
```

### Pre-commit Hooks

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged) to run checks before each commit:

- **ESLint** - Lints and auto-fixes staged `.ts` and `.js` files
- **Prettier** - Formats staged files
- **Tests** - Runs the test suite

To skip hooks temporarily (not recommended):

```bash
git commit --no-verify -m "Your message"
```

### Project Structure

```
openai-assistants-mcp-bridge/
├── src/
│   ├── index.ts              # Main server entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── constants.ts          # Configuration constants
│   └── utils/
│       ├── logger.ts         # Structured logging utility
│       └── retry.ts          # Retry with exponential backoff
├── scripts/
│   ├── manage-assistants.ts  # Unified assistant manager wizard
│   └── lib/
│       ├── index.ts          # AUTO-GENERATED - exports all assistants
│       ├── types.ts          # Shared types for assistant configs
│       ├── generate-index.ts # Generator for index.ts
│       └── assistants/       # Individual assistant configurations
│           ├── ux.ts
│           ├── ui.ts
│           ├── personas.ts
│           ├── microcopy.ts
│           ├── a11y.ts
│           └── super.ts
├── tests/
│   └── utils/
│       ├── logger.test.ts
│       └── retry.test.ts
├── dist/                     # Compiled JavaScript output
├── .husky/                   # Git hooks (pre-commit)
├── .env.example              # Environment variables template
├── .nvmrc                    # Node version for nvm users
├── .prettierrc               # Prettier configuration
├── assistants-creation.md    # Detailed assistant configurations
├── eslint.config.js          # ESLint configuration
├── package.json
├── tsconfig.json             # TypeScript config (includes all files)
├── tsconfig.build.json       # TypeScript config for production build
├── vitest.config.ts          # Test configuration
└── README.md
```

### Scripts

| Script | Description |
|--------|-------------|
| `npm run assistants` | Unified wizard to create/update assistants on OpenAI |
| `npm run generate:assistants` | Regenerate `scripts/lib/index.ts` after adding/removing assistants |
| `npm run build` | Build the MCP server |
| `npm run dev` | Watch mode for development |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | - | Your OpenAI API key |
| `OPENAI_ASSISTANT_UX` | Yes | - | Assistant ID for UX consultant |
| `OPENAI_ASSISTANT_PERSONAS` | Yes | - | Assistant ID for personas/journeys |
| `OPENAI_ASSISTANT_UI` | Yes | - | Assistant ID for UI critique |
| `OPENAI_ASSISTANT_MICROCOPY` | Yes | - | Assistant ID for microcopy |
| `OPENAI_ASSISTANT_A11Y` | Yes | - | Assistant ID for accessibility |
| `OPENAI_ASSISTANT_SUPER` | Yes | - | Assistant ID for super agent |
| `OPENAI_BASE_URL` | No | `https://api.openai.com/v1` | OpenAI API base URL |
| `OPENAI_POLL_TIMEOUT_MS` | No | `90000` | Max wait time for responses (ms) |
| `LOG_LEVEL` | No | `info` | Log level (debug, info, warn, error) |
| `LOG_ENABLED` | No | `true` | Enable/disable logging |

### Logging

The server outputs structured JSON logs to stderr. Example:

```json
{"timestamp":"2024-01-15T10:30:00.000Z","level":"info","message":"Tool invoked","context":{"toolName":"ux_consultant_review"}}
```

### Error Handling

- **Retry Logic**: Transient errors (429, 500, 503) are automatically retried with exponential backoff
- **Graceful Shutdown**: SIGTERM/SIGINT handlers ensure clean server shutdown
- **File Validation**: File paths are validated to prevent directory traversal attacks

</details>

---

## Learn More

- [Detailed Assistant Configurations](./assistants-creation.md) - Full prompts and settings for each AI expert
- [OpenAI Assistants API](https://platform.openai.com/docs/assistants/overview) - Official OpenAI documentation
- [Model Context Protocol](https://modelcontextprotocol.io/) - Learn about MCP

## License

MIT
