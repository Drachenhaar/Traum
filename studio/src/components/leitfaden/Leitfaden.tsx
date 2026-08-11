/**
 * Der Leitfaden – ein Wegweiser nach dem anderen.
 *
 * Hängt in der Buchhülle und entscheidet nur eines: welcher Hinweis jetzt
 * dran ist. Alles Weitere steht in `lib/leitfaden.ts` (was gezeigt wird) und
 * im `Wegweiser` (wie es aussieht).
 *
 * Was er bewusst nicht tut: den Bildschirm sperren, zum Weiterklicken
 * zwingen, oder von vorn beginnen, wenn man ihn einmal weggeklickt hat.
 */

import { useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useStudio } from '../../store/useStudio';
import { LEITFADEN_START, naechsterWegpunkt } from '../../lib/leitfaden';
import { Wegweiser } from './Wegweiser';

export function Leitfaden() {
  const settings = useStudio((s) => s.settings);
  const updateSettings = useStudio((s) => s.updateSettings);
  const { pathname } = useLocation();

  /*
   * Ob ein Ziel hier steht, weiss nur das Dokument. Der Zähler zwingt die
   * Frage nach jedem Seitenwechsel neu – sonst bliebe die Antwort von der
   * vorigen Seite stehen.
   */
  const [runde, setRunde] = useState(0);
  const vorhanden = useCallback(
    (ziel: string) => {
      void runde;
      const el = document.querySelector<HTMLElement>(`[data-leitfaden="${ziel}"]`);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    },
    [runde],
  );

  /* Nach jedem Seitenwechsel einmal neu fragen, wenn die Seite steht. */
  useState(() => 0);
  const [letzterPfad, setLetzterPfad] = useState(pathname);
  if (letzterPfad !== pathname) {
    setLetzterPfad(pathname);
    window.setTimeout(() => setRunde((r) => r + 1), 500);
  }

  const stand = settings.leitfaden ?? LEITFADEN_START;
  const punkt = naechsterWegpunkt(stand, pathname, vorhanden);
  if (!punkt) return null;

  return (
    <Wegweiser
      ziel={punkt.ziel}
      text={punkt.text}
      onVerstanden={() =>
        updateSettings({
          leitfaden: { ...stand, erledigt: [...stand.erledigt, punkt.id] },
        })
      }
      onGenug={() => updateSettings({ leitfaden: { ...stand, an: false } })}
    />
  );
}
