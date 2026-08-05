/** Routen und Anwendungsstart. */

import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { EntryPage } from './pages/EntryPage';
import { ImagesPage } from './pages/ImagesPage';
import { SettingsPage } from './pages/SettingsPage';
import {
  ArchitecturePage,
  AssetsPage,
  CharactersPage,
  CollectionsPage,
  CreaturesPage,
  EssencePage,
  PlantsPage,
  PromptsPage,
  WorldPage,
} from './pages/sections';
import { ConfirmHost } from './components/ui/Confirm';
import { Toasts } from './components/ui/Toasts';
import { useStudio } from './store/useStudio';

export default function App() {
  const ready = useStudio((s) => s.ready);
  const init = useStudio((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  if (!ready) {
    return (
      <div className="grid h-full place-items-center bg-cream-100">
        <div className="text-center">
          <p className="font-serif text-2xl text-ink">Dragoncore Studio</p>
          <p className="mt-1 text-[15px] text-ink-muted">Archiv wird geöffnet …</p>
        </div>
      </div>
    );
  }

  return (
    /* HashRouter: funktioniert auch, wenn die App als Datei oder in einem
       Unterordner ohne Server-Regeln ausgeliefert wird. */
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/essenz" element={<EssencePage />} />
          <Route path="/welt" element={<WorldPage />} />
          <Route path="/charaktere" element={<CharactersPage />} />
          <Route path="/kreaturen" element={<CreaturesPage />} />
          <Route path="/pflanzen" element={<PlantsPage />} />
          <Route path="/architektur" element={<ArchitecturePage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/prompts" element={<PromptsPage />} />
          <Route path="/sammlungen" element={<CollectionsPage />} />
          <Route path="/bilder" element={<ImagesPage />} />
          <Route path="/einstellungen" element={<SettingsPage />} />
          <Route path="/eintrag/:id" element={<EntryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

      <ConfirmHost />
      <Toasts />
    </HashRouter>
  );
}
