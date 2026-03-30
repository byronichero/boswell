import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "@/App";
import { ChatProvider } from "@/contexts/chat";
import { CorpusScopeProvider } from "@/contexts/corpus-scope";
import { OllamaModelProvider } from "@/contexts/ollama-model";
import { ThemeProvider } from "@/contexts/theme";
import { TrayProvider } from "@/contexts/tray";
import { TtsVoiceProvider } from "@/contexts/tts-voice";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <TtsVoiceProvider>
        <TrayProvider>
          <CorpusScopeProvider>
            <OllamaModelProvider>
              <ChatProvider>
                <App />
              </ChatProvider>
            </OllamaModelProvider>
          </CorpusScopeProvider>
        </TrayProvider>
        </TtsVoiceProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

