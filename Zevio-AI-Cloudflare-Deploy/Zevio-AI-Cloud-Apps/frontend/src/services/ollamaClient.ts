import { StreamChatParams, StreamHomeworkParams, StreamCodeParams } from "./api";
import { HealthResponse, ModelProfile } from "../types";

export const DEFAULT_OLLAMA_KEY = "";
export const OLLAMA_BASE_URL = "https://ollama.com";

export function getStoredOllamaKey(): string {
  try {
    const saved = localStorage.getItem("zevio_ollama_key");
    if (saved && saved.trim()) return saved.trim();
  } catch (_) {}
  return DEFAULT_OLLAMA_KEY;
}

export function setStoredOllamaKey(key: string): void {
  try {
    localStorage.setItem("zevio_ollama_key", key.trim());
  } catch (_) {}
}

export const OLLAMA_FEATURED_MODELS: ModelProfile[] = [
  {
    id: "ollama:glm-5.3-flash",
    name: "Ollama: GLM 5.3 Flash",
    category: "general",
    description: "High performance bilingual general reasoning model on Ollama Cloud",
    maxContext: 32768,
    recommendedFor: ["chat", "general", "translation"]
  },
  {
    id: "ollama:deepseek-v4.1-flash",
    name: "Ollama: DeepSeek V4.1 Flash",
    category: "general",
    description: "Advanced deep reasoning model for complex questions on Ollama Cloud",
    maxContext: 65536,
    recommendedFor: ["chat", "math", "reasoning"]
  },
  {
    id: "ollama:kimi-k2.7-code",
    name: "Ollama: Kimi K2.7 Code",
    category: "coder",
    description: "Specialized coding and architecture model on Ollama Cloud",
    maxContext: 65536,
    recommendedFor: ["code", "debugging", "architecture"]
  },
  {
    id: "ollama:gemma4:31b",
    name: "Ollama: Gemma 4 31B",
    category: "general",
    description: "Large open weights model hosted on Ollama Cloud",
    maxContext: 32768,
    recommendedFor: ["chat", "general", "academic"]
  },
  {
    id: "ollama:mistral-large-4",
    name: "Ollama: Mistral Large 4",
    category: "general",
    description: "Frontier reasoning and multivariable analysis on Ollama Cloud",
    maxContext: 32768,
    recommendedFor: ["chat", "analysis"]
  },
  {
    id: "ollama:minimax-m3.1-flash",
    name: "Ollama: MiniMax M3.1 Flash",
    category: "general",
    description: "Ultra-fast response model on Ollama Cloud",
    maxContext: 16384,
    recommendedFor: ["chat", "fast"]
  }
];

export async function checkOllamaHealth(): Promise<{ isOnline: boolean; latencyMs: number; error?: string }> {
  const apiKey = getStoredOllamaKey();
  const startTime = Date.now();
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      signal: AbortSignal.timeout(6000)
    });
    const latencyMs = Date.now() - startTime;
    if (res.ok) {
      return { isOnline: true, latencyMs };
    }
    return { isOnline: false, latencyMs, error: `Ollama Cloud HTTP ${res.status}` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { isOnline: false, latencyMs: 0, error: msg };
  }
}

export function cleanOllamaModelId(modelId?: string): string {
  if (!modelId) return "glm-5.3-flash";
  return modelId.replace(/^ollama:/, "");
}

export async function streamChatWithOllama(params: StreamChatParams): Promise<void> {
  const apiKey = getStoredOllamaKey();
  const rawModel = cleanOllamaModelId(params.model);

  const messages = params.messages.map((m) => ({
    role: m.role,
    content: m.content
  }));

  const payload = {
    model: rawModel,
    messages,
    stream: true,
    temperature: params.temperature ?? 0.7
  };

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      if (res.status === 402) {
        throw new Error("OLLAMA_PAYMENT_REQUIRED");
      }
      const errText = await res.text();
      throw new Error(`Ollama Cloud error ${res.status}: ${errText}`);
    }

    if (!res.body) {
      throw new Error("Response body is empty.");
    }

    const reader = res.body.getReader();
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
          const deltaContent = parsed.choices?.[0]?.delta?.content;
          if (deltaContent) {
            params.onChunk(deltaContent);
          }
        } catch (_) {}
      }
    }

    params.onDone();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("OLLAMA_PAYMENT_REQUIRED")) {
      params.onError("Ollama Cloud 402: Payment or usage credits required on ollama.com. Please check your Ollama billing or switch model to Zevio 3.5 Flash.");
    } else {
      params.onError(`Ollama Cloud error: ${msg}`);
    }
  }
}

export async function streamHomeworkWithOllama(params: StreamHomeworkParams): Promise<void> {
  const apiKey = getStoredOllamaKey();
  const formData = params.formData;
  const prompt = (formData.get("question") as string) || (formData.get("prompt") as string) || "";
  const subject = (formData.get("subject") as string) || "general";
  const gradeLevel = (formData.get("grade") as string) || (formData.get("gradeLevel") as string) || "General";

  const promptText = `You are Zevio Homework Solver, an elite academic reasoning tutor powered by Ollama AI for Grade 1–12 and University students.
Subject: ${subject}
Academic Grade: ${gradeLevel}

Problem Statement:
${prompt || "Please solve the problem step-by-step."}

Instructions:
1. Provide a comprehensive, rigorous step-by-step solution.
2. Provide clear bilingual explanations in Khmer (ភាសាខ្មែរ) and English so the student learns the concepts thoroughly.
3. CRITICAL LANGUAGE RULE: Respond strictly in Khmer (ភាសាខ្មែរ) or English. NEVER use Thai language (ภาษาไทย) or Thai script under ANY circumstance.
4. For ALL mathematical and scientific formulas, ALWAYS format in KaTeX LaTeX:
   - Use $...$ for inline equations (e.g. $ax^2 + bx + c = 0$, $\\Delta = b^2 - 4ac$, $x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$).
   - Use $$...$$ for display equations.
4. Clearly state the Given values, Formulas Used, Detailed Algebraic Steps, and final conclusion with units.
5. Highlight the final answer clearly in bold.`;

  const payload = {
    model: "glm-5.3-flash",
    messages: [
      { role: "system", content: "You are an elite bilingual academic solver for Khmer and English." },
      { role: "user", content: promptText }
    ],
    stream: true,
    temperature: 0.3
  };

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      if (res.status === 402) {
        throw new Error("OLLAMA_PAYMENT_REQUIRED");
      }
      const errText = await res.text();
      throw new Error(`Ollama Cloud error ${res.status}: ${errText}`);
    }

    if (!res.body) {
      throw new Error("Response body is empty.");
    }

    const reader = res.body.getReader();
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
          const deltaContent = parsed.choices?.[0]?.delta?.content;
          if (deltaContent) {
            params.onChunk(deltaContent);
          }
        } catch (_) {}
      }
    }

    params.onDone();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("OLLAMA_PAYMENT_REQUIRED")) {
      params.onError("Ollama Cloud 402: Payment required on ollama.com. Switching to Zevio 3.5 Flash Engine is recommended.");
    } else {
      params.onError(`Ollama Cloud error: ${msg}`);
    }
  }
}

export async function streamCodeWithOllama(params: StreamCodeParams): Promise<void> {
  const apiKey = getStoredOllamaKey();
  const promptText = `You are Zevio Code Studio, an expert AI software engineer.
Language: ${params.language}
Action: ${params.action}
User instructions: ${params.prompt}
${params.code ? `Existing Code:\n\`\`\`${params.language}\n${params.code}\n\`\`\`` : ""}

Instructions:
- If action is "generate": Generate clean, idiomatic, fully functional ${params.language} code.
- If action is "debug": Identify bugs, explain the root cause, and provide fixed code.
- If action is "explain": Provide clear step-by-step breakdown of how the code works.
- If action is "optimize": Improve performance, readability, and security.
- Always include the complete executable code inside markdown code fences (\`\`\`${params.language} ... \`\`\`).
- CRITICAL LANGUAGE RULE: Respond ONLY in Khmer (ភាសាខ្មែរ) or English. NEVER generate Thai language (ภาษาไทย) or Thai script under ANY circumstance. Any introductory text, comments, or explanations must be strictly in Khmer or English. Do NOT confuse Khmer with Thai.`;

  const payload = {
    model: cleanOllamaModelId(params.model) || "kimi-k2.7-code",
    messages: [
      { role: "system", content: "You are an elite coding assistant." },
      { role: "user", content: promptText }
    ],
    stream: true,
    temperature: 0.2
  };

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      if (res.status === 402) {
        throw new Error("OLLAMA_PAYMENT_REQUIRED");
      }
      const errText = await res.text();
      throw new Error(`Ollama Cloud error ${res.status}: ${errText}`);
    }

    if (!res.body) {
      throw new Error("Response body is empty.");
    }

    const reader = res.body.getReader();
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
          const deltaContent = parsed.choices?.[0]?.delta?.content;
          if (deltaContent) {
            params.onChunk(deltaContent);
          }
        } catch (_) {}
      }
    }

    params.onDone();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("OLLAMA_PAYMENT_REQUIRED")) {
      params.onError("Ollama Cloud 402: Payment required on ollama.com. Switching to Zevio 3.5 Flash Engine is recommended.");
    } else {
      params.onError(`Ollama Code error: ${msg}`);
    }
  }
}

