/**
 * Der Schreibraum – die Hülle für einen Roman.
 *
 * „Wenn ich schreibe, schreibe ich." Der Auftrag verlangt für den Roman
 * radikale Einfachheit, und radikal heisst hier: **Was nicht dem Schreiben
 * dient, ist nicht da** – nicht kleiner, nicht ausgegraut, nicht hinter einer
 * Falte. Nicht da.
 *
 * Drei Dinge unterscheiden diese Hülle vom Buchkörper, und alle drei sind
 * Weglassungen:
 *
 * **Kein Blättern.** Der Buchkörper hat zwei Pfeile am Rand, eine
 * Seitenzahl und eine Blätterbewegung. Ein Manuskript hat das nicht: Man
 * scrollt, und man ist an einer Stelle im Text, nicht auf einer Seite im
 * Buch. Wer schreibt, will nicht wissen, dass er auf Seite 43 ist.
 *
 * **Keine Kapitelzeile mit Lesebändchen.** Sie beantwortet „wo im Buch bin
 * ich" – eine Leserfrage. Hier steht stattdessen, woran man arbeitet.
 *
 * **Zwei Orte, nicht zwölf.** Manuskript und Welt. Alles andere gibt es
 * weiterhin und ist über die Welt erreichbar; es steht nur nicht im Weg.
 *
 * Was **bleibt**: das Papier. Die Seiten dahinter sind dieselben und sehen
 * gleich aus – ein Roman wird auf demselben Papier geschrieben, auf dem das
 * Artbook gesetzt wird. Der Unterschied ist der Raum, nicht der Bogen.
 */

import { Outlet, useLocation } from 'react-router-dom';
import { useStudio } from '../../store/useStudio';
import { useRaum } from '../../lib/raum/useRaum';
import { Raumschicht } from '../raum/Raumschicht';
import { Tiefenraum } from '../raum/Tiefenraum';
import { deskStyle } from '../../lib/textures';
import { Raumzeile, type Ort } from './Raumzeile';

/**
 * Die zwei Orte eines Romans.
 *
 * `Manuskript` fasst alles, was Text ist – das Regal der Kapitel und der
 * Schreibraum selbst. `Welt` fasst alles, was der Text hervorbringt: Figuren,
 * Orte, Dinge. Die Trennung ist die des Auftrags: vorn wird geschrieben,
 * hinten wächst die Welt daraus.
 */
const ORTE: Ort[] = [
  {
    ziel: '/roman',
    name: 'Manuskript',
    gehoert: (p) => p.startsWith('/roman') || p.startsWith('/schreiben'),
  },
  {
    /*
     * Nicht das Inhaltsverzeichnis des Buches, sondern das des Romans.
     *
     * `/inhalt` ist der Buchblock mit seinen vierzehn Kapiteln – Naturgesetze,
     * Materialien, Zeitalter. Für einen Roman ist das ein Regal voller
     * Schubladen, die er nie öffnet. `/verzeichnis` zeigt stattdessen, was
     * *in seinem Text* vorkommt.
     */
    ziel: '/verzeichnis',
    name: 'Welt',
    gehoert: (p) =>
      p.startsWith('/verzeichnis') ||
      p.startsWith('/inhalt') ||
      p.startsWith('/kapitel') ||
      p.startsWith('/eintrag') ||
      p.startsWith('/figur'),
  },
];

export function Schreibhuelle() {
  const titel = useStudio((s) => s.settings.book?.title?.trim() || 'Mein Buch');
  const tiefe = useRaum((s) => s.tiefe);
  /* Welche Seiten ohne Bogen liegen – siehe unten. */
  const { pathname } = useLocation();
  const vollbild = pathname.startsWith('/figur/');

  return (
    <div className="flex h-full w-full flex-col overflow-hidden" style={deskStyle}>
      <Raumzeile titel={titel} orte={ORTE} />

      {/*
        Ein Bogen, der den Raum füllt.

        Kein Buchkasten, keine Wölbung, kein Falz in der Mitte. Der Falz ist
        das Zeichen dafür, dass zwei Seiten nebeneinanderliegen – und in einem
        Manuskript liegt eine.
      */}
      {/*
        Die Raumschicht gehört auch hierher.

        Sie fehlte, und das war keine Auslassung mit Grund, sondern ein
        Versehen beim Umbau: `Raumschicht` und `Tiefenraum` hingen in
        `BookShell`, und als daneben zwei weitere Hüllen entstanden, blieben
        sie dort. Damit war im Roman und am Spieltisch die **ganze
        Bedienungs-DNA** fort – Randgeste, Richtungsbogen, Tiefe, Doppeltipp.
        Gemessen: Wer im Rollenspielband eine Figur in die Tiefe drückte,
        bekam nichts; im Artbook öffnete dieselbe Geste „Wesen · Tiefe 1".

        Sie liegt hier wie dort **um** den Inhalt und nicht darin. Der Bogen
        bleibt derselbe; was sich ändert, ist nur, dass es ihn jetzt gibt.
      */}
      <Raumschicht>
        {tiefe > 0 ? (
          <Tiefenraum />
        ) : vollbild ? (
          /*
           * Die Charakterseite liegt **direkt** in der Schicht.
           *
           * Dieselbe Ausnahme wie im Buchkörper, und aus demselben Grund: Sie
           * ist randlos und fast schwarz, kein Bogen – auf Papier gesetzt wäre
           * sie ein dunkles Rechteck mitten auf einer hellen Seite.
           *
           * Wichtiger noch ist die Bedienung. Im scrollenden `main` verliert
           * die Randgeste gegen die Scrollbarkeit – so steht es in der
           * Reihenfolge, wem der Finger gehört. Gemessen: Im Rollenspielband
           * führte ein Zug vom Rand zum Tisch statt in die Tiefe, im Artbook
           * dagegen öffnete derselbe Zug „Wesen · Tiefe 1". Der Unterschied
           * war genau dieser Kasten.
           */
          <div key={pathname} className="blatt-eintritt flex min-h-0 flex-1 flex-col">
            <Outlet />
          </div>
        ) : (
          <main className="scroll-slim min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 pb-2 sm:px-5 sm:pb-5">
            <div className="relative mx-auto flex min-h-full w-full max-w-[52rem] flex-col">
              <span aria-hidden className="paper-sheet absolute inset-0 z-0 block rounded-[3px]" />
              <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                <Outlet />
              </div>
            </div>
          </main>
        )}
      </Raumschicht>
    </div>
  );
}
