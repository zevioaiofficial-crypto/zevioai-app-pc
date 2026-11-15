import React, { useState } from "react";
import { X, Server, RefreshCw, CheckCircle2, AlertTriangle, Terminal, Key, Cpu } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getApiBaseUrl, setApiBaseUrl } from "../services/api";
import { getStoredApiKey, setStoredApiKey } from "../services/geminiClient";
import { getStoredOllamaKey, setStoredOllamaKey } from "../services/ollamaClient";

export const ServerStatusModal: React.FC = () => {
  const { isStatusModalOpen, setIsStatusModalOpen, health, isLoadingHealth, refreshHealth } = useApp();
  const [customUrl, setCustomUrl] = useState<string>(getApiBaseUrl());
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>(getStoredApiKey());
  const [keySaveSuccess, setKeySaveSuccess] = useState<boolean>(false);
  const [ollamaKey, setOllamaKeyState] = useState<string>(getStoredOllamaKey());
  const [ollamaKeySaveSuccess, setOllamaKeySaveSuccess] = useState<boolean>(false);

  if (!isStatusModalOpen) return null;

  const isOnline = health?.inference?.isOnline ?? false;
  const serverUrl = health?.inference?.serverUrl || "https://ollama.com/v1";
  const activeModel = health?.inference?.activeModel || "gemini-3.5-flash-lite";
  const latency = health?.inference?.latencyMs || 0;
  const errorMsg = health?.inference?.error;

  const handleSaveUrl = () => {
    setApiBaseUrl(customUrl);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    refreshHealth();
  };

  const handleSaveApiKey = () => {
    setStoredApiKey(apiKey);
    setKeySaveSuccess(true);
    setTimeout(() => setKeySaveSuccess(false), 2000);
    refreshHealth();
  };

  const handleSaveOllamaKey = () => {
    setStoredOllamaKey(ollamaKey);
    setOllamaKeySaveSuccess(true);
    setTimeout(() => setOllamaKeySaveSuccess(false), 2000);
    refreshHealth();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">AI Inference Engine &amp; API Keys</h3>
              <p className="text-xs text-slate-400">Dual Cloud Engines: Ollama AI Cloud &amp; Google Gemini</p>
            </div>
          </div>
          <button
            onClick={() => setIsStatusModalOpen(false)}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Card */}
        <div className="my-4 p-4 rounded-xl border bg-slate-950/60 border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Inference Status</span>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  AI Engine Online ({latency}ms)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 bg-rose-950/40 border border-rose-800/40 px-2.5 py-1 rounded-full">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Inference Offline
                </span>
              )}
            </div>
          </div>

          <div className="text-xs space-y-1.5 pt-2 border-t border-slate-800/60 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Inference Endpoints:</span>
              <span className="text-slate-300">ollama.com &amp; generativelanguage</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Active Model:</span>
              <span className="text-indigo-400">{activeModel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ollama Cloud:</span>
              <span className="text-emerald-400">Connected (Bearer Auth)</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-amber-950/20 border border-amber-900/30 rounded-lg text-xs text-amber-300">
              <p className="font-semibold mb-1">Status Note:</p>
              <p className="font-mono text-[11px] leading-relaxed break-all">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Ollama AI Cloud API Key Setting */}
        <div className="mb-3.5 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>Ollama AI Cloud API Key:</span>
            </span>
            <span className="text-[11px] text-emerald-400 font-mono font-medium">Configured</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={ollamaKey}
              onChange={(e) => setOllamaKeyState(e.target.value)}
              placeholder="Enter your Ollama API key (optional)"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <button
              type="button"
              onClick={handleSaveOllamaKey}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
            >
              {ollamaKeySaveSuccess ? "Saved!" : "Save"}
            </button>
          </div>
          <p className="text-[10px] text-slate-400">
            Powers Ollama Cloud models (GLM 5.3 Flash, DeepSeek V4.1, Kimi Code, Gemma 4).
          </p>
        </div>

        {/* Gemini Engine API Key Setting */}
        <div className="mb-3.5 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>Gemini Cloud API Key:</span>
            </span>
            <span className="text-[11px] text-emerald-400 font-mono font-medium">Active</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your AI API key (optional)"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <button
              type="button"
              onClick={handleSaveApiKey}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
            >
              {keySaveSuccess ? "Saved!" : "Save"}
            </button>
          </div>
        </div>

        {/* Backend Custom URL Setting */}
        <div className="mb-4 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">Self-Hosted vLLM Server URL:</span>
            <span className="text-[11px] text-slate-400">Optional custom GPU endpoint</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="e.g. http://localhost:8000/v1 or https://ai.khmersrt.site"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <button
              type="button"
              onClick={handleSaveUrl}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
            >
              {saveSuccess ? "Saved!" : "Save"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={() => refreshHealth()}
            disabled={isLoadingHealth}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHealth ? "animate-spin" : ""}`} />
            <span>Test Connection</span>
          </button>
          <button
            onClick={() => setIsStatusModalOpen(false)}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
