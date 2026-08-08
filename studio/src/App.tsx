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
import { Setzerei } from './pages/book/Setzerei';
import {
  ChronicleSheet,
  WorkbenchSheet,
  LooseLeavesSheet,
  ColophonSheet,
} from './pages/book/AppendixTools';
import { CanvasBoardPage } from './pages/CanvasBoardPage';
import { ConfirmHost } from './components/ui/Confirm';
import { Toasts } from './components/ui/Toasts';
import { ZeitstrahlSheet } from './pages/book/Zeitstrahl';
import { OwnershipSpread } from './pages/book/OwnershipSpread';
import { MeinBuchSheet } from './pages/book/MeinBuch';
import { Geburt } from './pages/geburt/Geburt';
import { useStudio } from './store/useStudio';
import { buildBook } from './lib/book';
import { hasBookIdentity } from './lib/bookIdentity';

export default function App() {
  const ready = useStudio((s) => s.ready);
  const init = useStudio((s) => s.init);
  const identity = useStudio((s) => s.settings.book);

  /*
   * Ob die Erschaffung läuft, wird genau einmal entschieden – beim ersten
   * Bereitsein – und danach nur noch von der Erschaffung selbst beendet.
   *
   * Der naheliegende Weg wäre, einfach auf die Buchidentität zu schauen. Der
   * ist falsch: Sobald das Buch geschrieben ist, wäre die Bedingung erfüllt
   * und der Router tauschte die Ansicht mitten in der Zeremonie. Der letzte,
   * stille Moment – das fertige Buch allein auf dem Tisch – fiele genau in
   * dem Augenblick weg, in dem er entsteht. Er ist aber der Grund, warum das
   * hier keine Einrichtung ist.
   */
  const [imWerden, setImWerden] = useState<boolean | null>(null);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (ready && imWerden === null) setImWerden(!hasBookIdentity(identity));
  }, [ready, identity, imWerden]);

  if (!ready || imWerden === null) {
    return (
      <div className="desk-surface grid h-full place-items-center">
        <p className="animate-fadeIn font-serif text-[15px] italic tracking-wide text-paper-400/50">
          Das Buch wird aufgeschlagen …
        </p>
      </div>
    );
  }

  /*
   * Die Erstöffnung.
   *
   * Gibt es auf diesem Gerät noch kein Buch, führt jede Adresse zur
   * Erschaffung – nicht nur „/". Wer von irgendwoher einen Verweis auf eine
   * Seite hat, die es noch nicht geben kann, soll nicht ins Leere greifen,
   * sondern dort anfangen, wo alles anfängt.
   *
   * Erkannt wird das an der Buchidentität selbst, nicht an einem Merker
   * daneben: Ein Merker kann verlorengehen oder lügen, ein Buch mit Titel
   * nicht.
   */
  if (imWerden) {
    return (
      <HashRouter>
        <Routes>
          <Route
            path="*"
            element={
              <Geburt
                onFertig={() => {
                  /* Zum Umschlag – von dort schlägt sich das Buch selbst auf. */
                  window.location.hash = '#/';
                  setImWerden(false);
                }}
              />
            }
          />
        </Routes>
        <ConfirmHost />
        <Toasts />
      </HashRouter>
    );
  }

  return (
    <HashRouter>
      <Routes>
        {/* Der Einband – der erste Bildschirm, ohne jede Software darum herum. */}
        <Route path="/" element={<CoverGate />} />

        <Route element={<BookShell />}>
          {/* Die Besitzseite steht vor dem Vorwort – die erste Seite des Bandes. */}
          <Route path="/besitz" element={<OwnershipSpread />} />
          <Route path="/mein-buch" element={<MeinBuchSheet />} />
          <Route path="/vorwort" element={<ForewordSpread />} />
          <Route path="/inhalt" element={<ContentsSpread />} />
          <Route path="/kapitel/:id" element={<ChapterSpread />} />
          <Route path="/eintrag/:id" element={<EntrySpread />} />
          <Route path="/tafeln" element={<PlatesSpread />} />
          <Route path="/anhang" element={<AppendixSpread />} />

          {/* Anhänge: eigene Blätter, kein Buchsatz */}
          <Route path="/setzerei" element={<Setzerei />} />
          <Route path="/karte" element={<FoldOutMap />} />
          <Route path="/register" element={<RegisterSheet />} />
          <Route path="/tafelteil" element={<PlatesSheet />} />
          <Route path="/zeitstrahl" element={<ZeitstrahlSheet />} />
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

        {/*
          Neu binden: dieselben Szenen wie bei der Erschaffung, aber für ein
          Buch, das es schon gibt. Bewusst außerhalb des Buchblocks – es ist
          keine Seite im Buch, sondern ein Vorgang am Buch.
        */}
        <Route path="/neu-binden" element={<NeuBinden />} />

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
/**
 * Das Buch neu binden.
 *
 * Am Ende steht der Verfasser wieder dort, wo er hergekommen ist – bei
 * „Einband & Zeichen". Nicht auf dem Umschlag: Er hat sein Buch nicht neu
 * begonnen, er hat es umgebunden, und danach will man sehen, was daraus
 * geworden ist.
 */
function NeuBinden() {
  const navigate = useNavigate();
  return <Geburt modus="neubinden" onFertig={() => navigate('/mein-buch')} />;
}

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

  /*
   * Beim allerersten Aufschlagen liegt die Besitzseite obenauf – so wie in
   * einem neuen Buch. Danach übernimmt das Lesebändchen: Es schlägt dort auf,
   * wo zuletzt zugeklappt wurde.
   */
  const ziel = resume?.path ?? (settings.lastSpreadKey ? '/vorwort' : '/besitz');

  return (
    <Cover
      book={book}
      identity={settings.book!}
      tagline={settings.worldTagline}
      resumePage={resume?.page}
      resumeLabel={resume ? resume.label : undefined}
      onOpen={() => navigate(ziel)}
    />
  );
}
