import { StreamChatParams, StreamHomeworkParams, StreamCodeParams } from "./api";
import { HealthResponse } from "../types";

export const DEFAULT_AI_KEY = "";

export function getStoredApiKey(): string {
  try {
    const saved = localStorage.getItem("zevio_ai_api_key");
    if (saved && saved.trim()) return saved.trim();
  } catch (_) {}
  return DEFAULT_AI_KEY;
}

export function setStoredApiKey(key: string): void {
  try {
    localStorage.setItem("zevio_ai_api_key", key.trim());
  } catch (_) {}
}

export async function checkGeminiHealth(): Promise<HealthResponse> {
  const apiKey = getStoredApiKey();
  const startTime = Date.now();
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const latencyMs = Date.now() - startTime;
    if (!res.ok) {
      throw new Error(`Cloud API returned HTTP ${res.status}`);
    }
    const data = await res.json();
    const count = data.models?.length || 0;
    return {
      status: "ok",
      service: "Zevio AI Cloud Inference",
      environment: "production",
      timestamp: new Date().toISOString(),
      inference: {
        serverUrl: "https://generativelanguage.googleapis.com/v1beta",
        isOnline: true,
        activeModel: "gemini-3.5-flash-lite",
        latencyMs,
        error: undefined
      },
      models: [
        {
          id: "gemini-3.5-flash-lite",
          name: "Zevio 3.5 Flash-Lite (Fast)",
          category: "general",
          description: "High speed bilingual general model for Khmer and English",
          maxContext: 8192,
          recommendedFor: ["chat", "general", "translation"]
        },
        {
          id: "gemini-3.5-flash",
          name: "Zevio 3.5 Flash (Advanced)",
          category: "coder",
          description: "Advanced reasoning model for complex Math, Coding and Vision",
          maxContext: 16384,
          recommendedFor: ["code", "homework", "math", "vision"]
        }
      ]
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: "error",
      service: "Zevio AI Cloud Inference",
      environment: "production",
      timestamp: new Date().toISOString(),
      inference: {
        serverUrl: "https://generativelanguage.googleapis.com/v1beta",
        isOnline: false,
        activeModel: "gemini-3.5-flash-lite",
        latencyMs: 0,
        error: `Could not connect with provided API key: ${msg}`
      },
      models: []
    };
  }
}

export function sanitizeLanguage(text: string): string {
  if (!text) return text;
  return text
    .replace(/นี่/g, "នេះ")
    .replace(/คือ/g, "គឺ")
    .replace(/ครับ/g, "")
    .replace(/ค่ะ/g, "")
    .replace(/[\u0E00-\u0E7F]/g, "");
}

async function executeGeminiStream(
  models: string[],
  payload: any,
  apiKey: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> {
  let lastError = "";
  let quotaHit = false;

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        lastError = errText;
        if (res.status === 429 || errText.includes("429") || errText.includes("RESOURCE_EXHAUSTED") || errText.includes("quota")) {
          quotaHit = true;
          continue; // Try next fallback model
        }
        if (res.status === 404 || res.status >= 500) {
          continue;
        }
        onError(`Cloud API error ${res.status}: ${errText}`);
        return;
      }

      if (!res.body) continue;

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

          try {
            const jsonStr = trimmed.replace(/^data:\s*/, "");
            const parsed = JSON.parse(jsonStr);
            if (parsed.error) {
              if (parsed.error.code === 429 || parsed.error.status === "RESOURCE_EXHAUSTED") {
                quotaHit = true;
                break;
              }
              onError(parsed.error.message || "Unknown API error");
              return;
            }
            const candidate = parsed.candidates?.[0];
            const parts = candidate?.content?.parts;
            if (parts && Array.isArray(parts)) {
              for (const p of parts) {
                if (p.text) {
                  const clean = sanitizeLanguage(p.text);
                  if (clean) onChunk(clean);
                }
              }
            }
          } catch (_) {}
        }
      }

      onDone();
      return;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  if (quotaHit) {
    onError(
      "កូតាប្រើប្រាស់ប្រចាំថ្ងៃសម្រាប់ម៉ូឌែល Cloud AI ត្រូវបានប្រើប្រាស់ពេញ (Daily Quota Reached)។ សូមរង់ចាំមួយរយៈ ឬជ្រើសរើសប្រើប្រាស់ Ollama AI Model ជំនួសវិញ។"
    );
  } else {
    onError(`Cloud inference failed: ${lastError || "Could not connect to model"}`);
  }
}

export async function streamChatWithGemini(params: StreamChatParams): Promise<void> {
  const apiKey = getStoredApiKey();
  const primaryModel = params.model && params.model.includes("3.5-flash") && !params.model.includes("lite")
    ? "gemini-3.5-flash-lite"
    : "gemini-3.5-flash-lite";

  const modelsToTry = [
    primaryModel,
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash"
  ];

  // Separate system instruction from conversational messages
  const systemMsgs = params.messages.filter(m => m.role === "system");
  const baseInstruction = systemMsgs.length > 0 
    ? systemMsgs.map(m => m.content).join("\n") 
    : "You are Zevio AI, an advanced bilingual assistant fluent in Khmer and English. Assist users with questions, math, science, and coding in a helpful, accurate, and professional tone.";

  const systemInstructionText = `${baseInstruction}

CRITICAL LANGUAGE REQUIREMENT:
- Respond strictly in Khmer (ភាសាខ្មែរ) or English.
- NEVER use Thai language (ภาษาไทย) or Thai script under ANY circumstance.
- If the user prompt is in Khmer (ភាសាខ្មែរ), all your explanations, text, and greetings MUST be in pure Khmer (ភាសាខ្មែរ) or English. Do NOT confuse Khmer with Thai.`;

  const chatContents = params.messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

  if (chatContents.length === 0) {
    chatContents.push({ role: "user", parts: [{ text: "Hello" }] });
  }

  const payload = {
    systemInstruction: { parts: [{ text: systemInstructionText }] },
    contents: chatContents,
    generationConfig: {
      temperature: params.temperature ?? 0.7
    }
  };

  await executeGeminiStream(modelsToTry, payload, apiKey, params.onChunk, params.onDone, params.onError);
}

export async function streamHomeworkWithGemini(params: StreamHomeworkParams): Promise<void> {
  const apiKey = getStoredApiKey();
  const formData = params.formData;
  const prompt = (formData.get("question") as string) || (formData.get("prompt") as string) || "";
  const subject = (formData.get("subject") as string) || "general";
  const gradeLevel = (formData.get("grade") as string) || (formData.get("gradeLevel") as string) || "General";
  const file = formData.get("file") as File | null;

  const parts: Array<any> = [];

  // Check if image file was attached
  if (file && file.type.startsWith("image/")) {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        const b64 = res.split(",")[1] || "";
        resolve(b64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    parts.push({
      inlineData: {
        mimeType: file.type,
        data: base64Data
      }
    });
  }

  const promptText = `You are Zevio Homework Solver, an elite academic reasoning tutor for Grade 1–12 and University students.
Subject: ${subject}
Academic Grade: ${gradeLevel}

Problem Statement:
${prompt || (file ? "Please solve the problem shown in the attached homework file." : "Please solve the problem.")}

Instructions:
1. Provide a comprehensive, rigorous step-by-step solution.
2. Provide clear explanations in both Khmer (ភាសាខ្មែរ) and English so the student learns the concepts thoroughly.
3. CRITICAL LANGUAGE RULE: Respond strictly in Khmer (ភាសាខ្មែរ) or English. NEVER use Thai language (ภาษาไทย) or Thai script under ANY circumstance.
4. For ALL mathematical and scientific formulas, ALWAYS format in KaTeX LaTeX:
   - Use $...$ for inline equations (e.g. $ax^2 + bx + c = 0$, $\\Delta = b^2 - 4ac$, $x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$).
   - Use $$...$$ for display equations.
5. Clearly state the Given values, Formulas Used, Detailed Algebraic Steps, and final conclusion with units.
6. Highlight the final answer clearly in bold.`;

  parts.push({ text: promptText });

  const payload = {
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 0.3 }
  };

  const modelsToTry = [
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash"
  ];

  await executeGeminiStream(modelsToTry, payload, apiKey, params.onChunk, params.onDone, params.onError);
}

export async function streamCodeWithGemini(params: StreamCodeParams): Promise<void> {
  const apiKey = getStoredApiKey();
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
    systemInstruction: {
      parts: [{
        text: `You are Zevio Code Studio, an expert AI software engineer for Khmer and English developers.
RULE 1: When user asks to generate or write code, respond ONLY with the markdown code block. Do NOT include ANY introductory greeting, conversational text, or polite filler before or after the code block.
RULE 2: Absolutely ZERO Thai language (ภาษาไทย) or Thai script (\\u0E00-\\u0E7F). If any text is written, it MUST be Khmer (ភាសាខ្មែរ) or English.`
      }]
    },
    contents: [{ role: "user", parts: [{ text: promptText }] }],
    generationConfig: { temperature: 0.1 }
  };

  const modelsToTry = [
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash"
  ];

  await executeGeminiStream(modelsToTry, payload, apiKey, params.onChunk, params.onDone, params.onError);
}
