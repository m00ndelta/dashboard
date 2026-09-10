import { useEffect, useRef, useState } from "react";
import { useApp } from "../lib/store";

type FeedTab = "ALL" | "DARKWEB" | "SOCIAL" | "COMMS";
type Sentiment = "NEG" | "NEU" | "POS";

interface FeedItem {
  id: number;
  src: string;
  srcCls: string;
  channel: FeedTab;
  time: string;
  text: string;
  sentiment: Sentiment;
}

const SENT_STYLE: Record<Sentiment, string> = {
  NEG: "bg-error/20 text-error",
  NEU: "bg-surface-container-high text-on-surface-variant",
  POS: "bg-secondary-container/30 text-secondary-fixed-dim",
};

const POOL: Omit<FeedItem, "id" | "time">[] = [
  { src: "DARKFORUM://XEON", srcCls: "text-error", channel: "DARKWEB", text: "Thread: \"harbor schedule window\" — OP asks for unlisted vessel arrival slots. 2 replies from burner accounts.", sentiment: "NEG" },
  { src: "TORCHAN://anon-7741", srcCls: "text-error", channel: "DARKWEB", text: "Escrow listing: 6 ISO containers, \"paperwork optional\". Pickup Sector 7. 0.04 BTC reserve.", sentiment: "NEG" },
  { src: "SOCIAL://X @portwatch", srcCls: "text-primary-container", channel: "SOCIAL", text: "User geotagged \"night crane ballet\" photo near Terminal North — deleted 4 min after posting. Cache retained.", sentiment: "NEU" },
  { src: "SOCIAL://TG CH \"CargoOps\"", srcCls: "text-primary-container", channel: "COMMS", text: "Encrypted group pinned message changed: \"schedule K moved +40\". 14 members read within 2 min.", sentiment: "NEU" },
  { src: "COMMS://VOIP 41-07", srcCls: "text-tertiary-fixed-dim", channel: "COMMS", text: "Burst transmission 8.2s near port district. Frequency hop pattern matches OPERATOR 'K' profile (conf 91%).", sentiment: "NEG" },
  { src: "SOCIAL://X @fintel_daily", srcCls: "text-primary-container", channel: "SOCIAL", text: "Finance intel account flags BOREALIS LTD as \"shell cluster of interest\" — cross-check vs. SNA registry hit.", sentiment: "POS" },
  { src: "DARKFORUM://MARKET", srcCls: "text-error", channel: "DARKWEB", text: "AIS spoofing toolkit v2.3 listed with \"Sector 7G compatibility patch\" changelog. Seller escrow verified.", sentiment: "NEG" },
  { src: "COMMS://CELLGRID-07", srcCls: "text-tertiary-fixed-dim", channel: "COMMS", text: "Anonymous IMSI cluster of 8 devices at pier approach 00:58Z. No call data — metadata only.", sentiment: "NEU" },
];

let nextId = 1000;

export default function Feeds() {
  const { utc, pushToast } = useApp();
  const [tab, setTab] = useState<FeedTab>("ALL");
  const [items, setItems] = useState<FeedItem[]>(() =>
    POOL.slice(0, 6).map((p, i) => ({ ...p, id: i + 1, time: utc }))
  );
  const [paused, setPaused] = useState(false);
  const poolIdx = useRef(0);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      const p = POOL[poolIdx.current % POOL.length];
      poolIdx.current += 1;
      const now = new Date().toISOString().slice(11, 19);
      setItems((cur) =>
        [{ ...p, id: nextId++, time: now }, ...cur].slice(0, 30)
      );
    }, 6500);
    return () => window.clearInterval(id);
  }, [paused]);

  const visible = items.filter((i) => tab === "ALL" || i.channel === tab);

  return (
    <div className="flex flex-col gap-space-md anim-fade-up">
      <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded p-space-md shadow-lg border border-surface-container-high/40 flex flex-col gap-space-sm">
        <div className="flex flex-wrap items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-base">rss_feed</span>
            <span className="font-headline-sm text-headline-sm text-on-surface">Collection Stream — Darkweb &amp; Social</span>
            <span className="px-space-xs py-space-2xs bg-surface-container-high rounded font-mono-sm text-mono-sm text-primary">
              {visible.length} LIVE CAPTURES
            </span>
          </div>
          <div className="flex items-center gap-space-xs">
            {(["ALL", "DARKWEB", "SOCIAL", "COMMS"] as FeedTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-space-sm py-space-xs rounded font-label-caps text-label-caps uppercase transition-all ${
                  tab === t
                    ? "bg-primary-container text-on-primary-container font-bold shadow-[0_0_10px_rgba(0,229,255,0.35)]"
                    : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {t}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setPaused(!paused);
                pushToast({ kind: "info", title: "STREAM", msg: paused ? "Collection stream resumed." : "Collection stream paused." });
              }}
              className={`p-space-xs rounded transition-colors ${paused ? "bg-tertiary-container text-on-tertiary-container" : "bg-surface-container hover:bg-surface-container-high text-on-surface"}`}
              title={paused ? "Resume stream" : "Pause stream"}
            >
              <span className="material-symbols-outlined text-base">{paused ? "play_arrow" : "pause"}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-space-2xs max-h-[calc(100vh-16rem)] overflow-y-auto">
          {visible.map((i) => (
            <div
              key={i.id}
              className="p-space-sm bg-surface-container/60 hover:bg-surface-container-high rounded transition-colors flex flex-col gap-space-xs anim-fade-up"
            >
              <div className="flex items-center gap-space-xs flex-wrap">
                <span className={`font-mono-md text-mono-md font-bold ${i.srcCls}`}>{i.src}</span>
                <span className={`px-space-xs py-space-2xs rounded font-label-caps text-label-caps uppercase ${SENT_STYLE[i.sentiment]}`}>
                  {i.sentiment}
                </span>
                <span className="font-mono-sm text-mono-sm text-outline-variant">// {i.time} ZULU</span>
                <span className="ml-auto flex items-center gap-space-xs">
                  <button
                    type="button"
                    onClick={() => pushToast({ kind: "ok", title: "CORRELATION RUN", msg: "Capture linked into SNA cluster — edge confidence +0.12." })}
                    className="font-label-caps text-label-caps text-primary uppercase hover:underline"
                  >
                    CORRELATE
                  </button>
                  <button
                    type="button"
                    onClick={() => setItems((cur) => cur.filter((x) => x.id !== i.id))}
                    className="font-label-caps text-label-caps text-error uppercase hover:underline"
                  >
                    QUARANTINE
                  </button>
                </span>
              </div>
              <div className="text-body-sm font-body-sm text-on-surface leading-relaxed">{i.text}</div>
            </div>
          ))}
          {visible.length === 0 && (
            <div className="text-body-sm font-body-sm text-on-surface-variant p-space-lg text-center">
              No captures in this channel yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
