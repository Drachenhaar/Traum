/**
 * Blöcke, nur zum Lesen.
 *
 * Wird im Story-Modus und in der Art Bible verwendet: dieselben Inhalte,
 * aber ohne jedes Bedienelement. Die Oberfläche verschwindet, der Inhalt bleibt.
 */

import type { Block } from '../../types';
import { Thumb } from '../images/Thumb';
import { cx } from '../../lib/utils';

export function BlockView({ block, tone = 'light' }: { block: Block; tone?: 'light' | 'dark' }) {
  const d = block.data;
  const muted = tone === 'dark' ? 'text-cream-100/60' : 'text-ink-muted';
  const body = tone === 'dark' ? 'text-cream-100/90' : 'text-ink';

  switch (block.type) {
    case 'heading': {
      const level = d.level ?? 2;
      const size = level === 1 ? 'text-[30px] sm:text-[38px]' : level === 2 ? 'text-[24px] sm:text-[28px]' : 'text-[20px]';
      if (!d.text) return null;
      return <h3 className={cx('mt-8 font-serif leading-tight', size, body)}>{d.text}</h3>;
    }

    case 'text':
      if (!d.text) return null;
      return (
        <p className={cx('mt-4 whitespace-pre-wrap text-[17px] leading-[1.75]', body)}>{d.text}</p>
      );

    case 'quote':
      if (!d.text) return null;
      return (
        <blockquote className="mt-7 border-l-2 border-brass-500 pl-5">
          <p className={cx('font-serif text-[21px] italic leading-relaxed', body)}>{d.text}</p>
          {d.source && <cite className={cx('mt-2 block text-[14px] not-italic', muted)}>{d.source}</cite>}
        </blockquote>
      );

    case 'note':
      if (!d.text) return null;
      return (
        <aside
          className={cx(
            'mt-6 rounded-xl border-l-2 border-brass-500 px-4 py-3 text-[16px] leading-relaxed',
            tone === 'dark' ? 'bg-cream-100/8 text-cream-100/85' : 'bg-cream-200/60 text-ink',
          )}
        >
          {d.text}
        </aside>
      );

    case 'image':
      if (!d.imageId) return null;
      return (
        <figure className="mt-7">
          <Thumb imageId={d.imageId} alt={d.caption ?? ''} className="max-h-[68vh] w-full" fit="contain" rounded="rounded-xl" />
          {d.caption && <figcaption className={cx('mt-2 text-[14px]', muted)}>{d.caption}</figcaption>}
        </figure>
      );

    case 'gallery': {
      const ids = d.imageIds ?? [];
      if (!ids.length) return null;
      return (
        <div
          className="mt-7 grid gap-3"
          style={{ gridTemplateColumns: `repeat(${Math.min(d.columns ?? 3, 3)}, minmax(0,1fr))` }}
        >
          {ids.map((id, i) => (
            <Thumb key={`${id}-${i}`} imageId={id} className="aspect-[4/3] w-full" rounded="rounded-xl" />
          ))}
        </div>
      );
    }

    case 'moodboard': {
      const tiles = d.tiles ?? [];
      if (!tiles.length) return null;
      return (
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tiles.map((t) => (
            <figure key={t.id}>
              <Thumb imageId={t.imageId} className="aspect-[4/3] w-full" rounded="rounded-xl" />
              {t.caption && <figcaption className={cx('mt-1.5 text-[13px]', muted)}>{t.caption}</figcaption>}
            </figure>
          ))}
        </div>
      );
    }

    case 'palette': {
      const swatches = d.swatches ?? [];
      if (!swatches.length) return null;
      return (
        <div className="mt-7 flex flex-wrap gap-2.5">
          {swatches.map((s) => (
            <div key={s.id} className="flex items-center gap-2.5">
              <span
                className="h-11 w-11 rounded-xl border border-black/10 shadow-sm"
                style={{ background: s.color }}
              />
              <span>
                <span className={cx('block text-[14px]', body)}>{s.name || s.color}</span>
                <span className={cx('block font-mono text-[12px] uppercase', muted)}>{s.color}</span>
              </span>
            </div>
          ))}
        </div>
      );
    }

    case 'materials': {
      const materials = d.materials ?? [];
      if (!materials.length) return null;
      return (
        <ul className="mt-7 space-y-2">
          {materials.map((m) => (
            <li key={m.id} className="flex items-center gap-3">
              <span
                className="h-9 w-9 shrink-0 rounded-lg border border-black/10"
                style={{ background: m.color }}
              />
              <span className="min-w-0">
                <span className={cx('block text-[16px]', body)}>{m.name}</span>
                <span className={cx('block text-[13px]', muted)}>
                  {[m.finish, m.note].filter(Boolean).join(' · ')}
                </span>
              </span>
            </li>
          ))}
        </ul>
      );
    }

    case 'references': {
      const cards = d.cards ?? [];
      if (!cards.length) return null;
      return (
        <ul className="mt-7 grid gap-3 sm:grid-cols-2">
          {cards.map((c) => (
            <li key={c.id} className="flex gap-3">
              {c.imageId && <Thumb imageId={c.imageId} className="h-20 w-20 shrink-0" />}
              <span className="min-w-0">
                <span className={cx('block text-[16px]', body)}>{c.title}</span>
                <span className={cx('block text-[14px]', muted)}>{c.note}</span>
                {c.source && <span className={cx('block text-[12px]', muted)}>{c.source}</span>}
              </span>
            </li>
          ))}
        </ul>
      );
    }

    case 'checklist': {
      const items = d.items ?? [];
      if (!items.length) return null;
      return (
        <ul className="mt-6 space-y-1.5">
          {items.map((i) => (
            <li key={i.id} className={cx('flex items-start gap-2 text-[16px]', i.done ? muted : body)}>
              <span className="mt-0.5">{i.done ? '☑' : '☐'}</span>
              <span className={i.done ? 'line-through' : undefined}>{i.text}</span>
            </li>
          ))}
        </ul>
      );
    }

    case 'prompt':
      if (!d.prompt) return null;
      return (
        <div
          className={cx(
            'mt-7 rounded-xl border px-4 py-3',
            tone === 'dark' ? 'border-cream-100/15 bg-cream-100/5' : 'border-line bg-cream-200/50',
          )}
        >
          <p className={cx('mb-1 text-[12px] uppercase tracking-wide', muted)}>
            Prompt{d.model ? ` · ${d.model}` : ''}
          </p>
          <p className={cx('whitespace-pre-wrap font-mono text-[13px] leading-relaxed', body)}>{d.prompt}</p>
          {d.negativePrompt && (
            <>
              <p className={cx('mb-1 mt-3 text-[12px] uppercase tracking-wide', muted)}>Negativ</p>
              <p className={cx('whitespace-pre-wrap font-mono text-[13px] leading-relaxed', muted)}>
                {d.negativePrompt}
              </p>
            </>
          )}
        </div>
      );

    case 'divider':
      return <hr className={cx('mt-8', tone === 'dark' ? 'border-cream-100/15' : 'border-line')} />;

    case 'spacer':
      return <div style={{ height: d.size === 'lg' ? 80 : d.size === 'sm' ? 20 : 44 }} />;

    default:
      return null;
  }
}

/** Alle Blöcke eines Eintrags am Stück. */
export function BlockList({ blocks, tone }: { blocks: Block[]; tone?: 'light' | 'dark' }) {
  return (
    <>
      {blocks.map((b) => (
        <BlockView key={b.id} block={b} tone={tone} />
      ))}
    </>
  );
}
