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

## Quick Start Guide

### What You'll Need

- Node.js version 18 or higher
- An OpenAI API key
- [Cursor IDE](https://cursor.sh/)

### Step 1: Install Node.js

1. Open Pendo Self Service (jamf)
2. Search for `Node.js`
3. Install the Node.js version 20.19.5

### Step 2: Download and Install

1. Open the terminal
2. Go to the folder where your projects are i.e.: `~/Documents/Cursor`
3. In the terminal run:
```bash
# Download the project, open the project folder, instll the project, and build the project
git clone https://github.com/ravidorr/openai-assistants-mcp-bridge.git && cd openai-assistants-mcp-bridge && npm install && npm run build
```

### Step 3: Get Your OpenAI API Key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Copy the key (it starts with `sk-`)
4. Keep this key safe - you'll need it in the next steps

### Step 4: Create the AI Assistants

The assistants are the AI experts that will review your designs. 
1. In the terminal run this to save your OpenAI API key. Don't forget to replace 'REPLACE_THIS_WITH_YOUR_OPENAI_API_KEY' with your OpenAI API key:
```bash
export OPENAI_API_KEY=REPLACE_THIS_WITH_YOUR_OPENAI_API_KEY
```
2. In the terminal run this to create your assistants:
```bash
npm run create-assistants
```

The script will create all 6 assistants and output a ready-to-use configuration for Cursor:

```
Creating: UX Consultant (Complex SaaS)...
  Created successfully!
...

Cursor MCP Configuration (mcp.json):
==================================

{
  "mcpServers": {
    "openai-assistants-bridge": {
      "command": "node",
      "args": ["/Users/yourname/openai-assistants-mcp-bridge/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "sk-paste-your-api-key-here",
        "OPENAI_ASSISTANT_UX": "asst_xxxxx",
        "OPENAI_ASSISTANT_PERSONAS": "asst_xxxxx",
        ...
      }
    }
  }
}
```

### Step 5: Connect to Cursor

1. Open Cursor
2. Open Settings (Cmd+, on Mac)
3. Search for "MCP" in settings
4. Click "Edit in mcp.json"
5. If you already have `"mcpServers": {...` in your `mcp.json` add only the `"openai-assistants-bridge": {...}` If you don't have `"mcpServers": {...` in your `mcp.json` add the whole `{"mcpServers": {...}`
6. In the `openai-assistants-bridge` replace the value of `OPENAI_API_KEY` (`sk-paste-your-api-key-here`) with your actual OpenAI API key
7. Save the file and *restart* Cursor

### Step 6: Enable Browser Automation

The assistants work best when they can view your designs in the browser. Enable these settings:

1. Open Cursor Settings (Cmd+, on Mac)
2. Go to **Tools & MCP** in the sidebar
3. Under **Browser**, set **Browser Automation** to "Browser Tab"
4. Turn on **Show Localhost Links in Browser**

This allows the assistants to take screenshots and interact with your running app.

### Step 7: (Optional) Install Figma MCP

For reviewing Figma designs, install the Figma MCP:

1. In Cursor Settings, go to **Tools & MCP**
2. Scroll to **Installed MCP Servers**
3. Click **Add new MCP server**
4. Look in the [Guide to the Figma MCP server](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server) for instrucations and install either:
   - **Figma** - for reviewing designs via Figma URLs
   - **Figma Desktop** - for reviewing designs from the Figma desktop app (requires Figma desktop to be running)

Once installed, you can share Figma URLs or selection context with the assistants for design review.

### Step 8: Start Using It!

In Cursor's chat, you can now ask the AI to use any of the design experts. Try these example prompts:

- "Use the UX consultant to review this login flow"
- "Ask the accessibility reviewer to check this form"
- "Get microcopy suggestions for these error messages"
- "Have the super agent do a full review of this dashboard design"

---

## Troubleshooting

### "Command not found: node"

You need to install Node.js. Download it from [nodejs.org](https://nodejs.org/) (choose the LTS version).

### "Missing required environment variable"

Make sure you've added all the environment variables to your `mcp.json` file, including your `OPENAI_API_KEY` and all 6 assistant IDs.

### "OPENAI_API_KEY is required"

Your API key isn't set. Make sure you:
1. Have a valid OpenAI API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Have added billing/payment to your OpenAI account
3. Copied the key correctly (it should start with `sk-`)

### The assistants aren't responding

1. Check that your OpenAI account has available credits
2. Make sure you copied the assistant IDs correctly from Step 3
3. Try restarting Cursor

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
| `files` | File paths to include in the review |
| `image_urls` | URLs of screenshots or mockups to review |
| `reset_thread` | Start a fresh conversation (forgets previous context) |
| `reset_files` | Clear previously uploaded files |

---

## Updating an Assistant

Need to change an assistant's name or instructions? Use the update wizard:
1. Open the terminal and navigate to the `openai-assistants-mcp-bridge` project
2. In the terminal run:
```bash
npm run update-assistant
```
The wizard will:
1. Read your `mcp.json` and show a list of configured assistants
2. Let you select which assistant to update
3. Show current details and prompt for changes
4. Confirm before applying updates

Example:
```
========================================
  OpenAI Assistant Update Wizard
========================================

Found 6 assistants:

  1) UX Consultant
  2) Personas & Journeys
  3) UI Critique
  4) Microcopy Editor
  5) Accessibility Reviewer
  6) Super Agent
  7) Enter a different assistant ID manually

Select an assistant (1-7): 1

Fetching current assistant details...

Current Assistant:
  Name:  UX Consultant (Complex SaaS)
  Model: gpt-4o

Enter new name (press Enter to keep current):
Do you want to update the instructions? (y/N):
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

### Development Commands

```bash
# Build the project
npm run build

# Watch mode for development
npm run dev

# Run linting
npm run lint

# Fix auto-fixable lint issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting without writing
npm run format:check

# Run tests
npm test
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
│   └── create-assistants.ts  # Script to create OpenAI Assistants
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
