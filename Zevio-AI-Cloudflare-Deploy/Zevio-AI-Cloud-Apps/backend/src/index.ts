import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { config } from "./config.js";
import { createRateLimiter } from "./middleware/rateLimiter.js";
import { optionalAuth } from "./middleware/auth.js";
import healthRouter from "./routes/health.js";
import chatRouter from "./routes/chat.js";
import homeworkRouter from "./routes/homework.js";
import codeRouter from "./routes/code.js";

const app = express();

// Security and CORS configuration
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Body parsers with generous limits for code and document uploads
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Rate limiting (60 requests per minute per IP)
app.use(createRateLimiter(60000, 60));

// Optional Supabase session auth
app.use(optionalAuth);

// API Routes
app.use("/api/health", healthRouter);
app.use("/api/chat", chatRouter);
app.use("/api/homework", homeworkRouter);
app.use("/api/code", codeRouter);

// Serve Frontend Static Build if present
const possibleDistPaths = [
  path.resolve(process.cwd(), "../frontend/dist"),
  path.resolve(process.cwd(), "frontend/dist"),
  path.resolve(process.cwd(), "dist/frontend")
];

let frontendDistPath: string | null = null;
for (const p of possibleDistPaths) {
  if (fs.existsSync(p)) {
    frontendDistPath = p;
    break;
  }
}

if (frontendDistPath) {
  app.use(express.static(frontendDistPath));
  app.get("*", (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(frontendDistPath!, "index.html"));
  });
} else {
  // Root API metadata route
  app.get("/", (_req: Request, res: Response) => {
    res.json({
      service: "Zevio AI Platform Backend",
      version: "1.0.0",
      inferenceEngine: "vLLM (Open-Source Models: Qwen2.5)",
      endpoints: {
        health: "/api/health",
        chatStream: "/api/chat/stream",
        chatComplete: "/api/chat/complete",
        homeworkSolve: "/api/homework/solve",
        codeAction: "/api/code/action"
      }
    });
  });
}

// Centralized error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const errorMessage = err instanceof Error ? err.message : String(err);
  console.error("Unhandled Server Error:", errorMessage);
  res.status(500).json({
    error: "Internal server error occurred.",
    details: config.nodeEnv === "development" ? errorMessage : undefined
  });
});

const server = app.listen(config.port, () => {
  console.log(`[Zevio AI Backend] Server running on port ${config.port}`);
  console.log(`[Zevio AI Backend] Target vLLM Inference Server: ${config.vllm.baseUrl}`);
});

process.on("SIGTERM", () => {
  console.log("[Zevio AI Backend] Shutting down gracefully...");
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  console.log("[Zevio AI Backend] Shutting down gracefully...");
  server.close(() => process.exit(0));
});
