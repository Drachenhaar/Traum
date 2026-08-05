/** Leerer Zustand – immer mit klarer Handlungsaufforderung. */

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-lineStrong bg-cream-50/60 px-6 py-14 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-cream-200 text-brass-600">
        <Icon size={26} strokeWidth={1.5} />
      </span>
      <h3 className="font-serif text-xl text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[15px] leading-relaxed text-ink-muted">{message}</p>
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
