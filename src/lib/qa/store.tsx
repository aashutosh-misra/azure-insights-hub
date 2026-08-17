import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { makeSeed } from "./seed";
import { loadQaState, saveQaState } from "./persist.functions";
import type { QaState } from "./types";

const STORAGE_KEY = "qa-app-state-v2";

export type StorageMode = "local" | "postgres";

interface QaContextValue {
  state: QaState;
  hydrated: boolean;
  /** where data is persisted: shared Postgres database or this browser only */
  storage: StorageMode;
  update: (fn: (draft: QaState) => QaState) => void;
  set: <K extends keyof QaState>(key: K, value: QaState[K]) => void;
  log: (action: string) => void;
  reset: () => void;
  currentUser: QaState["users"][number];
  /** modules filtered by the active project selection */
  projectFilter: (proj: string) => boolean;
}

const QaContext = createContext<QaContextValue | null>(null);

export function QaProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<QaState>(() => makeSeed());
  const [hydrated, setHydrated] = useState(false);
  const [storage, setStorage] = useState<StorageMode>("local");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      // 1. Try the shared Postgres database (only active when DATABASE_URL is set).
      try {
        const remote = await loadQaState();
        if (cancelled) return;
        if (remote.enabled) {
          setStorage("postgres");
          if (remote.json) {
            const parsed = JSON.parse(remote.json) as Partial<QaState>;
            setState((s) => ({ ...s, ...parsed, settings: { ...s.settings, ...parsed.settings } }));
          }
          setHydrated(true);
          return;
        }
      } catch {
        /* fall through to local storage */
      }

      // 2. Fall back to this browser's local storage.
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<QaState>;
          setState((s) => ({ ...s, ...parsed, settings: { ...s.settings, ...parsed.settings } }));
        }
      } catch {
        /* ignore corrupt state */
      }
      if (!cancelled) setHydrated(true);
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (storage === "postgres") {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void saveQaState({ data: { json: JSON.stringify(state) } }).catch(() => undefined);
      }, 600);
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota */
    }
  }, [state, hydrated, storage]);


  const update = useCallback((fn: (draft: QaState) => QaState) => {
    setState((s) => fn(s));
  }, []);

  const set = useCallback(<K extends keyof QaState>(key: K, value: QaState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
  }, []);

  const log = useCallback((action: string) => {
    setState((s) => {
      const user = s.users.find((u) => u.id === s.currentUserId);
      return {
        ...s,
        activity: [
          { id: `a${Date.now()}${Math.round(Math.random() * 1000)}`, ts: new Date().toISOString(), user: user?.name ?? "System", action },
          ...s.activity,
        ].slice(0, 200),
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState(makeSeed());
  }, []);

  const value = useMemo<QaContextValue>(() => {
    const currentUser = state.users.find((u) => u.id === state.currentUserId) ?? state.users[0]!;
    return {
      state,
      hydrated,
      storage,

      update,
      set,
      log,
      reset,
      currentUser,
      projectFilter: (proj: string) => state.currentProject === "All" || proj === state.currentProject,
    };
  }, [state, hydrated, storage, update, set, log, reset]);

  return <QaContext.Provider value={value}>{children}</QaContext.Provider>;
}

export function useQa() {
  const ctx = useContext(QaContext);
  if (!ctx) throw new Error("useQa must be used inside QaProvider");
  return ctx;
}

export function uid(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}
