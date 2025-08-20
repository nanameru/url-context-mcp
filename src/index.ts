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

type GoogleSearchStructuredResult = {
  text: string;
  urls: string[];
};

type UrlContextStructuredResult = {
  text: string;
  sources: string[];
};

type ResearchFlowParams = {
  query: string;
  instruction?: string;
  model?: string;
  maxIterations?: number;
};

type EvaluationResult = {
  isSufficient: boolean;
  missingPoints: string[];
  followUpQueries: string[];
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

async function callGeminiUrlContextStructured(params: AnalyzeUrlsParams): Promise<UrlContextStructuredResult> {
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
  const candidate = json?.candidates?.[0];
  const textOut = candidate?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n");
  const urlMeta: Array<{ retrieved_url?: string; url_retrieval_status?: string }> |
    undefined = candidate?.url_context_metadata?.url_metadata;
  const sources = Array.isArray(urlMeta)
    ? urlMeta.map((m) => m.retrieved_url).filter((u): u is string => Boolean(u))
    : [];

  if (textOut) {
    return { text: textOut, sources };
  }
  return { text: JSON.stringify(json, null, 2), sources };
}

async function callGoogleSearch(params: GoogleSearchParams): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not set");
  }

  const model = params.model ?? "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const promptText = params.instruction
    ? `${params.instruction}\n\nSearch query: ${params.query}`
    : `Search the web for information about: ${params.query}`;

  const tools: any[] = [{ google_search: {} }];

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

async function callGoogleSearchStructured(params: GoogleSearchParams): Promise<GoogleSearchStructuredResult> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not set");
  }

  const model = params.model ?? "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const promptText = params.instruction
    ? `${params.instruction}\n\nSearch query: ${params.query}`
    : `Search the web for information about: ${params.query}`;

  const tools: any[] = [{ google_search: {} }];

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
  const candidate = json?.candidates?.[0];
  const textOut = candidate?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n") ?? "";

  const groundingMeta = candidate?.grounding_metadata;
  const groundingChunks = groundingMeta?.grounding_chunks || [];
  const urls = groundingChunks
    .map((chunk: any) => chunk?.web?.uri)
    .filter((u: any): u is string => typeof u === "string")
    .filter((u: string) => /^https?:\/\//i.test(u));

  const uniqueUrls: string[] = Array.from(new Set<string>(urls));
  return { text: textOut, urls: uniqueUrls };
}

async function evaluateCoverage(params: { query: string; currentSummary: string; model?: string }): Promise<EvaluationResult> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not set");
  }

  const model = params.model ?? "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const instruction = `You are evaluating whether the provided summary sufficiently answers the user query. Return strict JSON with keys is_sufficient (boolean), missing_points (string[]), follow_up_queries (string[]). Do not include any extra text.`;
  const text = `${instruction}\n\nUser query:\n${params.query}\n\nCurrent summary:\n${params.currentSummary}`;

  const body = {
    contents: [
      {
        parts: [{ text }],
      },
    ],
  } as const;

  const response = await fetch(endpoint + `?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const json = (await response.json()) as any;
  const candidate = json?.candidates?.[0];
  const raw = candidate?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n") ?? "";
  try {
    const parsed = JSON.parse(raw);
    return {
      isSufficient: Boolean(parsed?.is_sufficient),
      missingPoints: Array.isArray(parsed?.missing_points) ? parsed.missing_points.map(String) : [],
      followUpQueries: Array.isArray(parsed?.follow_up_queries) ? parsed.follow_up_queries.map(String) : [],
    };
  } catch {
    return { isSufficient: false, missingPoints: [], followUpQueries: [] };
  }
}

async function runResearchFlow(params: ResearchFlowParams): Promise<string> {
  const maxIterations = Math.min(Math.max(params.maxIterations ?? 5, 1), 5);
  let iteration = 0;
  let workingQuery = params.query.trim();
  const seenUrls = new Set<string>();
  const allSources: string[] = [];
  let combinedSummary = "";

  while (iteration < maxIterations) {
    const searchResult = await callGoogleSearchStructured({ query: workingQuery, instruction: params.instruction, model: params.model });
    const newUrls = searchResult.urls.filter((u) => !seenUrls.has(u));
    newUrls.forEach((u) => seenUrls.add(u));

    if (newUrls.length === 0) {
      break;
    }

    const batch = newUrls.slice(0, 10);
    const urlContext = await callGeminiUrlContextStructured({ urls: batch, instruction: params.instruction ?? `Integrate findings to answer: ${params.query}. Provide concise summary, key facts, and citations.`, model: params.model });
    combinedSummary += (combinedSummary ? "\n\n" : "") + urlContext.text;
    urlContext.sources.forEach((s) => allSources.push(s));

    const evalResult = await evaluateCoverage({ query: params.query, currentSummary: combinedSummary, model: params.model });
    if (evalResult.isSufficient) {
      break;
    }
    if (evalResult.followUpQueries.length > 0) {
      workingQuery = evalResult.followUpQueries[0];
    }
    iteration += 1;
  }

  const sourcesSection = allSources.length > 0
    ? "\n\nCollected Sources (URL Context):\n" + Array.from(new Set(allSources)).map((u) => `- ${u}`).join("\n")
    : "";

  return combinedSummary + sourcesSection;
}

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
    {
      name: "research_or_scrape",
      description:
        "If URLs are provided, scrape them with URL Context. If a research query is provided, perform search → scrape URLs → evaluate gaps and iterate up to 5 times.",
      inputSchema: {
        type: "object",
        properties: {
          urls: {
            description: "Optional: one URL string or an array of URLs (max 20). If provided, search will be skipped and only scraping will run.",
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
          query: {
            type: "string",
            description: "Optional: research query. Used when URLs are not provided.",
          },
          instruction: {
            type: "string",
            description: "Optional instruction or task description",
          },
          model: {
            type: "string",
            description: "Gemini model id (e.g., gemini-2.5-flash)",
          },
          max_iterations: {
            type: "number",
            description: "Max search→scrape iterations (1-5). Default 5",
            minimum: 1,
            maximum: 5,
          },
        },
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
    if (name === "research_or_scrape") {
      const {
        urls: rawUrls,
        query,
        instruction,
        model,
        max_iterations,
      } = (args ?? {}) as {
        urls?: string | string[];
        query?: string;
        instruction?: string;
        model?: string;
        max_iterations?: number;
      };

      const urls = Array.isArray(rawUrls)
        ? rawUrls
        : typeof rawUrls === "string"
        ? [rawUrls]
        : [];

      if (urls.length > 0) {
        if (urls.length > 20) {
          throw new Error("Maximum of 20 URLs supported");
        }
        const text = await callGeminiUrlContext({ urls, instruction, model, useGoogleSearch: false });
        return { content: [{ type: "text", text }] };
      }

      if (!query || typeof query !== "string" || query.trim() === "") {
        throw new Error("Provide either 'urls' or a non-empty 'query'");
      }

      const text = await runResearchFlow({ query: query.trim(), instruction, model, maxIterations: max_iterations });
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


