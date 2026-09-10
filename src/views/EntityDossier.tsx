import { useMemo, useState } from "react";
import { useApp } from "../lib/store";

interface Entity {
  id: string;
  name: string;
  alias: string;
  kind: string;
  risk: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  riskColor: string;
  badge: string;
  badgeCls: string;
  summary: string;
  attrs: [string, string][];
}

const ENTITIES: Entity[] = [
  {
    id: "cape",
    name: "M/V CAPE ODYSSEY",
    alias: "IMO 9732144 (ex. AZOV LIGHT)",
    kind: "MARITIME VESSEL",
    risk: "CRITICAL",
    riskColor: "text-error border-error/50 bg-error/10",
    badge: "DARK VESSEL",
    badgeCls: "bg-error/20 text-error",
    summary:
      "Bulk carrier operating with AIS transponder disabled since Rotterdam departure. Matches thermal silhouette signature of sanctioned cargo transfer ops in Sector 7G.",
    attrs: [
      ["LENGTH", "228 M"],
      ["DRAFT", "14.1 M"],
      ["DISPLACEMENT", "48,200 DWT"],
      ["FLAG", "TANZANIA (FOC)"],
      ["LAST PORT", "ROTTERDAM 04/02"],
      ["SIGNATURE MATCH", "97.2%"],
    ],
  },
  {
    id: "echo",
    name: "FACILITY ECHO // DEPOT",
    alias: "N 36°44.4 W 121°47.2",
    kind: "INDUSTRIAL FACILITY",
    risk: "HIGH",
    riskColor: "text-tertiary-fixed-dim border-tertiary-fixed-dim/50 bg-tertiary-fixed-dim/10",
    badge: "THERMAL SURGE",
    badgeCls: "bg-tertiary-container text-on-tertiary-container",
    summary:
      "Fuel storage depot with repeated nocturnal thermal surges across vault rows B/C. Historical satellite archive shows gantry activity correlated with dark vessel arrivals.",
    attrs: [
      ["VAULTS", "18 (4 PRIMARY)"],
      ["HEAT DELTA", "+34.2°C AVG"],
      ["SECURITY", "PRIVATE + CCTV"],
      ["OWNER SHELL", "BOREALIS LTD"],
      ["CONFIDENCE", "98.4%"],
      ["PERSISTENCE", "21 NIGHTS"],
    ],
  },
  {
    id: "operator-k",
    name: "OPERATOR 'K'",
    alias: "Handle: k@protonmail / VOIP 41-07",
    kind: "HUMAN ACTOR",
    risk: "CRITICAL",
    riskColor: "text-error border-error/50 bg-error/10",
    badge: "HIGH-VALUE TARGET",
    badgeCls: "bg-error/20 text-error",
    summary:
      "Unattributed handler coordinating maritime + facility nodes via encrypted bursts. Betweenness centrality dominant in SNA cluster; suspected ex-logistics officer.",
    attrs: [
      ["COMMS", "BURST / OFFLINE DEAD DROPS"],
      ["LANGUAGES", "EN, RU, TR"],
      ["SNA RANK", "#1 CENTRALITY"],
      ["LAST OBSERVED", "38 MIN AGO"],
      ["PATTERN", "NIGHTLY 23:00-02:00Z"],
      ["AFFILIATION", "UNCONFIRMED"],
    ],
  },
  {
    id: "convoy12",
    name: "CONVOY VECTOR 12",
    alias: "6x 4-AXLE LOGISTICS TRUCKS",
    kind: "GROUND VECTOR",
    risk: "MEDIUM",
    riskColor: "text-secondary-fixed-dim border-secondary-fixed-dim/50 bg-secondary-fixed-dim/10",
    badge: "TRACKED",
    badgeCls: "bg-surface-container-lowest text-outline border border-outline-variant",
    summary:
      "Nightly logistics train shuttling between inland warehouse cluster and pier approach. Deviations from predicted corridor correlate with operator 'K' comms windows.",
    attrs: [
      ["UNITS", "6 TRACKED"],
      ["VELOCITY", "38 KM/H"],
      ["HEADING", "278° W"],
      ["DST TO PIER", "1.4 KM"],
      ["CORRIDOR DEV", "+1.2 KM"],
      ["CARGO", "SEALED ISO CONTAINERS"],
    ],
  },
  {
    id: "shell1",
    name: "SHELL MERIDIAN LLC",
    alias: "Reg: PAN-77421-A",
    kind: "CORPORATE SHELL",
    risk: "MEDIUM",
    riskColor: "text-secondary-fixed-dim border-secondary-fixed-dim/50 bg-secondary-fixed-dim/10",
    badge: "FRONT SUSPECTED",
    badgeCls: "bg-surface-container-high text-outline",
    summary:
      "Panama-registered holding entity linked to vessel beneficial ownership chain. Three director names appear across 12 dormant shelf companies (common mailbox, Ciudad de Panama).",
    attrs: [
      ["REGISTRY", "PANAMA 2019"],
      ["DIRECTORS", "3 SHARED"],
      ["SIBLINGS", "12 SHELF COMPANIES"],
      ["CAPITAL", "USD 5,000"],
      ["FILINGS", "DORMANT"],
      ["UPLIFT", "BOREALIS LTD"],
    ],
  },
  {
    id: "crane04",
    name: "DOCK CRANE ARRAY 04",
    alias: "STS GANTRY x3 / TERMINAL NORTH",
    kind: "INFRASTRUCTURE",
    risk: "LOW",
    riskColor: "text-outline border-outline-variant bg-surface-container",
    badge: "MONITORED",
    badgeCls: "bg-surface-container-high text-on-surface-variant",
    summary:
      "Ship-to-shore gantry cluster with anomalous night activity windows outside published port schedule. Motion telemetry cross-checked against pier camera gaps.",
    attrs: [
      ["UNITS", "3 STS GANTRY"],
      ["NIGHT MOVES", "6 DETECTED / 14D"],
      ["CAMERA GAPS", "11 MIN AVG"],
      ["DUTY SCHEDULE", "MISMATCH"],
      ["LAST EVENT", "01:47Z TODAY"],
      ["ASSESSMENT", "HANDOFF NODE"],
    ],
  },
];

const RISK_SORT: Record<Entity["risk"], number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export default function EntityDossier() {
  const { pushToast, setView } = useApp();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Entity>(ENTITIES[0]);
  const [watch, setWatch] = useState<string[]>(["cape", "operator-k"]);

  const filtered = useMemo(
    () =>
      ENTITIES.filter(
        (e) =>
          e.name.toLowerCase().includes(query.toLowerCase()) ||
          e.alias.toLowerCase().includes(query.toLowerCase()) ||
          e.kind.toLowerCase().includes(query.toLowerCase())
      ).sort((a, b) => RISK_SORT[a.risk] - RISK_SORT[b.risk]),
    [query]
  );

  const toggleWatch = (id: string) => {
    setWatch((w) => {
      const has = w.includes(id);
      pushToast({
        kind: has ? "info" : "ok",
        title: has ? "WATCHLIST REMOVED" : "WATCHLIST ADDED",
        msg: `${ENTITIES.find((e) => e.id === id)?.name} ${has ? "removed from" : "added to"} priority watchlist.`,
      });
      return has ? w.filter((x) => x !== id) : [...w, id];
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-space-md anim-fade-up">
      {/* List */}
      <div className="w-full lg:w-96 bg-surface-container-lowest/90 backdrop-blur-md rounded p-space-md shadow-lg border border-surface-container-high/40 flex flex-col gap-space-sm">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-primary text-base">manage_search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SEARCH ENTITY / ALIAS / CLASS…"
            className="flex-1 bg-surface-container rounded px-space-sm py-space-xs font-mono-sm text-mono-sm text-on-surface placeholder:text-outline-variant outline-none border border-transparent focus:border-primary-container/50 transition-colors"
          />
        </div>
        <div className="flex flex-col gap-space-2xs max-h-[560px] overflow-y-auto">
          {filtered.map((e) => {
            const active = selected.id === e.id;
            const onWatch = watch.includes(e.id);
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => setSelected(e)}
                className={`text-left p-space-sm rounded transition-colors flex flex-col gap-space-xs border ${
                  active
                    ? "bg-primary-container/10 border-primary-container/50"
                    : "bg-surface-container/60 hover:bg-surface-container-high border-transparent"
                }`}
              >
                <div className="flex items-center justify-between gap-space-xs">
                  <span className={`font-headline-sm text-headline-sm ${active ? "text-primary" : "text-on-surface"}`}>{e.name}</span>
                  <span className={`px-space-xs py-space-2xs rounded font-label-caps text-label-caps uppercase shrink-0 ${e.badgeCls}`}>{e.badge}</span>
                </div>
                <div className="flex items-center justify-between font-mono-sm text-mono-sm text-on-surface-variant">
                  <span className="truncate">{e.alias}</span>
                  {onWatch && <span className="material-symbols-outlined text-sm text-tertiary-fixed-dim">star</span>}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-body-sm font-body-sm text-on-surface-variant p-space-md text-center">
              No entities match query “{query}”.
            </div>
          )}
        </div>
      </div>

      {/* Dossier detail */}
      <div className="flex-1 bg-surface-container-lowest/90 backdrop-blur-md rounded p-space-md shadow-lg border border-surface-container-high/40 flex flex-col gap-space-sm">
        <div className="flex items-start justify-between gap-space-md flex-wrap">
          <div className="flex flex-col gap-space-2xs">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">{selected.kind} // DOSSIER REF {selected.id.toUpperCase().slice(0, 6)}-22</span>
            <span className="font-headline-lg text-headline-lg text-on-surface">{selected.name}</span>
            <span className="font-mono-sm text-mono-sm text-on-surface-variant">{selected.alias}</span>
          </div>
          <div className="flex items-center gap-space-xs">
            <span className={`px-space-sm py-space-xs rounded border font-label-caps text-label-caps uppercase ${selected.riskColor}`}>
              RISK: {selected.risk}
            </span>
            <button
              type="button"
              onClick={() => toggleWatch(selected.id)}
              className={`px-space-sm py-space-xs rounded font-label-caps text-label-caps uppercase flex items-center gap-space-2xs transition-colors ${
                watch.includes(selected.id)
                  ? "bg-tertiary-container text-on-tertiary-container"
                  : "bg-surface-container hover:bg-surface-container-high text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-sm">star</span>
              <span>{watch.includes(selected.id) ? "WATCHLISTED" : "WATCHLIST"}</span>
            </button>
          </div>
        </div>

        <div className="p-space-md bg-surface-container rounded text-body-md font-body-md text-on-surface-variant border-l-2 border-primary-container/60">
          {selected.summary}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-space-xs" key={selected.id}>
          {selected.attrs.map(([k, v]) => (
            <div key={k} className="p-space-sm bg-surface-container-high/50 rounded anim-fade-up">
              <div className="font-label-caps text-label-caps text-outline uppercase">{k}</div>
              <div className="font-mono-sm text-mono-sm text-on-surface mt-space-2xs">{v}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-space-xs mt-auto pt-space-sm">
          <button
            type="button"
            onClick={() => setView("sna-graph-matrix")}
            className="px-space-md py-space-sm rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-headline-sm text-headline-sm transition-all flex items-center gap-space-xs"
          >
            <span className="material-symbols-outlined text-base">hub</span>
            <span>View in SNA Matrix</span>
          </button>
          <button
            type="button"
            onClick={() => setView("orbital-satellite-recon")}
            className="px-space-md py-space-sm rounded bg-surface-container hover:bg-surface-container-high text-primary font-headline-sm text-headline-sm transition-all flex items-center gap-space-xs"
          >
            <span className="material-symbols-outlined text-base">public</span>
            <span>Locate on Orbital Feed</span>
          </button>
          <button
            type="button"
            onClick={() => pushToast({ kind: "ok", title: "DOSSIER EXPORT", msg: `${selected.name} dossier exported as PDF // TS/SCI sealed.` })}
            className="px-space-md py-space-sm rounded bg-primary-container text-on-primary-container font-headline-sm text-headline-sm font-bold shadow-[0_0_12px_rgba(0,229,255,0.35)] transition-all flex items-center gap-space-xs"
          >
            <span className="material-symbols-outlined text-base">download</span>
            <span>Export Dossier</span>
          </button>
        </div>
      </div>
    </div>
  );
}
