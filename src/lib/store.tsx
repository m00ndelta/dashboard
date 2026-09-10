import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ViewId =
  | "mission-overview"
  | "sna-graph-matrix"
  | "orbital-satellite-recon"
  | "entity-dossier-watchlist"
  | "darkweb-social-feeds"
  | "export-intel-briefing";

export const VIEW_META: { id: ViewId; label: string; icon: string }[] = [
  { id: "mission-overview", label: "Mission Overview (Dashboard)", icon: "dashboard" },
  { id: "sna-graph-matrix", label: "SNA Graph Matrix", icon: "hub" },
  { id: "orbital-satellite-recon", label: "Orbital Satellite Recon", icon: "public" },
  { id: "entity-dossier-watchlist", label: "Entity Dossier & Watchlist", icon: "badge" },
  { id: "darkweb-social-feeds", label: "Darkweb & Social Feeds", icon: "rss_feed" },
  { id: "export-intel-briefing", label: "Export Intel Briefing", icon: "ios_share" },
];

export type ToastKind = "info" | "warn" | "crit" | "ok";

export interface Toast {
  id: number;
  title: string;
  msg?: string;
  kind: ToastKind;
}

interface AppState {
  view: ViewId;
  setView: (v: ViewId) => void;
  toasts: Toast[];
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  utc: string;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

function formatUtc(): string {
  return new Date().toISOString().slice(11, 19);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ViewId>("orbital-satellite-recon");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [utc, setUtc] = useState<string>(formatUtc);

  useEffect(() => {
    const id = window.setInterval(() => setUtc(formatUtc()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = Date.now() + Math.random();
      setToasts((cur) => [...cur.slice(-4), { ...t, id }]);
      window.setTimeout(() => dismissToast(id), 4600);
    },
    [dismissToast]
  );

  return (
    <Ctx.Provider value={{ view, setView, toasts, pushToast, dismissToast, utc }}>
      {children}
    </Ctx.Provider>
  );
}
