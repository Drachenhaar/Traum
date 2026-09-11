/**
 * Der Tisch – die erste Seite eines Rollenspielbandes.
 *
 * Kein Armaturenbrett. Der Unterschied ist nicht die Zahl der Einträge,
 * sondern woraus sie bestehen: Ein Armaturenbrett zeigt Zahlen über den
 * Bestand („14 Orte, 3 Abenteuer, 62 % fertig"), dieser Tisch zeigt, **was
 * gespielt wird und was noch fehlt**.
 *
 * Der Auftrag verlangt für den leeren Zustand ausdrücklich, dass man sieht,
 * was daraus werden kann: „Charakter erstellen, Weltkarte beginnen, Ort
 * erstellen, erstes Abenteuer anlegen." Genau vier, und sie stehen hier auch
 * dann, wenn das Buch schon voll ist – dann nur leiser, unter dem, was es
 * bereits gibt. Ein Werkzeug, das nur im leeren Buch sichtbar ist, sucht man
 * beim zweiten Mal vergeblich.
 */

import { Link } from 'react-router-dom';
import { Compass, Map, Swords, UserPlus } from 'lucide-react';
import { useStudio, livingEntries } from '../../store/useStudio';
import { ARBEITSRAEUME } from '../../lib/arbeitsraum';
import { cx } from '../../lib/utils';
import type { Entry } from '../../types';

/* ---------------------------------------------------------- Die Arten ----- */

/*
 * Welche Eintragsarten auf welchem Stapel liegen.
 *
 * Abgeschrieben aus `lib/book.ts` und dort gegengeprüft, nicht erfunden – beim
 * ersten Versuch standen hier `story`, `event` und `building`, und keine
 * dieser drei Arten gibt es. Die Stapel wären still leer geblieben.
 */
const ARTEN = {
  abenteuer: new Set(['quest', 'lore']),
  bewohner: new Set(['character', 'creature', 'animal']),
  orte: new Set(['location', 'architecture', 'biome']),
};

/* --------------------------------------------------------- Die Anfänge ---- */

const ZEICHEN: Record<string, React.ReactNode> = {
  '/baukasten': <UserPlus size={17} />,
  '/weltkarte': <Map size={17} />,
  '/kapitel/architektur': <Compass size={17} />,
  '/kapitel/geschichten': <Swords size={17} />,
};

export function Tisch() {
  const entries = useStudio((s) => s.entries);
  const lebend = livingEntries(entries);
  const raum = ARBEITSRAEUME.rpg;

  /*
   * Was auf dem Tisch liegt.
   *
   * Bewusst aus den vorhandenen Eintragsarten und nicht aus einem eigenen
   * Kampagnenmodell: Ein Abenteuer *ist* eine Geschichte, ein NSC *ist* eine
   * Figur. Ein zweites Modell daneben hiesse, dieselbe Welt zweimal zu führen.
   */
  const abenteuer = lebend.filter((e) => ARTEN.abenteuer.has(e.type));
  const bewohner = lebend.filter((e) => ARTEN.bewohner.has(e.type));
  const orte = lebend.filter((e) => ARTEN.orte.has(e.type));
  const leer = lebend.length === 0;

  return (
    <div className="px-5 pb-12 pt-7 sm:px-9 sm:pt-9">
      <p className="rubric text-gild-600/70">Kampagne</p>
      <h1 className="mt-1.5 font-serif text-[26px] leading-tight text-ink sm:text-[32px]">
        Der Tisch
      </h1>
      <p className="mt-2 max-w-[52ch] font-serif text-[14.5px] italic leading-relaxed text-ink-faint">
        {leer ? raum.leer : 'Was vorbereitet ist – und was als Nächstes fehlt.'}
      </p>

      {!leer && (
        <div className="mt-8 grid gap-7 sm:grid-cols-3">
          <Stapel titel="Abenteuer" eintraege={abenteuer} leer="Noch kein Abenteuer." />
          <Stapel titel="Bewohner" eintraege={bewohner} leer="Noch niemand." />
          <Stapel titel="Orte" eintraege={orte} leer="Noch kein Ort." />
        </div>
      )}

      {/* ------------------------------------------------------ Die Anfänge */}
      <section className={cx(leer ? 'mt-9' : 'mt-12 border-t border-line pt-7')}>
        {!leer && <p className="rubric mb-4 text-ink-faint">Neu anlegen</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          {raum.anfaenge.map((a) => (
            <Link
              key={a.ziel}
              to={a.ziel}
              className={cx(
                'flex items-center gap-3 rounded-sm border px-4 transition-colors no-tap-highlight',
                leer
                  ? 'min-h-[58px] border-gild-600/35 hover:border-gild-600/70 hover:bg-gild-600/5'
                  : 'min-h-[48px] border-line hover:border-lineStrong',
              )}
            >
              <span className={cx('shrink-0', leer ? 'text-gild-600/80' : 'text-ink-faint')}>
                {ZEICHEN[a.ziel]}
              </span>
              <span
                className={cx(
                  'font-serif',
                  leer ? 'text-[16px] text-ink' : 'text-[14.5px] text-ink-muted',
                )}
              >
                {a.titel}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ----------------------------------------------------------- Ein Stapel ---- */

/**
 * Ein Stapel Blätter auf dem Tisch.
 *
 * Höchstens sechs, und darunter steht, wie viele es insgesamt sind. Eine volle
 * Liste wäre auf dieser Seite falsch: Sie ist der Blick über den Tisch, nicht
 * das Register. Wer alles sehen will, geht in das Kapitel.
 */
function Stapel({
  titel,
  eintraege,
  leer,
}: {
  titel: string;
  eintraege: Entry[];
  leer: string;
}) {
  const gezeigt = eintraege.slice(0, 6);

  return (
    <div>
      <p className="rubric text-ink-faint">{titel}</p>
      {gezeigt.length === 0 ? (
        <p className="mt-2.5 font-serif text-[14px] italic text-ink-faint/70">{leer}</p>
      ) : (
        <ul className="mt-2.5 space-y-1">
          {gezeigt.map((e) => (
            <li key={e.id}>
              <Link
                to={`/eintrag/${e.id}`}
                className="block truncate font-serif text-[15px] text-ink-muted transition-colors hover:text-ink no-tap-highlight"
              >
                {e.title || 'Ohne Titel'}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {eintraege.length > gezeigt.length && (
        <p className="mt-2 font-serif text-[12.5px] italic text-ink-faint/70">
          und {eintraege.length - gezeigt.length} weitere
        </p>
      )}
    </div>
  );
}
