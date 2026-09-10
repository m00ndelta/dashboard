import { useState } from "react";
import { useApp } from "../lib/store";

interface Node {
  id: string;
  label: string;
  sub: string;
  x: number;
  y: number;
  color: string;
  risk: number;
  kind: "vessel" | "facility" | "actor" | "shell" | "forum" | "convoy";
}

const NODES: Node[] = [
  { id: "hermes", label: "THE HERMES", sub: "COORDINATION NODE", x: 400, y: 60, color: "#00e5ff", risk: 92, kind: "actor" },
  { id: "atlas", label: "ATLAS-6", sub: "MARITIME BROKER", x: 170, y: 150, color: "#adc6ff", risk: 74, kind: "actor" },
  { id: "k", label: "OPERATOR 'K'", sub: "UNKNOWN HANDLER", x: 630, y: 110, color: "#ffb4ab", risk: 97, kind: "actor" },
  { id: "shell1", label: "SHELL MERIDIAN LLC", sub: "PANAMA REGISTRY", x: 80, y: 300, color: "#849396", risk: 55, kind: "shell" },
  { id: "shell2", label: "SHELL BOREALIS LTD", sub: "DELAWARE REGISTRY", x: 260, y: 330, color: "#849396", risk: 51, kind: "shell" },
  { id: "cape", label: "M/V CAPE ODYSSEY", sub: "AIS DARK VESSEL", x: 500, y: 290, color: "#ffb4ab", risk: 88, kind: "vessel" },
  { id: "echo", label: "FACILITY ECHO", sub: "FUEL DEPOT", x: 730, y: 250, color: "#ffb95f", risk: 81, kind: "facility" },
  { id: "convoy", label: "CONVOY VECTOR 12", sub: "LOGISTICS TRAIN", x: 640, y: 420, color: "#00daf3", risk: 63, kind: "convoy" },
  { id: "xeon", label: "DARKFORUM://XEON", sub: "MARKETPLACE CHATTER", x: 150, y: 440, color: "#adc6ff", risk: 58, kind: "forum" },
  { id: "grafter", label: "GRAFTER CO.", sub: "BROKERAGE FRONT", x: 390, y: 430, color: "#849396", risk: 47, kind: "shell" },
  { id: "ais", label: "AIS DARK NET", sub: "SPOOF CLUSTER", x: 760, y: 130, color: "#00e5ff", risk: 69, kind: "facility" },
];

const EDGES: [string, string, number][] = [
  ["hermes", "atlas", 4],
  ["hermes", "k", 5],
  ["hermes", "ais", 2],
  ["atlas", "shell1", 3],
  ["atlas", "shell2", 2],
  ["shell1", "cape", 4],
  ["shell2", "grafter", 3],
  ["grafter", "cape", 3],
  ["k", "echo", 4],
  ["k", "ais", 2],
  ["echo", "convoy", 3],
  ["cape", "echo", 4],
  ["xeon", "grafter", 2],
  ["xeon", "shell2", 2],
  ["cape", "convoy", 2],
];

const KIND_LABEL: Record<Node["kind"], string> = {
  vessel: "MARITIME ASSET",
  facility: "FACILITY",
  actor: "HUMAN ACTOR",
  shell: "CORPORATE SHELL",
  forum: "DARKWEB SOURCE",
  convoy: "GROUND VECTOR",
};

export default function SnaMatrix() {
  const { pushToast, setView } = useApp();
  const [selected, setSelected] = useState<string | null>("hermes");
  const [zoom, setZoom] = useState(1);

  const sel = NODES.find((n) => n.id === selected) ?? null;

  return (
    <div className="flex flex-col xl:flex-row gap-space-md anim-fade-up">
      {/* Graph canvas */}
      <div className="flex-1 bg-surface-container-lowest/90 backdrop-blur-md rounded p-space-md shadow-lg border border-surface-container-high/40 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-base">hub</span>
            <span className="font-headline-sm text-headline-sm text-on-surface">Social Network Analysis — THE HERMES Cluster</span>
          </div>
          <div className="flex items-center gap-space-xs">
            <button type="button" onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.15).toFixed(2)))} className="p-space-xs rounded bg-surface-container hover:bg-surface-container-high text-on-surface">
              <span className="material-symbols-outlined text-base">zoom_out</span>
            </button>
            <span className="font-mono-sm text-mono-sm text-outline tabular-nums w-10 text-center">{zoom.toFixed(2)}x</span>
            <button type="button" onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.15).toFixed(2)))} className="p-space-xs rounded bg-surface-container hover:bg-surface-container-high text-on-surface">
              <span className="material-symbols-outlined text-base">zoom_in</span>
            </button>
            <button
              type="button"
              onClick={() => pushToast({ kind: "info", title: "SNA RECOMPUTE", msg: "Betweenness centrality re-computed over 11 nodes / 15 edges." })}
              className="px-space-sm py-space-xs bg-surface-container hover:bg-surface-container-high rounded font-label-caps text-label-caps text-primary uppercase"
            >
              RECOMPUTE
            </button>
          </div>
        </div>

        <div className="relative flex-1 min-h-[420px] bg-surface-container-low rounded overflow-hidden">
          <div className="absolute inset-0 scanlines-grid pointer-events-none" />
          <svg viewBox="0 0 800 500" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            <g transform={`translate(${400 - 400 * zoom} ${250 - 250 * zoom}) scale(${zoom})`}>
              {EDGES.map(([a, b], i) => {
                const na = NODES.find((n) => n.id === a)!;
                const nb = NODES.find((n) => n.id === b)!;
                const hot = selected === a || selected === b;
                return (
                  <line
                    key={i}
                    x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                    stroke={hot ? "#00e5ff" : "#3b494c"}
                    strokeWidth={hot ? 2 : 1}
                    strokeOpacity={hot ? 0.9 : 0.55}
                    className={hot ? "anim-edge" : ""}
                    strokeDasharray={hot ? "6 6" : undefined}
                  />
                );
              })}
              {NODES.map((n) => {
                const active = selected === n.id;
                const r = active ? 14 : 9;
                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x} ${n.y})`}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelected(n.id);
                      pushToast({ kind: "info", title: "NODE SELECTED", msg: `${n.label} focused — edges isolated.` });
                    }}
                  >
                    {active && <circle r={r + 7} fill="none" stroke={n.color} strokeOpacity={0.35} />}
                    <circle r={r} fill="#0b0e15" stroke={n.color} strokeWidth={active ? 2.5 : 1.5} />
                    <circle r={3} fill={n.color} />
                    <text y={r + 16} textAnchor="middle" fill="#e1e2ec" fontSize="11" fontFamily="JetBrains Mono">
                      {n.label}
                    </text>
                    <text y={r + 29} textAnchor="middle" fill="#849396" fontSize="8.5" fontFamily="JetBrains Mono">
                      {n.sub}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          <div className="absolute bottom-space-sm left-space-sm flex items-center gap-space-md font-mono-sm text-mono-sm text-on-surface-variant bg-surface-container-lowest/80 backdrop-blur rounded px-space-sm py-space-xs">
            <span className="flex items-center gap-space-xs"><span className="h-2 w-2 rounded-full bg-error"></span> RISK &gt; 80</span>
            <span className="flex items-center gap-space-xs"><span className="h-2 w-2 rounded-full bg-primary-container"></span> CENTRALITY</span>
            <span className="flex items-center gap-space-xs"><span className="h-2 w-2 rounded-full bg-outline"></span> FRONT / SHELL</span>
          </div>
        </div>
      </div>

      {/* Inspector */}
      <div className="w-full xl:w-80 bg-surface-container-lowest/90 backdrop-blur-md rounded p-space-md shadow-lg border border-surface-container-high/40 flex flex-col gap-space-sm">
        <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">NODE INSPECTOR</span>
        {sel ? (
          <div className="flex flex-col gap-space-sm anim-fade-up" key={sel.id}>
            <div className="flex items-center gap-space-sm">
              <span className="w-3 h-3 rounded-full" style={{ background: sel.color, boxShadow: `0 0 10px ${sel.color}` }} />
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface">{sel.label}</span>
                <span className="font-mono-sm text-mono-sm text-on-surface-variant">{KIND_LABEL[sel.kind]}</span>
              </div>
            </div>
            <div className="p-space-sm bg-surface-container rounded flex flex-col gap-space-xs">
              <div className="flex justify-between font-mono-sm text-mono-sm">
                <span className="text-outline">RISK SCORE</span>
                <span className="text-error font-bold">{sel.risk}/100</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${sel.risk}%`, background: sel.color }} />
              </div>
              <div className="flex justify-between font-mono-sm text-mono-sm mt-space-xs">
                <span className="text-outline">DEGREE</span>
                <span className="text-on-surface">{EDGES.filter(([a, b]) => a === sel.id || b === sel.id).length}</span>
              </div>
              <div className="flex justify-between font-mono-sm text-mono-sm">
                <span className="text-outline">BETWEENNESS</span>
                <span className="text-on-surface">{Math.round(0.1 + sel.risk * 0.0042 * 100) / 100}</span>
              </div>
              <div className="flex justify-between font-mono-sm text-mono-sm">
                <span className="text-outline">LAST SIGINT</span>
                <span className="text-tertiary-fixed-dim">38 MIN AGO</span>
              </div>
            </div>
            <div className="flex flex-col gap-space-xs">
              <button
                type="button"
                onClick={() => setView("entity-dossier-watchlist")}
                className="px-space-md py-space-sm rounded bg-primary-container text-on-primary-container font-headline-sm text-headline-sm font-bold shadow-[0_0_12px_rgba(0,229,255,0.3)] hover:shadow-[0_0_20px_rgba(0,229,255,0.5)] transition-all flex items-center justify-center gap-space-xs"
              >
                <span className="material-symbols-outlined text-base">badge</span>
                <span>OPEN DOSSIER</span>
              </button>
              <button
                type="button"
                onClick={() => pushToast({ kind: "ok", title: "SNA EXPORT", msg: `Subgraph of ${sel.label} exported as GEXF (11 nodes).` })}
                className="px-space-md py-space-sm rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-headline-sm text-headline-sm transition-all flex items-center justify-center gap-space-xs"
              >
                <span className="material-symbols-outlined text-base">download</span>
                <span>Export Subgraph</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-body-sm font-body-sm text-on-surface-variant">Select a node on the graph to inspect.</div>
        )}
      </div>
    </div>
  );
}
