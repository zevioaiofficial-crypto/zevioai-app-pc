import { Router, Request, Response } from "express";
import { vllmClient, ChatMessage } from "../services/vllmClient.js";
import { modelManager } from "../services/modelManager.js";

const router = Router();

const DEFAULT_SYSTEM_PROMPT = `You are Zevio AI, an advanced, highly capable open-source AI assistant powered by self-hosted open-weight language models.
You are fully fluent in both Khmer (ភាសាខ្មែរ) and English.
Guidelines:
1. Always respond in the language the user speaks to you (Khmer or English). When responding in Khmer, write natural, grammatically correct, and respectful Khmer.
2. Provide clear, direct, and well-structured answers using clean Markdown formatting.
3. For mathematical equations, write standard LaTeX syntax enclosed in $...$ for inline math and $$...$$ for display math.
4. For programming tasks, provide clean, idiomatic, and secure code blocks with language identifiers.
5. Maintain honesty, precision, and helpfulness at all times.`;

router.post("/stream", async (req: Request, res: Response) => {
  const { messages, model, temperature, max_tokens, systemPrompt } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "Messages array is required." });
    return;
  }

  const selectedModel = modelManager.resolveModelForTask("chat", model);

  const formattedMessages: ChatMessage[] = [
    {
      role: "system",
      content: systemPrompt || DEFAULT_SYSTEM_PROMPT
    },
    ...messages.map((m: { role: "system" | "user" | "assistant"; content: string }) => ({
      role: m.role,
      content: m.content
    }))
  ];

  await vllmClient.streamChat(
    {
      model: selectedModel,
      messages: formattedMessages,
      temperature: typeof temperature === "number" ? temperature : 0.7,
      max_tokens: typeof max_tokens === "number" ? max_tokens : 4096
    },
    res
  );
});

router.post("/complete", async (req: Request, res: Response) => {
  const { messages, model, temperature, max_tokens, systemPrompt } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "Messages array is required." });
    return;
  }

  const selectedModel = modelManager.resolveModelForTask("chat", model);

  try {
    const formattedMessages: ChatMessage[] = [
      {
        role: "system",
        content: systemPrompt || DEFAULT_SYSTEM_PROMPT
      },
      ...messages.map((m: { role: "system" | "user" | "assistant"; content: string }) => ({
        role: m.role,
        content: m.content
      }))
    ];

    const content = await vllmClient.completeChat({
      model: selectedModel,
      messages: formattedMessages,
      temperature: typeof temperature === "number" ? temperature : 0.7,
      max_tokens: typeof max_tokens === "number" ? max_tokens : 4096
    });

    res.json({ content, model: selectedModel });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: msg });
  }
});

export default router;

