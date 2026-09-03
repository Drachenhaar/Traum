/**
 * Der Textkörper einer Buchseite – dieselbe Setzung, wo immer er steht.
 *
 * Er stand bis hierher als Rumpf in `pages/book/EntrySpread.tsx` und war
 * damit an eine **gespeicherte** Seite gebunden: `useParams` holt eine
 * Kennung, der Speicher liefert den Eintrag. Genau das machte eine ehrliche
 * Vorschau unmöglich – wer sehen wollte, wie ein Manuskript im Buch aussieht,
 * bekam in der Setzerei eine zweite, nachgebaute Seite: Titel etwas anders
 * gesetzt, keine Initiale, Felder als Tabelle statt als Randnotizen.
 *
 * Zwei Darstellungen derselben Sache sind zwei Wahrheiten, und die zweite
 * wird immer die falsche. Deshalb steht der Textkörper jetzt hier und nimmt
 * einen `Entry` entgegen statt einer Kennung – gleichgültig, ob dieser
 * Eintrag im Speicher liegt oder gerade erst aus einem Manuskript entsteht.
 *
 * Was **nicht** hierher gehört: Lesezeichen, Stift, Mehr-Menü, Besuchszählung,
 * Nachbarseiten. Das sind Handgriffe an einer vorhandenen Seite, keine
 * Setzung – sie bleiben in `EntrySpread`.
 */

import { Link } from 'react-router-dom';
import { Bildnismarke } from './Bildnismarke';
import type { Entry } from '../../types';
import { asBool, asList, asText, templateFor } from '../../lib/templates';
import { gruppiere } from '../../lib/feldgruppen';
import { leseZeit, schreibeZeit } from '../../lib/chronik/zeit';
import { FieldNotes } from '../book/Marginalia';
import { BlockView } from '../blocks/BlockView';
import { cx } from '../../lib/utils';

/**
 * Die Zeit, wie sie in einem Buch stünde: „1032 – 1078", „seit 1032",
 * „bis 1078". Was sich nicht lesen lässt, steht trotzdem da – es ist die
 * Angabe des Verfassers, und der Zeitstrahl sagt ihm dort, dass er sie nicht
 * deuten konnte.
 */
export function lebenszeitVon(beginn?: string, ende?: string): string {
  const b = beginn?.trim();
  const e = ende?.trim();
  if (!b && !e) return '';
  const zeige = (t: string) => {
    const z = leseZeit(t);
    return z ? schreibeZeit(z) : t;
  };
  if (b && e) return `${zeige(b)} – ${zeige(e)}`;
  return b ? `seit ${zeige(b)}` : `bis ${zeige(e!)}`;
}

/** Die kurzen Angaben, die als Randnotizen neben dem Text stehen. */
export function feldzeilen(entry: Entry): { label: string; value: string }[] {
  return templateFor(entry.type)
    .fields.filter(
      (f) => f.kind === 'text' || f.kind === 'select' || f.kind === 'boolean' || f.kind === 'tags',
    )
    .map((f) => ({
      label: f.label,
      value:
        f.kind === 'boolean'
          ? asBool(entry.fields[f.key])
            ? 'ja'
            : ''
          : f.kind === 'tags'
            ? asList(entry.fields[f.key]).join(' · ')
            : asText(entry.fields[f.key]),
    }));
}

/**
 * Der Fliesstext, nach Fragen gebündelt.
 *
 * Im Lesemodus gibt es keine Abschnitte zum Aufklappen – eine Buchseite
 * klappt nicht. Die Gruppen dienen hier nur der Reihenfolge: Was zusammen
 * gedacht wird, steht zusammen, und die Rubrik davor ist die Frage statt
 * einer Feldliste. Leere Felder erscheinen gar nicht.
 */
export function prosaVon(entry: Entry): { label: string; text: string; frage: string }[] {
  return gruppiere(
    templateFor(entry.type).fields.filter(
      (f) => f.kind === 'textarea' && !f.anderswo && asText(entry.fields[f.key]).trim(),
    ),
  ).flatMap(({ gruppe, felder }) =>
    felder.map((f, i) => ({
      label: f.label,
      text: asText(entry.fields[f.key]),
      /* Die Frage steht einmal je Gruppe, ueber dem ersten ihrer Felder. */
      frage: i === 0 ? gruppe.frage : '',
    })),
  );
}

export function Seitentext({
  entry,
  /**
   * Zeigt das Geheimfach. In der Vorschau immer aus – ein Manuskript hat
   * noch keins, und die Frage, wer es sehen darf, gehört zur Seite und nicht
   * zur Setzerei.
   */
  geheimSichtbar = false,
  /**
   * Verweise anzeigen (Zeitstrahl, Schreibraum). In der Vorschau aus: Eine
   * Seite, die es noch nicht gibt, kann nirgendwohin führen.
   */
  verweise = true,
}: {
  entry: Entry;
  geheimSichtbar?: boolean;
  verweise?: boolean;
}) {
  const lebenszeit = lebenszeitVon(entry.beginn, entry.ende);
  const prose = prosaVon(entry);
  const visibleBlocks = entry.blocks.filter((b) => b.type !== 'divider' && b.type !== 'spacer');

  return (
    <>
      {/*
        Die Bildnismarke steht **im** Titel und nicht daneben.

        Ein eigener Kasten neben der Überschrift bräche, sobald ein langer
        Name umbricht: Die Marke sässe dann neben der ersten Zeile und der
        Name ginge unter ihr weiter. Inline steht sie immer hinter dem
        letzten Wort – neben dem Namen, wo sie hingehört, und nicht neben
        seinem Anfang.

        Nur bei Figuren, und nur dort, wo Verweise überhaupt erlaubt sind:
        Die Setzerei zeigt dieselbe Seite als Vorschau, und eine Vorschau
        kann nirgendwohin führen.
      */}
      <h1 className="font-serif text-[34px] leading-[1.08] text-ink sm:text-[42px]">
        {entry.title}
        {verweise && entry.type === 'character' && <Bildnismarke entry={entry} />}
      </h1>
      {entry.subtitle && (
        <p className="mt-1.5 font-serif text-[17px] italic leading-snug text-ink-muted">
          {entry.subtitle}
        </p>
      )}

      {/*
       * Die Lebenszeit – im Lesemodus eine Zeile, kein Feld. Steht direkt
       * unter dem Titel, weil sie zur Person gehört wie ihr Name.
       */}
      {lebenszeit &&
        (verweise ? (
          <Link
            to="/zeitstrahl"
            className="mt-2.5 inline-block font-serif text-[13.5px] tracking-[0.06em] text-ink-faint transition-colors hover:text-gold no-tap-highlight"
          >
            {lebenszeit}
          </Link>
        ) : (
          <p className="mt-2.5 font-serif text-[13.5px] tracking-[0.06em] text-ink-faint">
            {lebenszeit}
          </p>
        ))}

      <span aria-hidden className="rule-gild mt-5 block w-24 opacity-70" />

      {entry.description && (
        <div className="prose-book dropcap mt-6">
          {entry.description.split(/\n{2,}/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      )}

      {geheimSichtbar && entry.geheim?.text?.trim() && (
        <section className="mt-8 border-l-2 border-gild-500/45 pl-4">
          <p className="rubric mb-1.5">Nur für dich</p>
          <div className="prose-book">
            {entry.geheim.text.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </section>
      )}

      {/*
        Die Frage traegt den Abstand, nicht der Absatz darunter: Sie ist eine
        Zaesur im Text, kein weiteres Etikett. Ohne die groessere Luft davor
        liest sie sich wie eine Rubrik – und damit waere die Gliederung nur
        eine zweite Reihe Beschriftungen.
      */}
      {prose.map((section, si) => (
        <section key={section.label} className={cx(section.frage && si > 0 ? 'mt-12' : 'mt-7')}>
          {section.frage && (
            <p className="mb-5 font-serif text-[15px] italic text-ink-faint/75">{section.frage}</p>
          )}
          <p className="rubric mb-1.5">{section.label}</p>
          <div className="prose-book">
            {section.text.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </section>
      ))}

      {/*
        Eine Szene wird hier gelesen, aber nicht geschrieben. Der Weg zum
        Manuskript ist ein Verweis, kein zweites Textfeld.
      */}
      {verweise && entry.type === 'szene' && (
        <Link
          to={`/schreiben/${entry.id}`}
          className="mt-8 inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-gild-500/40 px-4 font-serif text-[14.5px] text-gold transition-colors hover:bg-gild-400/10 no-tap-highlight"
        >
          Im Schreibraum öffnen
        </Link>
      )}

      <FieldNotes rows={feldzeilen(entry)} />

      {visibleBlocks.length > 0 && (
        <div className="mt-8">
          {visibleBlocks.map((block) => (
            <BlockView key={block.id} block={block} />
          ))}
        </div>
      )}
    </>
  );
}
