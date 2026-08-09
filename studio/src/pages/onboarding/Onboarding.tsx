/**
 * Der erste Weg durch das Buch.
 *
 * Vier Abschnitte, die ineinander übergehen: Das Buch entsteht, der Weg wird
 * gewählt, ein kleines Beispiel wird durchgeblättert, und dann steht die erste
 * eigene Frage.
 *
 * Es gibt keine Fortschrittsanzeige über das Ganze. Wer hier ist, soll nicht
 * wissen, wie viel noch kommt – er soll blättern.
 */

import { useState } from 'react';
import type { EntryType } from '../../types';
import { useStudio } from '../../store/useStudio';
import { Geburt } from '../geburt/Geburt';
import { DeinWeg } from './DeinWeg';
import { Schauseiten } from './Schauseiten';
import { ErsterSchritt } from './ErsterSchritt';

type Abschnitt = 'buch' | 'weg' | 'schau' | 'anfang';

export function Onboarding({ onFertig }: { onFertig: (ziel?: string) => void }) {
  const updateSettings = useStudio((s) => s.updateSettings);
  const createEntry = useStudio((s) => s.createEntry);
  const [abschnitt, setAbschnitt] = useState<Abschnitt>('buch');
  const [weg, setWeg] = useState('traumweber');

  if (abschnitt === 'buch') {
    return <Geburt onFertig={() => setAbschnitt('weg')} />;
  }

  if (abschnitt === 'weg') {
    return (
      <DeinWeg
        onWahl={(gewaehlt) => {
          setWeg(gewaehlt);
          updateSettings({ weg: gewaehlt });
          setAbschnitt('schau');
        }}
      />
    );
  }

  if (abschnitt === 'schau') {
    return (
      <Schauseiten
        weg={weg}
        onZurueck={() => setAbschnitt('weg')}
        onFertig={() => setAbschnitt('anfang')}
      />
    );
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
