# URL-Context-MCP MCP Server

The URL-Context-MCP MCP Server provides a tool to analyze and summarize the content of URLs using Google Gemini's URL Context capability via the Gemini API.

Now also supports optional grounding with Google Search alongside URL Context. The server is designed to follow prompt-only orchestration: control whether to search or scrape via the instruction text you provide.

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

### Published Package
This MCP server is now available as a published npm package: `@taiyokimura/url-context-mcp`
- No need to clone the repository locally
- Can be run directly via `npx @taiyokimura/url-context-mcp@latest`
- See setup instructions below for Cursor and Claude Code

### Build locally
```bash
cd /Users/kimurataiyou/url-context-mcp
npm i
npm run build
```

## Setup: Claude Code (CLI)
Use this one-line command (replace with your real API key):
```bash
claude mcp add URL-Context-MCP -s user -e GOOGLE_API_KEY="sk-your-real-key" -- npx @taiyokimura/url-context-mcp@latest
```
To remove the server from Claude Code:
```bash
claude mcp remove URL-Context-MCP
```

## Setup: Cursor
Create `.cursor/mcp.json` at your repository root:
```json
{
  "mcpServers": {
    "URL-Context-MCP": {
      "command": "npx",
      "args": ["@taiyokimura/url-context-mcp@latest"],
      "env": { "GOOGLE_API_KEY": "sk-your-real-key" },
      "autoStart": true
    }
  }
}
```

## Other Clients and Agents

<details>
<summary>VS Code</summary>

[Install in VS Code](https://insiders.vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%7B%22name%22%3A%22URL-Context-MCP%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22%40taiyokimura%2Furl-context-mcp%40latest%22%5D%7D)  
[Install in VS Code Insiders](https://insiders.vscode.dev/redirect?url=vscode-insiders%3Amcp%2Finstall%3F%7B%22name%22%3A%22URL-Context-MCP%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22%40taiyokimura%2Furl-context-mcp%40latest%22%5D%7D)

Or add via CLI:
```bash
code --add-mcp '{"name":"URL-Context-MCP","command":"npx","args":["@taiyokimura/url-context-mcp@latest"],"env":{"GOOGLE_API_KEY":"sk-your-real-key"}}'
```
</details>

<details>
<summary>Claude Desktop</summary>

Follow the MCP install guide and use the standard config above:
- Guide: https://modelcontextprotocol.io/quickstart/user
</details>

<details>
<summary>LM Studio</summary>

Add MCP Server with:
- Command: npx
- Args: ["@taiyokimura/url-context-mcp@latest"]
- Env: GOOGLE_API_KEY=sk-your-real-key
</details>

<details>
<summary>Goose</summary>

Advanced settings → Extensions → Add custom extension:
- Type: STDIO
- Command: npx
- Args: @taiyokimura/url-context-mcp@latest
- Enabled: true
</details>

<details>
<summary>opencode</summary>

Example `~/.config/opencode/opencode.json`:
```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "url-context-mcp": {
      "type": "local",
      "command": [
        "npx",
        "@taiyokimura/url-context-mcp@latest"
      ],
      "enabled": true
    }
  }
}
```
</details>

<details>
<summary>Qodo Gen</summary>

Open Qodo Gen (VSCode/IntelliJ) → Connect more tools → + Add new MCP → Paste the standard config JSON → Save.
</details>

<details>
<summary>Windsurf</summary>

Follow Windsurf MCP documentation and use the standard config above:
- Docs: https://docs.windsurf.com/windsurf/cascade/mcp
</details>

## Configuration (Env)
- GOOGLE_API_KEY: Your Gemini API key

## Available Tools
- analyze_urls
  - inputs:
    - urls: string | string[] (1-20 total)
    - instruction?: string
    - model?: string (default: gemini-2.5-flash)
    - use_google_search?: boolean (default: false) — enable grounding with Google Search in addition to URL Context

### Prompt recipes (prompt-only orchestration)
- Scraping-only (user provided URLs). Example instruction:
  - "ユーザーが貼ったこれらのURLのみをURLコンテキストで解析し、要約・キーファクト・引用URLを日本語で提示。外部検索は禁止。取得失敗は明示。"
- Research with search + scraping, iterative up to 5 rounds. Example instruction:
  - "以下のテーマを調査。まずGoogle検索で候補を収集し、引用する全URLは必ずURLコンテキストで取得・要約・統合。カバレッジ不十分なら最大5回まで再検索・再収集して補完。日本語で簡潔に要約・キーファクト・引用URLを提示。"

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

Scraping-only example
```json
{
  "name": "analyze_urls",
  "arguments": {
    "urls": ["https://example.com/post1", "https://example.com/post2"],
    "instruction": "ユーザーが貼ったこれらのURLのみをURLコンテキストで解析し、要約・キーファクト・引用URLを日本語で提示。外部検索は禁止。取得失敗は明示。"
  }
}
```

Research + scraping (iterative) example
```json
{
  "name": "google_search",
  "arguments": {
    "query": "最新のNext.js 14のApp Routerのベストプラクティス",
    "instruction": "まずGoogle検索で候補を収集し、引用する全URLは必ずURLコンテキストで取得・要約・統合。カバレッジ不十分なら最大5回まで再検索・再収集して補完。日本語で簡潔に要約・キーファクト・引用URLを提示。"
  }
}
```

## Troubleshooting
- 401 auth errors: verify `GOOGLE_API_KEY`
- Ensure Node 18+
- For npx usage: `npx @taiyokimura/url-context-mcp@latest` should work without local build
- For local development: use absolute path to `build/index.js`

## References
- [Model Context Protocol Quickstart](https://modelcontextprotocol.io/quickstart/server)
- [MCP SDK Docs](https://modelcontextprotocol.io/docs/sdk)
- [Gemini API URL context](https://ai.google.dev/gemini-api/docs/url-context)
