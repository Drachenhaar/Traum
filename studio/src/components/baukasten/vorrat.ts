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
import { heileTeil, type Teil } from '../../lib/baukasten';

/**
 * Die eingebauten Teile – einmal berechnet, für die ganze Laufzeit.
 *
 * Sie hängen von nichts ab, was sich ändern kann. Sie bei jedem Zeichnen neu
 * zu bauen hiesse, jedem Bildnis in jeder Liste eine neue Kennung zu geben,
 * an der React seine Vergleiche ausrichtet.
 *
 * ---
 *
 * **Ein Teil, mehrere Ansichten – schon hier.**
 *
 * „Kopf, rund" ist nicht die Vorderansicht eines Kopfes und „Kopf, im Profil"
 * seine Seitenansicht: Es ist **ein** Teil mit zwei Zeichnungen. Wer die
 * Ansicht wechselt, behält seinen Kopf und bekommt ihn von der Seite zu sehen.
 * Wären es zwei Teile, müsste man bei jedem Wechsel neu wählen, und dieselbe
 * Figur wäre in zwei Ansichten zwei Figuren.
 *
 * `rechts` steht nirgends: Die Seitenformen sind nach links gezeichnet, und
 * die Spiegelregel in `lib/baukasten.ts` liefert die Gegenseite umsonst.
 *
 * Die drei Kopfformen teilen sich dasselbe Profil. Das ist eine Abkürzung und
 * hier auch als solche gemeint – drei Silhouetten, die sich seitlich kaum
 * unterscheiden würden, wären drei Zeichnungen für nichts. Sobald jemand
 * eigene Köpfe zeichnet, ist die Frage ohnehin erledigt.
 */
const EINGEBAUT: Teil[] = [
  {
    id: 'grundform:kopf-rund',
    schicht: 'kopf',
    name: 'Kopf, rund',
    ansichten: {
      vorn: { art: 'grundform', form: 'kopf-rund' },
      links: { art: 'grundform', form: 'kopf-profil' },
    },
    toenbar: true,
  },
  {
    id: 'grundform:kopf-schmal',
    schicht: 'kopf',
    name: 'Kopf, schmal',
    ansichten: {
      vorn: { art: 'grundform', form: 'kopf-schmal' },
      links: { art: 'grundform', form: 'kopf-profil' },
    },
    toenbar: true,
  },
  {
    id: 'grundform:kopf-kantig',
    schicht: 'kopf',
    name: 'Kopf, kantig',
    ansichten: {
      vorn: { art: 'grundform', form: 'kopf-kantig' },
      links: { art: 'grundform', form: 'kopf-profil' },
    },
    toenbar: true,
  },
  {
    id: 'grundform:schultern',
    schicht: 'koerper',
    name: 'Schultern',
    ansichten: {
      vorn: { art: 'grundform', form: 'schultern' },
      links: { art: 'grundform', form: 'schultern-seite' },
    },
    toenbar: true,
  },
  {
    /*
     * Die Scheibe gilt in jeder Ansicht – ein Kreis sieht von der Seite
     * genauso aus. Sie steht dreimal da, statt eine Regel „gilt überall" zu
     * erfinden: Eine Angabe, die man lesen kann, ist besser als eine
     * Ausnahme, die man kennen muss.
     */
    id: 'grundform:scheibe',
    schicht: 'grund',
    name: 'Scheibe',
    ansichten: {
      vorn: { art: 'grundform', form: 'scheibe' },
      links: { art: 'grundform', form: 'scheibe' },
      rechts: { art: 'grundform', form: 'scheibe' },
    },
    toenbar: true,
  },
];

/**
 * Alles, woraus sich hier und jetzt ein Bildnis bauen lässt.
 *
 * Die eigenen Teile kommen **geheilt** herein. Das ist zugleich die Wanderung
 * von der ersten Fassung, in der ein Teil eine einzige Zeichnung trug: Sie
 * geschieht beim Lesen und braucht deshalb keine Datenbankfassung, die auf
 * eingelesene Sicherungen ohnehin nicht wirken würde. Siehe `heileTeil`.
 */
export function useVorrat(): Teil[] {
  const teile = useStudio((s) => s.teile);
  return useMemo(
    () => [
      ...teile.map((t) => heileTeil(t)).filter((t): t is Teil => t !== null),
      ...EINGEBAUT,
    ],
    [teile],
  );
}
