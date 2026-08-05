/**
 * Die Asset-Pipeline als Tafel.
 *
 * Eine Spalte je Stufe. Was in „Idee“ liegt, ist kein Rückstand – aber wenn
 * eine Spalte sich staut, sieht man es hier sofort, ohne eine Liste lesen zu
 * müssen.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Package, Plus } from 'lucide-react';
import { useStudio, livingEntries } from '../store/useStudio';
import { PIPELINE_STAGES, stageIndex } from '../lib/pipeline';
import { EmptyState } from '../components/ui/EmptyState';
import { Thumb } from '../components/images/Thumb';
import { StatusPill } from '../components/entry/StatusPill';
import { asText } from '../lib/templates';
import { cx } from '../lib/utils';
import type { Entry } from '../types';

export function PipelinePage() {
  const entries = useStudio((s) => s.entries);
  const updateEntry = useStudio((s) => s.updateEntry);
  const createEntry = useStudio((s) => s.createEntry);
  const navigate = useNavigate();
  const [compact, setCompact] = useState(false);

  const assets = useMemo(
    () => livingEntries(entries).filter((e) => e.type === 'asset'),
    [entries],
  );

  const columns = useMemo(
    () =>
      PIPELINE_STAGES.map((stage) => ({
        stage,
        items: assets
          .filter((a) => (a.pipelineStage ?? 'idea') === stage.id)
          .sort((a, b) => b.updatedAt - a.updatedAt),
      })),
    [assets],
  );

  const done = assets.filter((a) => (a.pipelineStage ?? 'idea') === 'exported').length;

  if (assets.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Noch keine Assets"
        message="Sobald du Assets anlegst, zeigt diese Tafel, wo jedes einzelne gerade steht – von der Idee bis zum Export."
        action={
          <button
            type="button"
            className="btn-accent"
            onClick={async () => {
              const entry = await createEntry('asset');
              navigate(`/eintrag/${entry.id}`);
            }}
          >
            <Plus size={18} /> Erstes Asset
          </button>
        }
      />
    );
  }

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[30px] leading-tight text-ink sm:text-[34px]">Pipeline</h1>
          <p className="mt-1 text-[15px] text-ink-muted">
            {assets.length} Assets · {done} ausgeliefert
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost h-10 min-h-0 px-3 text-[14px]"
          onClick={() => setCompact((v) => !v)}
        >
          {compact ? 'Mit Bildern' : 'Kompakt'}
        </button>
      </header>

      {/* Fortschritt über alles */}
      <div className="mb-5 flex h-2.5 overflow-hidden rounded-full">
        {columns.map(({ stage, items }) =>
          items.length ? (
            <div
              key={stage.id}
              className="h-full transition-[flex-grow] duration-500 ease-calm"
              style={{ background: stage.color, flexGrow: items.length }}
              title={`${stage.label}: ${items.length}`}
            />
          ) : null,
        )}
      </div>

      <div className="scroll-slim -mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
        {columns.map(({ stage, items }) => (
          <section
            key={stage.id}
            className="flex w-[268px] shrink-0 flex-col rounded-2xl border border-line bg-cream-50/70"
          >
            <header className="flex items-center gap-2 border-b border-line px-3 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: stage.color }} />
              <h2 className="flex-1 text-[15px] font-medium text-ink">{stage.label}</h2>
              <span className="text-[13px] text-ink-faint">{items.length}</span>
            </header>

            <div className="flex-1 space-y-2 p-2">
              {items.length === 0 ? (
                <p className="px-2 py-6 text-center text-[13px] text-ink-faint">leer</p>
              ) : (
                items.map((asset) => (
                  <PipelineCard
                    key={asset.id}
                    asset={asset}
                    compact={compact}
                    onMove={(delta) => {
                      const next = PIPELINE_STAGES[stageIndex(asset.pipelineStage) + delta];
                      if (next) updateEntry(asset.id, { pipelineStage: next.id });
                    }}
                    canBack={stageIndex(asset.pipelineStage) > 0}
                    canForward={stageIndex(asset.pipelineStage) < PIPELINE_STAGES.length - 1}
                  />
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function PipelineCard({
  asset,
  compact,
  onMove,
  canBack,
  canForward,
}: {
  asset: Entry;
  compact: boolean;
  onMove: (delta: number) => void;
  canBack: boolean;
  canForward: boolean;
}) {
  const assetId = asText(asset.fields.assetId);

  return (
    <article className="overflow-hidden rounded-xl border border-line bg-cream-50 shadow-card transition-shadow duration-200 ease-calm hover:shadow-lift">
      {!compact && (
        <Link to={`/eintrag/${asset.id}`}>
          <Thumb imageId={asset.coverImage} alt="" className="aspect-[4/3] w-full" rounded="rounded-none" />
        </Link>
      )}
      <div className="p-2.5">
        <Link to={`/eintrag/${asset.id}`} className="block">
          <p className="truncate text-[15px] leading-snug text-ink hover:text-brass-600">{asset.title}</p>
          {assetId && (
            <p className="truncate font-mono text-[11px] uppercase text-ink-faint">{assetId}</p>
          )}
        </Link>
        <div className="mt-2 flex items-center gap-1">
          <StatusPill status={asset.status} />
          <div className="ml-auto flex">
            <button
              type="button"
              onClick={() => onMove(-1)}
              disabled={!canBack}
              className={cx(
                'grid h-9 w-8 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-cream-200 hover:text-ink',
                !canBack && 'opacity-25',
              )}
              aria-label="Eine Stufe zurück"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              disabled={!canForward}
              className={cx(
                'grid h-9 w-8 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-cream-200 hover:text-ink',
                !canForward && 'opacity-25',
              )}
              aria-label="Eine Stufe weiter"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
