/**
 * Die Landzunge – das zweite Wort, mit dem man malen kann.
 *
 * ---
 *
 * **Der Spiegel der Bucht, bis in die Regel hinein.**
 *
 *   Die Bucht **ist Wasser**. Sie nimmt allem, was sie berührt – ausser dem
 *   Wasser, aus dem sie besteht.
 *
 *   Die Landzunge **ist Land**. Sie gibt der Küste hinzu, an der sie beginnt –
 *   und das Wasser weicht.
 *
 * Das zweite ist keine Zierde, sondern nötig: Wasser wird über Land gezeichnet
 * (`EBENEN` in `stil.ts`). Eine Landzunge, die in einen gemalten See hinein
 * wächst, verschwände sonst unter ihm – man zöge einen Strich und sähe nichts.
 * Also nimmt sie dem See genau das, was sie einnimmt. Fester Grund verdrängt
 * Wasser; das ist keine Programmregel, sondern wie eine Landzunge entsteht.
 *
 * ---
 *
 * **Woran sie wächst.**
 *
 * An **einer** Fläche, nicht an allen berührten. Hier läuft die Spiegelung
 * bewusst nicht weiter: Die Bucht trifft alles, weil ein Kanal durch Land und
 * Wald zugleich geht und ein Wald über dem Meer hängen bliebe. Beim Anfügen
 * wäre dasselbe falsch – wer eine Landzunge zieht, meint Land, und dass dabei
 * ein Wald mit ins Meer hinauswüchse, hat niemand gemeint.
 *
 * Gewachsen wird deshalb an der Fläche, die der Strich **zuerst** betritt. Das
 * ist genau die Geste: Man setzt auf der Küste auf und zieht hinaus.
 *
 * ---
 *
 * **Und was dabei umsonst abfällt: das Verschmelzen.**
 *
 * Berührt derselbe Strich eine zweite Fläche derselben Bedeutung, werden aus
 * zweien eine. Das ist die genaue Umkehrung des Durchtrennens, und es kostet
 * keine Zeile Sonderbehandlung: Eine Maske weiss nicht, wie viele Flächen sie
 * einmal war.
 */

import { abtragen, anfuegen } from './kontur';
import { neuesFeature, type Kartenfeature, type Punkt } from './modell';
import { imPolygon } from './modell';
import { EBENEN } from './stil';

/** Der Flächeninhalt – für die Frage, wer nach dem Verschmelzen den Namen behält. */
function inhalt(p: Punkt[]): number {
  let m = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    m += p[j][0] * p[i][1] - p[i][0] * p[j][1];
  }
  return Math.abs(m) / 2;
}

/**
 * Eine Landzunge ziehen.
 *
 * Zurück kommt die neue Flächenliste – oder `undefined`, wenn der Strich keine
 * Fläche getroffen hat. Wie bei der Bucht trägt der Unterschied Bedeutung: Ein
 * Strich, der danebenging, darf keinen Schritt im Rückgängig kosten.
 *
 * **Ein Strich frei im Wasser ist keine Landzunge, sondern eine Insel** – und
 * Inseln malt man mit „Land". Ein Werkzeug, das aus einem danebengegangenen
 * Strich stillschweigend etwas Neues erschafft, hat für den Verfasser
 * entschieden.
 */
export function landzungeZiehen(
  features: Kartenfeature[],
  spur: Punkt[],
  radius: number,
): Kartenfeature[] | undefined {
  /*
   * Die Fläche, die der Strich zuerst betritt – in der Reihenfolge des
   * Striches, nicht in der der Liste. Wer auf der Küste aufsetzt und hinaus
   * zieht, meint die Küste, an der er aufgesetzt hat.
   *
   * **Und bei mehreren an derselben Stelle die oberste.** Ein Wald liegt auf
   * einer Landfläche; der erste Punkt eines Striches, der im Wald beginnt,
   * liegt in beiden. Hier stand `features.find(…)`, also die Reihenfolge der
   * Liste – und die ist an dieser Stelle willkürlich. Gemessen wuchs dann das
   * Land statt des Waldes, obwohl der Finger auf dem Wald aufgesetzt hatte.
   *
   * Entschieden wird deshalb nach `EBENEN`, der Zeichenreihenfolge: Was zuletzt
   * gezeichnet wird, liegt oben, und worauf man zeigt, ist das, was man sieht.
   * Dieselbe Regel, die die flache Karte beim Antippen schon anwendet – dort
   * nimmt sie ihr das Zeichensystem ab, hier muss sie ausgesprochen werden.
   */
  const oben = (a: Kartenfeature, b: Kartenfeature) =>
    EBENEN.indexOf(b.art) - EBENEN.indexOf(a.art);
  let anker: Kartenfeature | undefined;
  for (const p of spur) {
    const treffer = features.filter((f) => f.art !== 'wasser' && imPolygon(p, f.punkte));
    if (treffer.length) {
      anker = [...treffer].sort(oben)[0];
      break;
    }
  }
  if (!anker) return undefined;

  /*
   * Und alle weiteren Flächen derselben Bedeutung, die derselbe Strich
   * berührt – sie verschmelzen mit. Eine Landzunge zwischen zwei Inseln macht
   * aus ihnen eine Insel.
   */
  const beteiligt = features.filter(
    (f) => f.art === anker.art && spur.some((p) => imPolygon(p, f.punkte)),
  );

  const gewachsen = anfuegen(
    beteiligt.map((f) => f.punkte),
    spur,
    radius,
  );
  if (!gewachsen?.length) return undefined;

  /*
   * Wer den Namen behält: das grösste **Ausgangsstück**, nicht das grösste
   * Ergebnis.
   *
   * Beim Durchtrennen war es das grösste Ergebnis – dort zerfiel eine Fläche,
   * und die Frage lautete, welcher Teil sie bleibt. Hier verschmelzen mehrere,
   * und die Frage lautet, wessen Name überlebt. Das ist der Name der Fläche,
   * die am meisten mitgebracht hat; die kleinere Insel gibt ihren auf.
   */
  const haupt = beteiligt.reduce((a, b) => (inhalt(b.punkte) > inhalt(a.punkte) ? b : a));
  const verschmolzen = new Set(beteiligt.map((f) => f.id));

  const naechste: Kartenfeature[] = [];
  for (const f of features) {
    if (f.id === haupt.id) {
      /*
       * Sollte der Strich wider Erwarten mehrere Umrisse hinterlassen – etwa
       * weil eine beteiligte Fläche gar nicht am Strich hing –, bekommt der
       * grösste die Kennung und der Rest wird namenloser Nachbar. Dieselbe
       * Regel wie beim Durchtrennen, damit nichts stillschweigend verschwindet.
       */
      gewachsen.forEach((punkte, i) => {
        naechste.push(
          i === 0
            ? { ...haupt, punkte }
            : { ...neuesFeature(haupt.art, punkte), seed: haupt.seed },
        );
      });
      continue;
    }
    if (verschmolzen.has(f.id)) continue;

    /*
     * Und das Wasser weicht.
     *
     * `abtragen` liefert `undefined`, wenn der Strich diese Wasserfläche gar
     * nicht berührt – dann bleibt sie, wie sie war. Eine leere Liste heisst,
     * dass die Landzunge den ganzen See eingenommen hat; dann verschwindet er,
     * und das ist richtig.
     */
    if (f.art === 'wasser') {
      const rest = abtragen(f.punkte, spur, radius);
      if (rest) {
        rest.forEach((punkte, i) => {
          naechste.push(
            i === 0 ? { ...f, punkte } : { ...neuesFeature(f.art, punkte), seed: f.seed },
          );
        });
        continue;
      }
    }
    naechste.push(f);
  }
  return naechste;
}
