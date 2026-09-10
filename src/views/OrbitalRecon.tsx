import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useApp } from "../lib/store";

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

type Spectral = "SAR" | "EO-RGB" | "FLIR (MWIR)" | "HYPERSPEC" | "SIGINT COMB";
type Palette = "IRONBOW" | "B-HOT" | "W-HOT" | "COOL-CYAN";
type BaseFeed = "ESRI" | "MODIS" | "VIIRS" | "OSM";

const SPECTRAL_MODES: { id: Spectral; icon: string; short: string }[] = [
  { id: "SAR", icon: "radar", short: "SAR" },
  { id: "EO-RGB", icon: "photo_camera", short: "EO-RGB" },
  { id: "FLIR (MWIR)", icon: "thermostat", short: "FLIR (MWIR)" },
  { id: "HYPERSPEC", icon: "blur_linear", short: "HYPERSPEC" },
  { id: "SIGINT COMB", icon: "cell_tower", short: "SIGINT COMB" },
];

/* CSS filter applied to the live tile pane per spectral mode */
const FILTERS: Record<Spectral, string> = {
  SAR: "grayscale(1) contrast(1.7) brightness(0.9)",
  "EO-RGB": "saturate(1.35) contrast(1.12) brightness(0.95)",
  "FLIR (MWIR)": "saturate(1.65) contrast(1.4) brightness(1.05)",
  HYPERSPEC: "hue-rotate(85deg) saturate(2.2) contrast(1.25)",
  "SIGINT COMB": "hue-rotate(140deg) saturate(1.8) contrast(1.3) grayscale(0.35)",
};

const PALETTE_HUE: Record<Palette, string> = {
  IRONBOW: "",
  "B-HOT": " hue-rotate(-28deg) saturate(1.4)",
  "W-HOT": " grayscale(0.9) contrast(1.6)",
  "COOL-CYAN": " hue-rotate(95deg) saturate(1.7)",
};

const FEEDS: { id: BaseFeed; label: string; desc: string }[] = [
  { id: "ESRI", label: "ESRI WORLD", desc: "Maxar / Airbus hi-res satellite mosaic" },
  { id: "MODIS", label: "NASA MODIS", desc: "Terra corrected-reflectance true color (near-real-time)" },
  { id: "VIIRS", label: "VIIRS NIGHT", desc: "Black Marble night lights" },
  { id: "OSM", label: "OSM GRID", desc: "OpenStreetMap reference grid" },
];

const GIBS_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi";
const ESRI_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const VIIRS_WMTS =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png";
const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

/* Mission anchor: Moss Landing port sector, Monterey Bay, CA */
const DEFAULT_CENTER: [number, number] = [36.8065, -121.786];
const DEFAULT_ZOOM = 13;

/* Ground sample distance: 156543.03392 * cos(lat) / 2^zoom  (m/px, Web Mercator 256px tiles) */
const GSD_BASE = 156543.03392;
/* Assumed sensor IFOV for altitude derivation */
const ALT_IFOV = 3.2e-5;

interface TargetDef {
  id: string;
  latlng: [number, number];
}

const TARGET_POS: TargetDef[] = [
  { id: "vessel", latlng: [36.8034, -121.7889] },
  { id: "depot", latlng: [36.8048, -121.7828] },
  { id: "crane", latlng: [36.8069, -121.7853] },
  { id: "convoy", latlng: [36.7906, -121.7802] },
];

const latOf = (id: string) => TARGET_POS.find((t) => t.id === id)!.latlng;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function toDMS(deg: number, pos: string, neg: string): string {
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const mFull = (abs - d) * 60;
  const m = Math.floor(mFull);
  const s = Math.floor((mFull - m) * 60);
  return `${d}°${String(m).padStart(2, "0")}'${String(s).padStart(2, "0")}"${deg >= 0 ? pos : neg}`;
}

function bearing(a: L.LatLng, b: L.LatLng): number {
  const f1 = (a.lat * Math.PI) / 180;
  const f2 = (b.lat * Math.PI) / 180;
  const dl = ((b.lng - a.lng) * Math.PI) / 180;
  const y = Math.sin(dl) * Math.cos(f2);
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
  return Math.round((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/* ------------------------------------------------------------------ */
/* Draggable fader (slider)                                            */
/* ------------------------------------------------------------------ */

function Fader({
  value,
  onChange,
  accent = "#00e5ff",
}: {
  value: number;
  onChange: (v: number) => void;
  accent?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const update = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const v = Math.min(100, Math.max(0, Math.round(((clientX - r.left) / r.width) * 100)));
    onChange(v);
  };

  return (
    <div
      ref={ref}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        update(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) update(e.clientX);
      }}
      className="relative w-full h-2 bg-surface-container-high rounded-full cursor-pointer group"
    >
      <div
        className="absolute left-0 top-0 bottom-0 rounded-full transition-[width] duration-150"
        style={{ width: `${value}%`, background: accent }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-surface-container-lowest shadow-[0_0_8px_rgba(0,229,255,0.6)] transition-[left] duration-150"
        style={{ left: `${value}%`, background: accent }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main view — live interactive satellite map                          */
/* ------------------------------------------------------------------ */

export default function OrbitalRecon() {
  const { setView, pushToast } = useApp();

  const [spectral, setSpectral] = useState<Spectral>("FLIR (MWIR)");
  const [palette, setPalette] = useState<Palette>("IRONBOW");
  const [feed, setFeed] = useState<BaseFeed>("ESRI");
  const [cloud, setCloud] = useState(94);
  const [gain, setGain] = useState(65);
  const [scrub, setScrub] = useState(100);
  const [predicted, setPredicted] = useState(false);
  const [split, setSplit] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [measure, setMeasure] = useState(false);
  const [ruler, setRuler] = useState({ dist: 0, bearing: 0 });
  const [recenterKey, setRecenterKey] = useState(0);
  const [revisit, setRevisit] = useState(0);
  const [hud, setHud] = useState(true);
  const [panels, setPanels] = useState({
    assets: true,
    tuning: true,
    targets: true,
    ruler: true,
  });

  const togglePanel = (key: keyof typeof panels) =>
    setPanels((p) => ({ ...p, [key]: !p[key] }));

  const viewportRef = useRef<HTMLDivElement>(null);
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<Record<BaseFeed, L.TileLayer | null>>({
    ESRI: null,
    MODIS: null,
    VIIRS: null,
    OSM: null,
  });
  const overlayRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const readout = useRef<{
    coords?: HTMLSpanElement | null;
    gsd?: HTMLSpanElement | null;
    alt?: HTMLSpanElement | null;
    zoom?: HTMLSpanElement | null;
    src?: HTMLSpanElement | null;
  }>({});
  const crossRef = useRef<HTMLDivElement>(null);
  const crossTipRef = useRef<HTMLDivElement>(null);
  const scanTimer = useRef<number | null>(null);
  const measureRef = useRef<{ group: L.LayerGroup | null; on: boolean; pts: L.LatLng[] }>({
    group: null,
    on: false,
    pts: [],
  });

  /* ----- filter builder (applied to live tile pane) ----- */
  const buildFilter = () => {
    let f = FILTERS[spectral];
    if (spectral === "FLIR (MWIR)") f += PALETTE_HUE[palette];
    f += ` brightness(${(0.88 + (gain / 100) * 0.5).toFixed(2)}) contrast(${(1.02 + (cloud / 100) * 0.42).toFixed(2)})`;
    if (scrub <= 33) f += " saturate(0.45) brightness(0.72)";
    else if (scrub < 66) f += " saturate(0.75) brightness(0.86)";
    if (predicted) f += " sepia(0.35) hue-rotate(-8deg)";
    if (feed === "VIIRS") f += " brightness(1.3)";
    return f;
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const pane = map.getPane("tilePane");
    if (pane) pane.style.filter = buildFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spectral, palette, feed, cloud, gain, scrub, predicted]);

  /* ----- measure mode cursor ----- */
  useEffect(() => {
    measureRef.current.on = measure;
    const el = mapRef.current?.getContainer();
    if (el) el.style.cursor = measure ? "crosshair" : "";
  }, [measure]);

  /* ----- map init (once) ----- */
  useEffect(() => {
    const el = mapElRef.current;
    if (!el) return;

    const map = L.map(el, {
      zoomControl: false,
      attributionControl: true,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 2,
      maxZoom: 19,
    });
    mapRef.current = map;
    map.attributionControl.setPrefix(false);

    layersRef.current.ESRI = L.tileLayer(ESRI_TILES, {
      maxZoom: 19,
      attribution: "Tiles © Esri — Maxar, Earthstar Geographics",
    });
    layersRef.current.MODIS = L.tileLayer.wms(GIBS_WMS, {
      layers: "MODIS_Terra_CorrectedReflectance_TrueColor",
      format: "image/jpeg",
      transparent: true,
      attribution: "NASA EOSDIS GIBS",
    });
    layersRef.current.VIIRS = L.tileLayer(VIIRS_WMTS, {
      maxNativeZoom: 8,
      maxZoom: 19,
      attribution: "NASA GIBS // VIIRS Black Marble",
    });
    layersRef.current.OSM = L.tileLayer(OSM_TILES, {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    });
    layersRef.current.ESRI.addTo(map);

    measureRef.current.group = L.layerGroup().addTo(map);

    /* target overlays follow the map */
    const updateTargets = () => {
      TARGET_POS.forEach((t) => {
        const box = overlayRefs.current[t.id];
        if (!box) return;
        const p = map.latLngToContainerPoint(t.latlng);
        box.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      });
    };

    /* live telemetry readout (direct DOM — no re-render churn) */
    let hovering = false;

    const setSrcTag = (mode: "CENTER" | "CURSOR") => {
      const el = readout.current.src;
      if (!el) return;
      el.textContent = mode;
      el.classList.toggle("text-primary-container", mode === "CURSOR");
      el.classList.toggle("bg-primary-container/10", mode === "CURSOR");
    };

    const updateReadout = () => {
      const c = map.getCenter();
      const z = map.getZoom();
      const gsd = (GSD_BASE * Math.cos((c.lat * Math.PI) / 180)) / Math.pow(2, z);
      const altM = gsd / ALT_IFOV;
      if (readout.current.coords && !hovering)
        readout.current.coords.textContent = `${toDMS(c.lat, "N", "S")}, ${toDMS(c.lng, "E", "W")}`;
      if (readout.current.gsd)
        readout.current.gsd.textContent = gsd >= 1 ? `${gsd.toFixed(1)} M/PX` : `${gsd.toFixed(2)} M/PX`;
      if (readout.current.alt)
        readout.current.alt.textContent =
          altM >= 100000
            ? `${Math.round(altM / 1000)} KM`
            : altM >= 1000
              ? `${(altM / 1000).toFixed(1)} KM`
              : `${Math.round(altM)} M`;
      if (readout.current.zoom) readout.current.zoom.textContent = `Z${z}`;
      if (!hovering) setSrcTag("CENTER");
    };

    /* click handler: measure tool */
    const onMapClick = (e: L.LeafletMouseEvent) => {
      const m = measureRef.current;
      if (!m.on || !m.group) return;
      m.pts.push(e.latlng);
      L.circleMarker(e.latlng, {
        radius: 4,
        color: "#00e5ff",
        weight: 2,
        fillColor: "#00e5ff",
        fillOpacity: 1,
      }).addTo(m.group);
      if (m.pts.length >= 2) {
        const a = m.pts[m.pts.length - 2];
        const b = m.pts[m.pts.length - 1];
        L.polyline([a, b], { color: "#00e5ff", weight: 2, dashArray: "5 5", opacity: 0.9 }).addTo(m.group);
        setRuler({ dist: map.distance(a, b), bearing: bearing(a, b) });
        m.pts = [];
      }
    };

    let raf = 0;
    const requestReadout = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        updateReadout();
      });
    };

    map.on("move", updateTargets);
    map.on("move", requestReadout);
    map.on("click", onMapClick);

    /* cursor tracking: coordinates + crosshair follow the mouse */
    map.on("mousemove", (e: L.LeafletMouseEvent) => {
      hovering = true;
      const dms = `${toDMS(e.latlng.lat, "N", "S")}, ${toDMS(e.latlng.lng, "E", "W")}`;
      if (readout.current.coords) readout.current.coords.textContent = dms;
      if (crossTipRef.current) crossTipRef.current.textContent = dms;
      setSrcTag("CURSOR");
      const cross = crossRef.current;
      if (cross) {
        cross.style.display = "block";
        cross.style.left = `${e.containerPoint.x}px`;
        cross.style.top = `${e.containerPoint.y}px`;
      }
    });
    map.on("mouseout", () => {
      hovering = false;
      const cross = crossRef.current;
      if (cross) cross.style.display = "none";
      updateReadout();
    });

    const onFs = () => window.setTimeout(() => map.invalidateSize(), 200);
    document.addEventListener("fullscreenchange", onFs);

    updateTargets();
    updateReadout();
    const pane = map.getPane("tilePane");
    if (pane) pane.style.filter = buildFilter();

    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----- scanning sweep ----- */
  const triggerScan = (msg: string, kind: "info" | "crit" | "ok" = "info") => {
    setScanning(true);
    if (scanTimer.current) window.clearTimeout(scanTimer.current);
    scanTimer.current = window.setTimeout(() => setScanning(false), 2200);
    pushToast({ kind, title: "SENSOR TASK", msg });
  };

  const flyTo = (latlng: [number, number], zoom: number) => {
    mapRef.current?.flyTo(latlng, zoom, { duration: 1.6 });
  };

  const centerAnchor = () => {
    flyTo(DEFAULT_CENTER, DEFAULT_ZOOM);
    setRecenterKey((k) => k + 1);
  };

  const switchFeed = (f: BaseFeed) => {
    const map = mapRef.current;
    if (!map) return;
    Object.values(layersRef.current).forEach((l) => {
      if (l && map.hasLayer(l)) map.removeLayer(l);
    });
    layersRef.current[f]?.addTo(map);
    setFeed(f);
    const meta = FEEDS.find((x) => x.id === f);
    pushToast({ kind: "info", title: "BASE FEED SWITCHED", msg: `${meta?.desc} now streaming to viewport.` });
  };

  const toggleFullscreen = () => {
    const el = viewportRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  const resetRuler = () => {
    measureRef.current.group?.clearLayers();
    measureRef.current.pts = [];
    setRuler({ dist: 0, bearing: 0 });
    setMeasure(false);
    pushToast({ kind: "info", title: "RULER RESET", msg: "Measurement vectors cleared." });
  };

  /* ----- timeline helpers ----- */
  const hoursRemaining = 6 * (1 - scrub / 100);
  const timeLabel = hoursRemaining <= 0.05 ? "LIVE (T-0)" : `T-${hoursRemaining.toFixed(1)}H`;
  const stepActive = (s: number) =>
    predicted ? s === 2 : scrub >= 66 ? s === 1 : scrub <= 33 ? s === 0 : s === -1;

  const pickStep = (s: number) => {
    if (s === 0) {
      setScrub(0);
      setPredicted(false);
      pushToast({ kind: "info", title: "TIMELINE: 0200Z BASE", msg: "Change-detection baseline imagery loaded." });
    } else if (s === 1) {
      setScrub(100);
      setPredicted(false);
      pushToast({ kind: "ok", title: "TIMELINE: 0800Z CURRENT", msg: "Live satellite downlink synchronized to T-0." });
    } else {
      setScrub(100);
      setPredicted(true);
      pushToast({ kind: "warn", title: "TIMELINE: 1400Z PREDICTED", msg: "Extrapolation forecast engaged — confidence 71.3%." });
    }
  };

  /* ------------------------------------------------------------------ */
  return (
    <div
      ref={viewportRef}
      className="relative w-full rounded-lg overflow-hidden bg-surface-container-lowest shadow-2xl min-h-[calc(100vh-5.5rem)] flex flex-col justify-between border border-surface-container-high/50"
    >
      {/* BASE LAYER: live satellite map + tactical overlays */}
      <div className="absolute inset-0 z-0">
        {/* Live Leaflet map (pan / zoom / real satellite tiles) */}
        <div ref={mapElRef} className="absolute inset-0" />

        {/* Cursor crosshair + live DMS tooltip (follows mouse over map) */}
        <div ref={crossRef} className="absolute top-0 left-0 z-[450] pointer-events-none" style={{ display: "none" }}>
          <div className="relative w-5 h-5 -translate-x-1/2 -translate-y-1/2">
            <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-primary-container/90 shadow-[0_0_6px_rgba(0,229,255,0.9)]" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-primary-container/90 shadow-[0_0_6px_rgba(0,229,255,0.9)]" />
            <div className="absolute left-1/2 top-1/2 w-1 h-1 -translate-x-1/2 -translate-y-1/2 bg-primary-container rounded-full" />
          </div>
          <div
            ref={crossTipRef}
            className="absolute left-2 top-2 px-space-xs py-space-2xs bg-surface-container-highest/90 backdrop-blur-md rounded font-mono-sm text-mono-sm text-primary whitespace-nowrap border border-primary-container/30"
          >
            —
          </div>
        </div>

        {/* Split-delta ghost (backdrop-filter over live map) */}
        {split && (
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300"
            style={{
              clipPath: "inset(0 0 0 50%)",
              backdropFilter: "invert(0.85) hue-rotate(160deg) contrast(1.3)",
              WebkitBackdropFilter: "invert(0.85) hue-rotate(160deg) contrast(1.3)",
            }}
          >
            <div className="absolute inset-y-0 left-0 w-px bg-error/80" />
            <span className="absolute top-2 left-1/2 -translate-x-1/2 px-space-xs py-space-2xs bg-error/80 text-surface-container-lowest rounded font-label-caps text-label-caps uppercase">
              T-6 BASE // DELTA
            </span>
          </div>
        )}

        {/* Predicted forecast ghost */}
        {predicted && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backdropFilter: "sepia(0.55) hue-rotate(-12deg) saturate(1.15)",
              WebkitBackdropFilter: "sepia(0.55) hue-rotate(-12deg) saturate(1.15)",
            }}
          >
            <span className="absolute top-3 left-1/2 -translate-x-1/2 px-space-sm py-space-xs bg-tertiary-fixed-dim/90 text-on-tertiary-fixed rounded font-label-caps text-label-caps uppercase anim-blink">
              EXTRAPOLATION FORECAST // 1400Z
            </span>
          </div>
        )}

        {/* Atmosphere vignettes */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-surface-container-lowest/80 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(11,14,21,0.35)_80%,rgba(11,14,21,0.75)_100%)] pointer-events-none" />
        <div className="absolute inset-0 scanlines-grid scanlines-drift pointer-events-none" />

        {/* Scan sweep bar */}
        {scanning && (
          <div className="absolute inset-x-0 anim-sweep pointer-events-none">
            <div className="h-10 w-full bg-gradient-to-b from-transparent via-primary-container/25 to-transparent" />
            <div className="h-px w-full bg-primary-container/70 shadow-[0_0_18px_rgba(0,229,255,0.8)]" />
          </div>
        )}

        {/* TGT-904 // Refueling depot (georeferenced overlay) */}
        <div
          ref={(el) => {
            overlayRefs.current.depot = el;
          }}
          className="absolute top-0 left-0 will-change-transform pointer-events-none"
          style={{ transform: "translate3d(-9999px,-9999px,0)" }}
        >
          <div className="w-48 h-32 bg-primary-container/5 relative shadow-[0_0_15px_rgba(0,229,255,0.2)] -translate-x-1/2 -translate-y-1/2 anim-blink">
            {["-top-2 -left-2", "-top-2 -right-2", "-bottom-2 -left-2", "-bottom-2 -right-2"].map((p) => (
              <span key={p} className={`absolute ${p} text-primary-container text-xs font-mono-sm font-bold`}>+</span>
            ))}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
              <div className="w-full h-[1px] bg-primary-container/40"></div>
              <div className="h-full w-[1px] bg-primary-container/40 absolute"></div>
            </div>
            <div className="absolute -top-7 left-0 px-space-xs py-space-2xs bg-surface-container-highest/90 backdrop-blur-md rounded">
              <span className="font-label-caps text-label-caps text-primary tracking-wider uppercase">TGT-904 // REFUELING DEPOT</span>
              <span className="font-mono-sm text-mono-sm text-tertiary-fixed-dim block">HEAT SIG: 342.6K [HIGH]</span>
            </div>
          </div>
        </div>

        {/* Vessel overlay */}
        <div
          ref={(el) => {
            overlayRefs.current.vessel = el;
          }}
          className="absolute top-0 left-0 will-change-transform pointer-events-none"
          style={{ transform: "translate3d(-9999px,-9999px,0)" }}
        >
          <div className="w-36 h-16 bg-error/5 relative shadow-[0_0_12px_rgba(255,180,171,0.2)] -translate-x-1/2 -translate-y-1/2 anim-blink">
            <span className="absolute -top-1 -left-1 text-error text-[10px] font-mono-sm font-bold">┌</span>
            <span className="absolute -top-1 -right-1 text-error text-[10px] font-mono-sm font-bold">┐</span>
            <span className="absolute -bottom-1 -left-1 text-error text-[10px] font-mono-sm font-bold">└</span>
            <span className="absolute -bottom-1 -right-1 text-error text-[10px] font-mono-sm font-bold">┘</span>
            <div className="absolute -bottom-6 left-0 px-space-xs py-space-2xs bg-surface-container-highest/90 backdrop-blur-md rounded whitespace-nowrap">
              <span className="font-label-caps text-label-caps text-error tracking-wider uppercase">VESSEL // AIS DARK</span>
              <span className="font-mono-sm text-mono-sm text-on-surface-variant ml-1">48,200 DWT</span>
            </div>
          </div>
        </div>

        {/* Crane gantry overlay */}
        <div
          ref={(el) => {
            overlayRefs.current.crane = el;
          }}
          className="absolute top-0 left-0 will-change-transform pointer-events-none"
          style={{ transform: "translate3d(-9999px,-9999px,0)" }}
        >
          <div className="w-56 h-28 bg-secondary-container/10 border border-secondary-container/30 relative -translate-x-1/2 -translate-y-1/2">
            <div className="absolute top-1 right-2 px-space-xs py-space-2xs bg-surface-container-lowest/80 rounded">
              <span className="font-label-caps text-label-caps text-secondary-fixed tracking-wider uppercase">CRANE GANTRY ARRAY 04</span>
            </div>
          </div>
        </div>

        {/* Convoy overlay */}
        <div
          ref={(el) => {
            overlayRefs.current.convoy = el;
          }}
          className="absolute top-0 left-0 will-change-transform pointer-events-none"
          style={{ transform: "translate3d(-9999px,-9999px,0)" }}
        >
          <div className="w-32 h-12 bg-tertiary-fixed-dim/10 border border-tertiary-fixed-dim/40 relative -translate-x-1/2 -translate-y-1/2 anim-blink">
            <div className="absolute -bottom-6 left-0 px-space-xs py-space-2xs bg-surface-container-highest/90 backdrop-blur-md rounded whitespace-nowrap">
              <span className="font-label-caps text-label-caps text-tertiary-fixed-dim tracking-wider uppercase">CONVOY VECTOR 12</span>
              <span className="font-mono-sm text-mono-sm text-on-surface-variant ml-1">38 KM/H // 278°</span>
            </div>
          </div>
        </div>

        {/* Center reticle ring */}
        <div
          key={recenterKey}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 pointer-events-none opacity-40 ${recenterKey ? "anim-recenter" : ""}`}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-r from-transparent via-primary-container/10 to-transparent flex items-center justify-center">
            <div className="w-72 h-72 rounded-full bg-primary-container/5 flex items-center justify-center relative">
              <div className="w-1.5 h-1.5 bg-primary-container rounded-full animate-ping"></div>
              <div className="absolute inset-0 rounded-full border border-dashed border-primary-container/20 anim-radar">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-primary-container rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LAYER 1: Top telemetry banner */}
      <div className="relative z-20 w-full p-space-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-md bg-surface-container-lowest/85 backdrop-blur-md border-b border-surface-container-high/40">
        <div className="flex flex-wrap items-center gap-space-sm">
          <div className="flex items-center gap-space-xs px-space-sm py-space-xs bg-surface-container-high rounded">
            <span className="material-symbols-outlined text-primary-container text-base">my_location</span>
            <span
              ref={(el) => {
                readout.current.coords = el;
              }}
              className="font-mono-md text-mono-md text-primary tracking-wider tabular-nums"
            >
              —°—'—"N, —°—'—"W
            </span>
            <span
              ref={(el) => {
                readout.current.src = el;
              }}
              className="px-space-2xs py-space-2xs rounded font-label-caps text-label-caps uppercase bg-surface-container text-outline transition-colors"
            >
              CENTER
            </span>
          </div>
          <div className="flex items-center gap-space-xs px-space-sm py-space-xs bg-surface-container rounded">
            <span className="font-label-caps text-label-caps text-outline uppercase">ALT:</span>
            <span
              ref={(el) => {
                readout.current.alt = el;
              }}
              className="font-mono-sm text-mono-sm text-on-surface font-semibold tabular-nums"
            >
              —
            </span>
          </div>
          <div className="flex items-center gap-space-xs px-space-sm py-space-xs bg-surface-container rounded">
            <span className="font-label-caps text-label-caps text-outline uppercase">GSD:</span>
            <span
              ref={(el) => {
                readout.current.gsd = el;
              }}
              className="font-mono-sm text-mono-sm text-primary-fixed-dim tabular-nums"
            >
              —
            </span>
          </div>
          <div className="flex items-center gap-space-xs px-space-sm py-space-xs bg-surface-container rounded">
            <span className="font-label-caps text-label-caps text-outline uppercase">ZOOM:</span>
            <span
              ref={(el) => {
                readout.current.zoom = el;
              }}
              className="font-mono-sm text-mono-sm text-on-surface tabular-nums"
            >
              Z—
            </span>
          </div>
          <div className="flex items-center gap-space-xs px-space-sm py-space-xs bg-surface-container-high rounded">
            <span className="h-2 w-2 rounded-full bg-primary-container animate-pulse"></span>
            <span className="font-label-caps text-label-caps text-primary-container uppercase">SAT-FEED: {feed} LIVE</span>
          </div>
        </div>

        {/* Spectral selector */}
        <div className="flex items-center bg-surface-container-low p-space-2xs rounded-lg gap-space-2xs overflow-x-auto max-w-full">
          {SPECTRAL_MODES.map((m) => {
            const active = spectral === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSpectral(m.id);
                  pushToast({ kind: "info", title: "SPECTRAL MODE", msg: `Sensor fusion switched to ${m.id}.` });
                }}
                className={`px-space-sm py-space-xs rounded font-label-caps text-label-caps uppercase transition-all flex items-center gap-space-2xs whitespace-nowrap ${
                  active
                    ? "bg-primary-container text-on-primary-container font-bold shadow-[0_0_12px_rgba(0,229,255,0.4)]"
                    : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-sm">{m.icon}</span>
                <span>{m.short}</span>
              </button>
            );
          })}
        </div>

        {/* Base feed selector + quick actions */}
        <div className="flex flex-wrap items-center gap-space-xs">
          <div className="flex items-center bg-surface-container-low p-space-2xs rounded-lg gap-space-2xs">
            {FEEDS.map((f) => (
              <button
                key={f.id}
                type="button"
                title={f.desc}
                onClick={() => switchFeed(f.id)}
                className={`px-space-sm py-space-xs rounded font-label-caps text-label-caps uppercase transition-all whitespace-nowrap ${
                  feed === f.id
                    ? "bg-tertiary-container text-on-tertiary-container font-bold shadow-sm"
                    : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button className="p-space-xs rounded bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors" title="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
            <span className="material-symbols-outlined text-base">add</span>
          </button>
          <button className="p-space-xs rounded bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors" title="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
            <span className="material-symbols-outlined text-base">remove</span>
          </button>
          <button className="p-space-xs rounded bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors" title="Center on Anchor" onClick={centerAnchor}>
            <span className="material-symbols-outlined text-base">filter_center_focus</span>
          </button>
          <button
            className={`p-space-xs rounded transition-colors ${hud ? "bg-primary-container/15 text-primary-container hover:bg-primary-container/25" : "bg-surface-container hover:bg-surface-container-high text-on-surface"}`}
            title={hud ? "Hide HUD panels" : "Show HUD panels"}
            onClick={() => {
              setHud(!hud);
              pushToast({
                kind: "info",
                title: "HUD CONTROL",
                msg: hud ? "Floating panels hidden — full-map observation mode." : "Floating panels restored.",
              });
            }}
          >
            <span className="material-symbols-outlined text-base">{hud ? "layers_clear" : "layers"}</span>
          </button>
          <button className="p-space-xs rounded bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors" title="Toggle Fullscreen Canvas" onClick={toggleFullscreen}>
            <span className="material-symbols-outlined text-base">fullscreen</span>
          </button>
          <button className="p-space-xs rounded bg-surface-container hover:bg-surface-container-high text-primary-container transition-colors" title="Calibrate Sensors" onClick={() => triggerScan("Sensor calibration cycle complete — drift <0.02 px.", "ok")}>
            <span className="material-symbols-outlined text-base">tune</span>
          </button>
        </div>
      </div>

      {/* LAYER 2: Mid-dock floating panels */}
      {hud ? (
      <div className="relative z-10 w-full px-space-md py-space-sm flex-1 flex flex-col lg:flex-row justify-between pointer-events-none gap-space-lg">
        {/* LEFT: constellation + tuning */}
        <div className="w-full lg:w-80 flex flex-col gap-space-sm">
          <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded p-space-sm shadow-xl flex flex-col gap-space-sm pointer-events-auto">
            <button
              type="button"
              onClick={() => togglePanel("assets")}
              className="flex items-center justify-between w-full text-left group/panel"
              title={panels.assets ? "Collapse Orbital Assets" : "Expand Orbital Assets"}
            >
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-base">satellite</span>
                <span className="font-headline-sm text-headline-sm text-on-surface">Orbital Assets</span>
              </div>
              <div className="flex items-center gap-space-xs">
                <span className="px-space-xs py-space-2xs bg-surface-container-high rounded font-mono-sm text-mono-sm text-primary">4 IN-VIEW</span>
                <span className="material-symbols-outlined text-sm text-outline group-hover/panel:text-primary">
                  {panels.assets ? "expand_less" : "expand_more"}
                </span>
              </div>
            </button>
            {panels.assets && (
            <>

            <div
              onClick={() => switchFeed("ESRI")}
              className="p-space-sm bg-surface-container-high/90 hover:bg-surface-container-high rounded flex flex-col gap-space-xs shadow-[0_0_10px_rgba(0,229,255,0.15)] cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="h-2 w-2 rounded-full bg-primary-container"></span>
                  <span className="font-mono-md text-mono-md text-primary font-bold">SAR-4 (SENTINEL-1D)</span>
                </div>
                <span className="font-label-caps text-label-caps text-primary-container uppercase">LOCKED</span>
              </div>
              <div className="grid grid-cols-2 gap-space-xs font-mono-sm text-mono-sm text-on-surface-variant">
                <div>EL: <span className="text-on-surface">68.4°</span></div>
                <div>PASS REM: <span className="text-primary font-semibold">00:06:21</span></div>
                <div>DL RATE: <span className="text-on-surface">850 Mbps</span></div>
                <div>BAND: <span className="text-on-surface">C-Band Synthetic</span></div>
              </div>
              <div className="w-full bg-surface-container-highest h-1 rounded overflow-hidden mt-space-2xs">
                <div className="bg-primary-container h-full w-3/4"></div>
              </div>
            </div>

            {[
              { name: "SKY-SAT-7 (SUB-METER)", tag: "AOS IN 18M", tagCls: "text-tertiary-fixed-dim", dot: "bg-tertiary-fixed-dim", meta: "FOV: 5.5 KM | ORBIT: 450 KM SSO", feed: "MODIS" as BaseFeed },
              { name: "WORLDVIEW-4 (MULTI-SPEC)", tag: "AOS IN 44M", tagCls: "text-outline", dot: "bg-outline", meta: "GSD: 0.31 M | TASK: STANDBY", feed: "OSM" as BaseFeed },
            ].map((s) => (
              <div
                key={s.name}
                onClick={() => switchFeed(s.feed)}
                className="p-space-sm bg-surface-container/60 hover:bg-surface-container/90 transition-colors rounded flex flex-col gap-space-xs cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs">
                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`}></span>
                    <span className="font-mono-md text-mono-md text-on-surface">{s.name}</span>
                  </div>
                  <span className={`font-label-caps text-label-caps ${s.tagCls} uppercase`}>{s.tag}</span>
                </div>
                <div className="flex justify-between font-mono-sm text-mono-sm text-outline">{s.meta}</div>
              </div>
            ))}
            </>
            )}
          </div>

          {/* Sensor tuning */}
          <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded p-space-sm shadow-xl flex flex-col gap-space-sm pointer-events-auto">
            <button
              type="button"
              onClick={() => togglePanel("tuning")}
              className="flex items-center justify-between w-full text-left group/panel"
              title={panels.tuning ? "Collapse Optical Tuning" : "Expand Optical Tuning"}
            >
              <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">OPTICAL TUNING &amp; ATMOSPHERE</span>
              <span className="flex items-center gap-space-2xs">
                <span className="material-symbols-outlined text-primary text-sm">adjust</span>
                <span className="material-symbols-outlined text-sm text-outline group-hover/panel:text-primary">
                  {panels.tuning ? "expand_less" : "expand_more"}
                </span>
              </span>
            </button>
            {panels.tuning && (
            <>
            <div className="flex flex-col gap-space-2xs">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">FALSE COLOR PALETTE</span>
              <div className="grid grid-cols-4 gap-space-xs">
                {(Object.keys(PALETTE_HUE) as Palette[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setPalette(p);
                      setSpectral("FLIR (MWIR)");
                    }}
                    className={`px-space-xs py-space-2xs font-mono-sm text-mono-sm rounded transition-all ${
                      palette === p && spectral === "FLIR (MWIR)"
                        ? "bg-primary-container text-on-primary-container font-bold shadow-sm"
                        : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-space-xs">
              <div className="flex justify-between items-center font-mono-sm text-mono-sm">
                <span className="text-on-surface-variant">CLOUD PENETRATION</span>
                <span className="text-primary font-bold tabular-nums">{cloud}% {cloud >= 90 ? "[ACTIVE]" : ""}</span>
              </div>
              <Fader value={cloud} onChange={setCloud} accent="#c3f5ff" />
            </div>
            <div className="flex flex-col gap-space-xs">
              <div className="flex justify-between items-center font-mono-sm text-mono-sm">
                <span className="text-on-surface-variant">FLIR SENSOR GAIN (MWIR)</span>
                <span className="text-tertiary-fixed-dim font-bold tabular-nums">+{(gain * 0.3).toFixed(1)} dB</span>
              </div>
              <Fader value={gain} onChange={setGain} accent="#ffb95f" />
            </div>
            </>
            )}
          </div>
        </div>

        {/* RIGHT: target inspector */}
        <div className="w-full lg:w-96 flex flex-col gap-space-sm">
          <div className="p-space-sm bg-error-container/80 backdrop-blur-md rounded flex items-center justify-between text-on-error-container shadow-lg pointer-events-auto">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-error text-lg animate-pulse">warning</span>
              <div className="flex flex-col">
                <span className="font-label-caps text-label-caps text-error font-bold uppercase tracking-wider">GEO-BREACH DETECTION</span>
                <span className="font-mono-sm text-mono-sm text-on-error-container">UNREGISTERED DISPLACEMENT DETECTED</span>
              </div>
            </div>
            <span className="font-mono-sm text-mono-sm px-space-xs py-space-2xs bg-surface-container-lowest/50 rounded text-error font-bold">CRIT 1</span>
          </div>

          <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded p-space-sm shadow-xl flex flex-col gap-space-sm max-h-[420px] overflow-y-auto pointer-events-auto">
            <button
              type="button"
              onClick={() => togglePanel("targets")}
              className="flex items-center justify-between w-full text-left pb-space-xs group/panel"
              title={panels.targets ? "Collapse Target Entities" : "Expand Target Entities"}
            >
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-base">center_focus_strong</span>
                <span className="font-headline-sm text-headline-sm text-on-surface">Target Entities</span>
              </div>
              <div className="flex items-center gap-space-xs">
                <span className="font-mono-sm text-mono-sm text-outline">SECTOR 7G // LIVE MAP</span>
                <span className="material-symbols-outlined text-sm text-outline group-hover/panel:text-primary">
                  {panels.targets ? "expand_less" : "expand_more"}
                </span>
              </div>
            </button>
            {panels.targets && (
            <>

            {/* Card 1: Vessel */}
            <div
              onClick={() => flyTo(latOf("vessel"), 15)}
              className="p-space-sm bg-surface-container-high/70 hover:bg-surface-container-high rounded transition-colors flex flex-col gap-space-xs cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors">M/V CAPE ODYSSEY</span>
                  <span className="font-mono-sm text-mono-sm text-error">AIS TRANSPONDER: OFFLINE</span>
                </div>
                <span className="px-space-xs py-space-2xs bg-error/20 text-error rounded font-label-caps text-label-caps uppercase">DARK VESSEL</span>
              </div>
              <div className="grid grid-cols-2 gap-space-2xs font-mono-sm text-mono-sm text-on-surface-variant mt-space-2xs">
                <span>LENGTH: 228M</span>
                <span>DRAFT: 14.1M</span>
                <span>LAST SEEN: ROTTERDAM</span>
                <span className="text-tertiary-fixed-dim">DISP: 48,200 DWT</span>
              </div>
              <div className="flex items-center justify-between pt-space-xs mt-space-2xs">
                <span className="font-mono-sm text-mono-sm text-outline">LAT: {latOf("vessel")[0].toFixed(4)} N</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    flyTo(latOf("vessel"), 16);
                    triggerScan("Re-acquisition of M/V CAPE ODYSSEY — SAR-4 pass task confirmed.", "crit");
                  }}
                  className="text-primary hover:underline font-label-caps text-label-caps flex items-center gap-space-2xs uppercase"
                >
                  <span>RE-ACQUIRE</span>
                  <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Card 2: Depot */}
            <div
              onClick={() => flyTo(latOf("depot"), 15)}
              className="p-space-sm bg-surface-container-high/70 hover:bg-surface-container-high rounded transition-colors flex flex-col gap-space-xs cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors">FACILITY ECHO // DEPOT</span>
                  <span className="font-mono-sm text-mono-sm text-tertiary-fixed-dim">HEAT SPIKE: +34.2°C DELTA</span>
                </div>
                <span className="px-space-xs py-space-2xs bg-tertiary-container text-on-tertiary-container rounded font-label-caps text-label-caps uppercase font-semibold">THERMAL SURGE</span>
              </div>
              <div className="text-body-sm font-body-sm text-on-surface-variant">
                Elevated thermal footprint across secondary fuel vaults indicating unannounced liquid fuel transfer operations.
              </div>
              <div className="flex items-center justify-between pt-space-xs mt-space-2xs">
                <span className="font-mono-sm text-mono-sm text-primary">CONFIDENCE: 98.4%</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSpectral("FLIR (MWIR)");
                    flyTo(latOf("depot"), 16);
                    triggerScan("FLIR MWIR inspection of FACILITY ECHO complete — 3 hotspots classified.", "ok");
                  }}
                  className="text-primary hover:underline font-label-caps text-label-caps flex items-center gap-space-2xs uppercase"
                >
                  <span>INSPECT FLIR</span>
                  <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Card 3: Convoy */}
            <div
              onClick={() => flyTo(latOf("convoy"), 14)}
              className="p-space-sm bg-surface-container-high/70 hover:bg-surface-container-high rounded transition-colors flex flex-col gap-space-xs cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors">CONVOY VECTOR 12</span>
                  <span className="font-mono-sm text-mono-sm text-primary-container">VELOCITY: 38 KM/H // HEADING 278°</span>
                </div>
                <span className="px-space-xs py-space-2xs bg-surface-container-lowest text-outline rounded font-label-caps text-label-caps uppercase">TRACKED</span>
              </div>
              <div className="flex justify-between font-mono-sm text-mono-sm text-on-surface-variant">
                <span>6 UNITS (4-AXLE LOGISTICS)</span>
                <span>DST TO PIER: 1.4 KM</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  flyTo(latOf("convoy"), 15);
                  triggerScan("Kinematic track extrapolation for CONVOY VECTOR 12 updated.", "info");
                }}
                className="self-start text-primary hover:underline font-label-caps text-label-caps flex items-center gap-space-2xs uppercase mt-space-2xs"
              >
                <span>UPDATE TRACK</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </button>
            </div>
            </>
            )}
          </div>

          {/* Ruler / measure tool */}
          <div className="p-space-sm bg-surface-container-lowest/90 backdrop-blur-md rounded flex flex-col gap-space-xs text-on-surface shadow-md pointer-events-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs font-mono-sm text-mono-sm">
                <span className="material-symbols-outlined text-primary text-base">square_foot</span>
                <span>
                  RULER:{" "}
                  <strong className="text-primary tabular-nums">{ruler.dist > 0 ? `${ruler.dist.toFixed(1)} M` : "—"}</strong>{" "}
                  {ruler.dist > 0 && `(BEARING ${ruler.bearing}°)`}
                </span>
              </div>
              <div className="flex items-center gap-space-xs">
                <button
                  type="button"
                  onClick={resetRuler}
                  className="px-space-xs py-space-2xs bg-surface-container hover:bg-surface-container-high rounded font-label-caps text-label-caps text-primary uppercase"
                >
                  RESET TOOL
                </button>
                <button
                  type="button"
                  onClick={() => togglePanel("ruler")}
                  className="p-space-xs rounded bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
                  title={panels.ruler ? "Collapse ruler" : "Expand ruler"}
                >
                  <span className="material-symbols-outlined text-sm">{panels.ruler ? "expand_less" : "expand_more"}</span>
                </button>
              </div>
            </div>
            {panels.ruler && (
              <div className="flex items-center gap-space-xs">
                <button
                  type="button"
                  onClick={() => {
                    setMeasure(!measure);
                    pushToast({
                      kind: measure ? "info" : "ok",
                      title: measure ? "MEASURE DISENGAGED" : "MEASURE ENGAGED",
                      msg: measure ? "Ruler tool off." : "Click two points on the satellite map to measure distance.",
                    });
                  }}
                  className={`flex-1 px-space-xs py-space-xs rounded font-label-caps text-label-caps uppercase transition-all flex items-center justify-center gap-space-2xs ${
                    measure
                      ? "bg-primary-container text-on-primary-container font-bold shadow-[0_0_10px_rgba(0,229,255,0.4)]"
                      : "bg-surface-container hover:bg-surface-container-high text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">straighten</span>
                  <span>{measure ? "CLICK 2 POINTS ON MAP…" : "MEASURE ON MAP"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      ) : (
      <div className="relative z-10 w-full px-space-md py-space-sm flex-1 flex justify-center items-start pointer-events-none">
        <button
          type="button"
          onClick={() => {
            setHud(true);
            pushToast({ kind: "info", title: "HUD CONTROL", msg: "Floating panels restored." });
          }}
          className="pointer-events-auto px-space-md py-space-xs bg-surface-container-lowest/90 backdrop-blur-md rounded font-label-caps text-label-caps text-primary uppercase flex items-center gap-space-2xs shadow-xl border border-primary-container/40 anim-fade-up"
        >
          <span className="material-symbols-outlined text-sm">layers</span>
          <span>SHOW HUD PANELS</span>
        </button>
      </div>
      )}

      {/* LAYER 3: Bottom timeline + analytics */}
      <div className="relative z-20 w-full p-space-md bg-surface-container-lowest/95 backdrop-blur-md flex flex-col gap-space-sm border-t border-surface-container-high/40">
        <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-sm flex-wrap">
            <span className="material-symbols-outlined text-primary text-lg">history</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">CHANGE-DETECTION TIMELINE:</span>
            <div className="flex items-center gap-space-xs">
              {[
                { label: "0200Z", sub: "[BASE]", s: 0 },
                { label: "0800Z", sub: "[T-0 CURRENT]", s: 1 },
                { label: "1400Z", sub: "[PREDICTED]", s: 2 },
              ].map((st, i) => {
                const active = stepActive(st.s);
                return (
                  <span key={st.s} className="flex items-center gap-space-xs">
                    {i > 0 && <span className="text-outline-variant font-mono-sm">→</span>}
                    <button
                      type="button"
                      onClick={() => pickStep(st.s)}
                      className={`px-space-sm py-space-xs rounded font-mono-sm text-mono-sm transition-colors flex items-center gap-space-2xs ${
                        active
                          ? "bg-primary-container text-on-primary-container font-bold shadow-[0_0_10px_rgba(0,229,255,0.4)]"
                          : "bg-surface-container hover:bg-surface-container-high text-on-surface"
                      }`}
                    >
                      {active && <span className="h-1.5 w-1.5 rounded-full bg-surface-container-lowest animate-pulse"></span>}
                      <span>{st.label}</span>
                      <span className={`text-[10px] ${st.s === 2 ? "text-tertiary-fixed-dim" : "text-outline"}`}>{st.sub}</span>
                    </button>
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex-1 max-w-md w-full flex items-center gap-space-sm">
            <span className="font-mono-sm text-mono-sm text-outline">T-6h</span>
            <div className="flex-1">
              <Fader
                value={scrub}
                onChange={(v) => {
                  setScrub(v);
                  setPredicted(false);
                }}
                accent="#00e5ff"
              />
            </div>
            <span className="font-mono-sm text-mono-sm text-primary font-bold tabular-nums">{timeLabel}</span>
          </div>

          <div className="flex items-center gap-space-xs">
            <button
              type="button"
              onClick={() => {
                setSplit(!split);
                pushToast({
                  kind: split ? "info" : "ok",
                  title: "SPLIT DELTA VIEW",
                  msg: split ? "Split-delta disabled." : "T-6 base vs T-0 current overlaid — change masks rendered.",
                });
              }}
              className={`px-space-sm py-space-xs rounded font-label-caps text-label-caps uppercase flex items-center gap-space-2xs transition-colors ${
                split ? "bg-primary-container text-on-primary-container font-bold" : "bg-surface-container hover:bg-surface-container-high text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-sm">view_column</span>
              <span>SPLIT DELTA (T-6 vs T-0)</span>
            </button>
          </div>
        </div>

        <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-space-md pt-space-xs">
          <div className="flex flex-wrap items-center gap-space-md text-on-surface-variant font-mono-sm text-mono-sm">
            <div className="flex items-center gap-space-2xs">
              <span className="font-label-caps text-label-caps text-outline uppercase">AI MODEL:</span>
              <span className="text-primary font-bold">YOLOV8-SAT-DEFENSE // CONF: 98.4%</span>
            </div>
            <span className="text-outline-variant">|</span>
            <div className="flex items-center gap-space-2xs">
              <span className="font-label-caps text-label-caps text-outline uppercase">TILE SOURCE:</span>
              <span className="text-secondary-fixed-dim">{FEEDS.find((x) => x.id === feed)?.desc}</span>
            </div>
            <span className="text-outline-variant">|</span>
            <div className="flex items-center gap-space-2xs">
              <span className="font-label-caps text-label-caps text-outline uppercase">SUN ELEVATION:</span>
              <span className="text-on-surface">14.2° AZ</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-space-xs">
            <button
              type="button"
              onClick={() => setView("sna-graph-matrix")}
              className="px-space-md py-space-sm rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-headline-sm text-headline-sm transition-all flex items-center gap-space-xs"
            >
              <span className="material-symbols-outlined text-base">hub</span>
              <span>Correlate with SNA Network</span>
            </button>
            <button
              type="button"
              onClick={() => pushToast({ kind: "ok", title: "GEO-EXPORT", msg: "High-res GeoTIFF (current viewport) queued to secure pipeline." })}
              className="px-space-md py-space-sm rounded bg-surface-container hover:bg-surface-container-high text-primary font-headline-sm text-headline-sm transition-all flex items-center gap-space-xs"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span>Export High-Res GeoTIFF</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRevisit(revisit + 1);
                triggerScan(`Priority re-visit task confirmed (task ${revisit + 1} / SCHED).`, "crit");
              }}
              className="px-space-md py-space-sm rounded bg-primary-container text-on-primary-container font-headline-sm text-headline-sm font-bold shadow-[0_0_16px_rgba(0,229,255,0.4)] hover:shadow-[0_0_24px_rgba(0,229,255,0.6)] transition-all flex items-center gap-space-xs"
            >
              <span className="material-symbols-outlined text-base">add_task</span>
              <span>Task Priority Re-Visit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
