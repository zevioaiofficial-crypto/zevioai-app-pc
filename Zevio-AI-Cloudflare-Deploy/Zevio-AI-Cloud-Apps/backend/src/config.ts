import dotenv from "dotenv";

dotenv.config();

export interface ZevioConfig {
  port: number;
  nodeEnv: string;
  aiApiKey: string;
  vllm: {
    baseUrl: string;
    apiKey: string;
    defaultModel: string;
    coderModel: string;
    mathModel: string;
    visionModel: string;
  };
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
}

export const config: ZevioConfig = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  aiApiKey: process.env.AI_API_KEY || "",
  vllm: {
    baseUrl: (process.env.VLLM_BASE_URL || "http://localhost:8000/v1").replace(/\/+$/, ""),
    apiKey: process.env.VLLM_API_KEY || "EMPTY",
    defaultModel: process.env.DEFAULT_MODEL || "gemini-3.5-flash-lite",
    coderModel: process.env.CODER_MODEL || "gemini-3.5-flash",
    mathModel: process.env.MATH_MODEL || "gemini-3.5-flash",
    visionModel: process.env.VISION_MODEL || "gemini-3.5-flash"
  },
  supabase: {
    url: process.env.SUPABASE_URL || "",
    anonKey: process.env.SUPABASE_ANON_KEY || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  }
};

