/**
 * Formularbausteine.
 *
 * Alle Bedienelemente sind mindestens 44 px hoch (Touch), Textfelder wachsen
 * automatisch mit dem Inhalt, damit auf dem iPhone nichts abgeschnitten wird.
 */

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Check, Plus, X } from 'lucide-react';
import { cx } from '../../lib/utils';

/* ------------------------------------------------------------------- Rahmen */

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="label-base">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-[13px] text-ink-faint">{hint}</span>}
      {error && <span className="mt-1 block text-[13px] text-red-700">{error}</span>}
    </label>
  );
}

/* ------------------------------------------------------------------- Inputs */

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...props }, ref) {
    return <input ref={ref} className={cx('input-base', className)} {...props} />;
  },
);

export const SelectInput = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function SelectInput({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cx('input-base appearance-none pr-8', className)} {...props}>
        {children}
      </select>
    );
  },
);

/** Textarea, die mit dem Inhalt mitwächst – kein Scrollen in kleinen Kästen. */
type AutoTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number };

export const AutoTextarea = forwardRef<HTMLTextAreaElement, AutoTextareaProps>(function AutoTextarea(
  { className, value, onChange, minRows = 3, ...props },
  ref,
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  const resize = () => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  };

  useEffect(resize, [value]);

  return (
    <textarea
      ref={(node) => {
        innerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      rows={minRows}
      value={value}
      onChange={(e) => {
        onChange?.(e);
        resize();
      }}
      className={cx('input-base resize-none leading-relaxed', className)}
      {...props}
    />
  );
});

/* ------------------------------------------------------------------ Schalter */

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="touch-target flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-cream-50 px-3 py-2 text-left transition-colors hover:bg-cream-200 no-tap-highlight"
    >
      <span className="min-w-0">
        <span className="block text-[15px] text-ink">{label}</span>
        {description && <span className="block text-[13px] text-ink-muted">{description}</span>}
      </span>
      <span
        className={cx(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ease-calm',
          checked ? 'bg-brass-500' : 'bg-lineStrong',
        )}
      >
        <span
          className={cx(
            'absolute top-1 h-5 w-5 rounded-full bg-cream-50 shadow transition-all duration-200 ease-calm',
            checked ? 'left-6' : 'left-1',
          )}
        />
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------- Schlagworte */

export function TagInput({
  value,
  onChange,
  placeholder = 'Schlagwort hinzufügen',
  suggestions = [],
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    if (value.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...value, tag]);
    setDraft('');
  };

  const open = suggestions.filter(
    (s) => draft && s.toLowerCase().includes(draft.toLowerCase()) && !value.includes(s),
  );

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <span key={tag} className="chip pr-1">
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="grid h-7 w-7 place-items-center rounded-full text-ink-faint transition-colors hover:bg-cream-300 hover:text-ink"
              aria-label={`${tag} entfernen`}
            >
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="input-base"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(draft);
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => add(draft)}
        />
        <button
          type="button"
          className="btn-ghost px-3"
          onClick={() => add(draft)}
          aria-label="Schlagwort übernehmen"
        >
          <Plus size={18} />
        </button>
      </div>
      {open.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {open.slice(0, 8).map((s) => (
            <button key={s} type="button" className="chip hover:bg-cream-200" onClick={() => add(s)}>
              <Plus size={12} /> {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- Mehrfachauswahl */

export function ChipSelect<T extends string>({
  options,
  value,
  onChange,
  multiple = true,
}: {
  options: readonly T[];
  value: T[];
  onChange: (v: T[]) => void;
  multiple?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => {
              if (!multiple) {
                onChange(active ? [] : [opt]);
                return;
              }
              onChange(active ? value.filter((v) => v !== opt) : [...value, opt]);
            }}
            className={cx(
              'inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3 text-[14px] transition-all duration-200 ease-calm no-tap-highlight',
              active
                ? 'border-brass-500 bg-brass-500/10 text-ink'
                : 'border-line bg-cream-50 text-ink-muted hover:bg-cream-200',
            )}
          >
            {active && <Check size={14} className="text-brass-600" />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}
