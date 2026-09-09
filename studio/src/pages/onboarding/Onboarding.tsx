/**
 * Der erste Weg durch das Buch.
 *
 * Drei Abschnitte, die ineinander übergehen: Erst die Frage, wofür das hier
 * gedacht ist, dann entsteht das Buch, dann steht die erste eigene Frage.
 *
 * Die Reihenfolge war einmal andersherum – erst das Buch, dann die Frage. Das
 * ist an einer Stelle falsch, die man leicht übersieht: Wer erst den Einband
 * bindet, hat die Frage schon beantwortet, ohne sie gehört zu haben. Und die
 * Antwort entscheidet, was ihn danach empfängt.
 *
 * ---
 *
 * **Die Führung liegt nicht mehr im Weg, sondern daneben.**
 *
 * Hier stand ein vierter Abschnitt: sechs Schauseiten an einer Beispielwelt,
 * zwischen dem gebundenen Buch und der ersten eigenen Frage. Gut gemacht – und
 * an der falschen Stelle. Sie kam **vor** dem eigenen Buch, wo nichts von dem,
 * was sie zeigt, sich an etwas Eigenem festmachen kann.
 *
 * Gemessen: dreizehn Klicks bis zum ersten eigenen Wort, sechs davon die
 * Führung. Jetzt sind es sieben, und die Führung wird dort angeboten, wo
 * jemand tatsächlich ins Stocken gerät – vor dem leeren Feld. Danach steht er
 * wieder vor demselben Feld, nur mit einer Vorstellung mehr. Und sie ist nicht
 * verloren: Sie liegt dauerhaft im Anhang.
 *
 * Der Weg selbst steht in `lib/onboarding/weg.ts` und wird dort geprüft.
 *
 * Es gibt keine Fortschrittsanzeige über das Ganze. Wer hier ist, soll nicht
 * wissen, wie viel noch kommt – er soll blättern.
 */

import { useState } from 'react';
import type { EntryType } from '../../types';
import { useStudio } from '../../store/useStudio';
import { profilVon } from '../../lib/profil';
import { naechsterAbschnitt, type Abschnitt } from '../../lib/onboarding/weg';
import { Geburt } from '../geburt/Geburt';
import { Schauseiten } from './Schauseiten';
import { ErsterSchritt } from './ErsterSchritt';

export function Onboarding({ onFertig }: { onFertig: (ziel?: string) => void }) {
  const createEntry = useStudio((s) => s.createEntry);
  const [abschnitt, setAbschnitt] = useState<Abschnitt>('buch');

  /*
   * Die Absicht kommt jetzt aus dem Buch, das gerade entstanden ist.
   *
   * Vorher stand hier eine eigene Frage davor – und gleich danach fragte die
   * Erschaffung noch einmal fast dasselbe. Die Art des Buches beantwortet
   * beides; das Profil wird beim Vollenden daraus abgeleitet. Die Führung
   * liest es hier nur ab.
   */
  const absicht = useStudio((s) => profilVon(s.settings.book).absicht);

  const weiter = (was: Parameters<typeof naechsterAbschnitt>[1]) =>
    setAbschnitt((jetzt) => naechsterAbschnitt(jetzt, was));

  if (abschnitt === 'buch') {
    return <Geburt onFertig={() => weiter('gebunden')} />;
  }

  if (abschnitt === 'fuehrung') {
    return <Schauseiten absicht={absicht} onFertig={() => weiter('fuehrungFertig')} />;
  }

  return (
    <ErsterSchritt
      onAnlegen={(titel, type: EntryType) => {
        void createEntry(type, { title: titel }).then((entry) => {
          /*
           * Direkt auf die eben entstandene Seite. Nicht auf eine Übersicht:
           * Wer gerade etwas erschaffen hat, will es sehen, nicht suchen.
           */
          onFertig(`/eintrag/${entry.id}`);
        });
      }}
      onFuehrung={() => weiter('fuehrungGewuenscht')}
      onUeberspringen={() => onFertig()}
    />
  );
}
