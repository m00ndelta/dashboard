import { useEffect, useState } from "react";
import { useApp, VIEW_META, type ViewId } from "../lib/store";

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { view, setView, pushToast } = useApp();
  const [latency, setLatency] = useState(14);
  const [load, setLoad] = useState(80);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLatency(Math.round(11 + Math.random() * 8));
      setLoad(Math.round(68 + Math.random() * 26));
    }, 2400);
    return () => window.clearInterval(id);
  }, []);

  const navigate = (v: ViewId) => {
    setView(v);
    onClose();
    if (v !== view) {
      pushToast({
        kind: "info",
        title: "VECTOR SWITCHED",
        msg: `Routing to ${VIEW_META.find((m) => m.id === v)?.label}`,
      });
    }
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={`fixed left-0 top-16 bottom-0 w-64 bg-surface-container-lowest/80 backdrop-blur-md z-40 flex flex-col justify-between p-space-sm border-r border-surface-container-high/40 transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col gap-space-md">
          <div className="px-space-sm py-space-xs flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
              PRIMARY VECTORS
            </span>
            <span className="font-mono-sm text-mono-sm text-outline-variant">SYS.REV 4.8</span>
          </div>
          <nav className="flex flex-col gap-space-xs">
            {VIEW_META.map((m) => {
              const active = view === m.id;
              return (
                <a
                  key={m.id}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(m.id);
                  }}
                  className={`flex items-center gap-space-sm px-space-sm py-space-sm rounded transition-all ${
                    active
                      ? "bg-primary-container text-on-primary-container font-headline-sm text-headline-sm shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{m.icon}</span>
                  <span className="text-sm leading-5">{m.label}</span>
                </a>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-space-xs p-space-sm bg-surface-container-low rounded">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-outline uppercase">SYS LATENCY</span>
            <span className="font-mono-sm text-mono-sm text-primary font-bold tabular-nums">{latency}ms</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-outline uppercase">SEC PROTOCOL</span>
            <span className="font-mono-sm text-mono-sm text-secondary-fixed-dim">AES-256 GCM</span>
          </div>
          <div className="w-full bg-surface-container h-1 rounded overflow-hidden mt-space-xs">
            <div
              className="bg-primary-container h-full transition-all duration-700"
              style={{ width: `${load}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between mt-space-xs">
            <span className="font-mono-sm text-mono-sm text-outline-variant">LINK: STABLE</span>
            <span className="h-1.5 w-1.5 rounded-full bg-primary-container animate-ping"></span>
          </div>
        </div>
      </aside>
    </>
  );
}
