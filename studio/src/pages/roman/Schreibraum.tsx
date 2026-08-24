/**
 * Der Schreibraum.
 *
 * Hier tritt der Rest von Dragoncore zurueck. Kein Buchblock, keine
 * Blaetterpfeile, keine Kapitelzeile – nur Papier, eine Ueberschrift und der
 * Text. Er darf etwas mehr Praesenz haben als eine Datenseite, weil hier
 * etwas entsteht statt nachgeschlagen zu werden.
 *
 * Drei Regeln haben jede Entscheidung in dieser Datei bestimmt:
 *
 *   1. Der Schreibfluss ist heilig. Nichts nimmt den Fokus, nichts schliesst
 *      die Tastatur, nichts schreibt in den Text hinein.
 *   2. Der Text ist der Hauptdarsteller. Werkzeuge treten zurueck, sobald
 *      getippt wird, und kommen bei der ersten Bewegung wieder.
 *   3. Was hier steht, steht in der Welt. Eine Szene ist ein Eintrag; ihr
 *      Ort ist der Ort, ihre Figuren sind die Figuren.
 *
 * Und eine Regel fuer spaeter: Diese Datei klebt an keiner Editorbibliothek.
 * Es ist ein `textarea` auf Papier. Was danach kommt – Papiergefuehl,
 * Seitenumbruch, Randnotizen im Satzspiegel, Textanimation – bleibt damit
 * moeglich.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, NotebookPen } from 'lucide-react';
import { useStudio, livingEntries } from '../../store/useStudio';
import { asText } from '../../lib/templates';
import {
  elternVon,
  roemisch,
  romanBaum,
  signatur,
  szeneKontext,
  szenenFolge,
  woerter,
} from '../../lib/roman/struktur';
import { randnotizen } from '../../lib/roman/randnotizen';
import { Kapitelzeichen } from '../../components/roman/Kapitelzeichen';
import { SzenenBlatt } from '../../components/roman/SzenenBlatt';
import { Leitfaden } from '../../components/leitfaden/Leitfaden';
import { deskStyle } from '../../lib/textures';
import { cx, debounce } from '../../lib/utils';

/** Wie lange nach dem letzten Tastendruck die Werkzeuge fortbleiben. */
const RUHE_MS = 1400;
/** Wie lange nach dem letzten Zeichen in die Datenbank geschrieben wird. */
const SPEICHER_MS = 600;
/** Wie lange nach dem letzten Zeichen die Randnotizen neu gelesen werden. */
const NOTIZ_MS = 900;

export function Schreibraum() {
  const { id } = useParams();
  const navigate = useNavigate();

  const alleEintraege = useStudio((s) => s.entries);
  const relIndex = useStudio((s) => s.relIndex);
  const relations = useStudio((s) => s.relations);
  const updateEntry = useStudio((s) => s.updateEntry);
  const createUnter = useStudio((s) => s.createUnter);
  const noteVisit = useStudio((s) => s.noteVisit);

  const entries = useMemo(() => livingEntries(alleEintraege), [alleEintraege]);
  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const szene = id ? byId.get(id) : undefined;

  /* Wo steckt die Szene? Kapitel und Roman kommen aus dem Graphen. */
  const kapitel = useMemo(
    () => (szene ? elternVon(relIndex, byId, szene.id) : undefined),
    [relIndex, byId, szene],
  );
  const roman = useMemo(
    () => (kapitel ? elternVon(relIndex, byId, kapitel.id) : undefined),
    [relIndex, byId, kapitel],
  );
  const baum = useMemo(
    () => (roman ? romanBaum(relIndex, byId, roman.id) : null),
    [relIndex, byId, roman],
  );
  const kontext = useMemo(
    () => (szene ? szeneKontext(relIndex, byId, szene.id) : undefined),
    [relIndex, byId, szene],
  );

  /*
   * Der Text lebt waehrend des Schreibens hier und nicht im Speicher.
   *
   * Das ist der Unterschied zwischen fluessig und zaeh: Jeder Tastendruck
   * wuerde sonst den gesamten Eintragsspeicher neu setzen, den Beziehungsindex
   * anfassen und jede Seite neu rechnen, die daran haengt. Geschrieben wird
   * gebuendelt – und beim Verlassen der Seite sofort.
   */
  const [text, setText] = useState('');
  const geladen = useRef<string | undefined>(undefined);
  if (szene && geladen.current !== szene.id) {
    geladen.current = szene.id;
    setText(asText(szene.fields.manuskript));
  }

  const schreiber = useRef(updateEntry);
  schreiber.current = updateEntry;
  const feldRef = useRef(szene?.fields);
  feldRef.current = szene?.fields;

  const sichern = useMemo(
    () =>
      debounce((szeneId: string, wert: string) => {
        schreiber.current(szeneId, { fields: { ...feldRef.current, manuskript: wert } });
      }, SPEICHER_MS),
    [],
  );

  /* Beim Verlassen nichts liegenlassen – auch nicht die letzten 600 ms. */
  const offenerText = useRef({ id: '', text: '', schmutzig: false });
  useEffect(
    () => () => {
      const o = offenerText.current;
      if (o.schmutzig && o.id) {
        sichern.cancel();
        schreiber.current(o.id, { fields: { ...feldRef.current, manuskript: o.text } });
      }
    },
    [sichern],
  );

  const aendere = useCallback(
    (wert: string) => {
      if (!szene) return;
      setText(wert);
      offenerText.current = { id: szene.id, text: wert, schmutzig: true };
      sichern(szene.id, wert);
    },
    [szene, sichern],
  );

  useEffect(() => {
    if (szene) noteVisit(szene.id);
  }, [szene, noteVisit]);

  /* ------------------------------------------------------- Randnotizen */

  /*
   * Gerechnet wird nicht auf jedem Zeichen, sondern auf dem beruhigten Text.
   *
   * Namensvergleich ueber die ganze Welt ist billig, aber nicht umsonst: bei
   * fuenftausend Eintraegen und einem langen Kapitel sind es einige Millionen
   * Zeichenvergleiche. Einmal pro Tippause ist das nichts, einmal pro
   * Tastendruck waere es ein Ruckeln – und ein Ruckeln beim Schreiben ist das
   * Einzige, was hier wirklich verboten ist.
   */
  const [ruhigerText, setRuhigerText] = useState('');
  useEffect(() => {
    const t = window.setTimeout(() => setRuhigerText(text), NOTIZ_MS);
    return () => window.clearTimeout(t);
  }, [text]);

  const notizen = useMemo(
    () =>
      szene
        ? randnotizen(ruhigerText, szene.beginn, entries, kontext?.weltbezuege ?? [], relations)
        : { vorkommen: [], vorschlaege: [], widersprueche: [] },
    [szene, ruhigerText, entries, kontext, relations],
  );
  const zuSehen = notizen.vorschlaege.length + notizen.widersprueche.length;

  /* ------------------------------------------------------------ Ruhe */

  const [ruhe, setRuhe] = useState(false);
  const ruheTimer = useRef<number>();
  const tippt = useCallback(() => {
    setRuhe(true);
    window.clearTimeout(ruheTimer.current);
    ruheTimer.current = window.setTimeout(() => setRuhe(false), RUHE_MS);
  }, []);
  const wecke = useCallback(() => {
    window.clearTimeout(ruheTimer.current);
    setRuhe(false);
  }, []);
  useEffect(() => () => window.clearTimeout(ruheTimer.current), []);

  /* ---------------------------------------------------------- Blätter */

  const [kapitelOffen, setKapitelOffen] = useState(false);
  const [blattOffen, setBlattOffen] = useState(false);

  const folge = useMemo(() => (baum ? szenenFolge(baum) : []), [baum]);
  const stelle = szene ? folge.findIndex((s) => s.id === szene.id) : -1;
  const vorige = stelle > 0 ? folge[stelle - 1] : undefined;
  const naechste = stelle >= 0 && stelle < folge.length - 1 ? folge[stelle + 1] : undefined;

  const feld = useRef<HTMLTextAreaElement>(null);
  /* Hoehe an den Inhalt anpassen – die Seite scrollt, nicht das Feld. */
  useEffect(() => {
    const el = feld.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [text, szene?.id]);

  if (!szene) {
    return (
      <div className="desk-surface grid h-full place-items-center px-6" style={deskStyle}>
        <div className="text-center">
          <p className="font-serif text-[17px] italic text-paper-400/70">
            Diese Szene steht nicht mehr im Buch.
          </p>
          <Link
            to="/roman"
            className="mt-4 inline-block font-serif text-[14px] text-gild-500 underline-offset-4 hover:underline"
          >
            Zurück zu den Romanen
          </Link>
        </div>
      </div>
    );
  }

  const nummer = baum ? baum.kapitel.findIndex((k) => k.kapitel.id === kapitel?.id) + 1 : 0;
  const zeichen = signatur(kontext ?? { figuren: [], weltbezuege: [] }, szene);
  const anzahl = woerter(text);

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden bg-cream-100"
      onPointerMove={wecke}
      onPointerDown={wecke}
    >
      {/* --------------------------------------------------- Kopfleiste */}
      <header
        className={cx(
          'relative z-20 flex shrink-0 items-center justify-between gap-2 px-2 pt-safe',
          'transition-opacity duration-500 motion-reduce:transition-none',
          ruhe ? 'opacity-0' : 'opacity-100',
        )}
      >
        <button
          type="button"
          onClick={() => navigate(roman ? `/roman/${roman.id}` : '/roman')}
          aria-label="Zurück"
          className="grid h-10 w-10 place-items-center text-ink-faint/45 transition-colors hover:text-ink no-tap-highlight"
        >
          <ChevronLeft size={18} />
        </button>

        {baum && (
          <Kapitelzeichen
            baum={baum}
            aktiveSzeneId={szene.id}
            offen={kapitelOffen}
            onOeffnen={() => setKapitelOffen(true)}
            onSchliessen={() => setKapitelOffen(false)}
            onSpringe={(zielId) => {
              setKapitelOffen(false);
              navigate(`/schreiben/${zielId}`);
            }}
            onNeueSzene={(kapitelId) => {
              setKapitelOffen(false);
              void createUnter(kapitelId, 'szene').then((neu) => navigate(`/schreiben/${neu.id}`));
            }}
          />
        )}

        <button
          type="button"
          onClick={() => setBlattOffen((o) => !o)}
          aria-label="Diese Szene"
          aria-expanded={blattOffen}
          data-leitfaden="szenenblatt"
          className={cx(
            'relative grid h-10 w-10 place-items-center transition-colors no-tap-highlight',
            blattOffen ? 'text-gild-500' : 'text-ink-faint/45 hover:text-gold-hell',
          )}
        >
          <NotebookPen size={17} />
          {/*
            Die einzige Stelle, an der die Randnotizen ungefragt sichtbar
            werden: ein Punkt. Kein Kasten, keine Meldung, kein rotes Zeichen –
            wer schreibt, soll wissen, dass etwas da ist, und selbst
            entscheiden, wann er hinsieht.
          */}
          {!blattOffen && zuSehen > 0 && (
            <span
              aria-label={`${zuSehen} ${zuSehen === 1 ? 'Randnotiz' : 'Randnotizen'}`}
              className="absolute right-1.5 top-1.5 h-[5px] w-[5px] rounded-full bg-gild-500"
            />
          )}
        </button>
      </header>

      {/* ------------------------------------------------------ Manuskript */}
      <div className="min-h-0 flex-1 overflow-y-auto scroll-slim">
        <article className="mx-auto w-full max-w-[42rem] px-6 pb-24 pt-4 sm:px-10">
          {nummer > 0 && <p className="rubric text-center">Kapitel {roemisch(nummer)}</p>}

          {/*
            Der Szenentitel ist die Ueberschrift dieser Seite und wird hier
            auch geschrieben – ein zweites Formular dafuer waere ein zweiter
            Ort fuer dieselbe Sache.
          */}
          <input
            value={szene.title}
            onChange={(e) => updateEntry(szene.id, { title: e.target.value })}
            onKeyDown={tippt}
            placeholder="Ohne Titel"
            aria-label="Titel der Szene"
            className={cx(
              'mt-2 w-full border-0 bg-transparent p-0 text-center font-serif text-[26px] leading-tight',
              'text-ink outline-none placeholder:text-ink-faint/35 sm:text-[32px]',
            )}
          />

          {zeichen && (
            <p className="mt-2.5 text-center font-serif text-[13px] tracking-[0.05em] text-ink-faint">
              {zeichen}
            </p>
          )}

          <span aria-hidden className="rule-gild mx-auto mt-6 block w-20 opacity-60" />

          <textarea
            ref={feld}
            value={text}
            onChange={(e) => aendere(e.target.value)}
            onKeyDown={tippt}
            placeholder="Hier beginnt die Szene …"
            aria-label="Manuskript"
            spellCheck
            className={cx(
              'mt-8 w-full resize-none overflow-hidden border-0 bg-transparent p-0 outline-none',
              'font-serif text-[17.5px] leading-[1.82] text-ink placeholder:italic placeholder:text-ink-faint/35',
              'sm:text-[18px]',
            )}
            style={{ hyphens: 'auto' }}
          />
        </article>
      </div>

      {/* ---------------------------------------------------- Fusszeile */}
      <footer
        className={cx(
          'pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between',
          'px-4 pb-safe transition-opacity duration-500 motion-reduce:transition-none',
          ruhe ? 'opacity-0' : 'opacity-100',
        )}
      >
        <Blaetterknopf ziel={vorige} richtung="zurueck" />
        <p className="pb-2 font-serif text-[12.5px] tabular-nums text-ink-faint/55">
          {anzahl.toLocaleString('de-DE')} {anzahl === 1 ? 'Wort' : 'Wörter'}
        </p>
        <Blaetterknopf ziel={naechste} richtung="vor" />
      </footer>

      <SzenenBlatt
        szene={szene}
        notizen={notizen}
        offen={blattOffen}
        onSchliessen={() => setBlattOffen(false)}
      />

      {/*
        Der Leitfaden haengt sonst in der Buchhuelle – der Schreibraum steht
        bewusst ausserhalb davon, also braucht er ihn hier noch einmal.
        Nur nicht in der Ruhe: Wenn die Werkzeuge verblassen, weil jemand
        schreibt, waere ein Wegweiser auf einen unsichtbaren Knopf das
        Gegenteil von Hilfe.
      */}
      {!ruhe && !kapitelOffen && !blattOffen && <Leitfaden />}
    </div>
  );
}

function Blaetterknopf({
  ziel,
  richtung,
}: {
  ziel?: { id: string; title: string };
  richtung: 'zurueck' | 'vor';
}) {
  if (!ziel) return <span className="h-10 w-10" />;
  const Pfeil = richtung === 'vor' ? ChevronRight : ChevronLeft;
  return (
    <Link
      to={`/schreiben/${ziel.id}`}
      title={ziel.title}
      aria-label={richtung === 'vor' ? `Weiter: ${ziel.title}` : `Zurück: ${ziel.title}`}
      className="pointer-events-auto grid h-10 w-10 place-items-center text-ink-faint/35 transition-colors hover:text-gold-hell no-tap-highlight"
    >
      <Pfeil size={18} />
    </Link>
  );
}
