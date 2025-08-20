import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

type AnalyzeUrlsParams = {
  urls: string[];
  instruction?: string;
  model?: string;
  useGoogleSearch?: boolean;
};

type GoogleSearchParams = {
  query: string;
  instruction?: string;
  model?: string;
};

// Removed structured orchestration types to keep prompt-only control

async function callGeminiUrlContext(params: AnalyzeUrlsParams): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not set");
  }

  const model = params.model ?? "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const promptText = `Guidelines:\n- Strictly use URL Context to retrieve ONLY the provided URLs\n- Do NOT perform web search or include external sources beyond these URLs\n- If a URL cannot be retrieved, note it explicitly\n\nTask:${params.instruction ? `\n${params.instruction}` : `\nProvide a concise, well-structured summary, key facts, and citations`}\n\nAnalyze these URLs:\n${params.urls.join("\n")}`;

  const tools: any[] = [{ url_context: {} }];
  if (params.useGoogleSearch) {
    tools.push({ google_search: {} });
  }

  const body = {
    contents: [
      {
        parts: [{ text: promptText }],
      },
    ],
    tools,
  } as const;

  const response = await fetch(endpoint + `?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${text}`);
  }

  const json = (await response.json()) as any;
  // Try to get the primary text output
  const candidate = json?.candidates?.[0];
  const textOut = candidate?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n");
  // Collect URL context metadata for transparency if present
  const urlMeta: Array<{ retrieved_url?: string; url_retrieval_status?: string }> |
    undefined = candidate?.url_context_metadata?.url_metadata;
  const sourcesSection = Array.isArray(urlMeta) && urlMeta.length > 0
    ? "\n\nSources (URL Context):\n" +
      urlMeta
        .map((m) => `- ${m.retrieved_url ?? "(unknown)"} [${m.url_retrieval_status ?? ""}]`)
        .join("\n")
    : "";

  if (textOut) {
    return textOut + sourcesSection;
  }
  // Fallback: return raw JSON if text not found
  return JSON.stringify(json, null, 2);
}

// Removed structured URL-context helper to keep API minimal

async function callGoogleSearch(params: GoogleSearchParams): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not set");
  }

  const model = params.model ?? "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const promptText = `Role: You are a meticulous web researcher.\n\nPrimary directive:\n- If the user provides explicit URLs in the request, SKIP web search and use URL Context to analyze ONLY those URLs.\n- Otherwise, perform grounded Google Search and for ANY URL you cite, you MUST fetch it via URL Context and synthesize findings.\n- Prefer authoritative, up-to-date sources.\n- If coverage is insufficient, refine the query and continue internally up to 5 rounds. Stop once adequate.\n\nTask:${params.instruction ? `\n${params.instruction}` : ``}\n\nResearch focus: ${params.query}`;

  const tools: any[] = [{ google_search: {} }, { url_context: {} }];

  const body = {
    contents: [
      {
        parts: [{ text: promptText }],
      },
    ],
    tools,
  } as const;

  const response = await fetch(endpoint + `?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${text}`);
  }

  const json = (await response.json()) as any;
  // Try to get the primary text output
  const candidate = json?.candidates?.[0];
  const textOut = candidate?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n");
  
  // Collect grounding metadata for search results
  const groundingMeta = candidate?.grounding_metadata;
  const searchQueries = groundingMeta?.web_search_queries || [];
  const groundingChunks = groundingMeta?.grounding_chunks || [];
  
  let sourcesSection = "";
  if (searchQueries.length > 0) {
    sourcesSection += "\n\nSearch Queries:\n" + searchQueries.map((q: string) => `- ${q}`).join("\n");
  }
  if (groundingChunks.length > 0) {
    sourcesSection += "\n\nSources (Google Search):\n" +
      groundingChunks
        .map((chunk: any) => `- ${chunk.web?.title || "(no title)"}: ${chunk.web?.uri || "(no URL)"})`)
        .join("\n");
  }

  if (textOut) {
    return textOut + sourcesSection;
  }
  // Fallback: return raw JSON if text not found
  return JSON.stringify(json, null, 2);
}

// Removed structured search helper to keep prompt-only control

// Removed evaluation and loop orchestration to rely on prompt-only guidance

async function main(): Promise<void> {
  const server = new Server(
    {
      name: "URL-Context-MCP",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const tools: Tool[] = [
    {
      name: "analyze_urls",
      description:
        "Analyze and summarize the content of given URLs using Google Gemini URL Context. Provide an optional instruction and model.",
      inputSchema: {
        type: "object",
        properties: {
          urls: {
            description: "One URL string or an array of URLs (max 20)",
            oneOf: [
              { type: "string" },
              {
                type: "array",
                items: { type: "string" },
                minItems: 1,
                maxItems: 20,
              },
            ],
          },
          instruction: {
            type: "string",
            description: "Optional instruction or task description",
          },
          model: {
            type: "string",
            description: "Gemini model id (e.g., gemini-2.5-flash)",
          },
          use_google_search: {
            type: "boolean",
            description:
              "Enable grounding with Google Search (adds google_search tool alongside URL context)",
          },
        },
        required: ["urls"],
      },
    },
    {
      name: "google_search",
      description:
        "Search the web using Google Search grounding via Gemini API. Provides search results with sources and citations.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query to find information on the web",
          },
          instruction: {
            type: "string",
            description: "Optional instruction for processing search results",
          },
          model: {
            type: "string",
            description: "Gemini model id (e.g., gemini-2.5-flash)",
          },
        },
        required: ["query"],
      },
    },
  ];

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    if (name === "analyze_urls") {
      const {
        urls: rawUrls,
        instruction,
        model,
        use_google_search,
      } = (args ?? {}) as {
        urls?: string | string[];
        instruction?: string;
        model?: string;
        use_google_search?: boolean;
      };
      const urls = Array.isArray(rawUrls)
        ? rawUrls
        : typeof rawUrls === "string"
        ? [rawUrls]
        : [];
      if (urls.length === 0) {
        throw new Error("'urls' must be provided as a string or a non-empty array");
      }
      if (urls.length > 20) {
        throw new Error("Maximum of 20 URLs supported");
      }
      const text = await callGeminiUrlContext({
        urls,
        instruction,
        model,
        useGoogleSearch: Boolean(use_google_search),
      });
      return { content: [{ type: "text", text }] };
    }
    if (name === "google_search") {
      const {
        query,
        instruction,
        model,
      } = (args ?? {}) as {
        query?: string;
        instruction?: string;
        model?: string;
      };
      if (!query || typeof query !== "string" || query.trim() === "") {
        throw new Error("'query' must be provided as a non-empty string");
      }
      const text = await callGoogleSearch({
        query: query.trim(),
        instruction,
        model,
      });
      return { content: [{ type: "text", text }] };
    }
    
    throw new Error(`Unknown tool: ${name}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Avoid stdout logs in STDIO servers
main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});


