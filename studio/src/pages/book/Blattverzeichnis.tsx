/**
 * Das Blattverzeichnis – jedes Blatt dieses Buches, mit einer Tür.
 *
 * ---
 *
 * **Warum es das braucht.**
 *
 * Gemeldet als: „Wir hatten die anderen grafischen Buchseiten. Sie sind noch
 * nicht direkt einsehbar, und ich würde direkten Zugang haben wollen."
 *
 * Nachgezählt: Das Buch hat rund dreissig Adressen. Der Anhang erreicht
 * fünfzehn davon – neun sofort, sechs hinter „Weiteres". Alles andere hängt an
 * einem *Weg*: Die Weltkarte liegt hinter einer Tiefengeste, das Tafelteil in
 * Blattform hinter dem Register, die Charakterseite hinter den Blättern einer
 * Figur, der Charakterspiegel hinter der Charakterseite.
 *
 * Jeder dieser Wege ist für sich richtig gebaut. Zusammen ergeben sie ein
 * Buch, in dem man **wissen muss**, dass es eine Seite gibt, um sie zu
 * finden. Das ist der Unterschied zwischen einer Welt, die man erkundet, und
 * einer, in der man sich verläuft.
 *
 * ---
 *
 * **Warum es kein zweiter Anhang ist.**
 *
 * Der Anhang ordnet nach dem Profil: Er legt nach vorn, was zu dieser
 * Arbeitsweise passt, und den Rest unter „Weiteres". Das ist gut und bleibt.
 *
 * Dieses Verzeichnis tut ausdrücklich das **Gegenteil**: Es ordnet nach dem
 * Buch und nicht nach dem Leser, es lässt nichts weg, und es fragt kein
 * Profil. Ein Verzeichnis, das etwas verschweigt, ist keins – und der Sinn
 * dieser Seite ist genau, dass man hier nichts wissen muss.
 *
 * ---
 *
 * **Was es nicht auflistet: die Einträge.**
 *
 * Die haben ein eigenes Verzeichnis, und das gibt es seit langem: das
 * Register, alphabetisch und mit Seitenzahl. Sie hier ein zweites Mal
 * aufzuzählen wäre bei dreihundert Kreaturen keine Übersicht, sondern eine
 * Wand. Das Verzeichnis nennt die **Blätter**; das Register nennt, was auf
 * ihnen steht. Deshalb steht das Register hier als Zeile und nicht als
 * Abschrift.
 *
 * ---
 *
 * **Leere Gruppen bleiben still.**
 *
 * Dieselbe Regel wie überall in diesem Buch: Wer noch keine Figur hat, liest
 * hier keine Überschrift „Figurenblätter" mit nichts darunter. Eine leere
 * Rubrik ist ein Versprechen, das die Seite nicht hält.
 */

import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useStudio, livingEntries } from '../../store/useStudio';
import type { Entry } from '../../types';
import { bandVon } from '../../lib/baende';
import { useCurrentSpread } from '../../components/book/BookShell';
import { AppendixSheet, anhangWerkzeuge, anhangAusserhalb, type AnhangZahlen } from './Appendix';

/** Eine Zeile im Verzeichnis: wohin, wie es heisst, und was dort liegt. */
interface Blatt {
  to: string;
  titel: string;
  /** Eine Zeile darunter – nie geraten, immer aus dem Buch. */
  notiz?: string;
  /** Die Seitenzahl, wenn das Buch eine dafür kennt. */
  seite?: number;
}

function Gruppe({ rubrik, blaetter }: { rubrik: string; blaetter: Blatt[] }) {
  /* Leere Gruppen bleiben still – siehe oben. */
  if (!blaetter.length) return null;
  return (
    <section className="mt-9 first:mt-0">
      <h3 className="font-serif text-[12px] uppercase tracking-[0.2em] text-rubrik">{rubrik}</h3>
      <ul className="mt-2 divide-y divide-line">
        {blaetter.map((b) => (
          <li key={b.to}>
            <Link to={b.to} className="flex items-baseline gap-3 py-3 no-tap-highlight">
              <span className="min-w-0 flex-1">
                <span className="block font-serif text-[16.5px] leading-snug text-ink">
                  {b.titel}
                </span>
                {b.notiz && (
                  <span className="mt-0.5 block font-serif text-[13.5px] italic leading-relaxed text-ink-faint">
                    {b.notiz}
                  </span>
                )}
              </span>
              {b.seite !== undefined && (
                <span className="shrink-0 font-serif text-[13px] tabular-nums text-ink-faint/70">
                  {b.seite}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BlattverzeichnisSheet() {
  const entries = useStudio((s) => s.entries);
  const images = useStudio((s) => s.images);
  const boards = useStudio((s) => s.boards);
  const settings = useStudio((s) => s.settings);
  const { book } = useCurrentSpread();

  const lebendig = useMemo(() => livingEntries(entries), [entries]);

  /*
   * Der Buchkörper kommt aus `book.spreads` und nicht aus einer Liste hier.
   *
   * Das ist die einzige Stelle, die weiss, welche Blätter dieses Buch
   * wirklich hat und welche Seitenzahl sie tragen – dieselbe Quelle, aus der
   * das Inhaltsverzeichnis und die Kopfzeile lesen. Eine eigene Aufzählung
   * wäre eine zweite Wahrheit über die Anzahl der Seiten, und die wäre beim
   * ersten neuen Kapitel falsch.
   */
  const vorderes: Blatt[] = book.spreads
    .filter((s) => s.kind === 'vorwort' || s.kind === 'inhalt')
    .map((s) => ({ to: s.path, titel: s.label, seite: s.page }));

  const kapitel: Blatt[] = book.chapters.map(({ chapter, entries: drin, page }) => ({
    to: `/kapitel/${chapter.id}`,
    titel: chapter.title,
    notiz: `${drin.length} ${drin.length === 1 ? 'Eintrag' : 'Einträge'}`,
    seite: page,
  }));

  /*
   * Der Anhang – vollständig und ohne Profil.
   *
   * Dieselbe Funktion, aus der der Anhang selbst liest (`anhangWerkzeuge`),
   * nur ohne `ordne`. Zwei handgeschriebene Listen derselben Sache sind in
   * diesem Projekt schon mehrfach auseinandergelaufen.
   */
  const zahlen: AnhangZahlen = {
    szenen: lebendig.filter((e: Entry) => e.type === 'szene').length,
    tafeln: images.length,
    boegen: boards.length,
    assets: lebendig.filter((e: Entry) => e.type === 'asset').length,
    entnommen: entries.filter((e: Entry) => e.deletedAt).length,
    bandName: bandVon(settings.book?.band).name,
  };
  const { kolophon, meinBuch } = anhangAusserhalb(zahlen);
  const anhang: Blatt[] = [...anhangWerkzeuge(zahlen), meinBuch, kolophon].map((w) => ({
    to: w.to,
    titel: w.title,
    notiz: w.note,
  }));

  /*
   * Und die Blätter, die bis hierher nur über einen Weg zu erreichen waren.
   *
   * Sie sind der Anlass für diese Seite. Jede Zeile hier nennt einen Ort, den
   * es im Buch längst gibt und zu dem keine Tür führte.
   */
  const figuren = lebendig.filter((e: Entry) => e.type === 'character');
  const bildteil: Blatt[] = [
    /*
     * Die Notizen sprechen zum Leser, nicht zum Erbauer.
     *
     * Hier stand „Lag bisher nur hinter einer Tiefengeste" und „die zweite
     * Darstellung des Tafelteils". Beides ist wahr und beides geht den Leser
     * nichts an: Das eine ist die Geschichte dieser Anwendung, das andere
     * ihr Bauplan. Wer ein Verzeichnis aufschlägt, will wissen, was ihn
     * erwartet – nicht, warum es vorher schwer zu finden war.
     *
     * Der Satz über die Tiefengeste steht deshalb oben im Dateikopf, wo er
     * hingehört.
     */
    {
      to: '/weltkarte',
      titel: 'Weltkarte',
      notiz: 'Die gezeichnete Karte deiner Welt, ganzseitig.',
    },
    {
      to: '/tafelteil',
      titel: 'Alle Tafeln',
      notiz: images.length
        ? `${images.length} ${images.length === 1 ? 'Tafel' : 'Tafeln'} untereinander, als durchgehendes Blatt.`
        : 'Alle Tafeln untereinander, als durchgehendes Blatt. Noch ist keine da.',
    },
  ];

  const figurenblaetter: Blatt[] = figuren.flatMap((f: Entry) => [
    {
      to: `/figur/${f.id}`,
      titel: f.title,
      notiz: 'Charakterseite – randlos, mit Daumenregister und Tiefenräumen.',
    },
    {
      to: `/spiegel/${f.id}`,
      titel: `${f.title} · Spiegel`,
      notiz: 'Was diese Figur über das Werk verrät.',
    },
  ]);

  const boegen: Blatt[] = boards.map((b) => ({
    to: `/lose-blaetter/${b.id}`,
    titel: b.name || 'Ohne Titel',
    notiz: 'Ein loser Bogen zum Sammeln und Sortieren.',
  }));

  return (
    <AppendixSheet title="Blattverzeichnis" rubric="Anhang · Jedes Blatt dieses Buches">
      <p className="font-serif text-[15px] italic leading-relaxed text-ink-muted">
        Alles, was dieses Buch an Blättern hat – ohne Ordnung nach Arbeitsweise, ohne Auslassung.
        Was auf den Blättern steht, nennt das Register.
      </p>

      <div className="mt-8">
        <Gruppe rubrik="Vorderes" blaetter={vorderes} />
        <Gruppe rubrik="Kapitel" blaetter={kapitel} />
        <Gruppe rubrik="Anhang" blaetter={anhang} />
        <Gruppe rubrik="Bildteil" blaetter={bildteil} />
        <Gruppe rubrik="Figurenblätter" blaetter={figurenblaetter} />
        <Gruppe rubrik="Lose Blätter" blaetter={boegen} />
      </div>
    </AppendixSheet>
  );
}
