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

async function callGeminiUrlContext(params: AnalyzeUrlsParams): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not set");
  }

  const model = params.model ?? "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const promptText = params.instruction
    ? `${params.instruction}\n\nAnalyze these URLs:\n${params.urls.join("\n")}`
    : `Analyze these URLs and provide a concise, well-structured summary, key facts, and citations:\n${params.urls.join("\n")}`;

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

async function main(): Promise<void> {
  const server = new Server({
    name: "URL-Context-MCP",
    version: "1.0.0",
  });

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


