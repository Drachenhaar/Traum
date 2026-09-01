/**
 * Das eingelegte Manuskript.
 *
 * Technisch ist es ein `textarea` – das bleibt so, weil daran der Parser
 * hängt und weil ein selbstgebautes Schreibfeld auf einem Telefon immer eine
 * schlechtere Tastatur, eine schlechtere Auswahl und eine schlechtere
 * Rechtschreibhilfe hätte.
 *
 * Sichtbar ist es ein Blatt: leicht vom Buchpapier abgesetzt, mit einer
 * feinen Kante und einem Schatten, der eine Papierstärke andeutet statt einer
 * Erhebung. Kein Rahmen im Ruhezustand. Erst beim Hineintippen zeigt eine
 * Goldlinie an der Kante, dass hier geschrieben wird.
 */

import { useState } from 'react';
import { cx } from '../../lib/utils';

export function ManuskriptBlatt({
  text,
  onText,
}: {
  text: string;
  onText: (t: string) => void;
}) {
  const [schreibt, setSchreibt] = useState(false);

  return (
    <div
      className={cx(
        'relative rounded-[2px] transition-shadow duration-300',
        /*
         * Zwei Schatten, und beide sind klein.
         *
         * Der erste ist die Papierstärke – ein Punkt Versatz, kaum ein
         * Weichzeichner. Der zweite ist der Schlagschatten auf das Buchpapier
         * darunter. Ein grosser weicher Schatten liesse das Blatt schweben,
         * und ein schwebendes Blatt ist eine Karte in einer App.
         */
        'shadow-[0_1px_0_rgba(255,255,255,0.5),0_3px_10px_-6px_rgba(60,44,26,0.45)]',
        schreibt && 'shadow-[0_1px_0_rgba(255,255,255,0.5),0_5px_16px_-8px_rgba(60,44,26,0.55)]',
      )}
      style={{
        /* Etwas heller als das Buchpapier – ein anderes Blatt, kein Kasten. */
        background: 'linear-gradient(178deg, rgb(var(--dc-blattgrund) / 0.85), rgb(var(--dc-blattgrund) / 0.6))',
      }}
    >
      {/* Die Papierkante: eine Haarlinie, keine Umrandung. */}
      <span
        aria-hidden
        className={cx(
          'pointer-events-none absolute inset-0 rounded-[2px] transition-colors duration-300',
          schreibt ? 'ring-1 ring-gild-500/30' : 'ring-1 ring-lineStrong/25',
        )}
      />

      <textarea
        value={text}
        onChange={(e) => onText(e.target.value)}
        onFocus={() => setSchreibt(true)}
        onBlur={() => setSchreibt(false)}
        data-leitfaden="setzerei-feld"
        placeholder={
          'Titel: Waldkoi\nKategorie: Kreatur\nArt: Schleierkarpfen\nGröße: 40 cm\n\nDer Waldkoi zieht in kleinen Schwärmen durch den Nebelwald …'
        }
        rows={10}
        /*
         * Auf dem Telefon Serifen, am Schreibtisch Monoschrift.
         *
         * Sechzehn Punkte sind die Untergrenze – darunter zoomt Safari beim
         * Hineintippen. Sechzehn Punkte *Monoschrift* aber brechen auf 390
         * Punkten nach vierundzwanzig Zeichen um: „Titel: Waldkoi" passte,
         * der erste ganze Satz nicht mehr, und ein Manuskript, das man nicht
         * lesen kann, ist keins.
         *
         * Die Monoschrift war für die gleichmässige Breite der
         * „Feld: Wert"-Zeilen da. Auf einer Handbreite richtet sich ohnehin
         * nichts aus; dort zählt nur, wie viel in eine Zeile passt.
         */
        className={cx(
          'relative w-full resize-y border-0 bg-transparent px-6 py-6 outline-none sm:px-8 sm:py-7',
          'font-serif text-[16px] leading-[1.8] text-ink placeholder:text-ink-faint/45',
          'sm:font-mono sm:text-[13.5px] sm:leading-[1.9]',
        )}
      />
    </div>
  );
}

/**
 * Was das Buch gelesen hat – zwei Zeilen, keine Tabelle.
 *
 * Hier stand eine Liste von dreissig Feldnamen mit Haken und Punkten daneben.
 * Sie war ehrlich und sie war eine Datenbankmaske: Wer ein Manuskript einlegt,
 * will wissen, *ob* es angekommen ist, nicht welche einunddreissig Schlüssel
 * es hätte füllen können.
 *
 * Beide Zeilen kommen ausschliesslich aus dem Transkript. Nichts wird geraten.
 */
export function Erkennungszeile({
  bausteine,
  typLabel,
  artikel,
  satz,
  vermutet,
}: {
  bausteine: number;
  typLabel: string;
  /** „einen" / „eine" / „ein" – aus der Vorlage, nicht geraten. */
  artikel: string;
  /** „Ein Name, eine Art, eine Größe und ein Ort zeichnen sich bereits ab." */
  satz: string;
  /** Kam die Art aus der Erkennung oder aus der Wahl des Verfassers? */
  vermutet: boolean;
}) {
  return (
    <div className="mt-6">
      <p className="font-serif text-[15px] leading-relaxed text-ink-muted">
        <span className="text-ink">{bausteine}</span>{' '}
        {bausteine === 1 ? 'Baustein' : 'Bausteine'} erkannt
        <span aria-hidden className="mx-2 text-gold opacity-60">
          ·
        </span>
        {vermutet ? `Ich erkenne ${artikel} ` : 'Gesetzt als '}
        <span className="italic text-ink">{typLabel}</span>.
      </p>
      {satz && (
        <p className="mt-1.5 font-serif text-[14px] italic leading-relaxed text-ink-faint">
          {satz}
        </p>
      )}
    </div>
  );
}
