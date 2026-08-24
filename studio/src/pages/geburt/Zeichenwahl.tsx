/**
 * Das Zeichen des Buches.
 *
 * Drei Wege, ruhig nebeneinander: eines aus der Bibliothek nehmen, ein
 * eigenes einlegen, oder eines erschaffen lassen.
 *
 * Der dritte Weg setzt bewusst keine bestimmte Bild-KI voraus. Das Buch
 * erzeugt keine Bilder und schickt nichts fort; es haelt einen Text bereit,
 * den man mitnimmt – zu ChatGPT, zu Claude, wohin man will – und nimmt das
 * Ergebnis wieder entgegen. Der Text gehoert dem Verfasser: Er ist sichtbar,
 * aenderbar, kopierbar und laesst sich auf die Werksfassung zuruecksetzen.
 */

import { useState } from 'react';
import { ClipboardCopy, RotateCcw } from 'lucide-react';
import { useStudio } from '../../store/useStudio';
import { EMBLEM_PRESETS } from '../../lib/emblems';
import { EMBLEM_PROMPT_ID, resolveTemplate } from '../../lib/promptTemplates';
import { BUCH_TEXTE } from '../../lib/bookTexts';
import { colorById } from '../../lib/bookIdentity';
import { BookEmblem } from '../../components/book/BookEmblem';
import { ImageUploadButton } from '../../components/images/ImageUploadButton';
import type { BookIdentity } from '../../types';
import { SzenenFrage, SzenenWeg } from './Geburt';
import { cx } from '../../lib/utils';

const T = BUCH_TEXTE.geburt.zeichen;

type Weg = 'vorhanden' | 'eigen' | 'erschaffen';

/**
 * Zwei Untergruende, dieselbe Wahl.
 *
 * Bei der Erschaffung liegt sie auf dem dunklen Tisch, spaeter unter „Mein
 * Buch" auf Papier. Statt die Komponente zu verdoppeln – und damit einen
 * zweiten Ort zu schaffen, an dem ein neues Zeichen vergessen werden kann –
 * wechselt nur die Farbstimmung.
 */
export type Ton = 'tisch' | 'papier';

const TOENE = {
  tisch: {
    an: 'text-gild-300',
    aus: 'text-paper-400/45 hover:text-paper-300/70',
    linie: 'bg-gild-500/60',
    still: 'text-paper-400/50',
    rahmenAn: 'border-gild-500/70 bg-gild-400/10',
    rahmenAus: 'border-paper-400/15 hover:border-paper-400/35',
    zeichenAus: 'rgba(196,180,143,0.55)',
    knopf:
      'border-gild-500/35 text-gild-300 hover:border-gild-400/70',
    feld: 'border-paper-400/20 bg-black/25 text-paper-300/85 focus:border-gild-500/45',
    trenner: 'border-paper-400/10',
  },
  papier: {
    an: 'text-gold',
    aus: 'text-ink-faint hover:text-ink-muted',
    linie: 'bg-gild-500/60',
    still: 'text-ink-faint',
    rahmenAn: 'border-gild-500/60 bg-gild-400/10',
    rahmenAus: 'border-line text-ink-faint hover:border-lineStrong',
    /*
     * `currentColor` statt eines festen Werts: Das Zeichen setzt `stroke`
     * als SVG-Attribut, und dort greift `var(…)` nicht – SVG-Attribute
     * werden nicht als CSS gelesen. Ueber `currentColor` erbt der Strich
     * die Textfarbe des Knopfes, und die haengt am Band.
     */
    zeichenAus: 'currentColor',
    knopf: 'border-gild-500/40 text-gold hover:bg-gild-400/10',
    feld: 'border-lineStrong bg-cream-100 text-ink focus:border-gild-500/60',
    trenner: 'border-line',
  },
} as const;

export function Zeichenwahl({
  identity,
  onChange,
  onZurueck,
  onVollenden,
  /** Ohne Weg-weiter: spaeteres Bearbeiten, wo es nichts zu vollenden gibt. */
  nurWahl = false,
  ton = 'tisch',
  vollendenLabel = BUCH_TEXTE.geburt.vollenden.knopf,
}: {
  identity: BookIdentity;
  onChange: (patch: Partial<BookIdentity>) => void;
  onZurueck?: () => void;
  onVollenden?: () => void;
  nurWahl?: boolean;
  ton?: Ton;
  vollendenLabel?: string;
}) {
  const [weg, setWeg] = useState<Weg>(identity.emblemType === 'preset' ? 'vorhanden' : 'eigen');
  const foil = colorById(identity.coverColor).foil;
  const t = TOENE[ton];

  return (
    <div>
      {!nurWahl && <SzenenFrage frage={T.frage} hinweis={T.hinweis} />}

      {/* Die drei Wege – als Zeilen, nicht als Karten mit Symbolen. */}
      <div
        className={cx(
          'mb-6 flex flex-wrap gap-x-7 gap-y-2',
          nurWahl ? 'justify-start' : 'justify-center',
        )}
      >
        <Weiche
          label={T.wegVorhanden}
          an={weg === 'vorhanden'}
          onClick={() => setWeg('vorhanden')}
          t={t}
        />
        <Weiche label={T.wegEigen} an={weg === 'eigen'} onClick={() => setWeg('eigen')} t={t} />
        <Weiche
          label={T.wegErschaffen}
          an={weg === 'erschaffen'}
          onClick={() => setWeg('erschaffen')}
          t={t}
        />
      </div>

      {weg === 'vorhanden' && (
        <Bibliothek identity={identity} onChange={onChange} foil={foil} t={t} mittig={!nurWahl} />
      )}
      {weg === 'eigen' && <EigenesBild identity={identity} onChange={onChange} t={t} />}
      {weg === 'erschaffen' && <Erschaffen identity={identity} onChange={onChange} t={t} />}

      {!nurWahl && onVollenden && (
        <SzenenWeg onZurueck={onZurueck} onWeiter={onVollenden} weiterLabel={vollendenLabel} />
      )}
    </div>
  );
}

type TonWerte = (typeof TOENE)[Ton];

function Weiche({
  label,
  an,
  onClick,
  t,
}: {
  label: string;
  an: boolean;
  onClick: () => void;
  t: TonWerte;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={an}
      className={cx(
        'min-h-[44px] font-serif text-[14.5px] transition-colors no-tap-highlight',
        an ? t.an : t.aus,
      )}
    >
      {label}
      <span
        aria-hidden
        className={cx(
          'mx-auto mt-1 block h-px transition-all duration-300',
          an ? cx('w-full', t.linie) : 'w-0 bg-transparent',
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------------ Weg A ---- */

function Bibliothek({
  identity,
  onChange,
  foil,
  t,
  mittig,
}: {
  identity: BookIdentity;
  onChange: (patch: Partial<BookIdentity>) => void;
  foil: string;
  t: TonWerte;
  mittig: boolean;
}) {
  return (
    <div className={cx('flex flex-wrap gap-2', mittig ? 'justify-center' : 'justify-start')}>
      {EMBLEM_PRESETS.map((preset) => {
        const an = identity.emblemType === 'preset' && identity.emblemId === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange({ emblemType: 'preset', emblemId: preset.id })}
            aria-pressed={an}
            aria-label={preset.label}
            title={preset.label}
            className={cx(
              'grid h-[56px] w-[56px] place-items-center rounded-[3px] border transition-all duration-300 no-tap-highlight',
              an ? t.rahmenAn : t.rahmenAus,
            )}
          >
            <BookEmblem
              identity={{ emblemType: 'preset', emblemId: preset.id }}
              size={32}
              color={an ? foil : t.zeichenAus}
            />
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------ Weg B ---- */

/**
 * Ein eigenes Bild.
 *
 * Groesse und Drehung sind bewusst das Einzige, was sich einstellen laesst.
 * Ein Zuschneidewerkzeug waere ein zweites Programm im Programm; wer sein
 * Zeichen genauer setzen will, tut das dort, wo er es gemacht hat.
 */
function EigenesBild({
  identity,
  onChange,
  t,
}: {
  identity: BookIdentity;
  onChange: (patch: Partial<BookIdentity>) => void;
  t: TonWerte;
}) {
  const hat = identity.emblemType !== 'preset' && !!identity.emblemImageId;

  return (
    <div className="flex flex-col items-center">
      <ImageUploadButton
        multiple={false}
        category="Zeichen"
        className={cx(
          'min-h-[44px] rounded-full border px-6 font-serif text-[14.5px] transition-colors no-tap-highlight',
          t.knopf,
        )}
        onImported={(metas) => {
          const bild = metas[0];
          if (!bild) return;
          onChange({
            emblemType: 'upload',
            emblemImageId: bild.id,
            emblemScale: 1,
            emblemRotation: 0,
          });
        }}
      >
        {hat ? T.bildTauschen : T.bildWaehlen}
      </ImageUploadButton>

      {hat && (
        <div className="mt-6 w-full max-w-xs">
          <Regler
            label={T.groesse}
            min={0.4}
            max={1.6}
            step={0.02}
            value={identity.emblemScale ?? 1}
            onChange={(v) => onChange({ emblemScale: v })}
            t={t}
          />
          <Regler
            label={T.drehung}
            min={-180}
            max={180}
            step={1}
            value={identity.emblemRotation ?? 0}
            onChange={(v) => onChange({ emblemRotation: v })}
            einheit="°"
            t={t}
          />
        </div>
      )}
    </div>
  );
}

function Regler({
  label,
  min,
  max,
  step,
  value,
  onChange,
  einheit = '',
  t,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  einheit?: string;
  t: TonWerte;
}) {
  return (
    <label className="mt-4 block">
      <span
        className={cx('mb-1.5 flex items-baseline justify-between font-serif text-[12.5px]', t.still)}
      >
        {label}
        <span className="tabular-nums opacity-70">
          {einheit ? Math.round(value) : value.toFixed(2)}
          {einheit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        /* `touch-action: none` – am Regler darf gewischt werden, ohne dass
           die Seite darunter mitwandert. */
        className="h-11 w-full cursor-pointer accent-gild-400 touch-none"
      />
    </label>
  );
}

/* ------------------------------------------------------------ Weg C ---- */

function Erschaffen({
  identity,
  onChange,
  t,
}: {
  identity: BookIdentity;
  onChange: (patch: Partial<BookIdentity>) => void;
  t: TonWerte;
}) {
  const gespeicherte = useStudio((s) => s.settings.promptTemplates);
  const savePromptTemplate = useStudio((s) => s.savePromptTemplate);
  const resetPromptTemplate = useStudio((s) => s.resetPromptTemplate);
  const notify = useStudio((s) => s.notify);

  const vorlage = resolveTemplate(EMBLEM_PROMPT_ID, gespeicherte);
  if (!vorlage) return null;

  const kopieren = async () => {
    try {
      await navigator.clipboard.writeText(vorlage.content);
      notify(T.promptKopiert, 'success');
    } catch {
      notify('Kopieren nicht möglich. Der Text steht zum Markieren bereit.', 'error');
    }
    /* Die benutzte Fassung bleibt als Herkunft am Buch. */
    onChange({ emblemPrompt: vorlage.content });
  };

  const hat = identity.emblemType !== 'preset' && !!identity.emblemImageId;

  return (
    <div className="mx-auto max-w-xl">
      <p className={cx('mb-4 text-center font-serif text-[13px] italic leading-relaxed', t.still)}>
        {T.erschaffenHinweis}
      </p>

      <textarea
        value={vorlage.content}
        onChange={(e) => savePromptTemplate(EMBLEM_PROMPT_ID, e.target.value)}
        rows={9}
        aria-label={vorlage.name}
        spellCheck={false}
        className={cx(
          'w-full resize-y rounded-[2px] border px-3.5 py-3 font-mono text-[12.5px] leading-relaxed outline-none transition-colors',
          t.feld,
        )}
      />

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <button
          type="button"
          onClick={() => void kopieren()}
          className={cx(
            'inline-flex min-h-[44px] items-center gap-2 rounded-full border px-5 font-serif text-[14.5px] transition-colors no-tap-highlight',
            t.knopf,
          )}
        >
          <ClipboardCopy size={15} /> {T.promptKopieren}
        </button>

        {vorlage.geaendert && (
          <button
            type="button"
            onClick={() => resetPromptTemplate(EMBLEM_PROMPT_ID)}
            className={cx(
              'inline-flex min-h-[44px] items-center gap-1.5 font-serif text-[13px] italic transition-colors no-tap-highlight',
              t.still,
            )}
          >
            <RotateCcw size={13} /> {T.promptZuruecksetzen}
          </button>
        )}
      </div>

      <div className={cx('mt-6 flex flex-col items-center border-t pt-6', t.trenner)}>
        <ImageUploadButton
          multiple={false}
          category="Zeichen"
          className={cx(
            'min-h-[44px] rounded-full border px-6 font-serif text-[14.5px] transition-colors no-tap-highlight',
            t.knopf,
          )}
          onImported={(metas) => {
            const bild = metas[0];
            if (!bild) return;
            onChange({
              emblemType: 'generated',
              emblemImageId: bild.id,
              emblemScale: 1,
              emblemRotation: 0,
              emblemPrompt: vorlage.content,
            });
          }}
        >
          {hat ? T.bildTauschen : T.bildWaehlen}
        </ImageUploadButton>
      </div>
    </div>
  );
}
