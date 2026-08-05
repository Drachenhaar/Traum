/**
 * Das Studio-Zuhause.
 *
 * Die Seite beantwortet vier Fragen, in dieser Reihenfolge:
 *   1. Wo war ich gerade?
 *   2. Wie lebendig ist meine Welt?
 *   3. Was wäre jetzt dran?
 *   4. Was habe ich zuletzt gemacht?
 *
 * Sie ist nie leer – auch am ersten Tag nicht.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Brush,
  Dna,
  ImagePlus,
  Images,
  Plus,
  Sparkle,
  Star,
  Unlink,
  Waypoints,
} from 'lucide-react';
import { useStudio, livingEntries } from '../store/useStudio';
import { EntryCard } from '../components/entry/EntryCard';
import { Thumb } from '../components/images/Thumb';
import { ImageUploadButton } from '../components/images/ImageUploadButton';
import { Lightbox } from '../components/images/Lightbox';
import { QuickCreate } from '../components/entry/QuickCreate';
import { GoalPanel } from '../components/home/GoalPanel';
import { templateFor } from '../lib/templates';
import { discoverRelated, findOrphans } from '../lib/relations';
import { relativeTime } from '../lib/utils';

export function HomePage() {
  const entries = useStudio((s) => s.entries);
  const images = useStudio((s) => s.images);
  const relations = useStudio((s) => s.relations);
  const relIndex = useStudio((s) => s.relIndex);
  const settings = useStudio((s) => s.settings);
  const boards = useStudio((s) => s.boards);
  const addRelation = useStudio((s) => s.addRelation);
  const navigate = useNavigate();

  const [lightbox, setLightbox] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const living = useMemo(() => livingEntries(entries), [entries]);
  const byId = useMemo(() => new Map(living.map((e) => [e.id, e])), [living]);

  /** Weitermachen, wo du warst. */
  const continueWith = useMemo(
    () => (settings.recentIds ?? []).map((id) => byId.get(id)).filter(Boolean).slice(0, 4),
    [settings.recentIds, byId],
  );

  const recent = useMemo(
    () => [...living].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8),
    [living],
  );
  const favorites = useMemo(() => living.filter((e) => e.favorite).slice(0, 8), [living]);
  const recentImages = useMemo(
    () => [...images].sort((a, b) => b.createdAt - a.createdAt).slice(0, 12),
    [images],
  );

  /** Wie dicht ist das Netz? Ein einziger, ehrlicher Wert. */
  const density = useMemo(() => {
    if (!living.length) return 0;
    const connected = living.filter((e) => (relIndex.neighbours.get(e.id)?.size ?? 0) > 0).length;
    return Math.round((connected / living.length) * 100);
  }, [living, relIndex]);

  const orphans = useMemo(() => findOrphans(living, relIndex).slice(0, 4), [living, relIndex]);

  /** Der Vorschlag des Tages: eine Entdeckung aus dem zweiten Grad. */
  const inspiration = useMemo(() => {
    const candidates = [...living].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 12);
    for (const entry of candidates) {
      const found = discoverRelated(relIndex, entry.id, byId, 1);
      if (found.length) return { from: entry, discovery: found[0], target: byId.get(found[0].entryId) };
    }
    return null;
  }, [living, relIndex, byId]);

  /** Die häufigsten Typen – die Welt zeigt, woraus sie besteht. */
  const composition = useMemo(() => {
    const counts = new Map<string, number>();
    living.forEach((e) => counts.set(e.type, (counts.get(e.type) ?? 0) + 1));
    return [...counts.entries()]
      .map(([type, count]) => ({ type, count, tpl: templateFor(type) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [living]);

  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'Noch wach' : hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Willkommen zurück' : 'Guten Abend';

  return (
    <div className="space-y-9">
      {/* ------------------------------------------------------------ Kopf */}
      <header>
        <p className="text-[13px] uppercase tracking-[0.18em] text-brass-600">
          {settings.worldName || 'Dragoncore'} Studio
        </p>
        <h1 className="mt-1 font-serif text-[34px] leading-[1.05] text-ink sm:text-[44px]">
          {greeting}
        </h1>
        <p className="mt-2 max-w-2xl text-[16px] leading-relaxed text-ink-muted">
          {living.length === 0
            ? 'Deine Welt beginnt mit einem einzigen Eintrag. Alles Weitere wächst daran.'
            : `${living.length} Einträge, ${relations.length} Verbindungen. ${
                density >= 80
                  ? 'Deine Welt hängt dicht zusammen.'
                  : density >= 40
                    ? 'Die Welt wächst zusammen.'
                    : 'Vieles steht noch für sich allein.'
              }`}
        </p>
      </header>

      {/* ----------------------------------------- Weitermachen, wo du warst */}
      {continueWith.length > 0 && (
        <section>
          <h2 className="mb-3 font-serif text-2xl text-ink">Weitermachen</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {continueWith.map((entry) => {
              if (!entry) return null;
              const tpl = templateFor(entry.type);
              return (
                <Link
                  key={entry.id}
                  to={`/eintrag/${entry.id}`}
                  className="group flex items-center gap-3 rounded-2xl border border-line bg-cream-50 p-2.5 shadow-card transition-all duration-200 ease-calm hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <Thumb imageId={entry.coverImage} alt="" className="h-14 w-14 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-[12px] uppercase tracking-wide" style={{ color: tpl.accent }}>
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: tpl.accent }} />
                      {tpl.label}
                    </p>
                    <p className="truncate font-serif text-[18px] text-ink">{entry.title}</p>
                    <p className="text-[13px] text-ink-faint">{relativeTime(entry.updatedAt)}</p>
                  </div>
                  <ArrowRight
                    size={18}
                    className="shrink-0 text-ink-faint transition-transform duration-200 ease-calm group-hover:translate-x-0.5 group-hover:text-brass-600"
                  />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ------------------------------------------------ Zustand der Welt */}
      <section className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl text-ink">Zustand der Welt</h2>
              <p className="mt-0.5 text-[14px] text-ink-muted">
                {density}% aller Einträge sind mit etwas verbunden
              </p>
            </div>
            <Link to="/graph" className="btn-ghost h-10 min-h-0 shrink-0 px-3 text-[14px]">
              <Waypoints size={16} /> Graph
            </Link>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-cream-300">
            <div
              className="h-full rounded-full bg-brass-500 transition-[width] duration-1000 ease-calm"
              style={{ width: `${density}%` }}
            />
          </div>

          {composition.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {composition.map(({ type, count, tpl }) => (
                <Link
                  key={type}
                  to={`/bibliothek?typ=${type}`}
                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-line bg-cream-50 px-3 text-[13px] text-ink-muted transition-colors hover:border-brass-400 hover:text-ink"
                >
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: tpl.accent }} />
                  {tpl.labelPlural} <span className="text-ink-faint">{count}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <GoalPanel />
      </section>

      {/* ----------------------------------------------- Vorschlag des Tages */}
      {inspiration?.target && (
        <section className="rounded-2xl border border-brass-500/35 bg-brass-500/10 p-4 sm:p-5">
          <h2 className="mb-1 flex items-center gap-2 font-serif text-xl text-ink">
            <Sparkle size={18} className="text-brass-600" /> Vielleicht gehört das zusammen
          </h2>
          <p className="text-[15px] leading-relaxed text-ink">
            <Link to={`/eintrag/${inspiration.from.id}`} className="font-medium hover:underline">
              {inspiration.from.title}
            </Link>{' '}
            und{' '}
            <Link to={`/eintrag/${inspiration.target.id}`} className="font-medium hover:underline">
              {inspiration.target.title}
            </Link>{' '}
            liegen dicht beieinander – {inspiration.discovery.path} –, sind aber noch nicht direkt
            verbunden.
          </p>
          <button
            type="button"
            className="btn-accent mt-3"
            onClick={() => addRelation(inspiration.from.id, inspiration.target!.id, 'related')}
          >
            Verbinden
          </button>
        </section>
      )}

      {/* ------------------------------------------------------ Schnellstart */}
      <section>
        <h2 className="mb-3 font-serif text-2xl text-ink">Womit weiter?</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-accent" onClick={() => setCreateOpen(true)}>
            <Plus size={18} /> Etwas Neues
          </button>
          <Link to="/dna" className="btn-ghost">
            <Dna size={18} /> Welt-DNA
          </Link>
          <Link to="/graph" className="btn-ghost">
            <Waypoints size={18} /> Weltgraph
          </Link>
          <Link to="/canvas" className="btn-ghost">
            <Brush size={18} /> Concept Canvas {boards.length > 0 && <span className="text-ink-faint">{boards.length}</span>}
          </Link>
          <ImageUploadButton className="btn-ghost" onImported={() => navigate('/bilder')}>
            <ImagePlus size={18} /> Bilder importieren
          </ImageUploadButton>
        </div>
      </section>

      {/* ---------------------------------------------- Noch ohne Verbindung */}
      {orphans.length > 0 && (
        <section>
          <h2 className="mb-1 flex items-center gap-2 font-serif text-2xl text-ink">
            <Unlink size={19} className="text-ink-faint" /> Noch allein
          </h2>
          <p className="mb-3 text-[15px] text-ink-muted">
            Diese Einträge sind mit nichts verbunden. Ein Ort, ein Material, eine DNA-Regel genügt.
          </p>
          <div className="flex flex-wrap gap-2">
            {orphans.map((entry) => {
              const tpl = templateFor(entry.type);
              return (
                <Link
                  key={entry.id}
                  to={`/eintrag/${entry.id}`}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-dashed border-lineStrong bg-cream-50/60 px-3 text-[14px] text-ink transition-colors hover:border-brass-400 hover:bg-cream-200"
                >
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: tpl.accent }} />
                  {entry.title}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* -------------------------------------------------- Zuletzt bearbeitet */}
      {recent.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-2xl text-ink">Zuletzt bearbeitet</h2>
            <Link to="/bibliothek" className="text-[14px] text-brass-600 hover:underline">
              Alles ansehen
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {recent.map((e) => (
              <EntryCard key={e.id} entry={e} />
            ))}
          </div>
        </section>
      )}

      {/* --------------------------------------------------------- Favoriten */}
      {favorites.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-serif text-2xl text-ink">
            <Star size={19} className="text-brass-500" /> Favoriten
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {favorites.map((e) => (
              <EntryCard key={e.id} entry={e} />
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------- Zuletzt hochgeladen */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-2xl text-ink">Zuletzt hinzugefügte Bilder</h2>
          <Link to="/bilder" className="text-[14px] text-brass-600 hover:underline">
            Alle Bilder
          </Link>
        </div>
        {recentImages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-lineStrong bg-cream-50/60 px-6 py-10 text-center">
            <Images size={24} className="mx-auto mb-2 text-ink-faint" strokeWidth={1.5} />
            <p className="text-[15px] text-ink-muted">
              Noch keine Bilder. Sie bleiben lokal auf diesem Gerät.
            </p>
            <ImageUploadButton className="btn-accent mt-4" onImported={() => navigate('/bilder')}>
              <ImagePlus size={18} /> Bilder importieren
            </ImageUploadButton>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {recentImages.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setLightbox(i)}
                className="group overflow-hidden rounded-xl border border-line transition-all duration-200 ease-calm hover:border-brass-400 hover:shadow-card"
                title={m.title}
              >
                <Thumb
                  imageId={m.id}
                  alt={m.title}
                  className="aspect-square w-full transition-transform duration-500 ease-calm group-hover:scale-[1.04]"
                  rounded="rounded-none"
                />
              </button>
            ))}
          </div>
        )}
      </section>

      {lightbox !== null && (
        <Lightbox
          ids={recentImages.map((m) => m.id)}
          index={lightbox}
          onIndexChange={setLightbox}
          onClose={() => setLightbox(null)}
        />
      )}
      <QuickCreate open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
