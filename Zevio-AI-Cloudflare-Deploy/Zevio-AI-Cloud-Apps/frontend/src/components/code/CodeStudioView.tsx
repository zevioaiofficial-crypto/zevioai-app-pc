import React, { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import {
  Code2,
  Play,
  Bug,
  HelpCircle,
  Zap,
  RotateCcw,
  Copy,
  ClipboardPaste,
  ArrowLeftToLine,
  Check,
  Eye,
  FileCode,
  Terminal,
  Sparkles,
  AlertCircle,
  Upload,
  FolderArchive,
  Layers,
  X,
  Loader2,
  FileText
} from "lucide-react";
import { CodeLanguage, CodeAction } from "../../types";
import { streamCodeAPI } from "../../services/api";
import { MarkdownRenderer } from "../common/MarkdownRenderer";
import { useApp } from "../../context/AppContext";
import {
  detectLanguageFromFilename,
  extractZipArchive,
  readSingleCodeFile,
  executeSequentialFiles,
  bundleWebProject,
  runPythonCode,
  runPhpCode,
  ExtractedCodeFile,
  ExecutionLog
} from "../../services/codeRunner";

export const CodeStudioView: React.FC = () => {
  const { setIsStatusModalOpen } = useApp();

  const [language, setLanguage] = useState<CodeLanguage>("html");
  const [code, setCode] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [activeAction, setActiveAction] = useState<CodeAction>("generate");

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [aiOutput, setAiOutput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // View modes
  const [activeViewMode, setActiveViewMode] = useState<"preview" | "ai_output" | "terminal">("preview");
  const [mobileTab, setMobileTab] = useState<"edit" | "ai_output" | "preview" | "terminal">("edit");
  const [iframeSrcDoc, setIframeSrcDoc] = useState<string>("");

  // Multi-file / ZIP project state
  const [projectFiles, setProjectFiles] = useState<ExtractedCodeFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [zipName, setZipName] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isRunningSequence, setIsRunningSequence] = useState<boolean>(false);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [copiedCode, setCopiedCode] = useState(false);
  const [pastedCode, setPastedCode] = useState(false);
  const [copiedAiCode, setCopiedAiCode] = useState(false);
  const [appliedFeedback, setAppliedFeedback] = useState(false);

  // Helper to extract clean code from AI output
  const extractCodeBlock = (text: string, isFinished = false): string | null => {
    if (!text) return null;

    const closedMatch = text.match(/```(?:\w+)?\r?\n([\s\S]*?)```/);
    if (closedMatch && closedMatch[1]) {
      return closedMatch[1].trim();
    }

    const openFenceIndex = text.indexOf("```");
    if (openFenceIndex !== -1) {
      const newlineIndex = text.indexOf("\n", openFenceIndex);
      if (newlineIndex !== -1) {
        const codePart = text.substring(newlineIndex + 1);
        const closeFenceIndex = codePart.indexOf("```");
        if (closeFenceIndex !== -1) {
          return codePart.substring(0, closeFenceIndex).trim();
        }
        return codePart;
      }
    }

    if (isFinished && !text.includes("```")) {
      const trimmed = text.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }

    return null;
  };

  const languages: Array<{ id: CodeLanguage; label: string; monacoLang: string }> = [
    { id: "html", label: "HTML5", monacoLang: "html" },
    { id: "javascript", label: "JavaScript", monacoLang: "javascript" },
    { id: "typescript", label: "TypeScript", monacoLang: "typescript" },
    { id: "python", label: "Python", monacoLang: "python" },
    { id: "css", label: "CSS3", monacoLang: "css" },
    { id: "php", label: "PHP", monacoLang: "php" },
    { id: "java", label: "Java", monacoLang: "java" },
    { id: "c", label: "C", monacoLang: "c" },
    { id: "cpp", label: "C++", monacoLang: "cpp" },
    { id: "csharp", label: "C#", monacoLang: "csharp" },
  ];

  const actions: Array<{ id: CodeAction; label: string; khmer: string; icon: React.ReactNode; color: string }> = [
    { id: "generate", label: "Generate", khmer: "បង្កើតកូដ", icon: <Sparkles className="w-3.5 h-3.5" />, color: "bg-indigo-600 hover:bg-indigo-500 text-white" },
    { id: "debug", label: "Debug", khmer: "កែកូដខុស", icon: <Bug className="w-3.5 h-3.5" />, color: "bg-rose-600 hover:bg-rose-500 text-white" },
    { id: "explain", label: "Explain", khmer: "ពន្យល់កូដ", icon: <HelpCircle className="w-3.5 h-3.5" />, color: "bg-amber-600 hover:bg-amber-500 text-white" },
    { id: "optimize", label: "Optimize", khmer: "បង្កើនល្បឿនកូដ", icon: <Zap className="w-3.5 h-3.5" />, color: "bg-emerald-600 hover:bg-emerald-500 text-white" },
  ];

  const handleLanguageChange = (newLang: CodeLanguage) => {
    setLanguage(newLang);
    setCode("");
    setIframeSrcDoc("");
  };

  // Handle Upload of HTML, CSS, PHP, Python, or ZIP archive
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      if (file.name.toLowerCase().endsWith(".zip")) {
        const extracted = await extractZipArchive(file);
        if (extracted.length === 0) {
          alert("No recognized code files found in the ZIP archive.");
        } else {
          setProjectFiles(extracted);
          setZipName(file.name);
          const first = extracted[0];
          setActiveFileId(first.id);
          setLanguage(first.language);
          setCode(first.content);

          const bundledHtml = bundleWebProject(extracted);
          setIframeSrcDoc(bundledHtml);
          setActiveViewMode("preview");
        }
      } else {
        const singleFile = await readSingleCodeFile(file);
        setProjectFiles([singleFile]);
        setZipName(null);
        setActiveFileId(singleFile.id);
        setLanguage(singleFile.language);
        setCode(singleFile.content);

        if (singleFile.language === "html") {
          setIframeSrcDoc(singleFile.content);
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      alert("Failed to read file: " + errMsg);
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Switch active file in the project
  const handleSelectFile = (file: ExtractedCodeFile) => {
    if (activeFileId) {
      setProjectFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: code } : f));
    }
    setActiveFileId(file.id);
    setLanguage(file.language);
    setCode(file.content);
  };

  // Close / clear project
  const handleCloseProject = () => {
    setProjectFiles([]);
    setActiveFileId(null);
    setZipName(null);
    setCode("");
    setIframeSrcDoc("");
    setExecutionLogs([]);
  };

  // Run Sequential Execution Pipeline
  const handleRunSequential = async () => {
    if (projectFiles.length === 0 && !code.trim()) return;

    const filesToRun = projectFiles.length > 0
      ? projectFiles.map(f => f.id === activeFileId ? { ...f, content: code } : f)
      : [{
          id: "current",
          name: `main.${language === "python" ? "py" : (language === "php" ? "php" : language)}`,
          path: `main.${language}`,
          content: code,
          language,
          size: code.length
        }];

    setIsRunningSequence(true);
    setExecutionLogs([]);
    setActiveViewMode("terminal");
    setMobileTab("terminal");

    const result = await executeSequentialFiles(filesToRun, (log) => {
      setExecutionLogs(prev => [...prev, log]);
    });

    if (result.htmlBundle) {
      setIframeSrcDoc(result.htmlBundle);
    }
    setIsRunningSequence(false);
  };

  // Single file Live Run handler
  const handleRunSandbox = async () => {
    if (!code.trim()) {
      setIframeSrcDoc("");
      return;
    }

    if (language === "html" || language === "javascript") {
      let runnable = code;
      if (language === "javascript") {
        runnable = `<!DOCTYPE html><html><body><pre id="log" style="color:#0f172a;font-family:monospace;padding:16px;background:#f8fafc"></pre><script>
        const _log = document.getElementById('log');
        console.log = function(...args) { _log.textContent += args.join(' ') + '\\n'; };
        try { ${code} } catch(e) { console.log('Runtime Error: ' + e.message); }
        </script></body></html>`;
      }
      setIframeSrcDoc(runnable);
      setActiveViewMode("preview");
      setMobileTab("preview");
    } else if (language === "python") {
      setActiveViewMode("terminal");
      setMobileTab("terminal");
      setExecutionLogs([
        { timestamp: new Date().toLocaleTimeString(), level: "info", fileName: "main.py", message: "Executing Python script..." }
      ]);
      const res = await runPythonCode(code);
      if (res.stdout) {
        setExecutionLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), level: "info", fileName: "main.py", message: `[STDOUT]:\n${res.stdout}` }]);
      }
      if (res.stderr) {
        setExecutionLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), level: "error", fileName: "main.py", message: `[STDERR]:\n${res.stderr}` }]);
      }
      setExecutionLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), level: "success", fileName: "main.py", message: "Execution finished (exit code 0)." }]);
    } else if (language === "php") {
      setActiveViewMode("terminal");
      setMobileTab("terminal");
      setExecutionLogs([
        { timestamp: new Date().toLocaleTimeString(), level: "info", fileName: "index.php", message: "Executing PHP script..." }
      ]);
      const out = runPhpCode(code);
      setExecutionLogs(prev => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), level: "info", fileName: "index.php", message: `[Output]:\n${out}` },
        { timestamp: new Date().toLocaleTimeString(), level: "success", fileName: "index.php", message: "PHP execution finished." }
      ]);
    }
  };

  const handleExecuteAction = async (action: CodeAction) => {
    setActiveAction(action);
    setIsProcessing(true);
    setAiOutput("");
    setError(null);
    setActiveViewMode("ai_output");
    setMobileTab("ai_output");

    let accumulated = "";

    await streamCodeAPI({
      code,
      prompt: prompt.trim() || `Please perform ${action.toUpperCase()} on the provided ${language} code.`,
      action,
      language,
      onChunk: (chunk: string) => {
        accumulated += chunk;
        setAiOutput(accumulated);

        if (action === "generate" || action === "debug" || action === "optimize") {
          const liveCode = extractCodeBlock(accumulated, false);
          if (liveCode !== null) {
            setCode(liveCode);
          }
        }
      },
      onDone: () => {
        setIsProcessing(false);
        if (action === "generate" || action === "debug" || action === "optimize") {
          const finalCode = extractCodeBlock(accumulated, true);
          if (finalCode !== null) {
            setCode(finalCode);
            if (language === "html") {
              setIframeSrcDoc(finalCode);
            }
          }
        }
      },
      onError: (err: string) => {
        setError(err);
        setIsProcessing(false);
      }
    });
  };

  const handleApplyCodeToEditor = (incomingCode: string) => {
    if (!incomingCode) return;
    const cleanCode = extractCodeBlock(incomingCode, true) || incomingCode;
    setCode(cleanCode);
    if (language === "html") {
      setIframeSrcDoc(cleanCode);
    }
    setAppliedFeedback(true);
    setTimeout(() => setAppliedFeedback(false), 2500);
    setMobileTab("edit");
  };

  const handleCopyAiCode = () => {
    if (!aiOutput) return;
    const extracted = extractCodeBlock(aiOutput, true) || aiOutput;
    navigator.clipboard.writeText(extracted);
    setCopiedAiCode(true);
    setTimeout(() => setCopiedAiCode(false), 2000);
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          const cleanCode = extractCodeBlock(text, true) || text;
          setCode(cleanCode);
          if (language === "html") {
            setIframeSrcDoc(cleanCode);
          }
          setPastedCode(true);
          setTimeout(() => setPastedCode(false), 2000);
          return;
        }
      }
    } catch (_) {}

    const manualText = window.prompt("សូមបិទភ្ជាប់កូដរបស់អ្នកនៅទីនេះ (Paste your code here):");
    if (manualText && manualText.trim()) {
      const cleanCode = extractCodeBlock(manualText, true) || manualText;
      setCode(cleanCode);
      if (language === "html") {
        setIframeSrcDoc(cleanCode);
      }
      setPastedCode(true);
      setTimeout(() => setPastedCode(false), 2000);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Hidden File Upload Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm,.css,.php,.py,.js,.jsx,.ts,.tsx,.json,.zip"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Studio Control Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-xs sm:text-sm">
            <Code2 className="w-4 h-4" />
            <span className="hidden sm:inline font-mono">Zevio Code Studio</span>
          </div>

          {/* Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isExtracting}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition shadow-sm whitespace-nowrap"
            title="Upload HTML, CSS, PHP, Python, or ZIP archive"
          >
            {isExtracting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span>ផ្ទុកកូដ / ZIP (Upload)</span>
          </button>

          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value as CodeLanguage)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono font-medium cursor-pointer"
          >
            {languages.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </div>

        {/* Action Buttons & Execution Buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {actions.map((act) => (
            <button
              key={act.id}
              onClick={() => handleExecuteAction(act.id)}
              disabled={isProcessing}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-40 whitespace-nowrap ${act.color}`}
            >
              {act.icon}
              <span className="hidden sm:inline">{act.khmer} ({act.label})</span>
              <span className="sm:hidden">{act.khmer}</span>
            </button>
          ))}

          {/* Sequential Run Button */}
          <button
            type="button"
            onClick={handleRunSequential}
            disabled={isRunningSequence || (!code.trim() && projectFiles.length === 0)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow-sm whitespace-nowrap disabled:opacity-40"
            title="ដំណើរការកូដទាំងអស់តាមលំដាប់ (Run sequential code execution)"
          >
            {isRunningSequence ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">ដំណើរការតាមលំដាប់ (Sequential Run)</span>
            <span className="sm:hidden">Run Sequence</span>
          </button>

          {/* Single File Live Run Button */}
          {(language === "html" || language === "javascript" || language === "python" || language === "php") && (
            <button
              onClick={handleRunSandbox}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition shadow-sm whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ដំណើរការកូដនេះ (Live Run)</span>
              <span className="sm:hidden">Run</span>
            </button>
          )}
        </div>
      </div>

      {/* Extracted Project Files Strip (when files are loaded) */}
      {projectFiles.length > 0 && (
        <div className="bg-slate-900 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto flex-shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {zipName && (
              <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1 mr-2 flex-shrink-0">
                <FolderArchive className="w-3.5 h-3.5" />
                <span>{zipName}</span>
                <span className="text-[10px] text-slate-400 font-normal">({projectFiles.length} files)</span>
              </span>
            )}
            {projectFiles.map(file => (
              <button
                key={file.id}
                type="button"
                onClick={() => handleSelectFile(file)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition flex-shrink-0 ${
                  activeFileId === file.id
                    ? "bg-indigo-600 text-white font-semibold shadow-sm"
                    : "bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800"
                }`}
              >
                <FileCode className="w-3 h-3 text-indigo-300" />
                <span>{file.name}</span>
                <span className="text-[9px] px-1 py-0.2 bg-black/30 rounded text-slate-300 uppercase">
                  {file.language}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleCloseProject}
            className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800 flex-shrink-0"
            title="Close project"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ជម្រះ</span>
          </button>
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="flex md:hidden border-b border-slate-800 bg-slate-900/90 px-3 py-1.5 items-center justify-between gap-1 flex-shrink-0 select-none">
        <button
          type="button"
          onClick={() => setMobileTab("edit")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            mobileTab === "edit"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 bg-slate-950/60"
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Edit Tab</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileTab("ai_output");
            setActiveViewMode("ai_output");
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            mobileTab === "ai_output"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 bg-slate-950/60"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>លទ្ធផល AI</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileTab("terminal");
            setActiveViewMode("terminal");
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            mobileTab === "terminal"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 bg-slate-950/60"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Terminal</span>
        </button>

        {(language === "html" || language === "javascript" || projectFiles.length > 0) && (
          <button
            type="button"
            onClick={() => {
              setMobileTab("preview");
              setActiveViewMode("preview");
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              mobileTab === "preview"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 bg-slate-950/60"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>
        )}
      </div>

      {/* Main Split-Pane Editor Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Monaco Code Editor */}
        <div
          className={`flex-1 flex-col border-r border-slate-800 overflow-hidden min-h-0 ${
            mobileTab === "edit" ? "flex" : "hidden md:flex"
          }`}
        >
          {/* Editor Header Toolbar */}
          <div className="h-9 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between text-xs text-slate-400 flex-shrink-0 gap-2">
            <span className="font-mono text-[11px] flex items-center gap-1.5 truncate">
              <FileCode className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              <span className="truncate">
                {activeFileId
                  ? projectFiles.find(f => f.id === activeFileId)?.name || "code"
                  : `main.${language === "javascript" ? "js" : (language === "typescript" ? "ts" : (language === "python" ? "py" : (language === "php" ? "php" : language)))}`}
              </span>
            </span>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="hover:text-indigo-300 transition text-[11px] flex items-center gap-1 text-slate-200 bg-slate-800 hover:bg-slate-700 px-2 sm:px-2.5 py-1 rounded-md border border-slate-700/80 shadow-sm font-medium"
                title="បិទភ្ជាប់កូដពី Clipboard"
              >
                {pastedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ClipboardPaste className="w-3.5 h-3.5 text-indigo-400" />}
                <span>{pastedCode ? "បានបិទភ្ជាប់" : "បិទភ្ជាប់ (Paste)"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="hover:text-slate-200 transition text-[11px] flex items-center gap-1 text-slate-300 bg-slate-800/80 hover:bg-slate-700 px-2 sm:px-2.5 py-1 rounded-md border border-slate-700/60 font-medium"
                title="ចម្លងកូដក្នុង Edit Tab (Copy Editor Code)"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? "បានចម្លង" : "ចម្លងកូដ"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCode("");
                  setIframeSrcDoc("");
                }}
                className="hover:text-rose-400 transition text-[11px] flex items-center gap-1 text-slate-400 hover:bg-slate-800 px-2 py-1 rounded-md"
                title="សម្អាតកូដទាំងអស់ (Clear editor)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">សម្អាត (Clear)</span>
              </button>
            </div>
          </div>

          {/* Monaco Editor Component */}
          <div className="flex-1 overflow-hidden relative">
            <Editor
              height="100%"
              language={languages.find((l) => l.id === language)?.monacoLang || "html"}
              theme="vs-dark"
              value={code}
              onChange={(value) => {
                const updated = value || "";
                setCode(updated);
                if (activeFileId) {
                  setProjectFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: updated } : f));
                }
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap: "on",
                padding: { top: 12 },
                tabSize: 2,
                automaticLayout: true
              }}
            />
          </div>

          {/* Bottom Prompt / Instruction Bar */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-col gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isProcessing) {
                    handleExecuteAction(activeAction);
                  }
                }}
                placeholder="បញ្ជា AI ពីអ្វីដែលអ្នកចង់បាន (e.g., 'បង្កើត form login ជាមួយ CSS modern', 'កែ syntax error')..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
              />
              <button
                type="button"
                onClick={() => handleExecuteAction(activeAction)}
                disabled={isProcessing}
                className="px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-40 whitespace-nowrap shadow-sm"
              >
                {isProcessing ? "កំពុងដំណើរការ..." : "អនុវត្ត (Execute)"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Pane: Multi-view (Sandbox Preview, AI Output, Sequential Terminal) */}
        <div
          className={`flex-1 flex-col overflow-hidden min-h-0 bg-slate-950 ${
            mobileTab !== "edit" ? "flex" : "hidden md:flex"
          }`}
        >
          {/* Right Pane Header Navigation Tabs */}
          <div className="h-9 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
            <div className="flex items-center gap-1 font-medium">
              <button
                type="button"
                onClick={() => setActiveViewMode("preview")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                  activeViewMode === "preview"
                    ? "bg-slate-800 text-indigo-400 font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Sandbox Preview</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewMode("terminal")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                  activeViewMode === "terminal"
                    ? "bg-slate-800 text-emerald-400 font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Terminal (Console)</span>
                {executionLogs.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveViewMode("ai_output")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                  activeViewMode === "ai_output"
                    ? "bg-slate-800 text-indigo-400 font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Output</span>
              </button>
            </div>

            {/* Action buttons on the right pane */}
            {activeViewMode === "ai_output" && aiOutput && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handleCopyAiCode}
                  className="hover:text-slate-200 transition text-[11px] flex items-center gap-1 text-slate-300 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-md border border-slate-700/80 font-medium"
                  title="Copy AI code"
                >
                  {copiedAiCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{copiedAiCode ? "បានចម្លង" : "ចម្លងកូដ"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyCodeToEditor(aiOutput)}
                  className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-md text-[11px] font-semibold transition border shadow-sm ${
                    appliedFeedback
                      ? "bg-emerald-600 text-white border-emerald-500"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500"
                  }`}
                  title="Paste AI code into Monaco Editor"
                >
                  {appliedFeedback ? <Check className="w-3.5 h-3.5" /> : <ArrowLeftToLine className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{appliedFeedback ? "បានដាក់ចូល Edit Tab រួចរាល់" : "ដាក់ចូល Edit Tab"}</span>
                  <span className="sm:hidden">{appliedFeedback ? "បានដាក់ចូល" : "ដាក់ចូល Edit"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Pane Body */}
          <div className="flex-1 overflow-hidden relative">
            {/* View 1: Sandbox Preview (for HTML / Web Projects) */}
            {activeViewMode === "preview" && (
              iframeSrcDoc.trim() ? (
                <iframe
                  title="Sandbox Preview"
                  srcDoc={iframeSrcDoc}
                  sandbox="allow-scripts allow-modals"
                  className="w-full h-full bg-white border-none"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500">
                  <Eye className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-300">Sandbox Preview</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                    Upload an HTML/ZIP project or enter code and click "Live Run" to preview it live.
                  </p>
                </div>
              )
            )}

            {/* View 2: Terminal / Sequential Execution Console */}
            {activeViewMode === "terminal" && (
              <div className="h-full flex flex-col bg-slate-950 text-slate-200 font-mono text-xs overflow-hidden">
                <div className="h-8 bg-slate-900/60 border-b border-slate-800/80 px-3 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] text-slate-300 font-semibold">Sequential Execution Output</span>
                  </div>
                  <button
                    onClick={() => setExecutionLogs([])}
                    className="text-[10px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded hover:bg-slate-800"
                  >
                    Clear Console
                  </button>
                </div>
                <div className="flex-1 p-3 overflow-y-auto space-y-1.5 selection:bg-emerald-800">
                  {executionLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12">
                      <Terminal className="w-8 h-8 mb-2 opacity-40" />
                      <p className="text-xs font-semibold text-slate-400">No execution logs</p>
                      <p className="text-[11px] text-slate-600 mt-1 text-center max-w-sm">
                        Click "Sequential Run" to run all files in order or click "Live Run" to execute the current file.
                      </p>
                    </div>
                  ) : (
                    executionLogs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[11px] leading-relaxed">
                        <span className="text-slate-600 select-none">[{log.timestamp}]</span>
                        {log.fileName && (
                          <span className="text-indigo-400 font-semibold select-none">[{log.fileName}]</span>
                        )}
                        <span
                          className={`whitespace-pre-wrap ${
                            log.level === "error"
                              ? "text-rose-400 font-semibold"
                              : log.level === "warn"
                              ? "text-amber-400"
                              : log.level === "success"
                              ? "text-emerald-400 font-semibold"
                              : "text-slate-200"
                          }`}
                        >
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* View 3: AI Intelligence Output */}
            {activeViewMode === "ai_output" && (
              <div className="h-full overflow-y-auto p-4 space-y-3">
                {isProcessing && !aiOutput && (
                  <div className="flex items-center gap-2 py-8 text-xs text-slate-400 justify-center">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span>Qwen 2.5 Coder is processing your request...</span>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-xl text-xs text-rose-300 space-y-2">
                    <div className="flex items-center gap-1.5 font-semibold text-rose-200">
                      <AlertCircle className="w-4 h-4" />
                      <span>Code Intelligence Error</span>
                    </div>
                    <p className="font-mono text-[11px]">{error}</p>
                    <button
                      onClick={() => setIsStatusModalOpen(true)}
                      className="px-2.5 py-1 bg-rose-900/40 text-rose-200 rounded text-[11px] font-semibold border border-rose-800"
                    >
                      Check GPU Connection
                    </button>
                  </div>
                )}

                {aiOutput ? (
                  <div className="prose-dark text-xs leading-relaxed">
                    <MarkdownRenderer
                      content={aiOutput}
                      onPasteToEditor={handleApplyCodeToEditor}
                    />
                  </div>
                ) : (
                  !isProcessing && (
                    <div className="flex flex-col items-center justify-center text-center py-16 text-slate-500">
                      <Terminal className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-xs font-semibold text-slate-400">No output yet</p>
                      <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                        Select an action (Generate, Debug, Explain, Optimize) and click execute to see AI code intelligence.
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
