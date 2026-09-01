/**
 * Ein Feld, wie es auf Papier aussieht.
 *
 * Der Unterschied zum Formular in `entry/EntryFields.tsx` ist nicht die
 * Funktion – es sind dieselben Werte in denselben Schlüsseln –, sondern die
 * Reihenfolge der Behauptungen:
 *
 *     Formular:  Hier ist ein Kasten. Schreib etwas hinein.
 *     Setzerei:  Hier steht eine Frage. Beantworte sie, wenn du magst.
 *
 * Deshalb hat ein leeres Feld hier keinen Rahmen, sondern eine Frage; und ein
 * gefülltes hat keinen Rahmen, sondern den Text. Der Rahmen erscheint erst,
 * wenn jemand hineinschreibt – ein Kontrollelement, das gebraucht wird, und
 * sonst Papier.
 *
 * ---
 *
 * **Was hier nicht steht.**
 *
 * Bildfelder. Der Leser der Setzerei hat gerade Text eingelegt; Bilder wählt
 * er auf der fertigen Seite. Sie hier anzubieten hiesse, in einem Schritt
 * zwei Dinge zu tun – und der Erkennungslauf kann ohnehin kein Bild finden.
 * Das entspricht dem bisherigen Verhalten: `angabenFor` liess Bilder und
 * Verweise schon immer aus.
 */

import { useEffect, useRef, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import type { Entry, FieldValue } from '../../types';
import type { FieldDef } from '../../lib/templates';
import { asBool, asList, asText, templateFor } from '../../lib/templates';
import { darstellungVon, frageFuer, istFormatangabe, weltbezugVon } from '../../lib/setzerei/darstellung';
import { cx } from '../../lib/utils';

/* ------------------------------------------------------------ Grundflächen */

/**
 * Eine Zeile, die wie geschrieben aussieht und nicht wie eingegeben.
 *
 * Kein Rahmen, kein Grund – nur eine Haarlinie darunter, und die auch nur,
 * solange jemand darin steht. `text-[16px]` ist kein Geschmack: Unter
 * sechzehn Punkten zoomt Safari beim Hineintippen, und das ausgerechnet in
 * dem Feld, in das man gerade schreibt.
 */
function Schreibzeile({
  wert,
  onChange,
  autoFocus,
  platzhalter,
}: {
  wert: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  platzhalter?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  return (
    <input
      ref={ref}
      value={wert}
      placeholder={platzhalter}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        'w-full border-0 border-b border-transparent bg-transparent pb-1 font-serif text-[16px]',
        'leading-relaxed text-ink outline-none transition-colors',
        'placeholder:text-ink-faint/45 focus:border-gild-500/50',
      )}
    />
  );
}

/** Ein Absatz, der mit dem Text wächst. Dieselbe Haltung wie oben. */
function Schreibsatz({
  wert,
  onChange,
  autoFocus,
  platzhalter,
  kursiv,
}: {
  wert: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  platzhalter?: string;
  kursiv?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  /* Die Höhe folgt dem Inhalt – ein Rollbalken in einem Absatz ist ein Kasten. */
  const messen = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  useEffect(messen, [wert]);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <textarea
      ref={ref}
      value={wert}
      rows={1}
      placeholder={platzhalter}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        'w-full resize-none overflow-hidden border-0 border-l-2 border-transparent bg-transparent',
        'py-0 pl-0 font-serif text-[16px] leading-[1.75] text-ink outline-none transition-[border-color,padding]',
        'placeholder:text-ink-faint/45 focus:border-gild-500/40 focus:pl-3',
        kursiv && 'italic',
      )}
    />
  );
}

/* ------------------------------------------------------------------ Marken */

/**
 * Eine Marke – der einzige Knopf, den diese Oberfläche kennt.
 *
 * Gold trägt genau eine Bedeutung: **das hier ist gewählt**. Alles andere ist
 * Papier mit einer feinen Linie darum. Wer Gold auch für „anklickbar"
 * benutzte, hätte eine Seite, auf der alles leuchtet und nichts gilt.
 */
export function Marke({
  children,
  an,
  onClick,
  klein,
  titel,
}: {
  children: React.ReactNode;
  an?: boolean;
  onClick?: () => void;
  klein?: boolean;
  titel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={onClick ? !!an : undefined}
      title={titel}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border font-serif transition-colors no-tap-highlight',
        klein ? 'min-h-[30px] px-2.5 text-[13px]' : 'min-h-[38px] px-3.5 text-[14.5px]',
        an
          ? 'border-gild-500/60 bg-gild-400/15 text-ink'
          : 'border-lineStrong/70 text-ink-muted hover:border-gild-500/40 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

/** Eine Liste einzelner Werte. Kein Komma, keine Rohzeile – je ein Wort, je eine Marke. */
function Markenfeld({
  werte,
  onChange,
  platzhalter,
}: {
  werte: string[];
  onChange: (v: string[]) => void;
  platzhalter: string;
}) {
  const [entwurf, setEntwurf] = useState('');
  const hinzu = (roh: string) => {
    const w = roh.trim();
    if (!w || werte.some((x) => x.toLowerCase() === w.toLowerCase())) {
      setEntwurf('');
      return;
    }
    onChange([...werte, w]);
    setEntwurf('');
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {werte.map((w) => (
        <span
          key={w}
          className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-gild-500/45 bg-gild-400/10 pl-3 pr-1 font-serif text-[14px] text-ink"
        >
          {w}
          <button
            type="button"
            onClick={() => onChange(werte.filter((x) => x !== w))}
            aria-label={`${w} entfernen`}
            className="grid h-7 w-7 place-items-center rounded-full text-ink-faint transition-colors hover:text-ink no-tap-highlight"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        value={entwurf}
        placeholder={platzhalter}
        onChange={(e) => setEntwurf(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            hinzu(entwurf);
          } else if (e.key === 'Backspace' && !entwurf && werte.length) {
            onChange(werte.slice(0, -1));
          }
        }}
        onBlur={() => hinzu(entwurf)}
        className="min-w-[9rem] flex-1 border-0 border-b border-transparent bg-transparent pb-1 font-serif text-[16px] text-ink outline-none transition-colors placeholder:text-ink-faint/45 focus:border-gild-500/50"
      />
    </div>
  );
}

/* ---------------------------------------------------------------- Palette */

/** Gespeichert bleibt „#RRGGBB|Name" – sichtbar ist die Farbe. */
function Palettenfeld({ werte, onChange }: { werte: string[]; onChange: (v: string[]) => void }) {
  const [offen, setOffen] = useState<number | null>(null);

  return (
    <div className="flex flex-wrap items-start gap-3">
      {werte.map((roh, i) => {
        const [farbe = '#000000', ...rest] = roh.split('|');
        const name = rest.join('|');
        const zeigeHex = offen === i;
        return (
          <div key={i} className="w-[86px]">
            <label className="relative block h-14 w-full cursor-pointer rounded-[2px] shadow-[0_1px_5px_rgba(60,44,26,0.3)]" style={{ background: farbe }}>
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(farbe) ? farbe : '#000000'}
                onChange={(e) => onChange(werte.map((v, x) => (x === i ? `${e.target.value}|${name}` : v)))}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Farbe wählen"
              />
            </label>
            <input
              value={name}
              placeholder="Name"
              onChange={(e) => onChange(werte.map((v, x) => (x === i ? `${farbe}|${e.target.value}` : v)))}
              className="mt-1 w-full border-0 bg-transparent font-serif text-[13px] text-ink outline-none placeholder:text-ink-faint/45"
            />
            {/*
              Der Hexwert steht nicht auf dem Papier.

              Er ist die Schreibweise der Maschine – man braucht ihn, wenn man
              eine Farbe woandershin traegt, und sonst nie. Also liegt er unter
              einem Tipp und nicht ueber der Farbe.
            */}
            <div className="flex items-baseline gap-2">
              <button
                type="button"
                onClick={() => setOffen(zeigeHex ? null : i)}
                className="font-serif text-[11px] italic text-ink-faint/70 transition-colors hover:text-gold no-tap-highlight"
              >
                {zeigeHex ? farbe : 'Wert'}
              </button>
              <button
                type="button"
                onClick={() => onChange(werte.filter((_, x) => x !== i))}
                aria-label="Farbe entfernen"
                className="font-serif text-[11px] italic text-ink-faint/70 transition-colors hover:text-gold no-tap-highlight"
              >
                weg
              </button>
            </div>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => onChange([...werte, '#A8853F|'])}
        aria-label="Farbe hinzufügen"
        className="grid h-14 w-[86px] place-items-center rounded-[2px] border border-dashed border-lineStrong/70 text-ink-faint transition-colors hover:border-gild-500/45 hover:text-gold no-tap-highlight"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ Feld */

export interface Feldstand {
  /** Der Wert, wie er im Eintrag stünde. */
  wert: FieldValue | undefined;
  /** Kam er aus dem Manuskript und ist noch unbestätigt? */
  vorschlag: boolean;
}

export function Feldsatz({
  def,
  stand,
  onChange,
  onUebernehmen,
  onVerwerfen,
  onVerweis,
  verknuepft,
  entries,
}: {
  def: FieldDef;
  stand: Feldstand;
  onChange: (v: FieldValue) => void;
  /** Vorschlag stehen lassen und als bestätigt kennzeichnen. */
  onUebernehmen: () => void;
  /** Vorschlag löschen. */
  onVerwerfen: () => void;
  /** Dieses Feld an eine vorhandene Seite binden. */
  onVerweis?: (def: FieldDef) => void;
  /** Der Eintrag, an den es gebunden ist – falls schon gewählt. */
  verknuepft?: Entry;
  entries: Entry[];
}) {
  const art = darstellungVon(def);
  if (art === 'bilder') return null;

  const [aktiv, setAktiv] = useState(false);
  const leer = !hatWert(stand.wert);
  const bezug = weltbezugVon(def.key);

  /*
   * Ein leeres Feld ist eine Frage, kein Kasten.
   *
   * Solange niemand sie angetippt hat, gibt es hier kein Eingabeelement –
   * nicht versteckt, sondern gar nicht. Dreissig leere Felder untereinander
   * sind eine Datenbankmaske; dreissig Fragen sind ein Fragebogen, und auch
   * das ist zu viel. Deshalb steht die Frage klein und der Abschnitt darum
   * ist zu, bis jemand ihn oeffnet.
   */
  if (leer && !aktiv) {
    return (
      <button
        type="button"
        onClick={() => setAktiv(true)}
        className="group block w-full py-2 text-left no-tap-highlight"
      >
        <span className="font-serif text-[15.5px] italic leading-relaxed text-ink-faint/75 transition-colors group-hover:text-gold">
          {frageFuer(def)}
        </span>
      </button>
    );
  }

  return (
    <div className="py-2">
      {/*
        Die Beschriftung steht klein darueber und nur, wenn etwas dasteht.
        Ueber einer Frage waere sie doppelt gemoppelt; ueber einem Wert ist
        sie die Auskunft, was der Wert bedeutet.
      */}
      <div className="mb-1">
        <span className="rubric">{def.label}</span>
      </div>

      <Inhalt
        art={art}
        def={def}
        wert={stand.wert}
        aktiv={aktiv}
        onChange={onChange}
        entries={entries}
      />

      {/*
        Die Herkunft des Werts – als Fussnote unter ihm, nicht als Leiste
        ueber ihm.

        Beim ersten Lauf standen „aus dem Manuskript", „übernehmen" und
        „verwerfen" in der Beschriftungszeile. Bei zwölf erkannten Feldern
        waren das sechsunddreissig Kontrollelemente, jedes mit Symbol, viele
        in Gold – und weil die Zeile zu eng wurde, brachen sie um. Genau die
        „grosse Menge gleichartiger Controls", die eine Werkstatt nicht haben
        soll.

        Jetzt: eine kursive Zeile in Fussnotengroesse. Sie sagt, woher der Wert
        kommt, und bietet die zwei Entscheidungen an, ohne selbst eine zu
        verlangen. Das Dritte – Bearbeiten – braucht keinen Knopf: Der Text
        darueber ist bereits das Feld.
      */}
      {stand.vorschlag && (
        <p className="mt-1.5 font-serif text-[12.5px] italic leading-relaxed text-ink-faint/75">
          aus dem Manuskript ·{' '}
          <button
            type="button"
            onClick={onUebernehmen}
            className="text-gold transition-colors hover:text-gold-hell no-tap-highlight"
          >
            übernehmen
          </button>
          {' · '}
          <button
            type="button"
            onClick={onVerwerfen}
            className="transition-colors hover:text-ink no-tap-highlight"
          >
            verwerfen
          </button>
        </p>
      )}

      {/*
        Das Weltwissen als Auswahlhilfe.

        „Herkunft: Nebelwald" ist ein String – und wenn es den Nebelwald als
        Ort laengst gibt, ist der String die schlechtere Wahrheit. Hier steht
        deshalb der Hinweis darauf, dass eine echte Verbindung moeglich waere.
        Der Text bleibt in jedem Fall stehen; die Kante kommt dazu.
      */}
      {bezug && onVerweis && (
        <button
          type="button"
          onClick={() => onVerweis(def)}
          className="mt-1.5 inline-flex min-h-[30px] items-center gap-1.5 font-serif text-[12.5px] italic text-ink-faint transition-colors hover:text-gold no-tap-highlight"
        >
          {verknuepft ? (
            <>
              <Check size={12} className="text-gold" />
              verbunden mit „{verknuepft.title}" · {templateFor(verknuepft.type).label}
            </>
          ) : (
            <>Mit einer vorhandenen Seite verbinden</>
          )}
        </button>
      )}
    </div>
  );
}

function Inhalt({
  art,
  def,
  wert,
  aktiv,
  onChange,
  entries,
}: {
  art: ReturnType<typeof darstellungVon>;
  def: FieldDef;
  wert: FieldValue | undefined;
  aktiv: boolean;
  onChange: (v: FieldValue) => void;
  entries: Entry[];
}) {
  /* Ein Hinweis, der ein Format beschreibt, gehört in den Prompt, nicht aufs Papier. */
  const platzhalter = istFormatangabe(def.hint) ? '' : def.placeholder ?? '';

  switch (art) {
    case 'zeile':
      return <Schreibzeile wert={asText(wert)} onChange={onChange} autoFocus={aktiv} platzhalter={platzhalter} />;

    case 'satz':
      return <Schreibsatz wert={asText(wert)} onChange={onChange} autoFocus={aktiv} platzhalter={platzhalter} />;

    /*
      Das Zitat wird gesetzt, nicht eingegeben.

      Es ist der einzige Satz auf einer Figurenseite, den die Figur selbst
      sagt – und im gedruckten Buch steht er groesser, kursiv und eingerueckt.
      Ihn hier als graue Zeile zu zeigen und erst auf der Seite zu setzen,
      hiesse: Man sieht beim Schreiben nicht, was man schreibt.
    */
    case 'zitat':
      return (
        <div className="border-l-2 border-gild-500/35 pl-4">
          <Schreibsatz wert={asText(wert)} onChange={onChange} autoFocus={aktiv} platzhalter={platzhalter} kursiv />
        </div>
      );

    /* Die Randbemerkung ist von Hand geschrieben – auch beim Schreiben. */
    case 'notiz':
      return (
        <div className="satz-hand text-ink-muted [&_textarea]:font-[inherit] [&_textarea]:text-[15px] [&_textarea]:leading-[1.6]">
          <Schreibsatz wert={asText(wert)} onChange={onChange} autoFocus={aktiv} platzhalter={platzhalter} />
        </div>
      );

    case 'einwahl': {
      const jetzt = asText(wert);
      return (
        <div className="flex flex-wrap gap-1.5">
          {(def.options ?? []).filter(Boolean).map((o) => (
            <Marke key={o} an={jetzt === o} onClick={() => onChange(jetzt === o ? '' : o)} klein>
              {o}
            </Marke>
          ))}
        </div>
      );
    }

    case 'jaNein':
      return (
        <div className="flex gap-1.5">
          <Marke an={asBool(wert)} onClick={() => onChange(true)} klein>
            ja
          </Marke>
          <Marke an={!asBool(wert)} onClick={() => onChange(false)} klein>
            nein
          </Marke>
        </div>
      );

    case 'marken':
      return <Markenfeld werte={asList(wert)} onChange={onChange} platzhalter="hinzufügen …" />;

    case 'palette':
      return <Palettenfeld werte={asList(wert)} onChange={onChange} />;

    case 'verweis': {
      const ids = asList(wert);
      const gewaehlt = ids
        .map((id) => entries.find((e) => e.id === id))
        .filter(Boolean) as Entry[];
      return (
        <div className="flex flex-wrap gap-1.5">
          {gewaehlt.map((e) => (
            <span
              key={e.id}
              className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-gild-500/45 bg-gild-400/10 pl-3 pr-1 font-serif text-[14px] text-ink"
            >
              {e.title}
              <button
                type="button"
                onClick={() => onChange(ids.filter((x) => x !== e.id))}
                aria-label={`${e.title} entfernen`}
                className="grid h-7 w-7 place-items-center rounded-full text-ink-faint hover:text-ink no-tap-highlight"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {gewaehlt.length === 0 && (
            <span className="font-serif text-[14px] italic text-ink-faint/70">
              noch nichts verbunden
            </span>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

export function hatWert(v: FieldValue | undefined): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return v === true;
}
