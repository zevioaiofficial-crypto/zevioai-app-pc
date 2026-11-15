import React, { useState, useEffect } from "react";
import { MessageSquare, GraduationCap, Code2, ChevronDown, Smartphone, Cpu } from "lucide-react";
import { useApp } from "../context/AppContext";
import { TabType } from "../types";
import { InstallModal } from "./InstallModal";

export const Navbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    health,
    selectedModel,
    setSelectedModel
  } = useApp();

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed on Home Screen)
    if (typeof window !== "undefined") {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);

      // Detect iOS Safari
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isApple = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isApple);

      // Listen for Android / Chromium PWA install prompt
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }
  }, []);

  const tabs: Array<{ id: TabType; label: string; shortLabel: string; khmer: string; icon: React.ReactNode }> = [
    { id: "chat", label: "Zevio Chat", shortLabel: "Chat", khmer: "ជជែក", icon: <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" /> },
    { id: "homework", label: "Zevio Homework", shortLabel: "Homework", khmer: "លំហាត់", icon: <GraduationCap className="w-3.5 h-3.5 flex-shrink-0" /> },
    { id: "code", label: "Zevio Code Studio", shortLabel: "Code", khmer: "កូដ", icon: <Code2 className="w-3.5 h-3.5 flex-shrink-0" /> },
  ];

  // Helper for compact short model label on mobile viewports
  const getModelShortLabel = (modelId: string): string => {
    if (!modelId) return "AI Model";
    if (modelId.includes("flash-lite-latest")) return "Flash Lite";
    if (modelId.includes("3.5-flash-lite")) return "3.5 Lite";
    if (modelId.includes("3.5-flash")) return "3.5 Flash";
    if (modelId.includes("glm")) return "GLM 5.3";
    if (modelId.includes("deepseek")) return "DeepSeek";
    if (modelId.includes("kimi")) return "Kimi Code";
    if (modelId.includes("qwen")) return "Qwen Coder";
    return modelId.split("/").pop()?.split(":").pop()?.slice(0, 9) || "AI";
  };

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur px-2 sm:px-4 z-30 sticky top-0 flex-shrink-0 w-full min-w-0 pt-[env(safe-area-inset-top,0px)]">
        <div className="h-11 sm:h-13 w-full flex items-center justify-between gap-1 sm:gap-2">
          {/* Brand */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <img
              src="./icon-192.png"
              alt="Zevio AI"
              className="w-7 h-7 rounded-lg object-cover shadow-md shadow-indigo-500/20 flex-shrink-0"
            />
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-100 tracking-tight text-xs sm:text-sm whitespace-nowrap hidden xs:inline">
                Zevio AI
              </span>
              <span className="text-[9px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1 py-0.2 rounded hidden md:inline">
                Open-Source
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-0.5 sm:gap-1 bg-slate-900/80 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-slate-800/80 flex-shrink-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-3 py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  {tab.icon}
                  <span className="inline sm:hidden">{tab.khmer}</span>
                  <span className="hidden sm:inline">{tab.khmer} ({tab.shortLabel})</span>
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Universal Model Picker & Add to Home Screen Button */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            {/* Universal Model Selector for Phone and Desktop */}
            <div className="relative flex items-center flex-shrink-0">
              <div
                className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 bg-slate-900 hover:bg-slate-800/90 border border-slate-700/80 hover:border-indigo-500/50 rounded-lg text-slate-200 text-[10px] sm:text-xs font-medium cursor-pointer transition shadow-sm active:scale-95"
                title="ជ្រើសរើស AI Model (Choose AI Model)"
              >
                <Cpu className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <span className="font-mono text-indigo-300 font-bold max-w-[55px] xs:max-w-[75px] sm:max-w-[120px] md:max-w-none truncate">
                  {getModelShortLabel(selectedModel)}
                </span>
                <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 flex-shrink-0" />
              </div>

              {/* Native select overlay with text-base to prevent iOS Safari auto-zoom */}
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full text-base z-10"
                aria-label="Select AI Model"
                title="Choose AI Model"
              >
                <optgroup label="Zevio Cloud Engine (Google Gemini)">
                  <option value="gemini-3.5-flash-lite">Zevio 3.5 Flash-Lite (Fast & Recommended)</option>
                  <option value="gemini-3.5-flash">Zevio 3.5 Flash (Advanced Reasoning)</option>
                  <option value="gemini-flash-lite-latest">Zevio Flash-Lite Latest (Khmer Optimized)</option>
                </optgroup>
                <optgroup label="Ollama Cloud Engine (Open-Source)">
                  <option value="ollama:glm-5.3-flash">GLM 5.3 Flash (Bilingual Khmer/EN)</option>
                  <option value="ollama:deepseek-v4.1-flash">DeepSeek V4.1 Flash (STEM & Math)</option>
                  <option value="ollama:kimi-k2.7-code">Kimi K2.7 Code (Code Studio)</option>
                  <option value="ollama:qwen-2.5-coder">Qwen 2.5 Coder (Full Stack)</option>
                </optgroup>
                {health?.models && health.models.length > 0 && (
                  <optgroup label="Detected Server Models">
                    {health.models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.category})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Add to Home Screen Button (PWA) - Only shown before installation */}
            {!isStandalone && (
              <button
                type="button"
                onClick={() => setIsInstallModalOpen(true)}
                className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/35 text-indigo-300 rounded-lg text-[10px] sm:text-xs font-semibold transition shadow-sm flex-shrink-0"
                title="Add Zevio AI to Home Screen"
              >
                <Smartphone className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span className="hidden sm:inline">ដំឡើង (Install)</span>
                <span className="inline sm:hidden">ដំឡើង</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Install Guidance Modal */}
      <InstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
        isIOS={isIOS}
        isStandalone={isStandalone}
      />
    </>
  );
};
