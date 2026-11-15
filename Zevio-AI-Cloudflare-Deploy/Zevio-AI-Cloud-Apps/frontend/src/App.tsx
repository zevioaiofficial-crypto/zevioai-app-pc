import React from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { ChatProvider } from "./context/ChatContext";
import { Navbar } from "./components/Navbar";
import { ServerStatusModal } from "./components/ServerStatusModal";
import { ChatView } from "./components/chat/ChatView";
import { HomeworkView } from "./components/homework/HomeworkView";
import { CodeStudioView } from "./components/code/CodeStudioView";

const AppContent: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-slate-950 text-slate-100 font-sans">
      <Navbar />
      <main className="flex-1 min-h-0 overflow-hidden relative flex flex-col">
        {activeTab === "chat" && <ChatView />}
        {activeTab === "homework" && <HomeworkView />}
        {activeTab === "code" && <CodeStudioView />}
      </main>
      <ServerStatusModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <ChatProvider>
        <AppContent />
      </ChatProvider>
    </AppProvider>
  );
};

export default App;
