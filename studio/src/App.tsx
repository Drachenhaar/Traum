/** Routen und Anwendungsstart. */

import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { EntryPage } from './pages/EntryPage';
import { LibraryPage } from './pages/LibraryPage';
import { DnaPage } from './pages/DnaPage';
import { GraphPage } from './pages/GraphPage';
import { ArtBiblePage } from './pages/ArtBiblePage';
import { PipelinePage } from './pages/PipelinePage';
import { TimelinePage } from './pages/TimelinePage';
import { CanvasListPage } from './pages/CanvasListPage';
import { CanvasBoardPage } from './pages/CanvasBoardPage';
import { ImagesPage } from './pages/ImagesPage';
import { SettingsPage } from './pages/SettingsPage';
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
        <div className="text-center animate-fadeIn">
          <p className="font-serif text-2xl text-ink">Dragoncore Studio</p>
          <p className="mt-1 text-[15px] text-ink-muted">Die Welt wird geöffnet …</p>
        </div>
      </div>
    );
  }

  return (
    /* HashRouter: funktioniert auch, wenn die App in einem Unterordner ohne
       Server-Regeln ausgeliefert wird. */
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/dna" element={<DnaPage />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="/bibliothek" element={<LibraryPage />} />
          <Route path="/canvas" element={<CanvasListPage />} />
          <Route path="/canvas/:id" element={<CanvasBoardPage />} />
          <Route path="/artbible" element={<ArtBiblePage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/zeitleiste" element={<TimelinePage />} />
          <Route path="/bilder" element={<ImagesPage />} />
          <Route path="/einstellungen" element={<SettingsPage />} />
          <Route path="/eintrag/:id" element={<EntryPage />} />

          {/* Alte Adressen der Bereichsseiten bleiben gültig. */}
          <Route path="/essenz" element={<Navigate to="/bibliothek?typ=page" replace />} />
          <Route path="/welt" element={<Navigate to="/bibliothek?typ=location" replace />} />
          <Route path="/charaktere" element={<Navigate to="/bibliothek?typ=character" replace />} />
          <Route path="/kreaturen" element={<Navigate to="/bibliothek?typ=creature" replace />} />
          <Route path="/pflanzen" element={<Navigate to="/bibliothek?typ=plant" replace />} />
          <Route path="/architektur" element={<Navigate to="/bibliothek?typ=architecture" replace />} />
          <Route path="/assets" element={<Navigate to="/bibliothek?typ=asset" replace />} />
          <Route path="/prompts" element={<Navigate to="/bibliothek?typ=prompt" replace />} />
          <Route path="/sammlungen" element={<Navigate to="/bibliothek?typ=collection" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

      <ConfirmHost />
      <Toasts />
    </HashRouter>
  );
}
