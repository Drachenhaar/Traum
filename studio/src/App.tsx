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
import { RomanBlatt, RomanRegal } from './pages/roman/RomanBlatt';
import { Schreibraum } from './pages/roman/Schreibraum';
import { ConfirmHost } from './components/ui/Confirm';
import { Toasts } from './components/ui/Toasts';
import { ZeitstrahlSheet } from './pages/book/Zeitstrahl';
import { EntdeckungenSheet } from './pages/book/Entdeckungen';
import { ReiseSheet } from './pages/book/Reise';
import { SpiegelSheet } from './pages/book/Spiegel';
import { OwnershipSpread } from './pages/book/OwnershipSpread';
import { MeinBuchSheet } from './pages/book/MeinBuch';
import { Geburt } from './pages/geburt/Geburt';
import { Onboarding } from './pages/onboarding/Onboarding';
import { Bibliothek } from './pages/bibliothek/Bibliothek';
import { useStudio } from './store/useStudio';
import { buildBook } from './lib/book';
import { istEinBuch } from './lib/bibliothek';

export default function App() {
  const ready = useStudio((s) => s.ready);
  const init = useStudio((s) => s.init);
  const identity = useStudio((s) => s.settings.book);
  const books = useStudio((s) => s.books);

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
    /*
     * Nur wer *gar keinen* Band besitzt, kommt in die Erschaffung. Wer Bücher
     * hat, aber gerade keines aufgeschlagen – etwa, weil alle im Archiv
     * stehen –, gehört in die Bibliothek und nicht an den Anfang: Ihm sein
     * erstes Buch anzubieten, während seine im Regal stehen, wäre ein
     * Schrecken, kein Empfang.
     */
    if (ready && imWerden === null) setImWerden(!istEinBuch(identity) && books.length === 0);
  }, [ready, identity, books.length, imWerden]);

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
              <Onboarding
                onFertig={(ziel) => {
                  /*
                   * Ohne Ziel zum Umschlag – von dort schlägt sich das Buch
                   * selbst auf. Mit Ziel direkt dorthin: Wer gerade seine
                   * erste Seite geschrieben hat, will sie sehen und nicht
                   * erst ein Buch aufschlagen.
                   */
                  window.location.hash = ziel ? `#${ziel}` : '#/';
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

  /*
   * Bücher, aber keines offen: Der Weg geht in die Bibliothek. Das ist der
   * Zustand nach dem Löschen des letzten aufgeschlagenen Bandes oder wenn
   * alles im Archiv steht.
   */
  if (!istEinBuch(identity)) {
    return (
      <HashRouter>
        <Routes>
          <Route path="/bibliothek" element={<Bibliothek />} />
          <Route path="/neues-buch" element={<NeuesBuch />} />
          <Route path="*" element={<Navigate to="/bibliothek" replace />} />
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

        {/*
          Die Bibliothek.

          Sie steht neben dem Umschlag, nicht davor: Wer Dragoncore oeffnet,
          haelt sein Buch in der Hand, nicht einen Regalplan. Erst wer es
          zuklappt, sieht, was sonst noch dasteht. Siehe §34 – die Metapher
          darf die Arbeit nicht verlangsamen.
        */}
        <Route path="/bibliothek" element={<Bibliothek />} />
        <Route path="/neues-buch" element={<NeuesBuch />} />

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
          <Route path="/entdeckungen" element={<EntdeckungenSheet />} />
          <Route path="/reise" element={<ReiseSheet />} />
          <Route path="/spiegel" element={<SpiegelSheet />} />
          <Route path="/chronik" element={<ChronicleSheet />} />
          <Route path="/werkbank" element={<WorkbenchSheet />} />
          <Route path="/lose-blaetter" element={<LooseLeavesSheet />} />
          <Route path="/lose-blaetter/:id" element={<CanvasBoardPage />} />
          <Route path="/kolophon" element={<ColophonSheet />} />

          {/* Der Roman: seine Übersicht ist ein Blatt im Buch … */}
          <Route path="/roman" element={<RomanRegal />} />
          <Route path="/roman/:id" element={<RomanBlatt />} />
        </Route>

        {/*
          … sein Schreibraum aber nicht.

          Er liegt bewusst außerhalb des Buchblocks. Beim Schreiben soll die
          restliche Welt zurücktreten: keine Kapitelzeile, keine
          Blätterpfeile, keine Seitenzahl. Wäre er eine Seite unter anderen,
          käme das ganze Buch mit hinein – und mit ihm alles, was den Blick
          vom Text wegzieht.
        */}
        <Route path="/schreiben/:id" element={<Schreibraum />} />

        {/* Frühere Adressen bleiben gültig – niemand soll ins Leere greifen. */}
        <Route path="/graph" element={<Navigate to="/karte" replace />} />
        <Route path="/zeitleiste" element={<Navigate to="/chronik" replace />} />
        <Route path="/pipeline" element={<Navigate to="/werkbank" replace />} />
        <Route path="/canvas" element={<Navigate to="/lose-blaetter" replace />} />
        <Route path="/bilder" element={<Navigate to="/tafelteil" replace />} />
        <Route path="/einstellungen" element={<Navigate to="/kolophon" replace />} />
        <Route path="/artbible" element={<Navigate to="/inhalt" replace />} />
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

/**
 * Ein weiteres Buch.
 *
 * Dieselben Szenen wie bei der Erschaffung, andere Worte – und eine Szene
 * mehr: die Ausrichtung. Am Ende liegt das neue Buch aufgeschlagen da; wer
 * abbricht, steht wieder in der Bibliothek und hat nichts angelegt.
 */
function NeuesBuch() {
  const navigate = useNavigate();
  /*
   * Direkt auf die erste Seite, nicht auf den Umschlag.
   *
   * „Schlag es auf" ist der letzte Satz der Zeremonie; wer darauf tippt, hat
   * das Buch aufgeschlagen. Auf dem Umschlag zu landen und dort ein zweites
   * Mal „Das Buch aufschlagen" zu lesen, nimmt dem Satz sein Wort.
   */
  return <Geburt modus="weiterer" onFertig={() => navigate('/besitz')} />;
}

function CoverGate() {
  const navigate = useNavigate();
  const entries = useStudio((s) => s.entries);
  const images = useStudio((s) => s.images);
  const settings = useStudio((s) => s.settings);
  const books = useStudio((s) => s.books);
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

  /*
   * Der Umschlag ist der geschlossene Zustand des Buches – und damit der
   * Ort, an dem die Bibliothek sichtbar wird.
   *
   * Auch mit einem einzigen Band. Die Zeile war zuerst an „mehr als eines"
   * geknuepft, und weil das Anlegen eines weiteren Buches *in* der Bibliothek
   * liegt, kam man mit einem Buch nie zu einem zweiten. Ein Regal mit einem
   * Band ist kein leerer Ort – es ist der Ort, an dem Platz ist.
   */
  void books;

  return (
    <Cover
      book={book}
      identity={settings.book!}
      tagline={settings.worldTagline}
      resumePage={resume?.page}
      resumeLabel={resume ? resume.label : undefined}
      onOpen={() => navigate(ziel)}
      onRegal={() => navigate('/bibliothek')}
    />
  );
}
