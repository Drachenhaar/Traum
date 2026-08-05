/**
 * Bestätigungsdialog mit imperativer API.
 *
 *   const ok = await confirm({ title: 'Wirklich löschen?', danger: true });
 *
 * `<ConfirmHost />` wird einmal in der App eingehängt.
 */

import { useEffect, useState } from 'react';
import { Modal } from './Modal';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type Listener = (state: { options: ConfirmOptions; resolve: (v: boolean) => void } | null) => void;

let listener: Listener | null = null;

export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!listener) {
      // Ohne Host lieber nichts Unwiderrufliches tun.
      resolve(false);
      return;
    }
    listener({ options, resolve });
  });
}

export function ConfirmHost() {
  const [state, setState] = useState<{ options: ConfirmOptions; resolve: (v: boolean) => void } | null>(
    null,
  );

  useEffect(() => {
    listener = setState;
    return () => {
      listener = null;
    };
  }, []);

  const close = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  if (!state) return null;
  const { options } = state;

  return (
    <Modal
      open
      onClose={() => close(false)}
      title={options.title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={() => close(false)}>
            {options.cancelLabel ?? 'Abbrechen'}
          </button>
          <button
            type="button"
            className={options.danger ? 'btn-danger' : 'btn-primary'}
            onClick={() => close(true)}
            autoFocus
          >
            {options.confirmLabel ?? 'Bestätigen'}
          </button>
        </>
      }
    >
      <p className="text-[15px] leading-relaxed text-ink-muted">
        {options.message ?? 'Diese Aktion lässt sich nicht rückgängig machen.'}
      </p>
    </Modal>
  );
}
