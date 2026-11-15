const CHAT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const CHAT_SYSTEM = `You are Zevio AI, a helpful bilingual Khmer and English assistant.
Reply in the language used by the user. Use clear Markdown. Be accurate and explain uncertainty.
For schoolwork, teach step by step rather than only giving an answer.`;

const HOMEWORK_SYSTEM = `You are Zevio Homework Solver, a patient academic tutor for school and university subjects.
Reply in the user's language (Khmer or English). Identify the subject and topic, list useful known information and formulas, explain the solution step by step, and clearly state the final answer with units.`;

const CODE_SYSTEM = `You are Zevio Code Studio, an expert programming assistant.
Help generate, debug, explain, and improve code. Give secure, idiomatic solutions and use fenced code blocks with language labels. Explain in Khmer when the user writes Khmer.`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function sse(content, status = 200) {
  const body = `data: ${JSON.stringify({ content })}\n\ndata: [DONE]\n\n`;
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-content-type-options": "nosniff"
    }
  });
}

async function runAI(env, messages, temperature = 0.6, max_tokens = 2048) {
  const result = await env.AI.run(CHAT_MODEL, {
    messages,
    temperature,
    max_tokens,
    stream: false
  });
  const answer = result && typeof result.response === "string" ? result.response : "";
  if (!answer) throw new Error("The AI model returned an empty response.");
  return answer;
}

async function handle(request, env) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (url.pathname === "/api/health" && request.method === "GET") {
    return json({
      status: "ok",
      service: "Zevio AI on Cloudflare Workers AI",
      environment: "production",
      timestamp: new Date().toISOString(),
      inference: {
        serverUrl: "Cloudflare Workers AI",
        isOnline: true,
        activeModel: CHAT_MODEL
      },
      models: [
        { id: CHAT_MODEL, name: "Llama 3.3 70B", category: "general", description: "Cloudflare-hosted general assistant", maxContext: 24000, recommendedFor: ["Chat", "Homework", "Code"] }
      ]
    });
  }

  if (request.method !== "POST") return json({ error: "Not found" }, 404);

  try {
    if (url.pathname === "/api/chat/stream") {
      const body = await request.json();
      if (!Array.isArray(body.messages) || body.messages.length === 0) {
        return json({ error: "Messages array is required." }, 400);
      }
      const messages = [
        { role: "system", content: body.systemPrompt || CHAT_SYSTEM },
        ...body.messages.map(m => ({
          role: ["user", "assistant", "system"].includes(m.role) ? m.role : "user",
          content: String(m.content ?? "")
        }))
      ];
      return sse(await runAI(env, messages, Number(body.temperature) || 0.6, 3072));
    }

    if (url.pathname === "/api/homework/solve") {
      const form = await request.formData();
      const question = String(form.get("question") || "");
      const subject = String(form.get("subject") || "General");
      const grade = String(form.get("grade") || "Not specified");
      const language = String(form.get("language") || "Khmer and English");
      const file = form.get("file");
      let attachmentNote = "";
      if (file && typeof file === "object" && "name" in file && file.size > 0) {
        const type = file.type || "unknown";
        if (type.startsWith("text/") || type === "application/json") {
          const text = (await file.text()).slice(0, 12000);
          attachmentNote = `\n\nUploaded file (${file.name}):\n${text}`;
        } else {
          attachmentNote = `\n\nThe user attached ${file.name} (${type}). This Cloudflare starter endpoint currently cannot extract this file type. Ask the user to paste the question text.`;
        }
      }
      if (!question && !attachmentNote) {
        return json({ error: "Please provide a question or upload a file." }, 400);
      }
      const prompt = `[Grade: ${grade}]\n[Subject: ${subject}]\n[Language: ${language}]\n\nStudent question:\n${question}${attachmentNote}`;
      return sse(await runAI(env, [
        { role: "system", content: HOMEWORK_SYSTEM },
        { role: "user", content: prompt }
      ], 0.2, 3072));
    }

    if (url.pathname === "/api/code/action") {
      const body = await request.json();
      if (!body.prompt && !body.code) {
        return json({ error: "Code snippet or prompt instruction is required." }, 400);
      }
      const prompt = `[Action: ${String(body.action || "generate")}]\n[Language: ${String(body.language || "JavaScript")}]\n\nInstruction:\n${String(body.prompt || "")}\n\n${body.code ? `Source code:\n\`\`\`${String(body.language || "")}\n${String(body.code)}\n\`\`\`` : ""}`;
      return sse(await runAI(env, [
        { role: "system", content: CODE_SYSTEM },
        { role: "user", content: prompt }
      ], 0.2, 3072));
    }

    return json({ error: "API route not found." }, 404);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "AI request failed." }, 502);
  }
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization",
    "vary": "Origin"
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      const response = await handle(request, env);
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(corsHeaders(request))) headers.set(key, value);
      return new Response(response.body, { status: response.status, headers });
    }
    return env.ASSETS.fetch(request);
  }
};
