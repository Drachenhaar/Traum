/**
 * Die werdende Seite.
 *
 * Was hier steht, ist keine Eingabemaske für einen Datensatz, sondern die
 * Buchseite, bevor es sie gibt: Titel im Titelgrad, Untertitel kursiv, die
 * kurzen Kennzeichen als Angaben, der Fließtext als Fließtext. Angefasst wird
 * sie an der Stelle, die man antippt.
 *
 * Die Bauteile kommen aus `components/setzerei/Setzerei.tsx` – Rubrik,
 * Angabe, Fliesstext, Zitat, Haarlinie, Still. Das ist der Grund, warum die
 * Bearbeitung wie Papier aussieht: Es ist derselbe Satz wie im Buch, nur mit
 * einem Stift daneben.
 */

import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import type { Block, Entry, FieldValue } from '../../types';
import type { FieldDef } from '../../lib/templates';
import { templateFor } from '../../lib/templates';
import { gruppiere } from '../../lib/feldgruppen';
import { createBlock } from '../../lib/blocks';
import type { SetzereiDraft } from '../../lib/setzerei/draft';
import { draftWert } from '../../lib/setzerei/draft';
import { Angabe, Angaben, Haarlinie, Rubrik, Still, Zitat } from './Setzerei';
import { SetzAbschnitt } from './SetzAbschnitt';
import { SetzFeld, hatWert } from './SetzFeld';
import { cx } from '../../lib/utils';

/**
 * Die Stammangaben – dieselben Schlüssel wie in `angabenFor`, mit
 * vorangestelltem Rautezeichen, damit kein eigenes Feld sie treffen kann.
 */
const KOPF: FieldDef[] = [
  { key: '#title', label: 'Titel', kind: 'text' },
  { key: '#subtitle', label: 'Untertitel', kind: 'text' },
];
const STAMM: FieldDef[] = [
  { key: '#description', label: 'Beschreibung', kind: 'textarea', hint: 'Worum geht es hier?' },
  { key: '#tags', label: 'Schlagworte', kind: 'tags' },
  { key: '#beginn', label: 'Beginn', kind: 'text', hint: 'Wann begann es?' },
  { key: '#ende', label: 'Ende', kind: 'text', hint: 'Wann endete es – oder besteht es fort?' },
];

export function VeredelBlatt({
  draft,
  onSetzen,
  onBloecke,
  onVerbinden,
  entries,
  weltbezuege,
  onWeltbezug,
}: {
  draft: SetzereiDraft;
  onSetzen: (key: string, wert: FieldValue) => void;
  onBloecke: (blocks: Block[]) => void;
  /** Eine erkannte Erwähnung an- oder abwählen. */
  onVerbinden: (entryId: string) => void;
  entries: Entry[];
  weltbezuege: Record<string, string>;
  onWeltbezug: (def: FieldDef) => void;
}) {
  /*
   * Genau ein Feld ist offen. Das ist die ganze Regel hinter „View first,
   * edit on tap": Zwei offene Textfelder sind wieder ein Formular.
   */
  const [offen, setOffen] = useState<string | null>(null);
  const [mehrKennzeichen, setMehrKennzeichen] = useState(false);
  const [mehrAbschnitte, setMehrAbschnitte] = useState(false);

  const tpl = templateFor(draft.type);
  const wert = (key: string) => draftWert(draft, key);

  /* Bilder sind hier zugelassen – anders als beim reinen Rohtextimport, wo
     sie nichts zu suchen hatten, weil kein Parser ein Bild finden kann. */
  const feldbar = tpl.fields.filter((f) => !f.anderswo);
  const gruppen = gruppiere(feldbar);
  const kennzeichen = gruppen.find((g) => g.gruppe.id === 'kern')?.felder ?? [];
  const abschnitte = gruppen.filter((g) => g.gruppe.id !== 'kern');
  const gefuellteAbschnitte = abschnitte.filter((g) => g.felder.some((f) => hatWert(wert(f.key))));
  const leereAbschnitte = abschnitte.filter((g) => !g.felder.some((f) => hatWert(wert(f.key))));

  const kategorie: FieldDef = {
    key: '#category',
    label: 'Kategorie',
    kind: 'select',
    options: tpl.categories,
  };

  const zitatBlock = draft.blocks.find((b) => b.type === 'quote');

  const feld = (def: FieldDef, ohneRubrik = false) => (
    <SetzFeld
      key={def.key}
      ohneRubrik={ohneRubrik}
      def={def}
      wert={wert(def.key)}
      onChange={(v) => onSetzen(def.key, v)}
      offen={offen === def.key}
      onOeffnen={() => setOffen(def.key)}
      onSchliessen={() => setOffen(null)}
      entries={entries}
      weltbezug={entries.find((e) => e.id === weltbezuege[def.key])}
      onWeltbezug={onWeltbezug}
    />
  );

  const vollKennzeichen = kennzeichen.filter((f) => hatWert(wert(f.key)));
  const leerKennzeichen = kennzeichen.filter((f) => !hatWert(wert(f.key)));

  return (
    <div className="satz-eintritt">
      {/* ------------------------------------------------------------ Kopf */}
      <header>
        {KOPF.map((def) => (
          <TitelZeile
            key={def.key}
            def={def}
            wert={String(wert(def.key) ?? '')}
            gross={def.key === '#title'}
            offen={offen === def.key}
            onOeffnen={() => setOffen(def.key)}
            onSchliessen={() => setOffen(null)}
            onChange={(v) => onSetzen(def.key, v)}
          />
        ))}

        {/*
          Die Art steht als stille Marke unter dem Titel – sie ist eine
          Auskunft und kein Knopf. Geändert wird sie im Manuskript, wo die
          Frage „Was soll daraus werden?" hingehört.
        */}
        <p className="mt-2.5">
          <span className="inline-flex min-h-[26px] items-center rounded-full border border-gild-500/30 px-2.5 font-serif text-[12.5px] text-ink-muted">
            {tpl.label}
          </span>
        </p>

        <span aria-hidden className="rule-gild mt-5 block w-24 opacity-70" />
      </header>

      {/* ------------------------------------------------- Die Kennzeichen */}
      {(vollKennzeichen.length > 0 || leerKennzeichen.length > 0) && (
        <section className="mt-6">
          <Angaben className="!mt-0">
            {vollKennzeichen.map((def) => (
              <Angabe key={def.key} name={def.label}>
                {feldInline(def, feld)}
              </Angabe>
            ))}
            {mehrKennzeichen &&
              leerKennzeichen.map((def) => (
                <Angabe key={def.key} name={def.label}>
                  {feldInline(def, feld)}
                </Angabe>
              ))}
            <Angabe name="Kategorie">{feldInline(kategorie, feld)}</Angabe>
          </Angaben>

          {leerKennzeichen.length > 0 && (
            <button
              type="button"
              onClick={() => setMehrKennzeichen((m) => !m)}
              className="mt-1 inline-flex min-h-[34px] items-center gap-1.5 font-serif text-[13px] italic text-ink-faint transition-colors duration-200 hover:text-gold no-tap-highlight"
            >
              <Plus size={12} />
              {mehrKennzeichen ? 'weniger zeigen' : 'weitere Eigenschaft'}
            </button>
          )}
        </section>
      )}

      {/* ----------------------------------------------------- Das Zitat */}
      <ZitatFeld
        block={zitatBlock}
        onAendern={(text, quelle) => {
          const rest = draft.blocks.filter((b) => b !== zitatBlock);
          if (!text.trim()) {
            onBloecke(rest);
            return;
          }
          const b: Block = zitatBlock
            ? { ...zitatBlock, data: { ...zitatBlock.data, text, source: quelle } }
            : { ...createBlock('quote'), data: { text, source: quelle } };
          onBloecke(zitatBlock ? draft.blocks.map((x) => (x === zitatBlock ? b : x)) : [...rest, b]);
        }}
      />

      {/* ------------------------------------------------- Die Abschnitte */}
      {/*
        Ohne Überschrift.

        „Beschreibung" stand hier zweimal untereinander – einmal als
        Abschnittstitel, einmal als Rubrik des Feldes darunter. Der Abschnitt
        trägt vier verschiedene Dinge (Beschreibung, Schlagworte, Beginn,
        Ende); ein Sammelname dafür wäre entweder gelogen oder eine
        Wiederholung. Die Felder sagen selbst, was sie sind.
      */}
      <SetzAbschnitt
        erster
        titel=""
        felder={STAMM}
        wertVon={wert}
        onChange={onSetzen}
        offenesFeld={offen}
        onOeffnen={setOffen}
        onSchliessen={() => setOffen(null)}
        entries={entries}
        weltbezuege={weltbezuege}
        onWeltbezug={onWeltbezug}
      />

      {/*
        Abschnitte mit Inhalt stehen offen. Abschnitte, in denen **nichts**
        steht, liegen hinter einer Zeile.

        Am Gerät standen hier vier Überschriften untereinander – „WO ES
        HINGEHÖRT", „WIE SEIN ALLTAG AUSSIEHT", „WERDEN UND VERGEHEN", „FÜR
        DIE HERSTELLUNG" – und unter jeder genau ein kursives „Eine weitere
        Angabe ergänzen". Vier Behauptungen über Inhalt, den es nicht gibt,
        und dazwischen drei Haarlinien, die nichts trennen.

        Eine Überschrift über nichts ist keine Gliederung, sondern ein
        Gerüst, das jemand stehen gelassen hat.
      */}
      {gefuellteAbschnitte.map(({ gruppe, felder }) => (
        <SetzAbschnitt
          key={gruppe.id}
          titel={gruppe.label}
          felder={felder}
          wertVon={wert}
          onChange={onSetzen}
          offenesFeld={offen}
          onOeffnen={setOffen}
          onSchliessen={() => setOffen(null)}
          entries={entries}
          weltbezuege={weltbezuege}
          onWeltbezug={onWeltbezug}
        />
      ))}

      {leereAbschnitte.length > 0 &&
        (mehrAbschnitte ? (
          leereAbschnitte.map(({ gruppe, felder }) => (
            <SetzAbschnitt
              key={gruppe.id}
              titel={gruppe.label}
              felder={felder}
              wertVon={wert}
              onChange={onSetzen}
              offenesFeld={offen}
              onOeffnen={setOffen}
              onSchliessen={() => setOffen(null)}
              entries={entries}
              weltbezuege={weltbezuege}
              onWeltbezug={onWeltbezug}
            />
          ))
        ) : (
          <button
            type="button"
            onClick={() => setMehrAbschnitte(true)}
            className="mt-9 block w-full border-t border-line pt-5 text-left no-tap-highlight"
          >
            <span className="font-serif text-[14.5px] italic leading-relaxed text-ink-faint transition-colors hover:text-gold">
              {leereAbschnitte.length === 1
                ? 'Ein weiterer Abschnitt steht bereit'
                : `${leereAbschnitte.length} weitere Abschnitte stehen bereit`}
              : {leereAbschnitte.map((a) => a.gruppe.label).join(', ')}.
            </span>
          </button>
        ))}

      {/* ---------------------------------------- Was es schon gibt */}
      <BereitsInDerWelt
        draft={draft}
        onVerbinden={onVerbinden}
      />
    </div>
  );
}

/**
 * Ein Feld, das in einer `Angabe` steht.
 *
 * Die Rubrik trägt dort schon die Beschriftung – das Feld darf sie nicht ein
 * zweites Mal setzen. Es lässt sie deshalb ganz weg; weggeblendet hiesse, sie
 * steht immer noch da und nur das Auge sieht sie nicht.
 */
function feldInline(def: FieldDef, feld: (d: FieldDef, ohneRubrik?: boolean) => JSX.Element) {
  return feld(def, true);
}

/* ------------------------------------------------------------- Der Titel */

/**
 * Titel und Untertitel.
 *
 * Sie bekommen keine Rubrik über sich: Ein Titel, über dem „TITEL" steht, ist
 * ein Formularfeld. Was er ist, sagt seine Größe.
 */
function TitelZeile({
  def,
  wert,
  gross,
  offen,
  onOeffnen,
  onSchliessen,
  onChange,
}: {
  def: FieldDef;
  wert: string;
  gross: boolean;
  offen: boolean;
  onOeffnen: () => void;
  onSchliessen: () => void;
  onChange: (v: string) => void;
}) {
  if (offen) {
    return (
      <input
        autoFocus
        value={wert}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onSchliessen}
        onKeyDown={(e) => e.key === 'Enter' && onSchliessen()}
        aria-label={def.label}
        className={cx(
          'w-full border-0 border-b border-gild-500/45 bg-transparent pb-1 text-ink outline-none',
          gross
            ? 'font-serif text-[30px] leading-[1.1] sm:text-[38px]'
            : 'font-serif text-[17px] italic leading-snug',
        )}
      />
    );
  }

  if (!wert.trim()) {
    /* Ein Buch ohne Titel gibt es nicht – die Einladung ist deutlicher. */
    return (
      <button type="button" onClick={onOeffnen} className="block text-left no-tap-highlight">
        <span
          className={cx(
            'font-serif italic text-ink-faint/70 transition-colors hover:text-gold',
            gross ? 'text-[26px]' : 'text-[16px]',
          )}
        >
          {gross ? 'Wie heißt es?' : 'Untertitel hinzufügen'}
        </span>
      </button>
    );
  }

  return (
    <button type="button" onClick={onOeffnen} className="block w-full text-left no-tap-highlight">
      {gross ? (
        <h1 className="font-serif text-[30px] leading-[1.08] text-ink sm:text-[38px]">{wert}</h1>
      ) : (
        <p className="mt-1.5 font-serif text-[17px] italic leading-snug text-ink-muted">{wert}</p>
      )}
    </button>
  );
}

/* -------------------------------------------------------------- Das Zitat */

/**
 * Das Zitat läuft über den vorhandenen `quote`-Block.
 *
 * Es wäre einfacher gewesen, dafür ein Feld zu erfinden – und falsch: Der
 * Block existiert, `BlockView` setzt ihn, Suche, Sicherung und Ausgabe
 * kennen ihn. Ein zweiter Weg für dasselbe hätte bedeutet, dass ein Zitat je
 * nachdem, wo es entstand, an zwei verschiedenen Stellen liegt.
 *
 * Und wenn keines da ist, wird keines erfunden. Es steht eine Einladung da
 * oder nichts.
 */
function ZitatFeld({
  block,
  onAendern,
}: {
  block: Block | undefined;
  onAendern: (text: string, quelle: string) => void;
}) {
  const [offen, setOffen] = useState(false);
  const text = String((block?.data as { text?: string } | undefined)?.text ?? '');
  const quelle = String((block?.data as { source?: string } | undefined)?.source ?? '');

  if (offen) {
    return (
      <div className="mt-7 border-l-2 border-gild-500/40 pl-4">
        <textarea
          autoFocus
          value={text}
          rows={2}
          placeholder="Ein Satz, der auf dieser Seite stehen soll."
          onChange={(e) => onAendern(e.target.value, quelle)}
          onBlur={() => setOffen(false)}
          className="w-full resize-none border-0 bg-transparent p-0 font-serif text-[17px] italic leading-[1.7] text-ink outline-none placeholder:text-ink-faint/45"
        />
        <input
          value={quelle}
          placeholder="Wer sagt es? (kann leer bleiben)"
          onChange={(e) => onAendern(text, e.target.value)}
          className="mt-2 w-full border-0 bg-transparent p-0 font-serif text-[13px] text-ink-muted outline-none placeholder:text-ink-faint/45"
        />
      </div>
    );
  }

  if (!text.trim()) {
    return (
      <button
        type="button"
        onClick={() => setOffen(true)}
        className="mt-7 inline-flex min-h-[38px] items-center gap-1.5 font-serif text-[14px] italic text-ink-faint transition-colors duration-200 hover:text-gold no-tap-highlight"
      >
        <Plus size={13} /> Zitat hinzufügen
      </button>
    );
  }

  return (
    <button type="button" onClick={() => setOffen(true)} className="block w-full no-tap-highlight">
      <Zitat von={quelle || undefined}>{text}</Zitat>
    </button>
  );
}

/* ------------------------------------------------- Bereits in deiner Welt */

/**
 * Was der Erkennungslauf im Text wiedergefunden hat.
 *
 * „Nebelwald · bereits in deiner Welt". Angehakt heisst: Beim Setzen entsteht
 * eine echte Kante, keine Kopie des Namens. Der Erkennungslauf hat sie nicht
 * zufällig gefunden, deshalb sind sie voreingestellt an – wer eine nicht
 * will, nimmt sie heraus.
 */
function BereitsInDerWelt({
  draft,
  onVerbinden,
}: {
  draft: SetzereiDraft;
  onVerbinden: (entryId: string) => void;
}) {
  if (!draft.mentions.length) return null;

  return (
    <section className="mt-10">
      <Haarlinie className="text-ink" />
      <Rubrik className="mb-1 text-gold">Bereits in deiner Welt</Rubrik>
      <Still was="Was hier steht, gibt es schon. Angehaktes wird mit dieser Seite verbunden." />

      <ul className="mt-3 space-y-0.5">
        {draft.mentions.map((m) => {
          const an = draft.verbinden.includes(m.entryId);
          return (
            <li key={m.entryId}>
              <button
                type="button"
                onClick={() => onVerbinden(m.entryId)}
                className="flex w-full items-baseline gap-2.5 py-1.5 text-left no-tap-highlight"
              >
                <span
                  className={cx(
                    'mt-[3px] grid h-[15px] w-[15px] shrink-0 place-items-center rounded-[2px] border transition-colors duration-200',
                    an ? 'border-gild-500/70 bg-gild-400/25 text-gold' : 'border-lineStrong',
                  )}
                >
                  {an && <Check size={11} strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span className="satz-fliess text-ink">{m.title}</span>
                  <span className="ml-2 font-serif text-[12.5px] italic text-ink-faint">
                    {m.via}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

