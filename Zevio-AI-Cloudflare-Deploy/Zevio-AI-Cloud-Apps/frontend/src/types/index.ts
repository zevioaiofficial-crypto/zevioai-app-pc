export type TabType = "chat" | "homework" | "code";

export interface ModelProfile {
  id: string;
  name: string;
  category: "general" | "coder" | "math" | "vision";
  description: string;
  maxContext: number;
  recommendedFor: string[];
}

export interface InferenceStatus {
  serverUrl: string;
  isOnline: boolean;
  activeModel: string;
  latencyMs: number;
  error?: string | null;
}

export interface HealthResponse {
  status: string;
  service: string;
  environment: string;
  timestamp: string;
  inference: InferenceStatus;
  models: ModelProfile[];
}

export interface Message {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: number;
  model?: string;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model: string;
}

export type HomeworkSubject =
  | "Mathematics"
  | "Physics"
  | "Chemistry"
  | "Biology"
  | "English"
  | "Khmer";

export type AcademicGrade =
  | "Grade 1-6 (Primary)"
  | "Grade 7-9 (Lower Secondary)"
  | "Grade 10"
  | "Grade 11"
  | "Grade 12 (BacII Exam)"
  | "University (Undergraduate)"
  | "University (Advanced/Postgraduate)";

export type CodeLanguage =
  | "python"
  | "javascript"
  | "typescript"
  | "html"
  | "css"
  | "php"
  | "java"
  | "c"
  | "cpp"
  | "csharp";

export type CodeAction = "generate" | "debug" | "explain" | "optimize";

