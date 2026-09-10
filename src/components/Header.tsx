import { useEffect, useState } from "react";
import { useApp } from "../lib/store";

/** Crosshair emblem used as logo */
export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9cf0ff" />
          <stop offset="1" stopColor="#00daf3" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill="none" stroke="url(#lg1)" strokeWidth="1.5" opacity="0.9" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="#00e5ff" strokeWidth="1" strokeDasharray="3 3" />
      <path d="M16 2v8M16 22v8M2 16h8M22 16h8" stroke="url(#lg1)" strokeWidth="2" />
      <circle cx="16" cy="16" r="3" fill="#00e5ff" />
      <circle cx="16" cy="16" r="6" fill="none" stroke="#00e5ff" strokeWidth="1" opacity="0.55" />
    </svg>
  );
}

export default function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { utc } = useApp();
  const [latency, setLatency] = useState(14);

  useEffect(() => {
    const id = window.setInterval(
      () => setLatency(Math.round(11 + Math.random() * 8)),
      2600
    );
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/90 backdrop-blur-md border-b border-surface-container-high/50">
      <div className="h-16 w-full px-container-padding flex items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md min-w-0">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-space-xs rounded bg-surface-container-high text-on-surface"
            aria-label="Toggle navigation"
          >
            <span className="material-symbols-outlined text-lg">menu</span>
          </button>
          <Logo className="h-8 w-8 shrink-0" />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-space-xs">
              <span className="font-headline-sm text-headline-sm text-primary tracking-tight whitespace-nowrap">
                SPECTRA OSINT
              </span>
              <span className="font-mono-sm text-mono-sm text-outline-variant hidden sm:inline">//</span>
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider hidden sm:inline">
                TACTICAL INTELLIGENCE COMMAND
              </span>
            </div>
            <div className="flex items-center gap-space-sm">
              <span className="px-space-xs py-space-2xs bg-surface-container-high rounded text-error font-label-caps text-label-caps uppercase border-l-2 border-error whitespace-nowrap">
                SECRET // REL TO INTEL COMMUNITY
              </span>
              <span className="font-mono-sm text-mono-sm text-outline hidden xl:inline">
                ORBIT_GRID // EPSG:4326
              </span>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-space-lg">
          <div className="flex items-center gap-space-xs px-space-sm py-space-2xs bg-surface-container rounded">
            <span className="h-2 w-2 rounded-full bg-tertiary-fixed-dim animate-pulse"></span>
            <span className="font-label-caps text-label-caps text-tertiary-fixed-dim uppercase">
              THREAT: ELEVATED (DEFCON 3)
            </span>
          </div>
          <div className="flex items-center gap-space-xs px-space-sm py-space-2xs bg-surface-container rounded">
            <span className="material-symbols-outlined text-primary text-base">satellite_alt</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">ACTIVE:</span>
            <span className="font-mono-sm text-mono-sm text-primary">SAR-4 / EO-9 / SENTINEL</span>
          </div>
          <div className="flex items-center gap-space-xs px-space-sm py-space-2xs bg-surface-container rounded">
            <span className="material-symbols-outlined text-outline text-base">schedule</span>
            <span className="font-mono-md text-mono-md text-on-surface tabular-nums">{utc}</span>
            <span className="font-mono-sm text-mono-sm text-outline-variant">[ZULU]</span>
          </div>
          <div className="flex items-center gap-space-xs px-space-sm py-space-2xs bg-surface-container rounded">
            <span className="material-symbols-outlined text-secondary-fixed-dim text-base">bolt</span>
            <span className="font-mono-sm text-mono-sm text-secondary-fixed-dim font-bold tabular-nums">
              {latency}ms
            </span>
          </div>
        </div>

        <div className="flex items-center gap-space-md">
          <div className="hidden md:flex flex-col items-end text-right">
            <span className="font-headline-sm text-headline-sm text-on-surface">
              Senior Analyst - Unit 07
            </span>
            <span className="font-mono-sm text-mono-sm text-primary">AUTH: LEVEL-4 TS/SCI</span>
          </div>
          <div className="relative flex items-center">
            <div className="w-8 h-8 rounded-full bg-surface-container-high ring-1 ring-primary-container/40 flex items-center justify-center">
              <span className="font-mono-sm text-mono-sm text-primary font-bold">U7</span>
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-primary-container rounded-full ring-2 ring-surface-container-lowest"></span>
          </div>
        </div>
      </div>
    </header>
  );
}
