/**
 * Der Zeitgeber hinter der zurücktretenden Oberfläche.
 *
 * Die Entscheidung selbst steht in `lib/raum/flaeche.ts` und ist eine reine
 * Funktion. Hier steht nur, was sie nicht wissen kann: wann zuletzt jemand
 * etwas getan hat, und wann als Nächstes nachzusehen ist.
 *
 * ---
 *
 * **Warum ein Zeitgeber und keine Schleife.**
 *
 * Eine Bildschleife, die sechzigmal je Sekunde fragt „ist es schon still",
 * hielte das Gerät wach, um festzustellen, dass nichts passiert. Stattdessen
 * ein einziger Zeitgeber, der genau dann losgeht, wenn die Ruhe fällig wäre –
 * und der bei jeder Berührung neu gestellt wird.
 *
 * **Warum die Ereignisse am Fenster hängen und nicht an der Hülle.**
 *
 * Weil Tastendrücke, Rollen und Berührungen überall stattfinden, auch in
 * Blättern und Feldern, die über der Hülle liegen. Ein Zuhörer an der Hülle
 * verpasste genau die Eingaben, bei denen jemand am konzentriertesten
 * arbeitet – und die Oberfläche verschwände beim Tippen.
 */

import { useEffect, useState } from 'react';
import { beiKonfig, konfig } from '../../lib/raum/konfig';
import { flaechenzustand, type Flaechenzustand } from '../../lib/raum/flaeche';
import { useRaum } from '../../lib/raum/useRaum';

export function useOberflaeche(): Flaechenzustand {
  const tiefe = useRaum((s) => s.tiefe);
  const phase = useRaum((s) => s.phase);
  const [zustand, setZustand] = useState<Flaechenzustand>('arbeit');

  useEffect(() => {
    let zuletzt = performance.now();
    let beruehrt = false;
    let uhr: ReturnType<typeof setTimeout> | null = null;

    const pruefe = () => {
      const k = konfig();
      const s = useRaum.getState();
      const neu = flaechenzustand(
        { tiefe: s.tiefe, phase: s.phase, beruehrt, seitMs: performance.now() - zuletzt },
        k,
      );
      setZustand(neu);

      /*
       * Nur dann wieder aufwachen, wenn es überhaupt etwas zu entscheiden
       * gibt. Steht die Oberfläche schon still oder liegt ein Finger auf,
       * ändert Warten nichts – dann läuft kein Zeitgeber.
       */
      if (uhr) clearTimeout(uhr);
      uhr = null;
      if (neu !== 'ruhe' && !beruehrt && s.phase === 'ruhe' && s.tiefe === 0) {
        const rest = Math.max(50, k.flaeche.ruheNachMs - (performance.now() - zuletzt));
        uhr = setTimeout(pruefe, rest);
      }
    };

    const regt = () => {
      zuletzt = performance.now();
      pruefe();
    };
    const anfassen = () => {
      beruehrt = true;
      regt();
    };
    const loslassen = () => {
      beruehrt = false;
      regt();
    };

    window.addEventListener('pointerdown', anfassen, { passive: true });
    window.addEventListener('pointerup', loslassen, { passive: true });
    window.addEventListener('pointercancel', loslassen, { passive: true });
    window.addEventListener('pointermove', regt, { passive: true });
    window.addEventListener('keydown', regt);
    window.addEventListener('scroll', regt, { passive: true, capture: true });
    const ab = beiKonfig(pruefe);

    pruefe();
    return () => {
      if (uhr) clearTimeout(uhr);
      window.removeEventListener('pointerdown', anfassen);
      window.removeEventListener('pointerup', loslassen);
      window.removeEventListener('pointercancel', loslassen);
      window.removeEventListener('pointermove', regt);
      window.removeEventListener('keydown', regt);
      window.removeEventListener('scroll', regt, { capture: true } as EventListenerOptions);
      ab();
    };
  }, []);

  /*
   * Tiefe und Phase kommen aus React und der Rest aus Ereignissen – also muss
   * eine Änderung von außen ebenfalls neu entscheiden lassen. Ohne diese
   * Zeilen bliebe die Oberfläche nach einer Heimkehr im Tiefenzustand stehen,
   * bis jemand den Bildschirm berührt.
   */
  useEffect(() => {
    const k = konfig();
    setZustand((alt) =>
      flaechenzustand({ tiefe, phase, beruehrt: false, seitMs: alt === 'ruhe' ? k.flaeche.ruheNachMs : 0 }, k),
    );
  }, [tiefe, phase]);

  return zustand;
}
