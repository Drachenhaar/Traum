/**
 * Manuskript · Veredeln · Seite.
 *
 * Ausdrücklich **keine** Tab-Leiste. Eine Tab-Leiste ist eine Behauptung über
 * eine App: drei gleichrangige Orte, jederzeit austauschbar, mit Symbolen,
 * einer Trennlinie und einer Fläche darunter. Hier sind es drei Zustände
 * **derselben Arbeit**, in einer Reihenfolge – deshalb drei Wörter, ein Punkt
 * dazwischen, und eine Haarlinie unter dem, bei dem man gerade ist.
 *
 * ---
 *
 * **Warum sie stehen bleibt.**
 *
 * Sie stand am Ende des Inhalts. Auf dem Telefon hiess das: die
 * Hauptnavigation des ganzen Ablaufs lag hinter zwei Bildschirmhöhen Text,
 * und wer den Schritt wechseln wollte, musste erst bis ans Ende dessen
 * scrollen, was er gerade nicht wollte.
 *
 * Jetzt liegt sie in der `fussleiste` von `AppendixSheet` und bleibt am
 * unteren Rand des Blattes stehen – `sticky` im Scrollbehälter, nicht `fixed`
 * am Fenster. Das Blatt *ist* der sichtbare Bereich; damit kann die Leiste
 * gar nicht erst hinter Safaris einklappender Werkzeugleiste landen.
 *
 * Zurückgehen verliert nichts. Das ist keine Höflichkeit, sondern die
 * Bedingung dafür, dass die Reihenfolge erträglich ist: Wer fürchten muss,
 * beim Zurückblättern etwas zu verlieren, blättert nicht zurück und arbeitet
 * an der falschen Stelle weiter.
 */

import type { SetzereiPhase } from '../../lib/setzerei/draft';
import { cx } from '../../lib/utils';

const SCHRITTE: { id: SetzereiPhase; label: string }[] = [
  { id: 'manuskript', label: 'Manuskript' },
  { id: 'veredeln', label: 'Veredeln' },
  { id: 'seite', label: 'Seite' },
];

export function SetzereiSchritte({
  jetzt,
  onWechsel,
  /** Ohne Entwurf führen Veredeln und Seite ins Leere – sie stehen dann still. */
  bereit,
}: {
  jetzt: SetzereiPhase;
  onWechsel: (p: SetzereiPhase) => void;
  bereit: boolean;
}) {
  return (
    <div
      className="relative"
      style={{
        /*
         * Der Papiergrund – deckend, und zwar wirklich.
         *
         * ---
         *
         * **`--dc-blattgrund` ist ein Hexwert und kein Kanaltripel.**
         *
         * Hier stand `rgb(var(--dc-blattgrund) / 0.97)`. Das ist die
         * Schreibweise, die überall sonst im Buch stimmt – `--dc-metall-500`
         * und die anderen Marken sind als „R G B" abgelegt, damit Tailwind
         * ihnen eine Deckkraft geben kann. `--dc-blattgrund` nicht: Es steht
         * als `#ebe1c9` da und wird direkt als Farbe benutzt.
         *
         * `rgb(#ebe1c9 / 0.97)` ist ungültig. Ungültige Angaben fallen
         * ersatzlos aus – gemessen kam `rgba(0, 0, 0, 0)` heraus, also *gar
         * kein* Hintergrund. Am Gerät stand die Schrift der Leiste dann
         * mitten im scrollenden Text, beide gleich gut lesbar, beide sinnlos.
         *
         * Dieselbe Familie von Fehlern wie `--dc-bogen` und `--dc-falz`
         * damals: Eine Variable, die anders gebaut ist, als die Schreibweise
         * annimmt, macht nichts kaputt – sie macht gar nichts.
         *
         * Also der Hexwert direkt, ohne Rechnung. Die Farbe kommt weiterhin
         * aus dem Band; im Tinte-Band ist das Blaugrau, im Pergament-Band
         * cremefarben.
         */
        background: 'var(--dc-blattgrund, #ebe1c9)',
        /*
         * Die Sicherheitszone des Geräts.
         *
         * Auf einem iPhone mit Home-Balken sind das vierunddreissig Punkte,
         * auf allem anderen null – `--sab` ist in `index.css` aus
         * `env(safe-area-inset-bottom)` gesetzt und deshalb keine geratene
         * Zahl für ein bestimmtes Gerät.
         */
        paddingBottom: 'var(--sab)',
      }}
    >
      {/*
        Darüber ein kurzer Verlauf, damit der Text verklingt statt hart
        abgeschnitten zu werden. Er liegt **über** der Leiste und nicht in
        ihr: Der Balken selbst muss deckend sein, das Verklingen davor.
      */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-7 block h-7"
        style={{
          background: 'linear-gradient(to bottom, transparent, var(--dc-blattgrund, #ebe1c9))',
        }}
      />

      <nav
        aria-label="Setzfolge"
        className="relative flex items-baseline justify-center gap-1 px-4 pb-3 pt-2"
      >
        {SCHRITTE.map((s, i) => {
          const an = s.id === jetzt;
          const still = !bereit && s.id !== 'manuskript';
          return (
            <span key={s.id} className="flex items-baseline">
              {i > 0 && (
                <span aria-hidden className="mx-2 font-serif text-[13px] text-gold opacity-40">
                  ·
                </span>
              )}
              <button
                type="button"
                onClick={() => !still && onWechsel(s.id)}
                disabled={still}
                aria-current={an ? 'step' : undefined}
                data-schritt={s.id}
                className={cx(
                  'relative min-h-[44px] px-1.5 font-serif text-[15.5px] transition-colors duration-200 no-tap-highlight',
                  /*
                   * Drei Helligkeiten, und alle drei müssen lesbar bleiben.
                   *
                   * Der ruhende Schritt stand auf `text-ink-muted`, der noch
                   * nicht erreichbare auf `text-ink-faint/40` – letzterer war
                   * fast weg. Ein Wort, das man suchen muss, ist keine
                   * Navigation, und „noch nicht erreichbar" heisst *leiser*,
                   * nicht *unsichtbar*.
                   */
                  an ? 'text-ink' : still ? 'text-ink-faint/75' : 'text-ink-muted hover:text-ink',
                )}
              >
                {s.label}
                <span
                  aria-hidden
                  className={cx(
                    'absolute inset-x-1.5 bottom-[9px] block h-px transition-colors duration-300',
                    an ? 'bg-gild-500/70' : 'bg-transparent',
                  )}
                />
              </button>
            </span>
          );
        })}
      </nav>
    </div>
  );
}
