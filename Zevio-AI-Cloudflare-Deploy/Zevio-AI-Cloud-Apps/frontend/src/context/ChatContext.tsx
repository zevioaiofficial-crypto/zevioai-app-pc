import React, { createContext, useContext, useState, useEffect } from "react";
import { Conversation, Message } from "../types";
import { streamChatAPI } from "../services/api";
import { useApp } from "./AppContext";

interface ChatContextType {
  conversations: Conversation[];
  activeConversationId: string;
  activeConversation: Conversation | undefined;
  setActiveConversationId: (id: string) => void;
  createNewConversation: () => string;
  deleteConversation: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  regenerateLastMessage: () => Promise<void>;
  isStreaming: boolean;
  streamingContent: string;
  streamingError: string | null;
}

const STORAGE_KEY = "zevio_chat_conversations_v1";

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedModel } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });

  const [activeConversationId, setActiveConversationId] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [streamingError, setStreamingError] = useState<string | null>(null);

  // Initialize first conversation if empty
  useEffect(() => {
    if (conversations.length === 0) {
      const initialId = `conv_${Date.now()}`;
      const initialConv: Conversation = {
        id: initialId,
        title: "New Conversation",
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        model: selectedModel
      };
      setConversations([initialConv]);
      setActiveConversationId(initialId);
    } else if (!activeConversationId) {
      setActiveConversationId(conversations[0].id);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (_) {}
  }, [conversations]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const createNewConversation = (): string => {
    const newId = `conv_${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      title: "New Conversation",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: selectedModel
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(newId);
    setStreamingContent("");
    setStreamingError(null);
    return newId;
  };

  const deleteConversation = (id: string) => {
    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (filtered.length === 0) {
        const fallbackId = `conv_${Date.now()}`;
        const fallbackConv: Conversation = {
          id: fallbackId,
          title: "New Conversation",
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          model: selectedModel
        };
        setActiveConversationId(fallbackId);
        return [fallbackConv];
      }
      if (activeConversationId === id) {
        setActiveConversationId(filtered[0].id);
      }
      return filtered;
    });
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    let targetConvId = activeConversationId;
    if (!targetConvId) {
      targetConvId = createNewConversation();
    }

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: Date.now()
    };

    // Update conversation with user message & set title if first message
    setConversations(prev =>
      prev.map(c => {
        if (c.id === targetConvId) {
          const isFirst = c.messages.length === 0;
          const newTitle = isFirst ? (content.trim().slice(0, 36) + (content.length > 36 ? "..." : "")) : c.title;
          return {
            ...c,
            title: newTitle,
            messages: [...c.messages, userMessage],
            updatedAt: Date.now()
          };
        }
        return c;
      })
    );

    setIsStreaming(true);
    setStreamingContent("");
    setStreamingError(null);

    const targetConv = conversations.find(c => c.id === targetConvId);
    const historyMessages = targetConv ? [...targetConv.messages, userMessage] : [userMessage];

    let accumulatedContent = "";

    await streamChatAPI({
      messages: historyMessages.map(m => ({ role: m.role, content: m.content })),
      model: selectedModel,
      onChunk: (chunk: string) => {
        accumulatedContent += chunk;
        setStreamingContent(accumulatedContent);
      },
      onDone: () => {
        if (accumulatedContent.trim()) {
          const assistantMessage: Message = {
            id: `msg_asst_${Date.now()}`,
            role: "assistant",
            content: accumulatedContent,
            timestamp: Date.now(),
            model: selectedModel
          };

          setConversations(prev =>
            prev.map(c => {
              if (c.id === targetConvId) {
                return {
                  ...c,
                  messages: [...c.messages, assistantMessage],
                  updatedAt: Date.now()
                };
              }
              return c;
            })
          );
        }
        setIsStreaming(false);
        setStreamingContent("");
      },
      onError: (err: string) => {
        setStreamingError(err);
        setIsStreaming(false);
      }
    });
  };

  const regenerateLastMessage = async () => {
    if (!activeConversation || activeConversation.messages.length === 0 || isStreaming) return;

    // Find last user message
    const msgs = [...activeConversation.messages];
    if (msgs[msgs.length - 1].role === "assistant") {
      msgs.pop(); // remove last assistant message
    }

    const lastUserMsg = msgs[msgs.length - 1];
    if (!lastUserMsg || lastUserMsg.role !== "user") return;

    // Remove the last assistant message from conversation state
    setConversations(prev =>
      prev.map(c => {
        if (c.id === activeConversationId) {
          return {
            ...c,
            messages: msgs,
            updatedAt: Date.now()
          };
        }
        return c;
      })
    );

    setIsStreaming(true);
    setStreamingContent("");
    setStreamingError(null);

    let accumulatedContent = "";

    await streamChatAPI({
      messages: msgs.map(m => ({ role: m.role, content: m.content })),
      model: selectedModel,
      onChunk: (chunk: string) => {
        accumulatedContent += chunk;
        setStreamingContent(accumulatedContent);
      },
      onDone: () => {
        if (accumulatedContent.trim()) {
          const assistantMessage: Message = {
            id: `msg_asst_${Date.now()}`,
            role: "assistant",
            content: accumulatedContent,
            timestamp: Date.now(),
            model: selectedModel
          };

          setConversations(prev =>
            prev.map(c => {
              if (c.id === activeConversationId) {
                return {
                  ...c,
                  messages: [...c.messages, assistantMessage],
                  updatedAt: Date.now()
                };
              }
              return c;
            })
          );
        }
        setIsStreaming(false);
        setStreamingContent("");
      },
      onError: (err: string) => {
        setStreamingError(err);
        setIsStreaming(false);
      }
    });
  };

  return (
    <ChatContext.Provider
      value={{
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
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};

