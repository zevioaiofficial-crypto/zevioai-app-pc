import React, { createContext, useContext, useState, useEffect } from "react";
import { TabType, HealthResponse } from "../types";
import { getHealthStatus } from "../services/api";

interface AppContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  health: HealthResponse | null;
  isLoadingHealth: boolean;
  refreshHealth: () => Promise<void>;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  isStatusModalOpen: boolean;
  setIsStatusModalOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitialTab = (): TabType => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes("code")) return "code";
      if (hash.includes("homework")) return "homework";
      if (hash.includes("chat")) return "chat";
    }
    return "chat";
  };

  const getInitialModel = (): string => {
    try {
      const stored = localStorage.getItem("zevio_selected_model");
      if (stored && stored.trim()) return stored;
    } catch (_) {}
    return "gemini-3.5-flash-lite";
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState<boolean>(true);
  const [selectedModel, setSelectedModelState] = useState<string>(getInitialModel);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);

  const setSelectedModel = (model: string) => {
    setSelectedModelState(model);
    try {
      localStorage.setItem("zevio_selected_model", model);
    } catch (_) {}
  };

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes("code")) setActiveTab("code");
      else if (hash.includes("homework")) setActiveTab("homework");
      else if (hash.includes("chat")) setActiveTab("chat");
    };
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const refreshHealth = async () => {
    setIsLoadingHealth(true);
    const data = await getHealthStatus();
    setHealth(data);
    try {
      const stored = localStorage.getItem("zevio_selected_model");
      if (!stored && data.inference?.activeModel) {
        setSelectedModelState(data.inference.activeModel);
      }
    } catch (_) {}
    setIsLoadingHealth(false);
  };

  useEffect(() => {
    refreshHealth();
    const interval = setInterval(refreshHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        health,
        isLoadingHealth,
        refreshHealth,
        selectedModel,
        setSelectedModel,
        isStatusModalOpen,
        setIsStatusModalOpen
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

