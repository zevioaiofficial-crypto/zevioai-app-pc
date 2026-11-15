import { HealthResponse, ModelProfile } from "../types";
import {
  checkGeminiHealth,
  streamChatWithGemini,
  streamHomeworkWithGemini,
  streamCodeWithGemini
} from "./geminiClient";
import {
  OLLAMA_FEATURED_MODELS,
  checkOllamaHealth,
  streamChatWithOllama,
  streamHomeworkWithOllama,
  streamCodeWithOllama
} from "./ollamaClient";

export function getApiBaseUrl(): string {
  try {
    const custom = localStorage.getItem("zevio_api_base_url");
    if (custom && custom.trim()) return custom.trim().replace(/\\/+$/, "");
  } catch (_) {}

  const buildTimeUrl = (import.meta as any).env?.VITE_ZEVIO_API_URL;
  if (typeof buildTimeUrl === "string" && buildTimeUrl.trim()) {
    return buildTimeUrl.trim().replace(/\\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const runtimeUrl = (window as any).ZEVIO_API_URL;
    if (typeof runtimeUrl === "string" && runtimeUrl.trim()) {
      return runtimeUrl.trim().replace(/\\/+$/, "");
    }
    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
      return window.location.origin;
    }
  }
  return "";
}

export function setApiBaseUrl(url: string): void {
  try {
    localStorage.setItem("zevio_api_base_url", url.trim());
  } catch (_) {}
}

export async function getHealthStatus(): Promise<HealthResponse> {
  const customBase = getApiBaseUrl();
  if (customBase) {
    try {
      const res = await fetch(`${customBase}/api/health`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        return await res.json();
      }
    } catch (_) {}
  }

  // Check both Gemini and Ollama Cloud
  const [cloudHealth, ollamaHealth] = await Promise.all([
    checkGeminiHealth(),
    checkOllamaHealth()
  ]);

  const combinedModels: ModelProfile[] = [
    ...(cloudHealth.models || []),
    ...OLLAMA_FEATURED_MODELS
  ];

  if (cloudHealth.status === "ok") {
    return {
      ...cloudHealth,
      inference: {
        ...cloudHealth.inference,
        error: ollamaHealth.error ? `Ollama Cloud Notice: ${ollamaHealth.error}` : undefined
      },
      models: combinedModels
    };
  }

  return {
    status: ollamaHealth.isOnline ? "ok" : "error",
    service: "Zevio AI Engine (Multi-Cloud: Gemini & Ollama)",
    environment: "production",
    timestamp: new Date().toISOString(),
    inference: {
      serverUrl: "https://ollama.com/v1",
      isOnline: ollamaHealth.isOnline,
      activeModel: "ollama:glm-5.3-flash",
      latencyMs: ollamaHealth.latencyMs,
      error: ollamaHealth.error || cloudHealth.inference?.error || "Could not connect to inference engine"
    },
    models: combinedModels
  };
}

export interface StreamChatParams {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export async function streamChatAPI(params: StreamChatParams): Promise<void> {
  const customBase = getApiBaseUrl();
  if (customBase) {
    try {
      const response = await fetch(`${customBase}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: params.messages,
          model: params.model,
          temperature: params.temperature ?? 0.7
        })
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;

            if (trimmed === "data: [DONE]") {
              params.onDone();
              return;
            }

            try {
              const jsonStr = trimmed.replace(/^data:\s*/, "");
              const parsed = JSON.parse(jsonStr);
              if (parsed.error) {
                if (
                  parsed.error.includes("User location") ||
                  parsed.error.includes("FAILED_PRECONDITION") ||
                  parsed.error.includes("429") ||
                  parsed.error.includes("quota")
                ) {
                  await streamChatWithGemini(params);
                  return;
                }
                params.onError(parsed.error);
                return;
              }
              if (parsed.content) {
                params.onChunk(parsed.content);
              }
            } catch (_) {}
          }
        }
        params.onDone();
        return;
      }
    } catch (_) {}
  }

  // Route to Ollama if an Ollama model is selected
  if (params.model && params.model.startsWith("ollama:")) {
    await streamChatWithOllama(params);
    return;
  }

  // Direct cloud API streaming with configured Gemini key
  await streamChatWithGemini(params);
}

export interface StreamHomeworkParams {
  formData: FormData;
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export async function streamHomeworkAPI(params: StreamHomeworkParams): Promise<void> {
  const customBase = getApiBaseUrl();
  if (customBase) {
    try {
      const response = await fetch(`${customBase}/api/homework/solve`, {
        method: "POST",
        body: params.formData
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;

            if (trimmed === "data: [DONE]") {
              params.onDone();
              return;
            }

            try {
              const jsonStr = trimmed.replace(/^data:\s*/, "");
              const parsed = JSON.parse(jsonStr);
              if (parsed.error) {
                if (
                  parsed.error.includes("User location") ||
                  parsed.error.includes("FAILED_PRECONDITION") ||
                  parsed.error.includes("429") ||
                  parsed.error.includes("quota")
                ) {
                  await streamHomeworkWithGemini(params);
                  return;
                }
                params.onError(parsed.error);
                return;
              }
              if (parsed.content) {
                params.onChunk(parsed.content);
              }
            } catch (_) {}
          }
        }
        params.onDone();
        return;
      }
    } catch (_) {}
  }

  const model = params.formData.get("model") as string | null;
  if (model && model.startsWith("ollama:")) {
    await streamHomeworkWithOllama(params);
    return;
  }

  // Direct cloud API streaming with Gemini
  await streamHomeworkWithGemini(params);
}

export interface StreamCodeParams {
  code?: string;
  prompt: string;
  action: string;
  language: string;
  model?: string;
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export async function streamCodeAPI(params: StreamCodeParams): Promise<void> {
  const customBase = getApiBaseUrl();
  if (customBase) {
    try {
      const response = await fetch(`${customBase}/api/code/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: params.code,
          prompt: params.prompt,
          action: params.action,
          language: params.language,
          model: params.model
        })
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;

            if (trimmed === "data: [DONE]") {
              params.onDone();
              return;
            }

            try {
              const jsonStr = trimmed.replace(/^data:\s*/, "");
              const parsed = JSON.parse(jsonStr);
              if (parsed.error) {
                if (
                  parsed.error.includes("User location") ||
                  parsed.error.includes("FAILED_PRECONDITION") ||
                  parsed.error.includes("429") ||
                  parsed.error.includes("quota")
                ) {
                  await streamCodeWithGemini(params);
                  return;
                }
                params.onError(parsed.error);
                return;
              }
              if (parsed.content) {
                params.onChunk(parsed.content);
              }
            } catch (_) {}
          }
        }
        params.onDone();
        return;
      }
    } catch (_) {}
  }

  // Route to Ollama if an Ollama model is selected
  if (params.model && params.model.startsWith("ollama:")) {
    await streamCodeWithOllama(params);
    return;
  }

  // Direct cloud API streaming with Gemini
  await streamCodeWithGemini(params);
}
