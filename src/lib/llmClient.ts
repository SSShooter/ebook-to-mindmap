export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmConfig = {
  baseURL: string;
  apiKey?: string;
  model: string;
  temperature?: number;
  max_tokens?: number;
};

function normalizeBaseURL(raw: string) {
  let url = (raw || "").trim();
  if (!/^https?:\/\//i.test(url)) {
    if (/^:?\d{2,5}/.test(url))
      url = "http://localhost" + (url.startsWith(":") ? url : ":" + url);
    else if (url.startsWith("//")) url = "http:" + url;
    else url = "http://" + url;
  }
  return url.replace(/\/+$/, "");
}

async function tryOpenAI(cfg: LlmConfig, messages: ChatMessage[]) {
  const base = normalizeBaseURL(cfg.baseURL);
  const url = base.endsWith("/v1")
    ? `${base}/chat/completions`
    : `${base}/v1/chat/completions`;
  const body = {
    model: cfg.model,
    messages,
    temperature: typeof cfg.temperature === "number" ? cfg.temperature : 0.7,
    ...(cfg.max_tokens ? { max_tokens: cfg.max_tokens } : {}),
    stream: false,
    // 强制JSON响应
    response_format: { type: "json_object" },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (res.status === 404) return null;
  if (!res.ok)
    throw new Error(
      `OpenAI-compatible error ${res.status}: ${await res.text()}`
    );
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function tryOllamaNative(cfg: LlmConfig, messages: ChatMessage[]) {
  const base = normalizeBaseURL(cfg.baseURL).replace(/\/v1$/i, "");
  const url = `${base}/api/chat`;
  const body = {
    model: cfg.model,
    stream: false,
    options: {
      temperature: typeof cfg.temperature === "number" ? cfg.temperature : 0.7,
      ...(cfg.max_tokens ? { num_predict: cfg.max_tokens } : {}),
    },
    messages,
    // 为Ollama强制JSON响应
    format: "json",
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data?.message?.content ?? "";
}

export async function llmComplete(cfg: LlmConfig, messages: ChatMessage[]) {
  const a = await tryOpenAI(cfg, messages).catch((e) => {
    throw e;
  });
  if (a !== null) return a;
  return await tryOllamaNative(cfg, messages);
}

// 专门用于生成思维导图的函数，强制JSON格式
export async function llmCompleteMindMap(
  cfg: LlmConfig,
  content: string,
  customPrompt?: string
): Promise<string> {
  const mindMapPrompt = `Return ONLY valid JSON in this format:
{
  "nodeData": {
    "topic": "Main Topic",
    "id": "1",
    "children": [
      {
        "topic": "Subtopic 1",
        "id": "2",
        "children": [
          {"topic": "Detail A", "id": "3"},
          {"topic": "Detail B", "id": "4"}
        ]
      }
    ]
  }
}

Rules: Use incremental IDs, keep topics under 50 chars, 2-4 subtopics with 2-5 details each.

Content: ${content.slice(0, 1000)}
${customPrompt ? `Focus: ${customPrompt}` : ""}`;

  return await llmComplete(cfg, [{ role: "user", content: mindMapPrompt }]);
}
