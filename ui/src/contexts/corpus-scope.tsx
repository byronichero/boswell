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
import type { Period, ScopeInfo, WorkListItem } from "@/types";

interface CorpusScopeContextValue {
  periods: Period[];
  periodId: number | null;
  setPeriodId: (periodId: number | null) => void;
  softScope: boolean;
  setSoftScope: (soft: boolean) => void;
  scopeInfo: ScopeInfo | null;
  works: WorkListItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface CorpusScopeProviderProps {
  readonly children: ReactNode;
}

const CorpusScopeContext = createContext<CorpusScopeContextValue | null>(null);

export function CorpusScopeProvider({ children }: CorpusScopeProviderProps) {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [periodId, setPeriodId] = useState<number | null>(null);
  const [softScope, setSoftScope] = useState<boolean>(true);
  const [scopeInfo, setScopeInfo] = useState<ScopeInfo | null>(null);
  const [works, setWorks] = useState<WorkListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);

    const [periodsRes, scopeRes, worksRes] = await Promise.allSettled([
      api.getPeriods(),
      api.getScope(periodId, softScope),
      api.getWorks(periodId, softScope),
    ]);

    if (periodsRes.status === "fulfilled") setPeriods(periodsRes.value);
    else setPeriods([]);

    if (scopeRes.status === "fulfilled") setScopeInfo(scopeRes.value);
    else setScopeInfo(null);

    if (worksRes.status === "fulfilled") setWorks(worksRes.value);
    else setWorks([]);

    const errors: string[] = [];
    if (periodsRes.status === "rejected") errors.push(`periods: ${String(periodsRes.reason)}`);
    if (scopeRes.status === "rejected") errors.push(`scope: ${String(scopeRes.reason)}`);
    if (worksRes.status === "rejected") errors.push(`works: ${String(worksRes.reason)}`);
    if (errors.length > 0) setError(errors.join(" | "));
  }, [periodId, softScope]);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setIsLoading(true);
      try {
        await refresh();
        if (cancelled) return;
        setIsLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const value: CorpusScopeContextValue = useMemo(
    () => ({
      periods,
      periodId,
      setPeriodId,
      softScope,
      setSoftScope,
      scopeInfo,
      works,
      isLoading,
      error,
      refresh,
    }),
    [periods, periodId, softScope, scopeInfo, works, isLoading, error, refresh],
  );

  return <CorpusScopeContext.Provider value={value}>{children}</CorpusScopeContext.Provider>;
}

export function useCorpusScope() {
  const ctx = useContext(CorpusScopeContext);
  if (!ctx) throw new Error("useCorpusScope must be used within CorpusScopeProvider");
  return ctx;
}

