/**
 * Kreative Ziele.
 *
 * Kein Aufgabenverwalter – nur ein leiser Hinweis darauf, worauf man
 * hinarbeitet. Ziele mit Eintragstyp zählen sich selbst mit; alles andere
 * hakt man ab, wenn es soweit ist.
 */

import { useMemo, useState } from 'react';
import { Check, Plus, Target, X } from 'lucide-react';
import { useStudio, livingEntries } from '../../store/useStudio';
import { Modal } from '../ui/Modal';
import { Field, SelectInput, TextInput } from '../ui/Fields';
import { allTemplates, templateFor } from '../../lib/templates';
import { cx } from '../../lib/utils';

export function GoalPanel() {
  const settings = useStudio((s) => s.settings);
  const entries = useStudio((s) => s.entries);
  const addGoal = useStudio((s) => s.addGoal);
  const updateGoal = useStudio((s) => s.updateGoal);
  const removeGoal = useStudio((s) => s.removeGoal);

  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [type, setType] = useState('');
  const [target, setTarget] = useState('10');

  const living = useMemo(() => livingEntries(entries), [entries]);
  const goals = settings.goals ?? [];

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    living.forEach((e) => map.set(e.type, (map.get(e.type) ?? 0) + 1));
    return map;
  }, [living]);

  const save = () => {
    if (!text.trim()) return;
    addGoal({
      text: text.trim(),
      entryType: type || undefined,
      target: Math.max(1, Number(target) || 1),
      done: false,
    });
    setText('');
    setType('');
    setTarget('10');
    setOpen(false);
  };

  return (
    <div className="card flex flex-col p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-serif text-xl text-ink">
          <Target size={18} className="text-brass-600" /> Ziele
        </h2>
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-cream-200 hover:text-ink"
          onClick={() => setOpen(true)}
          aria-label="Ziel hinzufügen"
        >
          <Plus size={17} />
        </button>
      </div>

      {goals.length === 0 ? (
        <p className="flex-1 text-[15px] leading-relaxed text-ink-muted">
          Noch kein Ziel gesetzt. Zum Beispiel: „Zehn Kreaturen, die alle im selben Biom leben.“
        </p>
      ) : (
        <ul className="flex-1 space-y-2.5">
          {goals.map((goal) => {
            const current = goal.entryType ? (counts.get(goal.entryType) ?? 0) : goal.done ? 1 : 0;
            const max = goal.entryType ? goal.target : 1;
            const percent = Math.min(100, Math.round((current / max) * 100));
            const reached = percent >= 100;
            return (
              <li key={goal.id}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => !goal.entryType && updateGoal(goal.id, { done: !goal.done })}
                    className={cx(
                      'grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors',
                      reached ? 'border-brass-500 bg-brass-500 text-cream-50' : 'border-lineStrong',
                      goal.entryType && 'cursor-default',
                    )}
                    aria-label={reached ? 'Erreicht' : 'Als erreicht markieren'}
                  >
                    {reached && <Check size={13} />}
                  </button>
                  <span className={cx('min-w-0 flex-1 text-[15px]', reached ? 'text-ink-faint' : 'text-ink')}>
                    {goal.text}
                  </span>
                  {goal.entryType && (
                    <span className="shrink-0 text-[13px] text-ink-faint">
                      {current}/{goal.target}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeGoal(goal.id)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-cream-200 hover:text-red-700"
                    aria-label="Ziel entfernen"
                  >
                    <X size={14} />
                  </button>
                </div>
                {goal.entryType && (
                  <div className="ml-8 mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream-300">
                    <div
                      className="h-full rounded-full bg-brass-500 transition-[width] duration-700 ease-calm"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Ziel setzen"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Abbrechen
            </button>
            <button type="button" className="btn-accent" onClick={save} disabled={!text.trim()}>
              Ziel setzen
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Was möchtest du erreichen?">
            <TextInput
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="z. B. Zehn Kreaturen für den Nebelwald"
              autoFocus
            />
          </Field>

          <Field label="Zählt sich selbst mit" hint="Optional – dann verfolgt das Ziel deinen Fortschritt.">
            <SelectInput value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">– einfach abhaken –</option>
              {allTemplates().map((t) => (
                <option key={t.type} value={t.type}>
                  {t.labelPlural}
                </option>
              ))}
            </SelectInput>
          </Field>

          {type && (
            <Field label={`Wie viele ${templateFor(type).labelPlural}?`}>
              <TextInput
                type="number"
                inputMode="numeric"
                min={1}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </Field>
          )}
        </div>
      </Modal>
    </div>
  );
}
