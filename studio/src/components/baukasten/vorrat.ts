/**
 * Der Vorrat: alles, woraus sich ein Bildnis bauen lässt.
 *
 * Eigene Datei, weil ihn **zwei** Stellen brauchen und beide dieselbe Antwort
 * bekommen müssen: der Baukasten, der ein Bildnis baut, und das Bildnis auf
 * der Figurenseite, das es zeigt. Stünde die Zusammenstellung nur im
 * Baukasten, sähe eine mit Grundformen gebaute Figur dort richtig aus und auf
 * ihrer eigenen Seite nach nichts – der Vorrat wäre ein anderer, und die
 * Verweise zeigten ins Leere.
 *
 * Die eingebauten Grundformen stehen **hinter** den eigenen Zeichnungen:
 * Sobald es eigene gibt, stehen sie in der Auswahl oben.
 */

import { useMemo } from 'react';
import { useStudio } from '../../store/useStudio';
import type { SchichtName, Teil } from '../../lib/baukasten';
import { GRUNDFORMEN } from './Grundformen';

/**
 * In welche Schicht eine Grundform gehört.
 *
 * Steht hier und nicht bei der Form selbst: Die Formen sind Zeichnungen, die
 * Schicht ist ihre Verwendung. Dieselbe Scheibe kann eines Tages auch etwas
 * anderes sein.
 */
const SCHICHT_DER_GRUNDFORM: Record<string, SchichtName> = {
  'kopf-rund': 'kopf',
  'kopf-schmal': 'kopf',
  'kopf-kantig': 'kopf',
  schultern: 'koerper',
  scheibe: 'grund',
};

/**
 * Die eingebauten Teile – einmal berechnet, für die ganze Laufzeit.
 *
 * Sie hängen von nichts ab, was sich ändern kann. Sie bei jedem Zeichnen neu
 * zu bauen hiesse, jedem Bildnis in jeder Liste eine neue Kennung zu geben,
 * an der React seine Vergleiche ausrichtet.
 */
const EINGEBAUT: Teil[] = GRUNDFORMEN.map((g) => ({
  id: `grundform:${g.form}`,
  schicht: SCHICHT_DER_GRUNDFORM[g.form] ?? 'beiwerk',
  name: g.name,
  quelle: { art: 'grundform', form: g.form },
  toenbar: true,
}));

/** Alles, woraus sich hier und jetzt ein Bildnis bauen lässt. */
export function useVorrat(): Teil[] {
  const teile = useStudio((s) => s.teile);
  return useMemo(
    () => [
      ...teile.map((t) => ({
        id: t.id,
        schicht: t.schicht,
        name: t.name,
        quelle: t.quelle,
        toenbar: t.toenbar,
        bedeutung: t.bedeutung,
      })),
      ...EINGEBAUT,
    ],
    [teile],
  );
}
