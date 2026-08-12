/**
 * Die Druckfassung.
 *
 * Die letzte Seite eines Buchprogramms, die noch etwas Neues tut: Sie macht
 * aus dem Buch ein Buch. Nicht einen Export, nicht eine Datei zum
 * Weiterverarbeiten – einen Satz, den man in die Hand nehmen kann.
 *
 * Deshalb steht hier fast nichts. Ein Format wählen, entscheiden, ob die
 * Tafeln mit sollen, und setzen lassen. Alles Weitere macht der Drucker des
 * Geräts, und der kann seit Jahren PDF.
 *
 * Der aufwendigste Teil dieser Datei ist nicht sichtbar: Das gesetzte Buch
 * wird in einem eigenen Fenster geöffnet, und dieses Fenster muss **beim
 * Antippen** entstehen, nicht danach. Wer es erst nach dem Satz öffnet, hat
 * einen Popup-Blocker gegen sich – und der schweigt, wenn er zuschlägt.
 */

import { useMemo, useState } from 'react';
import { BookOpen, FileDown } from 'lucide-react';
import { useStudio } from '../../store/useStudio';
import { AppendixSheet } from './Appendix';
import { EmptyState } from '../../components/ui/EmptyState';
import { FORMATE, druckfassung, type Format } from '../../lib/druck/weltbuch';
import { buildRelationIndex } from '../../lib/relations';
import { chapterOfType } from '../../lib/book';
import { cx, downloadFile } from '../../lib/utils';
import { geheimZeile } from '../../lib/geheim';

export function DruckSheet() {
  return (
    <AppendixSheet title="Druckfassung" rubric="Anhang · Auf Papier">
      <Druck />
    </AppendixSheet>
  );
}

/** Ein Dateiname, der auf einem fremden Rechner noch etwas bedeutet. */
function dateiname(titel: string): string {
  const rein = titel
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const tag = new Date().toISOString().slice(0, 10);
  return `${rein || 'buch'}-druckfassung-${tag}.html`;
}

function Druck() {
  const entries = useStudio((s) => s.entries);
  const relations = useStudio((s) => s.relations);
  const books = useStudio((s) => s.books);
  const activeBookId = useStudio((s) => s.activeBookId);
  const notify = useStudio((s) => s.notify);

  const [formatId, setFormatId] = useState(FORMATE[0].id);
  const [mitBildern, setMitBildern] = useState(true);
  /*
   * Standardmaessig *ohne* Geheimes.
   *
   * Die vorsichtigere Vorgabe gewinnt: Ein Ausdruck, dem ein Absatz fehlt,
   * laesst sich nachdrucken. Einer, der zu viel enthaelt und auf dem Spieltisch
   * liegt, nicht.
   */
  const [mitGeheimem, setMitGeheimem] = useState(false);
  const [busy, setBusy] = useState(false);

  const buch = books.find((b) => b.id === activeBookId);
  /*
   * Bewusst *nicht* `livingEntries`.
   *
   * Das filtert im Tischmodus verborgene Seiten heraus – richtig fuer jede
   * Ansicht am Bildschirm und falsch fuer den Druck. Sonst haette der
   * Schalter „Fuer dich" ins Leere gegriffen, sobald jemand beim Drucken
   * zufaellig im Tischmodus war: Er haette „mit allem" gewaehlt und ein
   * unvollstaendiges Buch bekommen, ohne dass irgendwo etwas dagegen spricht.
   * Was in den Druck kommt, entscheidet der Druck.
   */
  const lebende = useMemo(() => entries.filter((e) => !e.deletedAt), [entries]);

  /* Was tatsächlich in den Satz kommt – dieselbe Rechnung wie dort. */
  const kapitelzahl = useMemo(
    () => new Set(lebende.map((e) => chapterOfType(e.type).id)).size,
    [lebende],
  );
  const tafeln = useMemo(
    () => new Set(lebende.map((e) => e.coverImage).filter(Boolean)).size,
    [lebende],
  );
  const verborgen = useMemo(() => geheimZeile(entries), [entries]);

  if (!buch || lebende.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Noch nichts zu setzen"
        message="Ein Buch entsteht aus Seiten. Sobald die ersten geschrieben sind, lässt sich daraus ein Satz machen."
      />
    );
  }

  const format = FORMATE.find((f) => f.id === formatId) ?? FORMATE[0];

  /**
   * Setzen und zeigen.
   *
   * Das Fenster entsteht als Erstes und bekommt sofort eine Zeile zu lesen –
   * bei vielen Tafeln dauert das Einbetten mehrere Sekunden, und ein leeres
   * weißes Fenster sieht in dieser Zeit aus wie ein Absturz.
   */
  const setzen = async (danachDrucken: boolean) => {
    if (busy) return;
    const fenster = window.open('', '_blank');
    if (fenster) {
      fenster.document.write(
        '<!doctype html><meta charset="utf-8"><title>Wird gesetzt …</title>' +
          '<body style="margin:0;background:#3a3229;color:#c9bda8;font:italic 15px Georgia,serif;' +
          'display:flex;align-items:center;justify-content:center;height:100vh">Das Buch wird gesetzt …</body>',
      );
      fenster.document.close();
    }

    setBusy(true);
    try {
      const html = await bauen(format);
      if (!fenster) {
        /*
         * Der Blocker hat zugeschlagen. Statt zu klagen, geben wir die Datei
         * heraus – der Satz ist fertig, er soll nicht an einem Fenster
         * scheitern.
         */
        downloadFile(dateiname(buch.title), html, 'text/html;charset=utf-8');
        notify('Das neue Fenster wurde blockiert – die Druckfassung liegt jetzt als Datei bereit.', 'info');
        return;
      }
      fenster.document.open();
      fenster.document.write(html);
      fenster.document.close();
      if (danachDrucken) {
        /*
         * Erst wenn die Bilder stehen, sonst druckt der Browser Leerstellen.
         * `onload` des neuen Fensters ist dafuer der richtige Zeitpunkt; das
         * Zeitfenster danach ist nur eine Sicherheit fuer den Fall, dass es
         * schon geladen war, als wir zugehoert haben.
         */
        const drucken = () => {
          try {
            fenster.focus();
            fenster.print();
          } catch {
            /* Manche Umgebungen erlauben das nicht – dann bleibt das Fenster stehen. */
          }
        };
        if (fenster.document.readyState === 'complete') setTimeout(drucken, 400);
        else fenster.addEventListener('load', () => setTimeout(drucken, 400));
      }
    } catch (err) {
      fenster?.close();
      notify(`Der Satz ist misslungen: ${(err as Error).message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const sichern = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const html = await bauen(format);
      downloadFile(dateiname(buch.title), html, 'text/html;charset=utf-8');
    } catch (err) {
      notify(`Der Satz ist misslungen: ${(err as Error).message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const bauen = (f: Format) =>
    druckfassung({
      buch,
      entries: lebende,
      index: buildRelationIndex(relations),
      format: f,
      mitBildern,
      mitGeheimem,
    });

  return (
    <div className="max-w-[44rem]">
      <p className="font-serif text-[15px] leading-relaxed text-ink-soft">
        {lebende.length} {lebende.length === 1 ? 'Seite' : 'Seiten'} in {kapitelzahl}{' '}
        {kapitelzahl === 1 ? 'Kapitel' : 'Kapiteln'} werden zu einem Band gesetzt – mit Einband,
        Titelblatt, Inhalt, Kapiteltrennern und Farbtafel. Was dabei entsteht, ist eine einzelne
        Datei, die alles enthält und niemanden mehr braucht.
      </p>

      {/* ------------------------------------------------------- Das Format */}
      <h2 className="mt-9 font-serif text-[19px] text-ink">Das Maß</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {FORMATE.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFormatId(f.id)}
            aria-pressed={f.id === formatId}
            className={cx(
              'rounded-sm border px-4 py-3 text-left transition-colors no-tap-highlight',
              f.id === formatId
                ? 'border-gild-600/60 bg-gild-600/10'
                : 'border-paper-400/30 hover:border-paper-400/60',
            )}
          >
            <span className="block font-serif text-[15px] text-ink">{f.name}</span>
            <span className="mt-1 block font-serif text-[12.5px] leading-snug text-ink-faint">
              {f.note}
            </span>
          </button>
        ))}
      </div>

      {/*
        -------------------------------------------------------- Die Tafeln

        Nur wenn es welche gibt. Ein Schalter, der eingeschaltet dasteht und
        darunter einraeumt, dass es nichts zu schalten gibt, ist eine Frage
        ohne Gegenstand – und jede solche Frage macht die Seite laenger und
        die Entscheidung darueber schwerer.
      */}
      {tafeln > 0 && (
        <>
          <h2 className="mt-9 font-serif text-[19px] text-ink">Die Tafeln</h2>
          <button
            type="button"
            onClick={() => setMitBildern((v) => !v)}
            aria-pressed={mitBildern}
            className={cx(
              'mt-3 w-full rounded-sm border px-4 py-3 text-left transition-colors no-tap-highlight',
              mitBildern
                ? 'border-gild-600/60 bg-gild-600/10'
                : 'border-paper-400/30 hover:border-paper-400/60',
            )}
          >
            <span className="block font-serif text-[15px] text-ink">
              {mitBildern ? 'Titelbilder mitdrucken' : 'Ohne Bilder setzen'}
            </span>
            <span className="mt-1 block font-serif text-[12.5px] leading-snug text-ink-faint">
              {mitBildern
                ? `${tafeln} ${tafeln === 1 ? 'Titelbild wird' : 'Titelbilder werden'} in voller Auflösung eingebettet. Das dauert einen Moment und macht die Datei groß – auf Papier ist es der Unterschied.`
                : `${tafeln} ${tafeln === 1 ? 'Titelbild bleibt' : 'Titelbilder bleiben'} draußen. Die Datei wird klein und ist in einem Augenblick fertig.`}
            </span>
          </button>
        </>
      )}

      {/*
        -------------------------------------------------------- Das Verborgene

        Nur wenn dieses Buch etwas verbirgt – und mit der vorsichtigen Vorgabe.
        Ein Ausdruck verlaesst den Bildschirm: Er wird weitergereicht, liegt auf
        einem Tisch, wird vergessen. Deshalb ist das hier eine eigene, bewusste
        Entscheidung und nicht der Tischmodus des Geraets.
      */}
      {verborgen && (
        <>
          <h2 className="mt-9 font-serif text-[19px] text-ink">Für wen ist der Druck?</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              {
                an: false,
                titel: 'Für den Tisch',
                note: `Ohne alles, was nur du weißt. ${verborgen}.`,
              },
              {
                an: true,
                titel: 'Für dich',
                note: 'Mit den verborgenen Seiten und Stellen, sichtbar eingefasst.',
              },
            ].map((w) => (
              <button
                key={String(w.an)}
                type="button"
                onClick={() => setMitGeheimem(w.an)}
                aria-pressed={mitGeheimem === w.an}
                className={cx(
                  'rounded-sm border px-4 py-3 text-left transition-colors no-tap-highlight',
                  mitGeheimem === w.an
                    ? 'border-gild-600/60 bg-gild-600/10'
                    : 'border-paper-400/30 hover:border-paper-400/60',
                )}
              >
                <span className="block font-serif text-[15px] text-ink">{w.titel}</span>
                <span className="mt-1 block font-serif text-[12.5px] leading-snug text-ink-faint">
                  {w.note}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ------------------------------------------------------- Das Setzen */}
      <div className="mt-10 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-accent"
          disabled={busy}
          onClick={() => void setzen(true)}
        >
          <BookOpen size={18} /> {busy ? 'Wird gesetzt …' : 'Drucken oder als PDF sichern'}
        </button>
        <button type="button" className="btn-ghost" disabled={busy} onClick={() => void sichern()}>
          <FileDown size={18} /> Als Datei sichern
        </button>
      </div>

      <p className="mt-4 font-serif text-[13px] italic leading-relaxed text-ink-faint">
        Das gesetzte Buch öffnet sich in einem eigenen Fenster, und der Drucker des Geräts fragt,
        was damit geschehen soll. „Als PDF sichern“ steht dort in jedem Browser – das ist der Weg
        zur Datei, die eine Druckerei annimmt.
      </p>
    </div>
  );
}
