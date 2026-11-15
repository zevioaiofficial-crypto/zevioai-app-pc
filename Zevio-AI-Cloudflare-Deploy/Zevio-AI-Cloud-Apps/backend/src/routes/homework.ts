import { Router, Request, Response } from "express";
import multer from "multer";
import { vllmClient, ChatMessage } from "../services/vllmClient.js";
import { modelManager } from "../services/modelManager.js";
import { fileProcessor } from "../services/fileProcessor.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

const HOMEWORK_SYSTEM_PROMPT = `You are Zevio Homework Solver, an elite academic reasoning tutor powered by self-hosted open-weight AI models.
You assist students across Grade 1 to Grade 12 and University level.
Supported Subjects:
- Mathematics (Algebra, Geometry, Trigonometry, Calculus, Statistics, Linear Algebra)
- Physics (Mechanics, Thermodynamics, Electromagnetism, Optics, Quantum)
- Chemistry (Stoichiometry, Periodic Table, Organic, Inorganic, Electrochemistry)
- Biology (Cell Biology, Genetics, Physiology, Ecology)
- English (Grammar, Reading Comprehension, Essays, Vocabulary)
- Khmer (វេយ្យាករណ៍, អក្សរសាស្ត្រ, សំណេរ, តែងសេចក្តី)

Output Format Instructions:
1. State the Subject and Topic clearly.
2. Given Information & Formulas: List the known variables and theoretical principles required.
3. Step-by-Step Solution: Break down the reasoning into clear numbered steps. Show every algebraic and numerical step clearly.
4. Equations: Wrap all formulas and equations in KaTeX LaTeX format ($...$ for inline, $$...$$ for display math blocks).
5. Final Conclusion / Answer: Highlight the final result with units and explanation.
6. Language: Match the language of the prompt or problem (Khmer or English). Ensure high academic accuracy.`;

router.post("/solve", upload.single("file"), async (req: Request, res: Response) => {
  const { question, subject, grade, language, model } = req.body;

  if (!question && !req.file) {
    res.status(400).json({ error: "Please provide a question or upload a homework file." });
    return;
  }

  let fileContext = "";
  let base64ImageUrl: string | undefined;

  if (req.file) {
    try {
      const processed = await fileProcessor.processFile(req.file);
      if (processed.extractedText) {
        fileContext = `\n\n[Uploaded Document Content (${processed.originalName})]:\n${processed.extractedText}\n`;
      } else if (processed.base64DataUrl) {
        base64ImageUrl = processed.base64DataUrl;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: msg });
      return;
    }
  }

  const taskType = base64ImageUrl ? "vision" : (subject?.toLowerCase() === "mathematics" ? "math" : "chat");
  const selectedModel = modelManager.resolveModelForTask(taskType, model);

  const userPrompt = `[Academic Level: ${grade || "Not specified"}]
[Subject: ${subject || "General"}]
[Language: ${language || "Khmer & English"}]

Student Problem:
${question || "Please solve the problem in the attached file."}
${fileContext}`;

  let userContent: ChatMessage["content"];
  if (base64ImageUrl) {
    userContent = [
      { type: "text", text: userPrompt },
      { type: "image_url", image_url: { url: base64ImageUrl } }
    ];
  } else {
    userContent = userPrompt;
  }

  const messages: ChatMessage[] = [
    { role: "system", content: HOMEWORK_SYSTEM_PROMPT },
    { role: "user", content: userContent }
  ];

  await vllmClient.streamChat(
    {
      model: selectedModel,
      messages,
      temperature: 0.2, // Low temperature for high precision homework solving
      max_tokens: 4096
    },
    res
  );
});

export default router;

