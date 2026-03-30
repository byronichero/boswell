import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";

import Layout from "@/components/layout";
import { SplashScreen } from "@/components/splash-screen";
import ConcordancePage from "@/pages/concordance";
import CorpusPage from "@/pages/corpus";
import HomePage from "@/pages/home";
import ChatPage from "@/pages/chat";
import FaqPage from "@/pages/faq";
import GraphLabPage from "@/pages/graph-lab";
import HelpPage from "@/pages/help";
import TutorialPage from "@/pages/tutorial";
import KnowledgeBasePage from "@/pages/knowledge-base";
import KeywordsPage from "@/pages/keywords";
import SemanticPage from "@/pages/semantic";
import StatusPage from "@/pages/status";
import StylisticsPage from "@/pages/stylistics";
import SynthesizePage from "@/pages/synthesize";

const SPLASH_STORAGE_KEY = "boswell-splash-dismissed";

export function App() {
  const [entered, setEntered] = useState<boolean>(false);

  useEffect(() => {
    const dismissed = globalThis.window?.localStorage.getItem(SPLASH_STORAGE_KEY) === "true";
    setEntered(dismissed);
  }, []);

  function handleEnter(persistDismiss: boolean): void {
    if (persistDismiss) {
      globalThis.window?.localStorage.setItem(SPLASH_STORAGE_KEY, "true");
    }
    setEntered(true);
  }

  if (!entered) return <SplashScreen onEnter={handleEnter} />;

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="corpus" element={<CorpusPage />} />
        <Route path="concordance" element={<ConcordancePage />} />
        <Route path="keywords" element={<KeywordsPage />} />
        <Route path="semantic" element={<SemanticPage />} />
        <Route path="stylistics" element={<StylisticsPage />} />
        <Route path="synthesize" element={<SynthesizePage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="knowledge-base" element={<KnowledgeBasePage />} />
        <Route path="graph-lab" element={<GraphLabPage />} />
        <Route path="status" element={<StatusPage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="tutorial" element={<TutorialPage />} />
        <Route path="help" element={<HelpPage />} />
      </Route>
    </Routes>
  );
}

