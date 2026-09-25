/**
 * Wo dieses Buch liegt – die eine Zeile am geschlossenen Einband.
 *
 * Der Satz selbst und seine Begründung stehen in `lib/speicher.ts`
 * (`sicherungssatz`). Hier steht nur, wie er dasteht, und dazu die drei
 * Entscheidungen, die ihn von einer Mahnung unterscheiden:
 *
 * **Keine Farbe, kein Zeichen, kein Kasten.** Dieselbe stille Schrift wie die
 * Seitenzahl darüber. Ein gelber Kasten mit Warndreieck wäre auf einem
 * gemalten Einband ein Fremdkörper – und genau die Software-Anmutung, gegen
 * die dieses Buch antritt.
 *
 * **Die Tür steht daneben und heisst, was sie tut.** „Eine Sicherung anlegen"
 * führt an die Stelle, an der man eine anlegt. Nicht „mehr erfahren", nicht
 * „später".
 *
 * **Und sie verschwindet von selbst.** Nichts zum Wegklicken: Wer gesichert
 * hat, sieht die Zeile beim nächsten Zuklappen nicht mehr. Ein
 * Schliessen-Kreuz wäre die Einladung, sie wegzuklicken, ohne etwas zu tun –
 * und damit wäre sie genau das, wovor sie warnt: etwas, das man später
 * erledigen wollte.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudio, livingEntries } from '../../store/useStudio';
import { sicherungssatz } from '../../lib/speicher';

export function Sicherungszeile() {
  const navigate = useNavigate();
  const entries = useStudio((s) => s.entries);
  const settings = useStudio((s) => s.settings);

  const satz = useMemo(() => {
    const lebend = livingEntries(entries);
    return sicherungssatz(
      {
        letzteSicherung: settings.lastBackupAt,
        /*
         * Ab wann gerechnet wird, wenn es nie eine Sicherung gab: ab dem
         * Augenblick, seit dem es etwas zu verlieren gibt. Die Begründung
         * steht bei `sicherungFaellig`; sie wird hier nur gefüttert.
         */
        aeltesterEintrag: lebend.reduce<number | undefined>(
          (aelteste, e) => (aelteste === undefined ? e.createdAt : Math.min(aelteste, e.createdAt)),
          undefined,
        ),
        eintraege: lebend.length,
      },
      settings.backupReminderDays ?? 14,
    );
  }, [entries, settings.lastBackupAt, settings.backupReminderDays]);

  if (!satz) return null;

  return (
    /*
     * `/70` und nicht `/45`, und das ist keine Geschmacksfrage.
     *
     * Gemessen auf dem Einband, an den Bildpunkten des gerenderten
     * Bildschirms – nicht an der gesetzten Farbe, denn die ist halb
     * durchsichtig und sagt für sich genommen nichts:
     *
     *     /45   2,65:1   ← so stand die Zeile zuerst da
     *     /65   4,31:1
     *     /70   5,01:1   ← das hier
     *     /75   5,80:1
     *
     * Bei 12,5 px kursiv ist 4,5:1 die Schwelle. Ausgerechnet der einzige
     * Satz, der vor einem unwiederbringlichen Verlust warnt, wäre mit `/45`
     * der unleserlichste auf der Seite gewesen – leiser als die Tür daneben,
     * die schon bei 4,91:1 stand. Leise heisst gedämpft, nicht unsichtbar.
     *
     * Und nicht heller: `/75` läge über der Tür und würde die Betonung
     * verdrehen – die Feststellung riefe lauter als die Handlung. `/70` liegt
     * mit ihr gleichauf. Gerechnet hatte ich vorher 4,56:1 für `/65`;
     * gemessen wurden 4,31:1, weil die Kantenglättung dünner Kursivschrift
     * die volle Deckung nie erreicht. Deshalb wird hier gemessen.
     */
    <p className="mx-auto mt-4 max-w-[30ch] font-serif text-[12.5px] italic leading-relaxed text-paper-400/70">
      {satz}{' '}
      <button
        type="button"
        onClick={() => navigate('/kolophon')}
        /*
         * Die unsichtbare Fläche um die Tür herum.
         *
         * Gemessen: Die Schaltfläche war **20 px** hoch – die Höhe einer
         * Zeile Fliesstext. Für einen Verweis mitten im Satz ist das
         * üblich; für die eine Handlung, um die es auf dieser Zeile geht,
         * ist es wenig, und am unteren Bildschirmrand eines Telefons
         * trifft man dort mit dem Daumen daneben.
         *
         * Eine durchsichtige Fläche wird angetippt, nicht die Schrift – und
         * weil sie absolut sitzt, rückt kein einziger Buchstabe. Grösser zu
         * *setzen* wäre das Gegenteil: dann stünde die Zeile nicht mehr im
         * Buch, sondern auf einem Bedienfeld.
         *
         * **Nach unten, nicht nach allen Seiten.** Die Tür ist die letzte
         * Zeile des Absatzes: darüber steht Fliesstext desselben Satzes,
         * darunter sind 56 px Schreibtisch. Eine symmetrische Fläche würde
         * oben in die Textzeile greifen – dann führte ein Tippen auf blosse
         * Prosa fort von hier, und das ist schlimmer als ein kleines Ziel.
         * Also 4 px hinauf, 20 px hinab: 44 px, gemessen mit
         * `elementFromPoint`, nicht gerechnet – 43 gemessen, weil der Gehweg an der
         * Kante aufhört.
         */
        className="relative text-gild-400/70 underline decoration-gild-600/40 underline-offset-4 transition-colors hover:text-gild-300 no-tap-highlight before:absolute before:-inset-x-1 before:-top-1 before:-bottom-5 before:content-['']"
      >
        Eine Sicherung anlegen
      </button>
    </p>
  );
}
