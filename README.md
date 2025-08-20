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

### Build locally
```bash
cd /Users/kimurataiyou/url-context-mcp
npm i
npm run build
```

## Setup: Claude Code (CLI)
Use this one-line command (replace with your real API key):
```bash
claude mcp add URL-Context-MCP -s user -e GOOGLE_API_KEY="sk-your-real-key" -- $(which node) /Users/kimurataiyou/url-context-mcp/build/index.js
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
      "command": "node",
      "args": ["/Users/kimurataiyou/url-context-mcp/build/index.js"],
      "env": { "GOOGLE_API_KEY": "sk-your-real-key" },
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
- Use absolute path to `build/index.js`

## References
- [Model Context Protocol Quickstart](https://modelcontextprotocol.io/quickstart/server)
- [MCP SDK Docs](https://modelcontextprotocol.io/docs/sdk)
- [Gemini API URL context](https://ai.google.dev/gemini-api/docs/url-context)
