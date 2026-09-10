import { useEffect, useRef, useState } from "react";
import { useApp } from "../lib/store";

const SECTIONS = [
  { id: "exec", label: "EXECUTIVE SUMMARY", desc: "Mission posture & top-line findings" },
  { id: "orbit", label: "ORBITAL RECON COLLECTION", desc: "SAR-4 / FLIR / EO imagery findings" },
  { id: "sna", label: "SNA NETWORK ANALYSIS", desc: "Cluster graphs & centrality rankings" },
  { id: "entities", label: "ENTITY DOSSIERS", desc: "Target files, watchlist & risk scores" },
  { id: "feeds", label: "DARKWEB / SOCIAL CAPTURES", desc: "Annotated intercepts & sentiment" },
  { id: "timeline", label: "CHANGE-DETECTION TIMELINE", desc: "T-6 base vs T-0 delta analysis" },
];

const FORMATS = [
  { id: "PDF", icon: "picture_as_pdf", desc: "Vector PDF, sealed" },
  { id: "HTML", icon: "language", desc: "Single-file HTML packet" },
  { id: "TXT", icon: "text_snippet", desc: "Plain-text transcript" },
];

export default function ExportBriefing() {
  const { utc, pushToast } = useApp();
  const [title, setTitle] = useState("OPERATION VECTOR HOLD // Sector 7G Daily Brief");
  const [classification, setClassification] = useState("SECRET // REL TO INTEL COMMUNITY");
  const [format, setFormat] = useState("HTML");
  const [watermark, setWatermark] = useState(true);
  const [checked, setChecked] = useState<string[]>(["exec", "orbit", "sna", "entities"]);
  const [progress, setProgress] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [readySize, setReadySize] = useState("0 KB");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);

  const toggle = (id: string) =>
    setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const generate = () => {
    if (checked.length === 0) {
      pushToast({ kind: "warn", title: "BUILD BLOCKED", msg: "Select at least one briefing section." });
      return;
    }
    setReady(false);
    setProgress(0);
    let p = 0;
    timer.current = window.setInterval(() => {
      p += 6 + Math.random() * 10;
      if (p >= 100) {
        p = 100;
        if (timer.current) window.clearInterval(timer.current);
        setReady(true);
        setReadySize(`${(184 + checked.length * 96 + Math.random() * 40).toFixed(0)} KB`);
        pushToast({ kind: "ok", title: "BRIEFING READY", msg: "Packet assembled, checksum verified, AES-256 sealed." });
      }
      setProgress(p);
    }, 140);
  };

  const download = () => {
    const body = `SPECTRA OSINT // TACTICAL INTELLIGENCE COMMAND
====================================================
${title}
CLASSIFICATION: ${classification}
GENERATED: ${utc} ZULU // ANALYST UNIT 07
----------------------------------------------------
${checked
  .map((c) => {
    const s = SECTIONS.find((x) => x.id === c)!;
    return `### ${s.label}\n[${s.desc}]\nCompiled from live collection pipelines.\nKey findings appended by YOLOV8-SAT-DEFENSE (conf 98.4%).\n`;
  })
  .join("\n")}
----------------------------------------------------
END OF BRIEFING // ${watermark ? "WATERMARK: COPY 04 — EYES ONLY" : "UNWATERMARKED DRAFT"}
`;
    const blob = new Blob([body], {
      type: format === "TXT" ? "text/plain" : format === "HTML" ? "text/html" : "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SPECTRA_BRIEFING_${utc.replace(/:/g, "")}.${format.toLowerCase()}`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast({ kind: "ok", title: "DOWNLOAD STARTED", msg: `Packet saved locally as .${format.toLowerCase()}.` });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-space-md anim-fade-up">
      {/* Form */}
      <div className="xl:col-span-2 bg-surface-container-lowest/90 backdrop-blur-md rounded p-space-md shadow-lg border border-surface-container-high/40 flex flex-col gap-space-md">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-primary text-base">ios_share</span>
          <span className="font-headline-sm text-headline-sm text-on-surface">Briefing Assembly — Secure Export Pipeline</span>
        </div>

        <div className="flex flex-col gap-space-2xs">
          <label className="font-label-caps text-label-caps text-outline uppercase">BRIEFING TITLE</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-surface-container rounded px-space-sm py-space-xs font-mono-sm text-mono-sm text-on-surface outline-none border border-transparent focus:border-primary-container/50 transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          <div className="flex flex-col gap-space-2xs">
            <label className="font-label-caps text-label-caps text-outline uppercase">CLASSIFICATION BANNER</label>
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              className="bg-surface-container rounded px-space-sm py-space-xs font-mono-sm text-mono-sm text-on-surface outline-none border border-transparent focus:border-primary-container/50"
            >
              <option>SECRET // REL TO INTEL COMMUNITY</option>
              <option>SECRET // NOFORN</option>
              <option>TOP SECRET // SCI</option>
              <option>UNCLASSIFIED // FOUO</option>
            </select>
          </div>
          <div className="flex flex-col gap-space-2xs">
            <label className="font-label-caps text-label-caps text-outline uppercase">OUTPUT FORMAT</label>
            <div className="grid grid-cols-3 gap-space-xs">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id)}
                  title={f.desc}
                  className={`p-space-xs rounded flex flex-col items-center gap-space-2xs transition-all border ${
                    format === f.id
                      ? "bg-primary-container/10 border-primary-container/60 text-primary"
                      : "bg-surface-container hover:bg-surface-container-high border-transparent text-on-surface-variant"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{f.icon}</span>
                  <span className="font-label-caps text-label-caps uppercase">{f.id}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-space-2xs">
          <span className="font-label-caps text-label-caps text-outline uppercase">INCLUDED SECTIONS</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-xs">
            {SECTIONS.map((s) => {
              const on = checked.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s.id)}
                  className={`p-space-sm rounded text-left transition-colors border ${
                    on
                      ? "bg-primary-container/10 border-primary-container/50"
                      : "bg-surface-container hover:bg-surface-container-high border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-space-sm">
                    <span
                      className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                        on ? "bg-primary-container border-primary-container" : "border-outline-variant"
                      }`}
                    >
                      {on && <span className="material-symbols-outlined text-[10px] text-on-primary-container font-bold">check</span>}
                    </span>
                    <span className={`font-label-caps text-label-caps uppercase ${on ? "text-primary" : "text-on-surface-variant"}`}>{s.label}</span>
                  </div>
                  <div className="font-mono-sm text-mono-sm text-on-surface-variant mt-space-2xs ml-6">{s.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex items-center gap-space-sm cursor-pointer select-none">
          <span
            onClick={(e) => {
              e.preventDefault();
              setWatermark(!watermark);
            }}
            className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors ${
              watermark ? "bg-primary-container border-primary-container" : "border-outline-variant"
            }`}
          >
            {watermark && <span className="material-symbols-outlined text-[10px] text-on-primary-container font-bold">check</span>}
          </span>
          <span className="font-mono-sm text-mono-sm text-on-surface-variant">
            APPLY DIAGONAL WATERMARK “COPY 04 — EYES ONLY” (ANALYST TRACEABLE)
          </span>
        </label>

        {/* Progress */}
        <div className="p-space-md bg-surface-container rounded flex flex-col gap-space-sm">
          {progress === null ? (
            <div className="flex items-center justify-between">
              <span className="font-mono-sm text-mono-sm text-outline">PIPELINE IDLE — {checked.length} SECTIONS STAGED</span>
              <button
                type="button"
                onClick={generate}
                className="px-space-md py-space-sm rounded bg-primary-container text-on-primary-container font-headline-sm text-headline-sm font-bold shadow-[0_0_16px_rgba(0,229,255,0.4)] hover:shadow-[0_0_24px_rgba(0,229,255,0.6)] transition-all flex items-center gap-space-xs"
              >
                <span className="material-symbols-outlined text-base">bolt</span>
                <span>GENERATE PACKET</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-space-xs">
              <div className="flex justify-between font-mono-sm text-mono-sm">
                <span className="text-primary font-bold">{ready ? "PACKET READY // CHECKSUM OK" : "ASSEMBLING PACKET…"}</span>
                <span className="text-on-surface tabular-nums">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-150 ${ready ? "bg-tertiary-fixed-dim" : "bg-primary-container"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              {ready && (
                <div className="flex items-center justify-between mt-space-xs">
                  <span className="font-mono-sm text-mono-sm text-on-surface-variant">
                    SIZE: {readySize} // ENC: AES-256 GCM // AUTH: UNIT 07
                  </span>
                  <button
                    type="button"
                    onClick={download}
                    className="px-space-md py-space-sm rounded bg-tertiary-container text-on-tertiary-container font-headline-sm text-headline-sm font-bold transition-all flex items-center gap-space-xs anim-fade-up"
                  >
                    <span className="material-symbols-outlined text-base">download</span>
                    <span>DOWNLOAD .{format}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preview panel */}
      <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded p-space-md shadow-lg border border-surface-container-high/40 flex flex-col gap-space-sm">
        <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">PACKET PREVIEW</span>
        <div className="flex-1 bg-surface-container-lowest rounded p-space-md border border-surface-container-high/40 font-mono-sm text-mono-sm leading-6 overflow-y-auto max-h-[560px] relative">
          {watermark && (
            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="rotate-[-24deg] font-label-caps text-label-caps uppercase tracking-[0.3em] text-on-surface/10 text-xl whitespace-nowrap">
                COPY 04 — EYES ONLY
              </span>
            </span>
          )}
          <div className="text-primary font-bold">{title}</div>
          <div className="text-error">{classification}</div>
          <div className="text-outline-variant">GENERATED: {utc} ZULU // UNIT 07</div>
          <div className="border-t border-surface-container-high my-space-sm" />
          {checked.length === 0 && (
            <div className="text-outline">[ NO SECTIONS SELECTED ]</div>
          )}
          {checked.map((c) => {
            const s = SECTIONS.find((x) => x.id === c)!;
            return (
              <div key={c} className="mb-space-sm">
                <div className="text-secondary-fixed-dim">### {s.label}</div>
                <div className="text-on-surface-variant">[{s.desc}]</div>
              </div>
            );
          })}
          <div className="border-t border-surface-container-high my-space-sm" />
          <div className="text-outline-variant">END OF BRIEFING // FORMAT: {format}</div>
        </div>
        <button
          type="button"
          onClick={() => pushToast({ kind: "info", title: "PIPELINE", msg: "Preview reflects staged selections only — generate to finalize." })}
          className="font-label-caps text-label-caps text-primary uppercase hover:underline self-start"
        >
          REFRESH PREVIEW
        </button>
      </div>
    </div>
  );
}
