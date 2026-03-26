import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "@/App";
import { ChatProvider } from "@/contexts/chat";
import { CorpusScopeProvider } from "@/contexts/corpus-scope";
import { ThemeProvider } from "@/contexts/theme";
import { TrayProvider } from "@/contexts/tray";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <TrayProvider>
          <CorpusScopeProvider>
            <ChatProvider>
              <App />
            </ChatProvider>
          </CorpusScopeProvider>
        </TrayProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

