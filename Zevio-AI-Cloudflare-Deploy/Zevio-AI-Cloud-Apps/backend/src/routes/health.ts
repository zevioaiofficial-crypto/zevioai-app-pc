import { Router, Request, Response } from "express";
import { vllmClient } from "../services/vllmClient.js";
import { modelManager } from "../services/modelManager.js";
import { config } from "../config.js";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const vllmStatus = await vllmClient.checkHealth();
  const models = modelManager.getAvailableModels();

  res.json({
    status: "ok",
    service: "Zevio AI Backend",
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
    inference: {
      serverUrl: config.vllm.baseUrl,
      isOnline: vllmStatus.isAvailable,
      activeModel: vllmStatus.activeModel,
      latencyMs: vllmStatus.latencyMs,
      error: vllmStatus.error || null
    },
    models
  });
});

export default router;

