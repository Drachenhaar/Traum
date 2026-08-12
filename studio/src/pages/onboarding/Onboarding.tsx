/**
 * Der erste Weg durch das Buch.
 *
 * Vier Abschnitte, die ineinander übergehen: Erst die Frage, wofür das hier
 * gedacht ist, dann entsteht das Buch, dann wird ein kleines Beispiel
 * durchgeblättert, und dann steht die erste eigene Frage.
 *
 * Die Reihenfolge war einmal andersherum – erst das Buch, dann die Frage. Das
 * ist an einer Stelle falsch, die man leicht übersieht: Wer erst den Einband
 * bindet, hat die Frage schon beantwortet, ohne sie gehört zu haben. Und die
 * Antwort entscheidet, was ihn danach empfängt.
 *
 * Es gibt keine Fortschrittsanzeige über das Ganze. Wer hier ist, soll nicht
 * wissen, wie viel noch kommt – er soll blättern.
 */

import { useState } from 'react';
import type { EntryType } from '../../types';
import { useStudio } from '../../store/useStudio';
import { profilAus, type Absicht } from '../../lib/profil';
import { Geburt } from '../geburt/Geburt';
import { Absichtsfrage } from './Absichtsfrage';
import { Schauseiten } from './Schauseiten';
import { ErsterSchritt } from './ErsterSchritt';

type Abschnitt = 'absicht' | 'buch' | 'schau' | 'anfang';

export function Onboarding({ onFertig }: { onFertig: (ziel?: string) => void }) {
  const updateSettings = useStudio((s) => s.updateSettings);
  const createEntry = useStudio((s) => s.createEntry);
  const [abschnitt, setAbschnitt] = useState<Abschnitt>('absicht');
  const [absicht, setAbsicht] = useState<Absicht>('frei');

  if (abschnitt === 'absicht') {
    return (
      <Absichtsfrage
        onWahl={(gewaehlt) => {
          setAbsicht(gewaehlt);
          updateSettings({ profil: profilAus(gewaehlt) });
          setAbschnitt('buch');
        }}
      />
    );
  }

  if (abschnitt === 'buch') {
    return <Geburt onFertig={() => setAbschnitt('schau')} />;
  }

  if (abschnitt === 'schau') {
    return <Schauseiten absicht={absicht} onFertig={() => setAbschnitt('anfang')} />;
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
      onUeberspringen={() => onFertig()}
    />
  );
}
