import { useState } from "react";
import { AppProvider, useApp } from "./lib/store";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Toasts from "./components/Toasts";
import MissionOverview from "./views/MissionOverview";
import SnaMatrix from "./views/SnaMatrix";
import OrbitalRecon from "./views/OrbitalRecon";
import EntityDossier from "./views/EntityDossier";
import Feeds from "./views/Feeds";
import ExportBriefing from "./views/ExportBriefing";

function Shell() {
  const { view } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-surface min-h-screen text-on-surface select-none antialiased font-body-md text-body-md">
      <Header onMenuToggle={() => setMenuOpen((o) => !o)} />
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <Toasts />

      <div className="lg:pl-64">
        <main className="w-full pt-16 bg-surface min-h-screen px-container-padding pb-space-md">
          <div className="flex flex-col w-full">
            {view === "mission-overview" && <MissionOverview />}
            {view === "sna-graph-matrix" && <SnaMatrix />}
            {view === "orbital-satellite-recon" && <OrbitalRecon />}
            {view === "entity-dossier-watchlist" && <EntityDossier />}
            {view === "darkweb-social-feeds" && <Feeds />}
            {view === "export-intel-briefing" && <ExportBriefing />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
