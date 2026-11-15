import { config } from "../config.js";

export interface ModelProfile {
  id: string;
  name: string;
  category: "general" | "coder" | "math" | "vision";
  description: string;
  maxContext: number;
  recommendedFor: string[];
}

export class ModelManager {
  private activeGeneralModel: string;
  private activeCoderModel: string;
  private activeMathModel: string;
  private activeVisionModel: string;

  constructor() {
    this.activeGeneralModel = config.vllm.defaultModel;
    this.activeCoderModel = config.vllm.coderModel;
    this.activeMathModel = config.vllm.mathModel;
    this.activeVisionModel = config.vllm.visionModel;
  }

  public getAvailableModels(): ModelProfile[] {
    return [
      {
        id: this.activeGeneralModel,
        name: "Qwen 2.5 General",
        category: "general",
        description: "Open-source multilingual language model optimized for Khmer and English conversations.",
        maxContext: 32768,
        recommendedFor: ["Zevio Chat", "General QA", "Translations", "Summarization"]
      },
      {
        id: this.activeCoderModel,
        name: "Qwen 2.5 Coder",
        category: "coder",
        description: "Specialized open-weight coding model with deep knowledge across 90+ programming languages.",
        maxContext: 32768,
        recommendedFor: ["Zevio Code Studio", "Bug Fixing", "Code Explanation", "Refactoring"]
      },
      {
        id: this.activeMathModel,
        name: "Qwen 2.5 Math",
        category: "math",
        description: "Leading open-weight mathematical reasoning model supporting step-by-step solutions with LaTeX.",
        maxContext: 32768,
        recommendedFor: ["Zevio Homework Math", "Physics Calculations", "Chemistry Formulas"]
      },
      {
        id: this.activeVisionModel,
        name: "Qwen 2 Vision-Language",
        category: "vision",
        description: "Multimodal vision-language model capable of parsing diagram homework and document pages.",
        maxContext: 32768,
        recommendedFor: ["Homework Image Uploads", "Diagram Analysis", "Exam Paper OCR"]
      }
    ];
  }

  public resolveModelForTask(task: "chat" | "code" | "math" | "vision", requestedModel?: string): string {
    if (requestedModel) return requestedModel;

    switch (task) {
      case "code":
        return this.activeCoderModel;
      case "math":
        return this.activeMathModel;
      case "vision":
        return this.activeVisionModel;
      case "chat":
      default:
        return this.activeGeneralModel;
    }
  }

  public setModel(category: "general" | "coder" | "math" | "vision", modelId: string): void {
    switch (category) {
      case "general":
        this.activeGeneralModel = modelId;
        break;
      case "coder":
        this.activeCoderModel = modelId;
        break;
      case "math":
        this.activeMathModel = modelId;
        break;
      case "vision":
        this.activeVisionModel = modelId;
        break;
    }
  }
}

export const modelManager = new ModelManager();

