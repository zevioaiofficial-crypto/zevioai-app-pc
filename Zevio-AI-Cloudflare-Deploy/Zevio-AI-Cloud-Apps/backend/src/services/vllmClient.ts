import { config } from "../config.js";
import { Response } from "express";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface VLLMChatOptions {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

export interface VLLMHealthStatus {
  isAvailable: boolean;
  activeModel: string;
  baseUrl: string;
  latencyMs: number;
  error?: string;
}

export class VLLMClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config.vllm.baseUrl;
    this.apiKey = config.vllm.apiKey;
  }

  public async checkHealth(): Promise<VLLMHealthStatus> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        signal: AbortSignal.timeout(6000)
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          isAvailable: false,
          activeModel: config.vllm.defaultModel,
          baseUrl: this.baseUrl,
          latencyMs,
          error: `vLLM server responded with HTTP status ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json() as { data?: Array<{ id: string }> };
      const modelId = data.data?.[0]?.id || config.vllm.defaultModel;

      return {
        isAvailable: true,
        activeModel: modelId,
        baseUrl: this.baseUrl,
        latencyMs
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        isAvailable: false,
        activeModel: config.vllm.defaultModel,
        baseUrl: this.baseUrl,
        latencyMs: Date.now() - startTime,
        error: `Could not connect to vLLM GPU inference server at ${this.baseUrl}. Details: ${errorMessage}`
      };
    }
  }

  public async streamChat(options: VLLMChatOptions, res: Response): Promise<void> {
    const targetModel = options.model || config.vllm.defaultModel;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: targetModel,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 4096,
          top_p: options.top_p ?? 0.9,
          stream: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        res.write(`data: ${JSON.stringify({ error: `vLLM Error (${response.status}): ${errorText}` })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      if (!response.body) {
        throw new Error("vLLM response body is empty");
      }

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
            res.write("data: [DONE]\n\n");
            continue;
          }

          try {
            const jsonStr = trimmed.replace(/^data:\s*/, "");
            const parsed = JSON.parse(jsonStr) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent !== undefined) {
              res.write(`data: ${JSON.stringify({ content: deltaContent })}\n\n`);
            }
          } catch (_) {
            // Ignore partial JSON chunks
          }
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.write(`data: ${JSON.stringify({
        error: `Inference server connection failed: ${msg}. Make sure your vLLM GPU instance is running at ${this.baseUrl}`
      })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }

  public async completeChat(options: VLLMChatOptions): Promise<string> {
    const targetModel = options.model || config.vllm.defaultModel;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: targetModel,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 4096,
        top_p: options.top_p ?? 0.9,
        stream: false
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`vLLM HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return data.choices?.[0]?.message?.content || "";
  }
}

export const vllmClient = new VLLMClient();

