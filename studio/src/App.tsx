/**
 * Das Buch und seine Seiten.
 *
 * Zwei Zustände: geschlossen (der Einband) und aufgeschlagen (der Buchblock).
 * Alle Adressen sind Seiten des Buches – es gibt keine „Ansichten“ mehr, nur
 * Kapitel und Anhänge.
 */

import { useEffect, useMemo, useState } from 'react';
import { HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { BookShell } from './components/book/BookShell';
import { Cover } from './components/book/Cover';
import { ForewordSpread } from './pages/book/ForewordSpread';
import { ContentsSpread } from './pages/book/ContentsSpread';
import { ChapterSpread } from './pages/book/ChapterSpread';
import { EntrySpread } from './pages/book/EntrySpread';
import { AppendixSpread } from './pages/book/Appendix';
import { FoldOutMap } from './pages/book/FoldOutMap';
import { RegisterSheet, PlatesSpread, PlatesSheet } from './pages/book/RegisterSpread';
import {
  ChronicleSheet,
  WorkbenchSheet,
  LooseLeavesSheet,
  ColophonSheet,
} from './pages/book/AppendixTools';
import { CanvasBoardPage } from './pages/CanvasBoardPage';
import { ConfirmHost } from './components/ui/Confirm';
import { Toasts } from './components/ui/Toasts';
import { useStudio } from './store/useStudio';
import { buildBook } from './lib/book';

export default function App() {
  const ready = useStudio((s) => s.ready);
  const init = useStudio((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  if (!ready) {
    return (
      <div className="desk-surface grid h-full place-items-center">
        <p className="animate-fadeIn font-serif text-[15px] italic tracking-wide text-paper-400/50">
          Das Buch wird aufgeschlagen …
        </p>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        {/* Der Einband – der erste Bildschirm, ohne jede Software darum herum. */}
        <Route path="/" element={<CoverGate />} />

        <Route element={<BookShell />}>
          <Route path="/vorwort" element={<ForewordSpread />} />
          <Route path="/inhalt" element={<ContentsSpread />} />
          <Route path="/kapitel/:id" element={<ChapterSpread />} />
          <Route path="/eintrag/:id" element={<EntrySpread />} />
          <Route path="/tafeln" element={<PlatesSpread />} />
          <Route path="/anhang" element={<AppendixSpread />} />

          {/* Anhänge: eigene Blätter, kein Buchsatz */}
          <Route path="/karte" element={<FoldOutMap />} />
          <Route path="/register" element={<RegisterSheet />} />
          <Route path="/tafelteil" element={<PlatesSheet />} />
          <Route path="/chronik" element={<ChronicleSheet />} />
          <Route path="/werkbank" element={<WorkbenchSheet />} />
          <Route path="/lose-blaetter" element={<LooseLeavesSheet />} />
          <Route path="/lose-blaetter/:id" element={<CanvasBoardPage />} />
          <Route path="/kolophon" element={<ColophonSheet />} />
        </Route>

        {/* Frühere Adressen bleiben gültig – niemand soll ins Leere greifen. */}
        <Route path="/graph" element={<Navigate to="/karte" replace />} />
        <Route path="/zeitleiste" element={<Navigate to="/chronik" replace />} />
        <Route path="/pipeline" element={<Navigate to="/werkbank" replace />} />
        <Route path="/canvas" element={<Navigate to="/lose-blaetter" replace />} />
        <Route path="/bilder" element={<Navigate to="/tafelteil" replace />} />
        <Route path="/einstellungen" element={<Navigate to="/kolophon" replace />} />
        <Route path="/artbible" element={<Navigate to="/inhalt" replace />} />
        <Route path="/bibliothek" element={<Navigate to="/inhalt" replace />} />
        <Route path="/dna" element={<Navigate to="/kapitel/essenz" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ConfirmHost />
      <Toasts />
    </HashRouter>
  );
}

/**
 * Der Einband.
 *
 * Beim Aufschlagen kehrt das Buch dorthin zurück, wo es zuletzt zugeklappt
 * wurde – nicht auf eine Startseite. Existiert die Seite nicht mehr (der
 * Eintrag wurde entfernt), beginnt es beim Vorwort.
 */
function CoverGate() {
  const navigate = useNavigate();
  const entries = useStudio((s) => s.entries);
  const images = useStudio((s) => s.images);
  const settings = useStudio((s) => s.settings);
  const [book] = useState(() => buildBook(entries, images.length));

  const resume = useMemo(() => {
    const key = settings.lastSpreadKey;
    if (!key) return undefined;
    const index = book.indexOf.get(key);
    if (index === undefined) return undefined;
    return book.spreads[index];
  }, [settings.lastSpreadKey, book]);

  return (
    <Cover
      book={book}
      worldName={settings.worldName}
      tagline={settings.worldTagline}
      resumePage={resume?.page}
      resumeLabel={resume ? resume.label : undefined}
      onOpen={() => navigate(resume?.path ?? '/vorwort')}
    />
  );
}
