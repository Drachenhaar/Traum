/**
 * Ein Feld auf der werdenden Buchseite.
 *
 * Der Unterschied zu jedem Formular liegt in einer einzigen Entscheidung:
 * **Ein Feld ist zuerst gesetzter Text und erst auf Verlangen ein
 * Eingabeelement.**
 *
 *     Formular:  dreißig Kästen, alle bereit, alle leer, alle gleich
 *     Setzerei:  eine Seite, die schon aussieht wie eine Seite – und die
 *                sich an der Stelle öffnet, die man antippt
 *
 * Daraus folgt, dass immer höchstens **ein** Feld offen ist. Das ist keine
 * Sparsamkeit, sondern der Punkt: Wer zwei Textfelder gleichzeitig offen hat,
 * sieht wieder ein Formular. Welches offen ist, entscheidet deshalb der
 * Aufrufer und nicht das Feld – siehe `offen` / `onOeffnen`.
 *
 * ---
 *
 * **Alle acht Feldarten aus `templates.ts` sind hier darstellbar**, in
 * Lesedarstellung und in Bearbeitung. Es gibt keine, die stillschweigend
 * fehlt: `images` und `entries` benutzen die vorhandenen Wähler, statt hier
 * einen neunten zu bauen.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, PenLine, Plus, X } from 'lucide-react';
import type { Entry, FieldValue } from '../../types';
import type { FieldDef } from '../../lib/templates';
import { asBool, asList, asText, templateFor } from '../../lib/templates';
import { istFormatangabe, weltbezugVon } from '../../lib/setzerei/darstellung';
import { Fliesstext, Rubrik } from './Setzerei';
import { Thumb } from '../images/Thumb';
import { ImagePicker } from '../images/ImagePicker';
import { EntryLinkPicker } from '../entry/EntryLinkPicker';
import { cx } from '../../lib/utils';

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
}: {
  children: ReactNode;
  an?: boolean;
  onClick?: () => void;
  klein?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={onClick ? !!an : undefined}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border font-serif transition-colors duration-200 no-tap-highlight',
        klein ? 'min-h-[32px] px-3 text-[13.5px]' : 'min-h-[38px] px-3.5 text-[14.5px]',
        an
          ? 'border-gild-500/60 bg-gild-400/15 text-ink'
          : 'border-lineStrong/70 text-ink-muted hover:border-gild-500/40 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

/** Eine Marke, die nur dasteht – ein gesetzter Wert, kein Bedienelement. */
function Stillmarke({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-[30px] items-center rounded-full border border-gild-500/35 bg-gild-400/[0.07] px-3 font-serif text-[14px] text-ink">
      {children}
    </span>
  );
}

/* ------------------------------------------------------------ Schreibflächen */

/**
 * Sechzehn Punkte sind die Untergrenze für jede Fläche, in die getippt wird –
 * darunter zoomt Safari beim Hineintippen, und das ausgerechnet in dem Feld,
 * in dem man gerade schreibt.
 */
function Schreibzeile({ wert, onChange, onFertig }: { wert: string; onChange: (v: string) => void; onFertig: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <input
      ref={ref}
      value={wert}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onFertig()}
      onBlur={onFertig}
      className="w-full border-0 border-b border-gild-500/45 bg-transparent pb-1 font-serif text-[16px] leading-relaxed text-ink outline-none"
    />
  );
}

function Schreibsatz({ wert, onChange, onFertig }: { wert: string; onChange: (v: string) => void; onFertig: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const messen = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  useEffect(() => {
    messen();
    ref.current?.focus();
  }, []);
  useEffect(messen, [wert]);
  return (
    <textarea
      ref={ref}
      value={wert}
      rows={1}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onFertig}
      className="w-full resize-none overflow-hidden border-0 border-l-2 border-gild-500/40 bg-transparent py-0 pl-3 font-serif text-[16px] leading-[1.8] text-ink outline-none"
    />
  );
}

/* -------------------------------------------------------------------- Feld */

export function SetzFeld({
  def,
  wert,
  onChange,
  offen,
  onOeffnen,
  onSchliessen,
  entries,
  weltbezug,
  onWeltbezug,
  ohneRubrik,
}: {
  def: FieldDef;
  wert: FieldValue | undefined;
  onChange: (v: FieldValue) => void;
  offen: boolean;
  onOeffnen: () => void;
  onSchliessen: () => void;
  entries: Entry[];
  /** Mit welcher vorhandenen Seite dieses Feld verbunden werden soll. */
  weltbezug?: Entry;
  onWeltbezug?: (def: FieldDef) => void;
  /**
   * Steht das Feld in einer `Angabe`, trägt die Rubrik dort schon die
   * Beschriftung – dann darf sie hier nicht ein zweites Mal gesetzt werden.
   *
   * Der erste Anlauf blendete sie mit `sr-only` weg. Fürs Auge stimmte das,
   * und genau deshalb wäre es durchgerutscht: `sr-only` heisst „nur für die
   * Vorlesehilfe". Eine Vorlesehilfe hörte danach „Art. Art. Schleierkarpfen"
   * – die Beschriftung zweimal, sauber ausgesprochen, sinnlos.
   */
  ohneRubrik?: boolean;
}) {
  const leer = !hatWert(wert);
  const bezug = weltbezugVon(def.key);

  return (
    <div
      className={cx(
        'group/feld transition-[opacity,transform] duration-200',
        offen && 'opacity-100',
      )}
    >
      {/*
        Rubrik und Stiftzeichen – oder keines von beidem.

        Der Stift ist die einzige sichtbare Zusage, dass hier etwas geändert
        werden kann, und er steht dauerhaft da: Auf einem Telefon gibt es kein
        Darüberfahren, und ein Handgriff, den man nur mit der Maus findet, ist
        auf dem Gerät, für das dieses Buch gebaut ist, keiner.

        Steht das Feld aber in einer `Angabe`, gibt es hier keine Rubrik – und
        dann schwebte der Stift allein am rechten Rand, eine Zeile über einem
        Wert, zu dem er sichtbar nicht gehörte. Dort ist der Wert selbst die
        Fläche; das ist die kleinere Zusage und die ehrlichere.
      */}
      {!ohneRubrik && (
        <div className="flex items-baseline gap-3">
          <Rubrik className="flex-1 text-gold">{def.label}</Rubrik>
          {!offen && (
            <button
              type="button"
              onClick={onOeffnen}
              aria-label={`${def.label} bearbeiten`}
              className="shrink-0 p-1 text-ink-faint/40 transition-colors duration-200 hover:text-gold no-tap-highlight"
            >
              <PenLine size={13} strokeWidth={1.6} />
            </button>
          )}
        </div>
      )}

      <div className={ohneRubrik ? undefined : 'mt-1'}>
        {offen ? (
          <Bearbeitung
            def={def}
            wert={wert}
            onChange={onChange}
            onFertig={onSchliessen}
            entries={entries}
          />
        ) : (
          <button
            type="button"
            onClick={onOeffnen}
            className="block w-full text-left no-tap-highlight"
          >
            {leer ? (
              /*
                Ein leeres Feld ist eine Einladung, kein Kasten.
                „Zitat hinzufügen" statt eines grauen Rechtecks mit Rahmen.
              */
              <span className="satz-fliess italic text-ink-faint/70 transition-colors group-hover/feld:text-gold">
                {einladung(def)}
              </span>
            ) : (
              <Lesedarstellung def={def} wert={wert} entries={entries} />
            )}
          </button>
        )}
      </div>

      {/*
        Das Weltwissen als Auswahlhilfe.

        „Herkunft: Nebelwald" ist ein String – und wenn es den Nebelwald als
        Ort längst gibt, ist der String die schlechtere Wahrheit. Der Text
        bleibt in jedem Fall stehen; die echte Kante kommt dazu.
      */}
      {bezug && onWeltbezug && !offen && (
        <button
          type="button"
          onClick={() => onWeltbezug(def)}
          className="mt-1 inline-flex min-h-[30px] items-center gap-1.5 font-serif text-[12.5px] italic text-ink-faint transition-colors duration-200 hover:text-gold no-tap-highlight"
        >
          {weltbezug ? (
            <>
              <Check size={12} className="text-gold" />
              verbunden mit „{weltbezug.title}" · {templateFor(weltbezug.type).label}
            </>
          ) : (
            'Bestehenden Eintrag verbinden'
          )}
        </button>
      )}
    </div>
  );
}

/** Was in einem leeren Feld steht, damit dort nicht nichts steht. */
function einladung(def: FieldDef): string {
  /* Ein Hinweis, der eine Frage ist, ist die beste Einladung – viele Vorlagen
     tragen genau solche. Formatangaben („durch Komma getrennt") nicht. */
  const hint = def.hint?.trim();
  if (hint && hint.endsWith('?') && !istFormatangabe(hint)) return hint;
  return `${def.label} hinzufügen`;
}

/* ------------------------------------------------------------- Lesen */

function Lesedarstellung({
  def,
  wert,
  entries,
}: {
  def: FieldDef;
  wert: FieldValue | undefined;
  entries: Entry[];
}) {
  switch (def.kind) {
    case 'textarea':
      return <Fliesstext text={asText(wert)} />;

    case 'tags':
      return (
        <div className="flex flex-wrap gap-1.5">
          {asList(wert).map((t) => (
            <Stillmarke key={t}>{t}</Stillmarke>
          ))}
        </div>
      );

    case 'select':
      return <Stillmarke>{asText(wert)}</Stillmarke>;

    case 'boolean':
      return <p className="satz-fliess">{asBool(wert) ? 'ja' : 'nein'}</p>;

    case 'palette':
      return (
        <div className="flex flex-wrap gap-2">
          {asList(wert).map((roh, i) => {
            const [farbe = '#000000', ...rest] = roh.split('|');
            return (
              <div key={i} className="w-[64px]">
                <div
                  className="h-9 w-full rounded-[2px] shadow-[0_1px_4px_rgba(60,44,26,0.28)]"
                  style={{ background: farbe }}
                />
                <p className="mt-1 truncate font-serif text-[11.5px] text-ink-muted">
                  {rest.join('|') || farbe}
                </p>
              </div>
            );
          })}
        </div>
      );

    case 'entries': {
      const gewaehlt = asList(wert)
        .map((id) => entries.find((e) => e.id === id))
        .filter(Boolean) as Entry[];
      return (
        <div className="flex flex-wrap gap-1.5">
          {gewaehlt.map((e) => (
            <Stillmarke key={e.id}>{e.title}</Stillmarke>
          ))}
        </div>
      );
    }

    case 'images':
      return (
        <div className="flex flex-wrap gap-2">
          {asList(wert).slice(0, 6).map((id, i) => (
            <Thumb key={`${id}-${i}`} imageId={id} className="h-14 w-14" />
          ))}
        </div>
      );

    case 'text':
    default:
      return <p className="satz-fliess">{asText(wert)}</p>;
  }
}

/* --------------------------------------------------------- Bearbeiten */

function Bearbeitung({
  def,
  wert,
  onChange,
  onFertig,
  entries,
}: {
  def: FieldDef;
  wert: FieldValue | undefined;
  onChange: (v: FieldValue) => void;
  onFertig: () => void;
  entries: Entry[];
}) {
  const [wahl, setWahl] = useState(false);

  switch (def.kind) {
    case 'textarea':
      return <Schreibsatz wert={asText(wert)} onChange={onChange} onFertig={onFertig} />;

    /*
      Eine Auswahl aus wenigen Möglichkeiten wird als Marken gesetzt und nicht
      als Klappliste. Ein `<select>` ist auf einem Telefon ein Systemrad, das
      den halben Bildschirm einnimmt – und es sagt „Datenbankfeld", nicht
      „Hauptfigur oder Nebenfigur".
    */
    case 'select': {
      const jetzt = asText(wert);
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          {(def.options ?? []).filter(Boolean).map((o) => (
            <Marke
              key={o}
              klein
              an={jetzt === o}
              onClick={() => {
                onChange(jetzt === o ? '' : o);
                onFertig();
              }}
            >
              {o}
            </Marke>
          ))}
          <Fertig onClick={onFertig} />
        </div>
      );
    }

    case 'boolean':
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <Marke klein an={asBool(wert)} onClick={() => { onChange(true); onFertig(); }}>
            ja
          </Marke>
          <Marke klein an={!asBool(wert)} onClick={() => { onChange(false); onFertig(); }}>
            nein
          </Marke>
        </div>
      );

    case 'tags':
      return <Markenfeld werte={asList(wert)} onChange={onChange} onFertig={onFertig} />;

    case 'palette':
      return <Palettenfeld werte={asList(wert)} onChange={onChange} onFertig={onFertig} />;

    case 'entries': {
      const ids = asList(wert);
      const gewaehlt = ids.map((id) => entries.find((e) => e.id === id)).filter(Boolean) as Entry[];
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          {gewaehlt.map((e) => (
            <span
              key={e.id}
              className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-gild-500/45 bg-gild-400/10 pl-3 pr-1 font-serif text-[14px] text-ink"
            >
              {e.title}
              <Weg onClick={() => onChange(ids.filter((x) => x !== e.id))} was={e.title} />
            </span>
          ))}
          <Marke klein onClick={() => setWahl(true)}>
            <Plus size={12} /> verbinden
          </Marke>
          <Fertig onClick={onFertig} />
          <EntryLinkPicker
            open={wahl}
            onClose={() => setWahl(false)}
            selected={ids}
            onChange={onChange}
            title={def.label}
          />
        </div>
      );
    }

    case 'images': {
      const ids = asList(wert);
      return (
        <div className="flex flex-wrap items-center gap-2">
          {ids.map((id, i) => (
            <span key={`${id}-${i}`} className="relative">
              <Thumb imageId={id} className="h-14 w-14" />
              <button
                type="button"
                onClick={() => onChange(ids.filter((_, x) => x !== i))}
                aria-label="Bild entfernen"
                className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-cream-50 text-ink-faint shadow no-tap-highlight"
              >
                <X size={11} />
              </button>
            </span>
          ))}
          <Marke klein onClick={() => setWahl(true)}>
            <Plus size={12} /> Bild
          </Marke>
          <Fertig onClick={onFertig} />
          <ImagePicker
            open={wahl}
            onClose={() => setWahl(false)}
            multiple
            title={def.label}
            onSelect={(neue) => onChange([...ids, ...neue.filter((id) => !ids.includes(id))])}
          />
        </div>
      );
    }

    case 'text':
    default:
      return <Schreibzeile wert={asText(wert)} onChange={onChange} onFertig={onFertig} />;
  }
}

/**
 * „fertig" – und warum es überhaupt dasteht.
 *
 * Ein Textfeld schliesst sich beim Verlassen von selbst. Marken, Farben und
 * Bilder tun das nicht: Wer eine dritte Farbe hinzufügen will, darf nicht
 * dadurch hinausgeworfen werden, dass er die zweite angetippt hat. Also ein
 * Wort, klein und kursiv, das den Abschnitt wieder zur Seite macht.
 */
function Fertig({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-1 min-h-[30px] font-serif text-[12.5px] italic text-gold transition-colors hover:text-gold-hell no-tap-highlight"
    >
      fertig
    </button>
  );
}

function Weg({ onClick, was }: { onClick: () => void; was: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${was} entfernen`}
      className="grid h-7 w-7 place-items-center rounded-full text-ink-faint transition-colors hover:text-ink no-tap-highlight"
    >
      <X size={12} />
    </button>
  );
}

/** Einzelne Werte, je eine Marke. Kein Komma, keine Rohzeile. */
function Markenfeld({
  werte,
  onChange,
  onFertig,
}: {
  werte: string[];
  onChange: (v: string[]) => void;
  onFertig: () => void;
}) {
  const [entwurf, setEntwurf] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);

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
          <Weg onClick={() => onChange(werte.filter((x) => x !== w))} was={w} />
        </span>
      ))}
      <input
        ref={ref}
        value={entwurf}
        placeholder="hinzufügen …"
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
        className="min-w-[8rem] flex-1 border-0 border-b border-gild-500/45 bg-transparent pb-1 font-serif text-[16px] text-ink outline-none placeholder:text-ink-faint/45"
      />
      <Fertig onClick={onFertig} />
    </div>
  );
}

/** Farbfelder. Gespeichert bleibt „#RRGGBB|Name" – sichtbar ist die Farbe. */
function Palettenfeld({
  werte,
  onChange,
  onFertig,
}: {
  werte: string[];
  onChange: (v: string[]) => void;
  onFertig: () => void;
}) {
  const [hex, setHex] = useState<number | null>(null);

  return (
    <div>
      <div className="flex flex-wrap items-start gap-3">
        {werte.map((roh, i) => {
          const [farbe = '#000000', ...rest] = roh.split('|');
          const name = rest.join('|');
          return (
            <div key={i} className="w-[78px]">
              <label
                className="relative block h-12 w-full cursor-pointer rounded-[2px] shadow-[0_1px_5px_rgba(60,44,26,0.3)]"
                style={{ background: farbe }}
              >
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
                Der Hexwert steht nicht auf dem Papier. Er ist die Schreibweise
                der Maschine – man braucht ihn, wenn man eine Farbe woandershin
                trägt, und sonst nie.
              */}
              <div className="flex items-baseline gap-2">
                <button
                  type="button"
                  onClick={() => setHex(hex === i ? null : i)}
                  className="font-serif text-[11px] italic text-ink-faint/70 transition-colors hover:text-gold no-tap-highlight"
                >
                  {hex === i ? farbe : 'Wert'}
                </button>
                <button
                  type="button"
                  onClick={() => onChange(werte.filter((_, x) => x !== i))}
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
          className="grid h-12 w-[78px] place-items-center rounded-[2px] border border-dashed border-lineStrong/70 text-ink-faint transition-colors hover:border-gild-500/45 hover:text-gold no-tap-highlight"
        >
          <Plus size={15} />
        </button>
      </div>
      <div className="mt-1">
        <Fertig onClick={onFertig} />
      </div>
    </div>
  );
}

export function hatWert(v: FieldValue | undefined): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return v === true;
}
