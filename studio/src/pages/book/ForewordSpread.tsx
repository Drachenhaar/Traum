/**
 * Das Vorwort.
 *
 * Die erste Seite des Buchblocks. Sie erzählt den Zustand der Welt in Sätzen,
 * nicht in Kacheln: wie viele Seiten es gibt, was zuletzt entstand, was noch
 * allein steht. Ein Dashboard hätte hier Zahlen aufgereiht – ein Buch schreibt
 * einen Absatz.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStudio, livingEntries } from '../../store/useStudio';
import { useCurrentSpread } from '../../components/book/BookShell';
import { Spread, Plate } from '../../components/book/Spread';
import { templateFor } from '../../lib/templates';
import { discoverRelated } from '../../lib/relations';
import { useImageUrl } from '../../components/images/Thumb';
import { TEXTURES } from '../../lib/textures';
import { relativeTime } from '../../lib/utils';

export function ForewordSpread() {
  const { book, spread, wear } = useCurrentSpread();
  const entries = useStudio((s) => s.entries);
  const relations = useStudio((s) => s.relations);
  const relIndex = useStudio((s) => s.relIndex);
  const settings = useStudio((s) => s.settings);
  const addRelation = useStudio((s) => s.addRelation);

  const living = useMemo(() => livingEntries(entries), [entries]);
  const byId = useMemo(() => new Map(living.map((e) => [e.id, e])), [living]);

  const recent = useMemo(
    () => [...living].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5),
    [living],
  );

  const density = useMemo(() => {
    if (!living.length) return 0;
    const connected = living.filter((e) => (relIndex.neighbours.get(e.id)?.size ?? 0) > 0).length;
    return Math.round((connected / living.length) * 100);
  }, [living, relIndex]);

  /* Der Fund des Tages – zwei Einträge, die sich noch nicht kennen. */
  const discovery = useMemo(() => {
    for (const entry of [...living].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 12)) {
      const found = discoverRelated(relIndex, entry.id, byId, 1);
      if (found.length) return { from: entry, to: byId.get(found[0].entryId), via: found[0].path };
    }
    return null;
  }, [living, relIndex, byId]);

  const newest = recent[0];

  return (
    <Spread
      pageLeft={spread?.page ?? 6}
      wear={wear}
      left={
        <div className="py-4 lg:py-10">
          <p className="rubric">Vorwort</p>
          <h1 className="mt-3 font-serif text-[38px] leading-[1.05] text-ink sm:text-[46px]">
            {settings.worldName || 'Dragoncore'}
          </h1>
          {settings.worldTagline && (
            <p className="mt-2 font-serif text-[18px] italic leading-snug text-ink-muted">
              {settings.worldTagline}
            </p>
          )}
          <span aria-hidden className="rule-gild mt-6 block w-28 opacity-75" />

          <div className="prose-book dropcap mt-7">
            {living.length === 0 ? (
              <p>
                Dieses Buch ist noch leer. Es beginnt mit einer einzigen Seite – einem Ort, einer
                Kreatur, einem Gedanken. Alles Weitere wächst daran, und mit jeder Seite wird der
                Rücken ein Stück dicker.
              </p>
            ) : (
              <p>
                Dieser Band umfasst {book.totalPages} Seiten in {book.chapters.length}{' '}
                {book.chapters.length === 1 ? 'Kapitel' : 'Kapiteln'}. Er verzeichnet {living.length}{' '}
                {living.length === 1 ? 'Eintrag' : 'Einträge'} und {relations.length}{' '}
                {relations.length === 1 ? 'Verbindung' : 'Verbindungen'} zwischen ihnen.{' '}
                {density >= 80
                  ? 'Die Welt hängt dicht zusammen; kaum etwas steht für sich allein.'
                  : density >= 40
                    ? 'Die Welt wächst zusammen, aber es sind noch Fäden zu knüpfen.'
                    : 'Vieles steht noch für sich allein und wartet darauf, verbunden zu werden.'}
              </p>
            )}

            {newest && (
              <p>
                Zuletzt wurde <em>{newest.title}</em> beschrieben, {relativeTime(newest.updatedAt)}.
              </p>
            )}
          </div>

          {discovery?.to && (
            <section className="mt-9 border-t border-paper-300/70 pt-5">
              <p className="rubric mb-2">Eine Beobachtung</p>
              <p className="prose-book">
                <Link to={`/eintrag/${discovery.from.id}`} className="underline decoration-gild-500/40">
                  {discovery.from.title}
                </Link>{' '}
                und{' '}
                <Link to={`/eintrag/${discovery.to.id}`} className="underline decoration-gild-500/40">
                  {discovery.to.title}
                </Link>{' '}
                liegen dicht beieinander – {discovery.via} –, sind aber noch nicht direkt verbunden.
              </p>
              <button
                type="button"
                onClick={() => addRelation(discovery.from.id, discovery.to!.id, 'related')}
                className="mt-3 inline-flex min-h-[36px] items-center rounded-full border border-gild-500/35 px-4 font-serif text-[13.5px] text-gild-600 transition-colors hover:bg-gild-400/10 no-tap-highlight"
              >
                Verbinden
              </button>
            </section>
          )}
        </div>
      }
      right={
        <>
          {newest?.coverImage ? (
            <div className="mb-7 h-[52%] min-h-[220px]">
              <ForewordPlate
                imageId={newest.coverImage}
                caption={newest.title}
                rubric={templateFor(newest.type).label}
              />
            </div>
          ) : (
            /* Solange die Welt keine eigenen Tafeln hat, trägt das Frontispiz die Seite. */
            <div className="mb-7 h-[52%] min-h-[220px]">
              <Plate rubric="Frontispiz" caption={settings.worldName || 'Dragoncore'}>
                <img src={TEXTURES.frontispiz} alt="" className="h-full w-full object-cover" />
              </Plate>
            </div>
          )}

          {recent.length > 0 && (
            <section>
              <p className="rubric mb-3">Zuletzt geschrieben</p>
              <ol>
                {recent.map((item) => {
                  const page = book.pageOfEntry.get(item.id);
                  const tpl = templateFor(item.type);
                  return (
                    <li key={item.id} className="group">
                      <Link
                        to={`/eintrag/${item.id}`}
                        className="flex items-baseline gap-2 py-[6px] no-tap-highlight"
                      >
                        <span
                          aria-hidden
                          className="h-[5px] w-[5px] shrink-0 translate-y-[-3px] rounded-full"
                          style={{ background: tpl.accent }}
                        />
                        <span className="truncate font-serif text-[15.5px] text-ink transition-colors group-hover:text-gild-600">
                          {item.title}
                        </span>
                        <span
                          aria-hidden
                          className="mx-1 min-w-[1rem] flex-1 translate-y-[-4px] border-b border-dotted border-paper-400/60"
                        />
                        <span className="shrink-0 font-serif text-[13px] tabular-nums text-ink-faint">
                          {page}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          <p className="mt-10 font-serif text-[12.5px] italic leading-relaxed text-ink-faint/70">
            Blättern Sie weiter, oder schlagen Sie das{' '}
            <Link to="/inhalt" className="underline decoration-gild-500/40">
              Inhaltsverzeichnis
            </Link>{' '}
            auf.
          </p>
        </>
      }
    />
  );
}

function ForewordPlate({
  imageId,
  caption,
  rubric,
}: {
  imageId: string;
  caption: string;
  rubric: string;
}) {
  const url = useImageUrl(imageId, 'full');
  return (
    <Plate rubric={rubric} caption={caption}>
      {url ? <img src={url} alt={caption} className="h-full w-full object-cover" /> : <div className="h-full" />}
    </Plate>
  );
}
