import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { GameSettings, SaveData } from "@survivor/shared";
import type { RunResult } from "../game/types.js";
import { loadSave, writeSave } from "./localSave.js";

interface SaveContextValue {
  save: SaveData | null;
  loading: boolean;
  updateSettings: (patch: Partial<GameSettings>) => void;
  applyRunResult: (result: RunResult) => void;
}

const SaveContext = createContext<SaveContextValue | null>(null);

export function SaveProvider({ children }: { children: ReactNode }) {
  const [save, setSave] = useState<SaveData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadSave().then((loaded) => {
      if (!cancelled) {
        setSave(loaded);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<GameSettings>) => {
      setSave((prev) => {
        if (!prev) return prev;
        const next = { ...prev, settings: { ...prev.settings, ...patch } };
        void writeSave(next);
        return next;
      });
    },
    [],
  );

  const applyRunResult = useCallback(
    (result: RunResult) => {
      setSave((prev) => {
        if (!prev) return prev;
        const next: SaveData = {
          ...prev,
          gold: prev.gold + result.goldEarned,
          runePointsTotal: prev.runePointsTotal + result.runePointsEarned,
          normalCleared: prev.normalCleared || result.victory,
          stats: {
            runs: prev.stats.runs + 1,
            bestScore: Math.max(prev.stats.bestScore, result.score),
            totalKills: prev.stats.totalKills + result.kills,
          },
        };
        void writeSave(next);
        return next;
      });
    },
    [],
  );

  const value = useMemo<SaveContextValue>(
    () => ({ save, loading, updateSettings, applyRunResult }),
    [save, loading, updateSettings, applyRunResult],
  );

  return <SaveContext.Provider value={value}>{children}</SaveContext.Provider>;
}

export function useSave(): SaveContextValue {
  const ctx = useContext(SaveContext);
  if (!ctx) throw new Error("useSave must be used within a SaveProvider");
  return ctx;
}
