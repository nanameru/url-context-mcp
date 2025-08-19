# URL-Context-MCP MCP Server

The URL-Context-MCP MCP Server provides a tool to analyze and summarize the content of URLs using Google Gemini's URL Context capability via the Gemini API.

## Installation

### Prerequisites
- Node.js 18+
- Set `GOOGLE_API_KEY` in your environment

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

## Troubleshooting
- 401 auth errors: verify `GOOGLE_API_KEY`
- Ensure Node 18+
- Use absolute path to `build/index.js`

## References
- [Model Context Protocol Quickstart](https://modelcontextprotocol.io/quickstart/server)
- [MCP SDK Docs](https://modelcontextprotocol.io/docs/sdk)
- [Gemini API URL context](https://t.co/8il127XZGO)
