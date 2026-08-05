/**
 * Die Art Bible.
 *
 * Sie wird nicht geschrieben, sie entsteht. Jeder Eintrag, jede Farbe, jedes
 * Material landet automatisch an der richtigen Stelle. Was hier fehlt, fehlt
 * in der Welt – und genau das soll dieses Kapitelverzeichnis zeigen.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Download, Presentation } from 'lucide-react';
import { useStudio, livingEntries } from '../store/useStudio';
import { templateFor, templatesByFamily, asList, asText, FAMILY_LABELS } from '../lib/templates';
import { relationsOf } from '../lib/relations';
import { StoryMode } from '../components/story/StoryMode';
import { Thumb } from '../components/images/Thumb';
import { EmptyState } from '../components/ui/EmptyState';
import { renderArtBibleHtml } from '../lib/portability';
import { downloadFile, fileStamp, formatDate } from '../lib/utils';
import type { Entry } from '../types';

export function ArtBiblePage() {
  const entries = useStudio((s) => s.entries);
  const images = useStudio((s) => s.images);
  const relIndex = useStudio((s) => s.relIndex);
  const settings = useStudio((s) => s.settings);
  const notify = useStudio((s) => s.notify);

  const [storyIds, setStoryIds] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  const living = useMemo(() => livingEntries(entries), [entries]);

  /** Kapitel entstehen aus den Familien – aber nur, wo es auch Inhalt gibt. */
  const chapters = useMemo(() => {
    const families = templatesByFamily();
    return families
      .map((family) => {
        const types = new Set(family.items.map((t) => t.type));
        const items = living
          .filter((e) => types.has(e.type))
          .sort((a, b) => a.type.localeCompare(b.type) || a.title.localeCompare(b.title, 'de'));
        return { key: family.family, label: family.label, items };
      })
      .filter((c) => c.items.length > 0);
  }, [living]);

  /** Alle Farben der Welt, nach Häufigkeit. */
  const worldPalette = useMemo(() => {
    const counts = new Map<string, { color: string; name: string; count: number }>();
    const add = (color: string, name: string) => {
      const key = color.toLowerCase();
      const hit = counts.get(key);
      if (hit) {
        hit.count += 1;
        if (!hit.name && name) hit.name = name;
      } else counts.set(key, { color, name, count: 1 });
    };
    for (const entry of living) {
      asList(entry.fields.palette).forEach((raw) => {
        const [color, ...rest] = raw.split('|');
        if (/^#[0-9a-f]{6}$/i.test(color)) add(color, rest.join('|'));
      });
      entry.blocks.forEach((b) => {
        b.data.swatches?.forEach((s) => /^#[0-9a-f]{6}$/i.test(s.color) && add(s.color, s.name));
        b.data.materials?.forEach((m) => /^#[0-9a-f]{6}$/i.test(m.color) && add(m.color, m.name));
      });
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 24);
  }, [living]);

  /** Materialien tauchen an vielen Stellen auf – hier einmal gesammelt. */
  const materials = useMemo(() => {
    const list: { name: string; color: string; note: string }[] = [];
    living
      .filter((e) => e.type === 'material')
      .forEach((e) =>
        list.push({
          name: e.title,
          color: asList(e.fields.palette)[0]?.split('|')[0] ?? '#8C7A62',
          note: asText(e.fields.finish),
        }),
      );
    living.forEach((e) =>
      e.blocks.forEach((b) =>
        b.data.materials?.forEach((m) => list.push({ name: m.name, color: m.color, note: m.finish })),
      ),
    );
    const seen = new Set<string>();
    return list.filter((m) => {
      const key = m.name.toLowerCase();
      if (!m.name || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [living]);

  const dnaRules = living.filter((e) => e.type === 'dna');
  const allIds = useMemo(
    () => [...dnaRules.map((r) => r.id), ...chapters.flatMap((c) => c.items.map((i) => i.id))],
    [dnaRules, chapters],
  );

  const exportHtml = async () => {
    setBusy(true);
    try {
      const html = await renderArtBibleHtml(
        living,
        relIndex,
        settings.worldName || 'Dragoncore',
        settings.worldTagline,
      );
      downloadFile(`art-bible_${fileStamp()}.html`, html, 'text/html');
      notify('Art Bible als HTML gesichert.', 'success');
    } catch (err) {
      notify(`Export fehlgeschlagen: ${(err as Error).message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (living.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Die Art Bible ist noch leer"
        message="Sie wird nicht geschrieben, sondern wächst mit. Sobald du Einträge anlegst, füllen sich hier die Kapitel von selbst."
      />
    );
  }

  return (
    <div className="space-y-10">
      {/* ------------------------------------------------------------ Titel */}
      <header className="border-b border-line pb-8">
        <p className="text-[13px] uppercase tracking-[0.2em] text-brass-600">Art Bible</p>
        <h1 className="mt-2 font-serif text-[40px] leading-[1.05] text-ink sm:text-[56px]">
          {settings.worldName || 'Dragoncore'}
        </h1>
        {settings.worldTagline && (
          <p className="mt-2 font-serif text-[20px] italic text-ink-muted sm:text-[24px]">
            {settings.worldTagline}
          </p>
        )}
        <p className="mt-4 text-[15px] text-ink-muted">
          {living.length} Einträge · {dnaRules.length} DNA-Regeln · {images.length} Bilder · Stand{' '}
          {formatDate(Date.now())}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="btn-accent" onClick={() => setStoryIds(allIds)}>
            <Presentation size={18} /> Im Story-Modus zeigen
          </button>
          <button type="button" className="btn-ghost" onClick={() => void exportHtml()} disabled={busy}>
            <Download size={18} /> {busy ? 'Wird gebaut …' : 'Als HTML sichern'}
          </button>
        </div>
      </header>

      {/* -------------------------------------------------------------- DNA */}
      {dnaRules.length > 0 && (
        <section>
          <h2 className="mb-1 font-serif text-2xl text-ink">Die DNA</h2>
          <p className="mb-4 text-[15px] text-ink-muted">Woran sich alles messen lässt.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {dnaRules.map((rule) => (
              <Link
                key={rule.id}
                to={`/eintrag/${rule.id}`}
                className="card p-4 transition-all duration-200 ease-calm hover:-translate-y-0.5 hover:shadow-lift"
              >
                <p className="text-[12px] uppercase tracking-wide text-brass-600">{rule.category}</p>
                <h3 className="mt-1 font-serif text-lg text-ink">{rule.title}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-muted">
                  {asText(rule.fields.rule) || rule.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------- Palette */}
      {worldPalette.length > 0 && (
        <section>
          <h2 className="mb-1 font-serif text-2xl text-ink">Farben der Welt</h2>
          <p className="mb-4 text-[15px] text-ink-muted">
            Gesammelt aus allen Einträgen – die häufigsten zuerst.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {worldPalette.map((c) => (
              <div key={c.color} className="overflow-hidden rounded-xl border border-line bg-cream-50">
                <div className="h-14 w-full" style={{ background: c.color }} />
                <div className="p-1.5">
                  <p className="truncate text-[12px] text-ink">{c.name || c.color}</p>
                  <p className="font-mono text-[11px] uppercase text-ink-faint">{c.color}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* -------------------------------------------------------- Materialien */}
      {materials.length > 0 && (
        <section>
          <h2 className="mb-1 font-serif text-2xl text-ink">Materialien</h2>
          <p className="mb-4 text-[15px] text-ink-muted">Woraus die Welt gemacht ist.</p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {materials.map((m) => (
              <li
                key={m.name}
                className="flex items-center gap-3 rounded-xl border border-line bg-cream-50 px-3 py-2"
              >
                <span
                  className="h-9 w-9 shrink-0 rounded-lg border border-line"
                  style={{ background: m.color }}
                />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] text-ink">{m.name}</span>
                  {m.note && <span className="block truncate text-[13px] text-ink-muted">{m.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------------------------------------------ Kapitel */}
      {chapters
        .filter((c) => c.key !== 'system')
        .map((chapter) => (
          <section key={chapter.key}>
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="font-serif text-2xl text-ink">{chapter.label}</h2>
              <button
                type="button"
                className="text-[14px] text-brass-600 hover:underline"
                onClick={() => setStoryIds(chapter.items.map((i) => i.id))}
              >
                Kapitel vorführen
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {chapter.items.map((item) => (
                <BibleCard key={item.id} entry={item} connections={relationsOf(relIndex, item.id).length} />
              ))}
            </div>
          </section>
        ))}

      {storyIds && <StoryMode ids={storyIds} onClose={() => setStoryIds(null)} />}
    </div>
  );
}

function BibleCard({ entry, connections }: { entry: Entry; connections: number }) {
  const tpl = templateFor(entry.type);
  const palette = asList(entry.fields.palette);

  return (
    <Link
      to={`/eintrag/${entry.id}`}
      className="card group flex gap-3 overflow-hidden p-3 transition-all duration-200 ease-calm hover:-translate-y-0.5 hover:shadow-lift"
    >
      <Thumb imageId={entry.coverImage} alt="" className="h-20 w-20 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[12px] uppercase tracking-wide" style={{ color: tpl.accent }}>
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: tpl.accent }} />
          {tpl.label}
        </p>
        <h3 className="mt-0.5 truncate font-serif text-[17px] text-ink transition-colors group-hover:text-brass-600">
          {entry.title}
        </h3>
        <p className="mt-0.5 line-clamp-2 text-[14px] leading-snug text-ink-muted">
          {entry.description || entry.subtitle || FAMILY_LABELS[tpl.family]}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          {palette.slice(0, 4).map((raw, i) => (
            <span
              key={i}
              className="h-3.5 w-3.5 rounded-full border border-line"
              style={{ background: raw.split('|')[0] }}
            />
          ))}
          <span className="ml-auto text-[12px] text-ink-faint">{connections} Verbindungen</span>
        </div>
      </div>
    </Link>
  );
}
