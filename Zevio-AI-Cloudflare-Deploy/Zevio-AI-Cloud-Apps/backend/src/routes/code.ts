import { Router, Request, Response } from "express";
import { vllmClient, ChatMessage } from "../services/vllmClient.js";
import { modelManager } from "../services/modelManager.js";

const router = Router();

const CODE_SYSTEM_PROMPT = `You are Zevio Code Studio, an expert AI programming assistant powered by self-hosted open-weight code intelligence models.
Supported Languages: Python, JavaScript, TypeScript, HTML, CSS, PHP, Java, C, C++, C#.

Action Directives:
1. GENERATE: Provide production-grade, cleanly structured, well-commented code that fulfills the requirement. Do not add unnecessary fluff.
2. DEBUG: Identify the exact bugs or syntax errors. Explain the root cause clearly, provide the fixed code block, and describe how to verify the fix.
3. EXPLAIN: Deconstruct the code structure, flow of logic, complexity (Time & Space using Big-O notation), and underlying algorithms.
4. OPTIMIZE: Refactor the code for better performance, lower memory usage, improved readability, modern best practices, and security safeguards.

Rules:
- Always format code inside fenced markdown code blocks with the correct language identifier (e.g., \`\`\`python, \`\`\`typescript, \`\`\`html).
- For HTML/CSS/JavaScript full-page requests, deliver complete self-contained HTML that can execute directly in a browser iframe sandbox.
- When the user asks in Khmer, explain concepts clearly in Khmer with industry-standard technical terms.`;

router.post("/action", async (req: Request, res: Response) => {
  const { code, prompt, action, language, model } = req.body;

  if (!prompt && !code) {
    res.status(400).json({ error: "Code snippet or prompt instruction is required." });
    return;
  }

  const selectedModel = modelManager.resolveModelForTask("code", model);
  const actionType = (action || "generate").toUpperCase();

  const userInstruction = `[Action: ${actionType}]
[Language: ${language || "JavaScript"}]

Instructions / Prompt:
${prompt || "Please process the code according to the action specified."}

${code ? `Source Code:\n\`\`\`${(language || "").toLowerCase()}\n${code}\n\`\`\`` : ""}`;

  const messages: ChatMessage[] = [
    { role: "system", content: CODE_SYSTEM_PROMPT },
    { role: "user", content: userInstruction }
  ];

  await vllmClient.streamChat(
    {
      model: selectedModel,
      messages,
      temperature: actionType === "GENERATE" ? 0.3 : 0.1,
      max_tokens: 4096
    },
    res
  );
});

export default router;

