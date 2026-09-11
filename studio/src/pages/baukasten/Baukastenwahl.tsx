/**
 * Der Baukasten, aufgeschlagen ohne Figur.
 *
 * ---
 *
 * **Warum es diese Seite gibt.**
 *
 * Den Baukasten gab es zuerst nur an einer Figur – und der Weg dorthin ging
 * über eine kleine goldene Raute neben dem Titel und danach über ein Menü
 * hinter drei Punkten. Beide Zeichen sind gut begründet und beide sind
 * *unbeschriftet*: Wer nicht schon wusste, dass es die Seite gibt, fand sie
 * nicht. Nirgends im Buch stand ein Wort, das den Baukasten nennt.
 *
 * Ein Werkzeug, das man kennen muss, um es zu finden, ist für den, der es
 * nicht kennt, nicht vorhanden. Also steht der Baukasten jetzt im Anhang, bei
 * Setzerei, Zeitstrahl und Werkbank – mit einem Namen, den man lesen kann –,
 * und diese Seite beantwortet die einzige Frage, die dann noch offen ist:
 * *für welche Figur?*
 *
 * Die Wege über die Raute und über das Menü bleiben. Sie sind schneller für
 * den, der sie kennt; diese Seite ist der sichtbare für alle anderen. Dasselbe
 * Verhältnis wie bei Register und Randgeste – eine Wahrheit, mehrere
 * Erscheinungen.
 */

import { useNavigate } from 'react-router-dom';
import { useStudio, livingEntries } from '../../store/useStudio';
import { AppendixSheet } from '../book/Appendix';
import { Bildniswerk } from '../../components/baukasten/Bildniswerk';
import { useVorrat } from '../../components/baukasten/vorrat';
import { istLeer } from '../../lib/baukasten';
import { namenszeichen } from '../../lib/bildnis';
import type { Entry } from '../../types';

export function Baukastenwahl() {
  const navigate = useNavigate();
  const entries = useStudio((s) => s.entries);
  const vorrat = useVorrat();

  const figuren = livingEntries(entries).filter((e) => e.type === 'character');

  return (
    <AppendixSheet title="Der Baukasten" rubric="Anhang">
      <p className="prose-book">
        Ein Bildnis aus Schichten bauen – Kopf, Augen, Haar, Gewand –, und es
        schlägt sich danach auf der Figurenseite auf. Für welche Figur?
      </p>

      {figuren.length === 0 ? (
        <p className="mt-6 font-serif text-[15px] italic text-ink-faint">
          In diesem Band steht noch keine Figur.{' '}
          <button
            type="button"
            onClick={() => navigate('/inhalt')}
            className="text-gold underline no-tap-highlight"
          >
            Zum Inhaltsverzeichnis
          </button>
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {figuren.map((f) => (
            <li key={f.id}>
              <Wahlkachel entry={f} vorrat={vorrat} onClick={() => navigate(`/baukasten/${f.id}`)} />
            </li>
          ))}
        </ul>
      )}
    </AppendixSheet>
  );
}

/**
 * Eine Figur zur Wahl.
 *
 * Wer schon ein gebautes Bildnis hat, zeigt es – und zwar das Kopffeld, weil
 * man Figuren an Gesichtern unterscheidet und nicht an Gewändern. Wer keines
 * hat, zeigt sein Namenszeichen: Das ist dieselbe Antwort, die die leere
 * Bildnisplatte gibt, und sie heisst „noch nicht" und nicht „kaputt".
 */
function Wahlkachel({
  entry,
  vorrat,
  onClick,
}: {
  entry: Entry;
  vorrat: ReturnType<typeof useVorrat>;
  onClick: () => void;
}) {
  const bau = entry.bildbau;
  const gebaut = bau && !istLeer(bau, vorrat, 'kopf') ? bau : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full overflow-hidden rounded-[3px] border border-line text-left transition-colors hover:border-gild-500/50 no-tap-highlight"
    >
      <div className="relative aspect-square bg-paper-200 text-ink-faint">
        {gebaut ? (
          /* Zwei bis vier je Reihe – eine Kachel, keine Ansicht. */
          <Bildniswerk
            bau={gebaut}
            vorrat={vorrat}
            darstellung="kopf"
            fassung="thumb"
            className="w-full"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center font-serif text-[30px] text-gild-400/45">
            {namenszeichen(entry.title)}
          </span>
        )}
      </div>
      <span className="block truncate px-2 py-1.5 font-serif text-[13px] text-ink">
        {entry.title}
      </span>
    </button>
  );
}
