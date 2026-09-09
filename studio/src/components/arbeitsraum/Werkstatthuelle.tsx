/**
 * Die Werkstatt – die Hülle für ein Rollenspielbuch.
 *
 * Der einzige Raum, in dem Werkzeuge von selbst offen liegen dürfen. Wer eine
 * Runde vorbereitet, sucht nicht nach Stimmung, sondern nach einer Karte, einer
 * Figur und einer Begegnung – und er sucht sie **jetzt**, oft mit dem Tisch
 * voller Menschen daneben. Hier ist Suchen teurer als Sehen.
 *
 * Vier Orte, wie der Auftrag sie nennt: Kampagne, Welt, Bewohner, Werkstatt.
 * Sie stehen nebeneinander und nicht hinter einer Falte – das ist genau der
 * Unterschied zum Schreibraum, und er ist Absicht, keine Nachlässigkeit.
 *
 * **Und trotzdem kein Verwaltungsprogramm.** Der Auftrag verlangt beides:
 * mehr Werkzeug *und* weiter Dragoncore. Deshalb ist die Werkstatt kein
 * Armaturenbrett: kein Raster aus Kacheln, keine Zählwerke, keine
 * Fortschrittsbalken. Es bleibt der Tisch, das Papier und die Schrift des
 * Buches; was sich ändert, ist, wie viel gleichzeitig erreichbar ist.
 */

import { Outlet } from 'react-router-dom';
import { useStudio } from '../../store/useStudio';
import { deskStyle } from '../../lib/textures';
import { Raumzeile, type Ort } from './Raumzeile';

/**
 * Die vier Orte einer Runde.
 *
 * Sie stehen in der Reihenfolge, in der man sie beim Vorbereiten braucht:
 * erst was gespielt wird, dann wo, dann wer, und zuletzt die Bank, an der man
 * baut, was noch fehlt.
 */
const ORTE: Ort[] = [
  {
    ziel: '/tisch',
    name: 'Kampagne',
    gehoert: (p) => p === '/tisch' || p.startsWith('/kapitel/geschichten'),
  },
  {
    ziel: '/weltkarte',
    name: 'Welt',
    gehoert: (p) =>
      p.startsWith('/weltkarte') ||
      p.startsWith('/karte') ||
      p.startsWith('/kapitel/architektur') ||
      p.startsWith('/kapitel/natur'),
  },
  {
    ziel: '/kapitel/bewohner',
    name: 'Bewohner',
    gehoert: (p) =>
      p.startsWith('/kapitel/bewohner') ||
      p.startsWith('/kapitel/tiere') ||
      p.startsWith('/figur') ||
      p.startsWith('/eintrag'),
  },
  {
    ziel: '/anhang',
    name: 'Werkstatt',
    gehoert: (p) =>
      p.startsWith('/anhang') ||
      p.startsWith('/baukasten') ||
      p.startsWith('/setzerei') ||
      p.startsWith('/werkbank'),
  },
];

export function Werkstatthuelle() {
  const titel = useStudio((s) => s.settings.book?.title?.trim() || 'Mein Buch');

  return (
    <div className="flex h-full w-full flex-col overflow-hidden" style={deskStyle}>
      <Raumzeile titel={titel} orte={ORTE} />

      {/*
        Breiter als der Schreibraum.

        Ein Manuskript hat eine Zeilenlänge, an der man nicht rütteln sollte –
        52 Zeichen lesen sich besser als 90. Eine Karte, ein Charakterbogen
        und eine Begegnungsliste haben das nicht; ihnen nimmt eine schmale
        Spalte nur Platz weg.
      */}
      <main className="scroll-slim min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 pb-2 sm:px-5 sm:pb-5">
        <div className="relative mx-auto flex min-h-full w-full max-w-[72rem] flex-col">
          <span aria-hidden className="paper-sheet absolute inset-0 z-0 block rounded-[3px]" />
          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
