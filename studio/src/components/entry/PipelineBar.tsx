/**
 * Die Produktionsstufe eines Assets.
 *
 * Kein Formular, sondern ein Weg: man sieht auf einen Blick, wie weit es ist
 * und was die nächste Stufe bedeutet. Der Vorschlag rechts kommt aus den
 * vorhandenen Daten – entschieden wird trotzdem per Hand.
 */

import { useMemo } from 'react';
import { Check, Sparkle } from 'lucide-react';
import type { Entry } from '../../types';
import { PIPELINE_STAGES, stageById, stageIndex, suggestStage } from '../../lib/pipeline';
import { useStudio } from '../../store/useStudio';
import { cx } from '../../lib/utils';

export function PipelineBar({ entry }: { entry: Entry }) {
  const updateEntry = useStudio((s) => s.updateEntry);
  const relIndex = useStudio((s) => s.relIndex);
  const entries = useStudio((s) => s.entries);

  const hasPromptRelation = useMemo(() => {
    const ids = relIndex.neighbours.get(entry.id);
    if (!ids) return false;
    for (const id of ids) {
      if (entries.find((e) => e.id === id)?.type === 'prompt') return true;
    }
    return false;
  }, [relIndex, entry.id, entries]);

  const current = entry.pipelineStage ?? 'idea';
  const currentIndex = stageIndex(current);
  const suggested = suggestStage(entry, hasPromptRelation);
  const showSuggestion = stageIndex(suggested) > currentIndex;

  return (
    <section className="card mb-5 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-xl text-ink">Produktion</h2>
        <p className="text-[13px] text-ink-muted">{stageById(current).requirement}</p>
      </div>

      {/* Der Weg */}
      <div className="scroll-slim -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {PIPELINE_STAGES.map((stage, i) => {
          const reached = i <= currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => updateEntry(entry.id, { pipelineStage: stage.id })}
              className={cx(
                'group relative flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[13px] transition-all duration-200 ease-calm',
                isCurrent ? 'text-paper-50' : reached ? 'text-ink' : 'border-line bg-cream-50 text-ink-faint hover:bg-cream-200',
              )}
              style={
                isCurrent
                  ? { background: stage.color, borderColor: stage.color }
                  : reached
                    ? { background: `${stage.color}22`, borderColor: `${stage.color}66` }
                    : undefined
              }
              title={stage.requirement}
            >
              {reached && !isCurrent && <Check size={13} />}
              {stage.label}
            </button>
          );
        })}
      </div>

      {showSuggestion && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-brass-500/35 bg-brass-500/10 px-3 py-2">
          <Sparkle size={15} className="shrink-0 text-brass-600" />
          <p className="flex-1 text-[14px] text-ink">
            Nach den vorhandenen Daten ist dieses Asset schon bei{' '}
            <strong>{stageById(suggested).label}</strong>.
          </p>
          <button
            type="button"
            className="btn-accent h-9 min-h-0 px-3 text-[13px]"
            onClick={() => updateEntry(entry.id, { pipelineStage: suggested })}
          >
            Übernehmen
          </button>
        </div>
      )}
    </section>
  );
}
