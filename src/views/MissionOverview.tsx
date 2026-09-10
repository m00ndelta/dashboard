import { useApp } from "../lib/store";

const KPIS = [
  { label: "ACTIVE TRACKS", value: "42", delta: "+7 / 24H", icon: "track_changes", tone: "text-primary-container" },
  { label: "CRITICAL ALERTS", value: "3", delta: "2 UNACK", icon: "warning", tone: "text-error" },
  { label: "PASSES SCHEDULED", value: "17", delta: "24H WINDOW", icon: "satellite_alt", tone: "text-secondary-fixed-dim" },
  { label: "INT INGESTED", value: "1.84 TB", delta: "+312 GB", icon: "database", tone: "text-tertiary-fixed-dim" },
];

const SECTORS = [
  { name: "SECTOR 7G", val: 86, color: "#00e5ff" },
  { name: "SECTOR 3A", val: 42, color: "#0566d9" },
  { name: "SECTOR 9K", val: 63, color: "#ffb95f" },
  { name: "SECTOR 2F", val: 24, color: "#adc6ff" },
  { name: "SECTOR 5D", val: 57, color: "#c3f5ff" },
  { name: "SECTOR 8H", val: 71, color: "#00daf3" },
];

const ALERTS = [
  { t: "13:52Z", sev: "CRIT", txt: "AIS transponder dark vessel re-entered littoral exclusion zone.", src: "AIS-NET" },
  { t: "13:47Z", sev: "HIGH", txt: "Thermal surge at FACILITY ECHO vault row — fuel transfer suspected.", src: "FLIR" },
  { t: "13:31Z", sev: "MED", txt: "Convoy vector 12 deviated 1.2 km from predicted corridor.", src: "SNA-PRED" },
  { t: "12:58Z", sev: "HIGH", txt: "Encrypted burst transmission detected near port district.", src: "SIGINT" },
  { t: "12:44Z", sev: "LOW", txt: "New crane gantry motion signature logged at terminal 04.", src: "EO-RGB" },
  { t: "12:20Z", sev: "MED", txt: "Darkweb chatter spike referencing 'harbor schedule' in market forum.", src: "TORCHAN" },
];

const ASSETS = [
  { name: "SAR-4 / SENTINEL-1D", orbit: "693 KM SSO", task: "RE-VISIT 14:30Z", status: "TASKED", stCls: "text-primary-container border-primary-container/40" },
  { name: "SKY-SAT-7", orbit: "450 KM SSO", task: "STEREO STRIP", status: "AOS 18M", stCls: "text-tertiary-fixed-dim border-tertiary-fixed-dim/40" },
  { name: "WORLDVIEW-4", orbit: "617 KM SSO", task: "STANDBY", status: "AOS 44M", stCls: "text-outline border-outline-variant" },
  { name: "RELAY LEO-3", orbit: "560 KM", task: "DOWNLINK RELAY", status: "LINKED", stCls: "text-primary border-primary/40" },
];

const SEV_STYLE: Record<string, string> = {
  CRIT: "bg-error/20 text-error",
  HIGH: "bg-tertiary-container/20 text-tertiary-fixed-dim",
  MED: "bg-secondary-container/30 text-secondary-fixed-dim",
  LOW: "bg-surface-container-high text-on-surface-variant",
};

export default function MissionOverview() {
  const { pushToast, setView } = useApp();

  return (
    <div className="flex flex-col gap-space-md anim-fade-up">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        {KPIS.map((k) => (
          <div
            key={k.label}
            className="bg-surface-container-lowest/90 backdrop-blur-md rounded p-space-md shadow-lg border border-surface-container-high/40 hover:border-primary-container/30 transition-colors cursor-pointer"
            onClick={() => pushToast({ kind: "info", title: k.label, msg: "Detail panel queued for next build cycle." })}
          >
            <div className="flex items-center justify-between">
              <span className={`material-symbols-outlined text-xl ${k.tone}`}>{k.icon}</span>
              <span className="font-mono-sm text-mono-sm text-outline uppercase">{k.delta}</span>
            </div>
            <div className="mt-space-sm font-display-lg text-display-lg text-on-surface tabular-nums leading-none">{k.value}</div>
            <div className="mt-space-xs font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-space-md">
        {/* Sector activity chart */}
        <div className="xl:col-span-2 bg-surface-container-lowest/90 backdrop-blur-md rounded p-space-md shadow-lg border border-surface-container-high/40 flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-base">bar_chart</span>
              <span className="font-headline-sm text-headline-sm text-on-surface">Sector Activity Index (24H)</span>
            </div>
            <span className="font-mono-sm text-mono-sm text-outline">AUTO-REFRESH 30S</span>
          </div>
          <div className="flex items-end gap-space-md h-40 pt-space-md">
            {SECTORS.map((s) => (
              <div key={s.name} className="flex-1 flex flex-col items-center gap-space-xs group">
                <span className="font-mono-sm text-mono-sm text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">{s.val}</span>
                <div
                  className="w-full rounded-t-sm transition-all duration-700 hover:opacity-80"
                  style={{ height: `${s.val}%`, background: s.color, boxShadow: `0 0 12px ${s.color}44` }}
                />
                <span className="font-label-caps text-label-caps text-on-surface-variant">{s.name.replace("SECTOR ", "S")}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alert feed */}
        <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded p-space-md shadow-lg border border-surface-container-high/40 flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-error text-base animate-pulse">notification_important</span>
              <span className="font-headline-sm text-headline-sm text-on-surface">Live Alert Feed</span>
            </div>
            <button
              type="button"
              onClick={() => pushToast({ kind: "ok", title: "ALERTS", msg: "3 critical alerts acknowledged." })}
              className="font-label-caps text-label-caps text-primary uppercase hover:underline"
            >
              ACK ALL
            </button>
          </div>
          <div className="flex flex-col gap-space-2xs max-h-72 overflow-y-auto">
            {ALERTS.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-space-xs p-space-xs bg-surface-container/60 hover:bg-surface-container-high rounded transition-colors cursor-pointer"
                onClick={() => setView("orbital-satellite-recon")}
              >
                <span className={`px-space-2xs rounded font-label-caps text-label-caps uppercase shrink-0 ${SEV_STYLE[a.sev]}`}>{a.sev}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-body-sm font-body-sm text-on-surface">{a.txt}</div>
                  <div className="font-mono-sm text-mono-sm text-outline-variant mt-space-2xs">
                    {a.t} ZULU // SRC: {a.src}
                  </div>
                </div>
                <span className="material-symbols-outlined text-sm text-outline">arrow_forward</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Asset table */}
      <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded p-space-md shadow-lg border border-surface-container-high/40 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary-fixed-dim text-base">satellite</span>
            <span className="font-headline-sm text-headline-sm text-on-surface">Constellation Task Board</span>
          </div>
          <button
            type="button"
            onClick={() => pushToast({ kind: "info", title: "TASKING", msg: "Tasking window opened — 2 slots available." })}
            className="px-space-sm py-space-xs bg-surface-container hover:bg-surface-container-high rounded font-label-caps text-label-caps text-primary uppercase"
          >
            + NEW TASK
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-surface-container-high font-label-caps text-label-caps text-outline uppercase">
                <th className="py-space-xs px-space-sm">Asset</th>
                <th className="py-space-xs px-space-sm">Orbit</th>
                <th className="py-space-xs px-space-sm">Tasking</th>
                <th className="py-space-xs px-space-sm">Status</th>
                <th className="py-space-xs px-space-sm text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {ASSETS.map((a) => (
                <tr key={a.name} className="border-b border-surface-container-high/40 hover:bg-surface-container/40 transition-colors">
                  <td className="py-space-sm px-space-sm font-mono-md text-mono-md text-on-surface whitespace-nowrap">{a.name}</td>
                  <td className="py-space-sm px-space-sm font-mono-sm text-mono-sm text-on-surface-variant whitespace-nowrap">{a.orbit}</td>
                  <td className="py-space-sm px-space-sm font-mono-sm text-mono-sm text-on-surface-variant whitespace-nowrap">{a.task}</td>
                  <td className="py-space-sm px-space-sm whitespace-nowrap">
                    <span className={`px-space-xs py-space-2xs rounded border font-label-caps text-label-caps uppercase ${a.stCls}`}>{a.status}</span>
                  </td>
                  <td className="py-space-sm px-space-sm text-right">
                    <button
                      type="button"
                      onClick={() => pushToast({ kind: "ok", title: "ASSET", msg: `${a.name} telemetry panel opened.` })}
                      className="text-primary hover:underline font-label-caps text-label-caps uppercase"
                    >
                      INSPECT
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
