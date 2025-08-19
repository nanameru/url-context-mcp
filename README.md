# URL-Context-MCP MCP Server

The URL-Context-MCP MCP Server provides a tool to analyze and summarize the content of URLs using Google Gemini's URL Context capability via the Gemini API.

Now also supports optional grounding with Google Search alongside URL Context.

## Installation

### Prerequisites
- Node.js 18+
- Set `GOOGLE_API_KEY` in your environment

### Get a Gemini API key
- Sign in to Google AI for Developers and create an API key
  - See: [Gemini API – API keys guide](https://ai.google.dev/gemini-api/docs/api-key)
- Copy the generated key and set it as `GOOGLE_API_KEY` for this server
  - Cursor (project): add to `.cursor/mcp.json` under `env`
  - Claude CLI one-liner example: shown below
  - Or set it in your shell before launching

Examples
```json
// .cursor/mcp.json
{
  "mcpServers": {
    "URL-Context-MCP": {
      "command": "node",
      "args": ["/Users/kimurataiyou/url-context-mcp/build/index.js"],
      "env": { "GOOGLE_API_KEY": "sk-your-real-key" },
      "autoStart": true
    }
  }
}
```

```bash
# Claude CLI (replace with your real key)
claude mcp add URL-Context-MCP -s user -e GOOGLE_API_KEY="sk-your-real-key" -- $(which node) /Users/kimurataiyou/url-context-mcp/build/index.js
```

```bash
# Shell export (current terminal session)
export GOOGLE_API_KEY="sk-your-real-key"
```

### Build locally
```bash
cd /Users/kimurataiyou/url-context-mcp
npm i
npm run build
```

### Install in Claude Code (one-line)
Replace secrets with real values.
```bash
claude mcp add URL-Context-MCP -s user -e GOOGLE_API_KEY="sk-REPLACE_ME" -- $(which node) /Users/kimurataiyou/url-context-mcp/build/index.js
```
To remove:
```bash
claude mcp remove URL-Context-MCP
```

### Configure in Cursor
Create `.cursor/mcp.json` at your repository root.
```json
{
  "mcpServers": {
    "URL-Context-MCP": {
      "command": "node",
      "args": ["/Users/kimurataiyou/url-context-mcp/build/index.js"],
      "env": { "GOOGLE_API_KEY": "sk-REPLACE_ME" },
      "autoStart": true
    }
  }
}
```

## Configuration (Env)
- GOOGLE_API_KEY: Your Gemini API key

## Available Tools
- analyze_urls
  - inputs:
    - urls: string | string[] (1-20 total)
    - instruction?: string
    - model?: string (default: gemini-2.5-flash)
    - use_google_search?: boolean (default: false) — enable grounding with Google Search in addition to URL Context

### Example invocation (MCP tool call)

```json
{
  "name": "analyze_urls",
  "arguments": {
    "urls": "https://note.com/hawk735/n/nbc585d0774df",
    "instruction": "日本語で、要約・キーファクト・引用URLを簡潔に",
    "use_google_search": true
  }
}
```

## Troubleshooting
- 401 auth errors: verify `GOOGLE_API_KEY`
- Ensure Node 18+
- Use absolute path to `build/index.js`

## References
- [Model Context Protocol Quickstart](https://modelcontextprotocol.io/quickstart/server)
- [MCP SDK Docs](https://modelcontextprotocol.io/docs/sdk)
- [Gemini API URL context](https://ai.google.dev/gemini-api/docs/url-context)
