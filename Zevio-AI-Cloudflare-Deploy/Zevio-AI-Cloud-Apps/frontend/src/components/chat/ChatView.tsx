import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Plus,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  MessageSquare,
  Bot,
  User,
  Sparkles,
  AlertCircle,
  Paperclip,
  FileCode,
  FolderArchive,
  X,
  Loader2
} from "lucide-react";
import { useChat } from "../../context/ChatContext";
import { useApp } from "../../context/AppContext";
import { MarkdownRenderer } from "../common/MarkdownRenderer";
import {
  readSingleCodeFile,
  extractZipArchive,
  ExtractedCodeFile,
  isAcceptedCodeFile
} from "../../services/codeRunner";

export const ChatView: React.FC = () => {
  const {
    conversations,
    activeConversationId,
    activeConversation,
    setActiveConversationId,
    createNewConversation,
    deleteConversation,
    sendMessage,
    regenerateLastMessage,
    isStreaming,
    streamingContent,
    streamingError
  } = useChat();

  const { health, setIsStatusModalOpen, selectedModel } = useApp();
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<ExtractedCodeFile[]>([]);
  const [zipSource, setZipSource] = useState<{ name: string; count: number } | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isServerOnline = health?.inference?.isOnline ?? false;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, streamingContent]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      if (file.name.toLowerCase().endsWith(".zip")) {
        const extracted = await extractZipArchive(file);
        if (extracted.length === 0) {
          alert("No recognized code files found in the ZIP archive.");
        } else {
          setAttachedFiles(extracted);
          setZipSource({ name: file.name, count: extracted.length });
        }
      } else {
        const codeFile = await readSingleCodeFile(file);
        setAttachedFiles([codeFile]);
        setZipSource(null);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      alert("Failed to process file: " + errMsg);
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachedFiles = () => {
    setAttachedFiles([]);
    setZipSource(null);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && attachedFiles.length === 0) || isStreaming) return;

    let fullPrompt = "";
    if (attachedFiles.length > 0) {
      if (zipSource) {
        fullPrompt += `[Uploaded ZIP Archive: ${zipSource.name} (${zipSource.count} code files extracted)]\n\n`;
      }
      fullPrompt += attachedFiles.map((f, i) => {
        return `### File ${i + 1}/${attachedFiles.length}: ${f.name} (${f.language.toUpperCase()})\n\`\`\`${f.language}\n${f.content}\n\`\`\``;
      }).join("\n\n");
      fullPrompt += "\n\n";
    }

    if (input.trim()) {
      fullPrompt += input.trim();
    } else {
      fullPrompt += "Please review, explain, and verify the uploaded code files above.";
    }

    setInput("");
    setAttachedFiles([]);
    setZipSource(null);
    sendMessage(fullPrompt);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const samplePrompts = [
    { title: "ពន្យល់ពី Machine Learning", desc: "ការពន្យល់ជាភាសាខ្មែរយ៉ាងក្បោះក្បាយ" },
    { title: "Write a high-performance Python scraper", desc: "Using asyncio and aiohttp" },
    { title: "ដោះស្រាយសមីការឌីផេរ៉ង់ស្យែល", desc: "បង្ហាញរូបមន្ត និងដំណោះស្រាយជាជំហានៗ" },
    { title: "Design scalable microservice architecture", desc: "Docker, Kubernetes, and vLLM" }
  ];

  return (
    <div className="flex h-full w-full flex-1 overflow-hidden bg-slate-950">
      {/* Sidebar: Conversation History */}
      <aside className="w-64 border-r border-slate-800/80 bg-slate-900/40 hidden md:flex flex-col">
        {/* New Chat Button */}
        <div className="p-3 border-b border-slate-800/60">
          <button
            onClick={() => createNewConversation()}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Conversations
          </div>
          {conversations.map((c) => {
            const isActive = c.id === activeConversationId;
            return (
              <div
                key={c.id}
                onClick={() => setActiveConversationId(c.id)}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition ${
                  isActive
                    ? "bg-indigo-600/15 border border-indigo-500/30 text-indigo-200"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{c.title || "Untitled Conversation"}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition"
                  title="Delete conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800/60 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Engine: vLLM + Qwen</span>
          <span className="text-indigo-400">Self-Hosted</span>
        </div>
      </aside>

      {/* Main Conversation Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
          {/* Welcome Screen if empty */}
          {(!activeConversation || activeConversation.messages.length === 0) && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-12">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/10">
                <Sparkles className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-100 mb-2">Welcome to Zevio Chat</h2>
              <p className="text-xs text-slate-400 mb-8 leading-relaxed">
                Powered by self-hosted open-source Qwen models. Fluent in Khmer and English, with support for math equations, code, and reasoning.
              </p>

              {/* Sample Prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
                {samplePrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(p.title);
                      textareaRef.current?.focus();
                    }}
                    className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 text-xs transition group"
                  >
                    <p className="font-semibold text-slate-200 group-hover:text-indigo-300 transition">
                      {p.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation Messages */}
          {activeConversation?.messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl mx-auto ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-md shadow-indigo-600/30">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`group relative rounded-2xl px-4 py-3 text-sm max-w-[85%] ${
                    isUser
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-slate-900 border border-slate-800/80 text-slate-200 rounded-bl-sm shadow-sm"
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  ) : (
                    <MarkdownRenderer content={msg.content} />
                  )}

                  {/* Message Action Bar */}
                  {!isUser && (
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-800/60 text-slate-400">
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[11px] hover:text-slate-200 hover:bg-slate-800 transition"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Real-time Streaming Output */}
          {isStreaming && (
            <div className="flex gap-3 max-w-3xl mx-auto justify-start animate-fade-in">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-md shadow-indigo-600/30">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-900 border border-slate-800/80 text-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 text-sm max-w-[85%] shadow-sm">
                {streamingContent ? (
                  <MarkdownRenderer content={streamingContent} />
                ) : (
                  <div className="flex items-center gap-1.5 py-1 text-xs text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span>Zevio AI is thinking...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Streaming Error Banner */}
          {streamingError && (
            <div className="max-w-3xl mx-auto p-4 rounded-xl bg-rose-950/30 border border-rose-900/50 text-xs text-rose-300 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-rose-200">Inference Error</p>
                  <p className="mt-0.5 leading-relaxed font-mono text-[11px]">{streamingError}</p>
                </div>
              </div>
              <button
                onClick={() => setIsStatusModalOpen(true)}
                className="px-2.5 py-1 bg-rose-900/40 hover:bg-rose-900/60 border border-rose-800 text-rose-200 rounded text-[11px] font-semibold whitespace-nowrap"
              >
                Inspect GPU
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar with Home Screen safe-area bottom cushion */}
        <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-950/90 backdrop-blur pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
            {/* Attached Code / ZIP Files Pill */}
            {attachedFiles.length > 0 && (
              <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-slate-900 border border-indigo-500/40 rounded-xl text-xs text-slate-200 shadow-md">
                {zipSource ? (
                  <FolderArchive className="w-4 h-4 text-amber-400 flex-shrink-0" />
                ) : (
                  <FileCode className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                )}
                <div className="flex-1 truncate">
                  <span className="font-semibold text-slate-100">
                    {zipSource ? zipSource.name : attachedFiles[0].name}
                  </span>
                  <span className="text-[11px] text-indigo-300 ml-1.5 font-mono">
                    {zipSource ? `(${zipSource.count} code files extracted)` : `[${attachedFiles[0].language.toUpperCase()}]`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={removeAttachedFiles}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition"
                  title="Remove attached files"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="relative flex items-end bg-slate-900 border border-slate-800 rounded-2xl p-2 focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/50 transition">
              {/* File Attachment Input (hidden) */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm,.css,.php,.py,.js,.jsx,.ts,.tsx,.json,.zip,.txt,.md"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Attachment Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming || isProcessingFile}
                className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-xl transition disabled:opacity-40 flex-shrink-0"
                title="Upload HTML, CSS, PHP, Python, or ZIP archive (ផ្ទុកឯកសារកូដ ឬ ZIP)"
              >
                {isProcessingFile ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </button>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder={attachedFiles.length > 0 ? "Ask AI about this code (or press Enter to analyze)..." : "Ask Zevio AI anything or upload HTML/CSS/PHP/Python/ZIP..."}
                rows={1}
                disabled={isStreaming}
                className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm px-2 py-1.5 focus:outline-none resize-none max-h-44 leading-relaxed font-sans"
              />

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {activeConversation && activeConversation.messages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => regenerateLastMessage()}
                    disabled={isStreaming}
                    className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition disabled:opacity-40"
                    title="Regenerate last response"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="submit"
                  disabled={(!input.trim() && attachedFiles.length === 0) || isStreaming}
                  className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition disabled:opacity-40 disabled:hover:bg-indigo-600 shadow-sm"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 px-2 mt-1.5">
              <span>Shift + Enter for new line</span>
              <span className="font-mono text-indigo-400/90 font-medium truncate max-w-[200px]">
                AI: {selectedModel}
              </span>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

