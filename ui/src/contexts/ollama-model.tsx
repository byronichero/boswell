import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api } from "@/lib/api";

const STORAGE_KEY = "boswell-ollama-chat-model";

function pickInitialModel(models: string[]): string {
  if (models.length === 0) return "";
  const stored = globalThis.window?.localStorage.getItem(STORAGE_KEY);
  if (stored && models.includes(stored)) return stored;
  return models[0];
}

interface OllamaModelContextValue {
  models: string[];
  model: string;
  setModel: (name: string) => void;
  loadError: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const OllamaModelContext = createContext<OllamaModelContextValue | null>(null);

export function OllamaModelProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [models, setModels] = useState<string[]>([]);
  const [model, setModelState] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const load = useCallback(async () => {
    setLoadError(null);
    setIsLoading(true);
    try {
      const res = await api.getOllamaModels();
      const list = res.models;
      setModels(list);
      setModelState((prev) => {
        if (prev && list.includes(prev)) return prev;
        return pickInitialModel(list);
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
      setModels([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setModel = useCallback((name: string) => {
    setModelState(name);
    globalThis.window?.localStorage.setItem(STORAGE_KEY, name);
  }, []);

  const value: OllamaModelContextValue = useMemo(
    () => ({
      models,
      model,
      setModel,
      loadError,
      isLoading,
      refresh: load,
    }),
    [models, model, setModel, loadError, isLoading, load],
  );

  return <OllamaModelContext.Provider value={value}>{children}</OllamaModelContext.Provider>;
}

export function useOllamaModel() {
  const ctx = useContext(OllamaModelContext);
  if (!ctx) throw new Error("useOllamaModel must be used within OllamaModelProvider");
  return ctx;
}
