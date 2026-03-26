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
import type { TrayItemCreate, TrayRead } from "@/types";

interface TrayContextValue {
  trayId: string | null;
  tray: TrayRead | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addItem: (item: TrayItemCreate) => Promise<void>;
  removeItem: (trayItemId: string) => Promise<void>;
}

const TrayContext = createContext<TrayContextValue | null>(null);

const STORAGE_KEY = "boswell_tray_id";

function getStoredTrayId(): string | null {
  if (globalThis.window === undefined) return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function TrayProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [trayId, setTrayId] = useState<string | null>(getStoredTrayId);
  const [tray, setTray] = useState<TrayRead | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!trayId) return;
    const next = await api.getTray(trayId);
    setTray(next);
  }, [trayId]);

  useEffect(() => {
    let cancelled = false;
    async function init(): Promise<void> {
      setIsLoading(true);
      setError(null);
      try {
        if (trayId) {
          const existing = await api.getTray(trayId);
          if (cancelled) return;
          setTray(existing);
          setIsLoading(false);
          return;
        }
        const created = await api.createTray();
        if (cancelled) return;
        localStorage.setItem(STORAGE_KEY, created.tray_id);
        setTrayId(created.tray_id);
        setTray(created);
        setIsLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setIsLoading(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [trayId]);

  const addItem = useCallback(
    async (item: TrayItemCreate) => {
      if (!trayId) throw new Error("Tray not initialized");
      await api.addTrayItem(trayId, item);
      await refresh();
    },
    [trayId, refresh],
  );

  const removeItem = useCallback(
    async (trayItemId: string) => {
      if (!trayId) throw new Error("Tray not initialized");
      await api.deleteTrayItem(trayId, trayItemId);
      await refresh();
    },
    [trayId, refresh],
  );

  const value: TrayContextValue = useMemo(
    () => ({ trayId, tray, isLoading, error, refresh, addItem, removeItem }),
    [trayId, tray, isLoading, error, refresh, addItem, removeItem],
  );

  return <TrayContext.Provider value={value}>{children}</TrayContext.Provider>;
}

export function useTray() {
  const ctx = useContext(TrayContext);
  if (!ctx) throw new Error("useTray must be used within TrayProvider");
  return ctx;
}

