/**
 * Eine Seite im Buch.
 *
 * Lesen ist der Normalfall. Es gibt keine Eingabefelder, keine Rahmen, keine
 * Knöpfe – nur Rubrik, Titel, Fließtext, Tafel und Fußnoten. Die Seite soll
 * druckbar aussehen.
 *
 * Bearbeiten ist eine bewusste Handlung: ein Stift am Rand. Erst dann wird aus
 * der Seite eine Arbeitsfläche, und danach sofort wieder eine Buchseite.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PenLine, Star } from 'lucide-react';
import type { Entry } from '../../types';
import { useStudio, livingEntries } from '../../store/useStudio';
import { templateFor, asList, asText, asBool } from '../../lib/templates';
import { useCurrentSpread } from '../../components/book/BookShell';
import { Spread, Plate } from '../../components/book/Spread';
import { Marginalia, FieldNotes } from '../../components/book/Marginalia';
import { BlockView } from '../../components/blocks/BlockView';
import { Thumb, useImageUrl } from '../../components/images/Thumb';
import { EntryEditor } from './EntryEditor';
import { leseZeit, schreibeZeit } from '../../lib/chronik/zeit';
import { datiere } from '../../lib/chronik/zustand';
import { zeitgenossenVon } from '../../lib/chronik/zeitgenossen';
import { cx } from '../../lib/utils';

export function EntrySpread() {
  const { id } = useParams();
  const navigate = useNavigate();
  const entry = useStudio((s) => s.entries.find((e) => e.id === id));
  const entries = useStudio((s) => s.entries);
  const relIndex = useStudio((s) => s.relIndex);
  const settings = useStudio((s) => s.settings);
  const updateSettings = useStudio((s) => s.updateSettings);
  const toggleFavorite = useStudio((s) => s.toggleFavorite);
  const noteVisit = useStudio((s) => s.noteVisit);

  const { spread, wear } = useCurrentSpread();
  const [editing, setEditing] = useState(false);

  const entriesById = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);

  /* Besuch zählen – daraus entsteht später die Abnutzung der Seite. */
  useEffect(() => {
    if (!id || !spread) return;
    noteVisit(id);
    const visits = { ...(settings.visits ?? {}) };
    visits[spread.key] = (visits[spread.key] ?? 0) + 1;
    updateSettings({ visits });
    // Nur beim Seitenwechsel zählen, nicht bei jeder Neuzeichnung.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* Beim Blättern schließt sich die Bearbeitung von selbst. */
  useEffect(() => setEditing(false), [id]);

  /*
   * Die Zeit, wie sie in einem Buch stünde: „1032 – 1078", „seit 1032",
   * „bis 1078". Was sich nicht lesen lässt, steht trotzdem da – es ist die
   * Angabe des Verfassers, und der Zeitstrahl sagt ihm dort, dass er sie
   * nicht deuten konnte.
   */
  const lebenszeit = useMemo(() => {
    const b = entry?.beginn?.trim();
    const e = entry?.ende?.trim();
    if (!b && !e) return '';
    const zeige = (t: string) => {
      const z = leseZeit(t);
      return z ? schreibeZeit(z) : t;
    };
    if (b && e) return `${zeige(b)} – ${zeige(e)}`;
    return b ? `seit ${zeige(b)}` : `bis ${zeige(e!)}`;
  }, [entry?.beginn, entry?.ende]);

  if (!entry) {
    return (
      <Spread
        pageLeft={spread?.page ?? 6}
        left={
          <div className="pt-20 text-center">
            <p className="rubric">Verloren</p>
            <h1 className="mt-3 font-serif text-[30px] text-ink">Diese Seite gibt es nicht mehr</h1>
            <p className="prose-book mt-4">
              Vielleicht liegt der Eintrag im Papierkorb. Die Chronik im Anhang holt ihn zurück.
            </p>
            <Link to="/inhalt" className="mt-6 inline-block font-serif text-[15px] text-gild-600 underline">
              Zum Inhaltsverzeichnis
            </Link>
          </div>
        }
        right={null}
      />
    );
  }

  const tpl = templateFor(entry.type);

  if (editing) {
    return <EntryEditor entry={entry} onDone={() => setEditing(false)} pageLeft={spread?.page ?? 6} />;
  }

  /* --------------------------------------------------- Die gelesene Seite */

  const fieldRows = tpl.fields
    .filter((f) => f.kind === 'text' || f.kind === 'select' || f.kind === 'boolean' || f.kind === 'tags')
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

  const prose = tpl.fields
    .filter((f) => f.kind === 'textarea')
    .map((f) => ({ label: f.label, text: asText(entry.fields[f.key]) }))
    .filter((f) => f.text.trim());

  const palette = asList(entry.fields.palette);
  const gallery = tpl.fields
    .filter((f) => f.kind === 'images')
    .flatMap((f) => asList(entry.fields[f.key]))
    .filter((imageId) => imageId !== entry.coverImage)
    .slice(0, 6);

  const visibleBlocks = entry.blocks.filter((b) => b.type !== 'divider' && b.type !== 'spacer');

  return (
    <Spread
      pageLeft={spread?.page ?? 6}
      wear={wear}
      left={
        <>
          {/* Rubrik + Werkzeuge am Rand */}
          <div className="mb-1 flex items-start justify-between gap-4">
            <p className="rubric pt-1">{tpl.label}</p>
            <div className="-mt-1 flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => toggleFavorite(entry.id)}
                aria-label={entry.favorite ? 'Lesezeichen entfernen' : 'Lesezeichen setzen'}
                className={cx(
                  'grid h-9 w-9 place-items-center transition-colors no-tap-highlight',
                  entry.favorite ? 'text-gild-400' : 'text-ink-faint/35 hover:text-gild-500',
                )}
              >
                <Star size={15} className={entry.favorite ? 'fill-current' : ''} />
              </button>
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Diese Seite bearbeiten"
                title="Bearbeiten"
                className="grid h-9 w-9 place-items-center text-ink-faint/35 transition-colors hover:text-gild-500 no-tap-highlight"
              >
                <PenLine size={15} />
              </button>
            </div>
          </div>

          <h1 className="font-serif text-[34px] leading-[1.08] text-ink sm:text-[42px]">
            {entry.title}
          </h1>
          {entry.subtitle && (
            <p className="mt-1.5 font-serif text-[17px] italic leading-snug text-ink-muted">
              {entry.subtitle}
            </p>
          )}
          {/*
           * Die Lebenszeit – im Lesemodus eine Zeile, kein Feld.
           * Steht direkt unter dem Titel, weil sie zur Person gehört wie ihr
           * Name, und führt zum Zeitstrahl, wo sie im Zusammenhang steht.
           */}
          {lebenszeit && (
            <Link
              to="/zeitstrahl"
              className="mt-2.5 inline-block font-serif text-[13.5px] tracking-[0.06em] text-ink-faint transition-colors hover:text-gild-600 no-tap-highlight"
            >
              {lebenszeit}
            </Link>
          )}

          <span aria-hidden className="rule-gild mt-5 block w-24 opacity-70" />

          {entry.description && (
            <div className="prose-book dropcap mt-6">
              {entry.description.split(/\n{2,}/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}

          {prose.map((section) => (
            <section key={section.label} className="mt-7">
              <p className="rubric mb-1.5">{section.label}</p>
              <div className="prose-book">
                {section.text.split(/\n{2,}/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>
          ))}

          <FieldNotes rows={fieldRows} />

          {visibleBlocks.length > 0 && (
            <div className="mt-8">
              {visibleBlocks.map((block) => (
                <BlockView key={block.id} block={block} />
              ))}
            </div>
          )}

          <OpenQuestion entry={entry} />
        </>
      }
      right={
        <>
          {entry.coverImage ? (
            <div className="mb-6 lg:h-[62%]">
              <CoverPlate imageId={entry.coverImage} rubric={tpl.label} caption={entry.title} />
            </div>
          ) : null}

          {palette.length > 0 && (
            <section className={cx(entry.coverImage ? 'mt-2' : 'mt-0')}>
              <p className="rubric mb-2">Farbklang</p>
              <div className="flex flex-wrap gap-2">
                {palette.map((raw, i) => {
                  const [color, name] = raw.split('|');
                  return (
                    <div key={i} className="w-[70px]">
                      <div
                        className="h-11 w-full rounded-[2px] shadow-[0_1px_4px_rgba(60,44,26,0.28)]"
                        style={{ background: color }}
                      />
                      <p className="mt-1 truncate font-serif text-[11px] text-ink-muted">
                        {name || color}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {gallery.length > 0 && (
            <section className="mt-7">
              <p className="rubric mb-2">Studien</p>
              <div className="grid grid-cols-3 gap-2">
                {gallery.map((imageId) => (
                  <Thumb
                    key={imageId}
                    imageId={imageId}
                    alt=""
                    className="aspect-square w-full rounded-[2px]"
                    rounded="rounded-[2px]"
                  />
                ))}
              </div>
            </section>
          )}

          <Marginalia
            entry={entry}
            relIndex={relIndex}
            entriesById={entriesById}
            heading={!entry.coverImage && palette.length === 0 && gallery.length === 0}
          />

          <Zeitgenossen entry={entry} />

          {/* Nachbarseiten – so blättert man weiter, ohne zu suchen. */}
          <Neighbours entryId={entry.id} onGo={(path) => navigate(path)} />
        </>
      }
    />
  );
}

/**
 * Eine offene Frage am Fuß der Seite.
 *
 * Das Buch beantwortet nicht nur, es fragt auch. Aus den noch leeren Feldern
 * der Vorlage wird genau eine Frage ausgewählt und still ans Ende gesetzt –
 * keine Aufforderung, keine Fortschrittsanzeige, kein „3 von 12 ausgefüllt“.
 * Nur ein Gedanke, der weiterträgt.
 *
 * Die Auswahl hängt an der Eintrags-ID, damit dieselbe Seite immer dieselbe
 * Frage stellt. Eine Seite, die bei jedem Besuch etwas anderes wissen will,
 * wäre ein Formular mit Zufallsgenerator.
 */
function OpenQuestion({ entry }: { entry: Entry }) {
  const offen = templateFor(entry.type)
    .fields.filter((f) => f.hint && !asText(entry.fields[f.key]).trim() && asList(entry.fields[f.key]).length === 0)
    .map((f) => f.hint!);

  if (offen.length === 0) return null;

  /* Stabile Wahl aus der ID – dieselbe Seite, dieselbe Frage. */
  let sum = 0;
  for (let i = 0; i < entry.id.length; i++) sum = (sum + entry.id.charCodeAt(i)) % 9973;
  const frage = offen[sum % offen.length];

  return (
    <aside className="mt-10 border-t border-paper-300/60 pt-5">
      <p className="flex gap-3">
        <span aria-hidden className="mt-[11px] h-[3px] w-[3px] shrink-0 rotate-45 bg-gild-500/70" />
        <span className="font-serif text-[16px] italic leading-[1.6] text-ink-muted">{frage}</span>
      </p>
    </aside>
  );
}

/** Die Tafel füllt die Seite; das Bild darf atmen, nicht beschnitten wirken. */
/**
 * Zu ihrer Zeit.
 *
 * Der Lohn fuers Datieren – und zwar dort, wo die Arbeit anfaellt. Wer zwei
 * Jahreszahlen eintraegt, bekommt nicht bloss einen Balken im Anhang, sondern
 * den Satz, der in jedem guten Weltenbuch steht: *Zu seinen Lebzeiten
 * geschah …*
 *
 * Keine neue Datenhaltung: Es faellt aus dem Zeitraum ab, den es schon gibt.
 * Und keine Ueberschrift, wenn nichts da ist – eine leere Rubrik ist eine
 * Behauptung ueber eine Welt, die noch keine Zeit kennt.
 */
function Zeitgenossen({ entry }: { entry: Entry }) {
  const entries = useStudio((s) => s.entries);

  const gefunden = useMemo(() => {
    if (!entry.beginn?.trim() && !entry.ende?.trim()) return undefined;
    return zeitgenossenVon(entry, datiere(entries), 6);
  }, [entry, entries]);

  if (!gefunden) return null;

  const waehrend = gefunden.begannWaehrend;
  const daneben = gefunden.gleichzeitig.filter((d) => !waehrend.includes(d));
  if (waehrend.length === 0 && daneben.length === 0) return null;

  return (
    <section className="mt-8 border-t border-paper-300/60 pt-5">
      <p className="rubric mb-2.5">Zu dieser Zeit</p>

      {waehrend.length > 0 && (
        <ul className="space-y-1">
          {waehrend.map((d) => (
            <li key={d.entry.id} className="flex items-baseline gap-2">
              <span className="shrink-0 font-serif text-[12.5px] tabular-nums text-ink-faint/80">
                {d.zeit.beginn ? schreibeZeit(d.zeit.beginn) : ''}
              </span>
              <Link
                to={`/eintrag/${d.entry.id}`}
                className="font-serif text-[14.5px] text-ink-muted transition-colors hover:text-gild-600 no-tap-highlight"
              >
                {d.entry.title}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {daneben.length > 0 && (
        <p className="mt-3 font-serif text-[14px] leading-relaxed text-ink-faint">
          Bestand daneben:{' '}
          {daneben.map((d, i) => (
            <span key={d.entry.id}>
              {i > 0 && ', '}
              <Link
                to={`/eintrag/${d.entry.id}`}
                className="text-ink-muted transition-colors hover:text-gild-600 no-tap-highlight"
              >
                {d.entry.title}
              </Link>
            </span>
          ))}
          .
        </p>
      )}
    </section>
  );
}

function CoverPlate({ imageId, rubric, caption }: { imageId: string; rubric: string; caption: string }) {
  const url = useImageUrl(imageId, 'full');
  return (
    <Plate rubric={rubric} caption={caption}>
      {url ? (
        <img src={url} alt={caption} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full min-h-[220px] place-items-center font-serif text-[13px] italic text-ink-faint">
          Tafel fehlt
        </div>
      )}
    </Plate>
  );
}

/** „Vorherige / Nächste Seite“ – gesetzt wie eine Kolumnenzeile, kein Knopf. */
function Neighbours({ entryId, onGo }: { entryId: string; onGo: (path: string) => void }) {
  const { book } = useCurrentSpread();
  const entries = useStudio((s) => s.entries);
  const living = useMemo(() => livingEntries(entries), [entries]);
  const index = book.spreads.findIndex((s) => s.entryId === entryId);
  if (index < 0 || living.length === 0) return null;

  const prev = book.spreads[index - 1];
  const next = book.spreads[index + 1];
  if (!prev && !next) return null;

  return (
    <nav className="mt-10 flex items-baseline justify-between gap-4 border-t border-paper-300/60 pt-3">
      {prev ? (
        <button
          type="button"
          onClick={() => onGo(prev.path)}
          className="min-w-0 text-left font-serif text-[12.5px] italic text-ink-faint transition-colors hover:text-gild-600 no-tap-highlight"
        >
          ← {prev.label}
        </button>
      ) : (
        <span />
      )}
      {next && (
        <button
          type="button"
          onClick={() => onGo(next.path)}
          className="min-w-0 text-right font-serif text-[12.5px] italic text-ink-faint transition-colors hover:text-gild-600 no-tap-highlight"
        >
          {next.label} →
        </button>
      )}
    </nav>
  );
}
