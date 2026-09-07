/**
 * Die Bucht – was ein abtragender Strich auf einer ganzen Karte anrichtet.
 *
 * `kontur.ts` weiss, wie man aus einer Fläche und einem Strich neue Flächen
 * macht. Es weiss nichts von Bedeutungen, Kennungen oder Seiten. Genau das
 * steht hier – und es steht hier und nicht im Bauteil, weil es *Bedeutung*
 * ist und keine Darstellung:
 *
 *   Welche Flächen eine Bucht überhaupt angeht.
 *   Wer nach dem Durchtrennen den Namen behält.
 *   Woran man erkennt, dass gar nichts geschehen ist.
 *
 * Drei Fragen, die man beantworten kann, ohne je einen Bildschirm gesehen zu
 * haben – und die man deshalb auch prüfen kann, ohne einen zu bauen. Solange
 * sie in der `.tsx` standen, waren sie nur durch Hinsehen zu belegen.
 */

import { abtragen } from './kontur';
import { neuesFeature, type Kartenfeature, type Punkt } from './modell';

/**
 * Eine Bucht durch die ganze Karte ziehen.
 *
 * Zurück kommt die neue Flächenliste – oder `undefined`, wenn der Strich
 * nichts getroffen hat. Der Unterschied trägt Bedeutung: Oben legt jede
 * Änderung einen Schritt im Rückgängig ab, und ein Strich, der danebenging,
 * darf keinen kosten. Sonst müsste man dreimal „Zurücknehmen" drücken, um
 * einen Strich zurückzunehmen, und niemand fände heraus, warum.
 *
 * ---
 *
 * **Sie trifft alles, was sie berührt – ausser Wasser.**
 *
 * Der erste Entwurf wollte *eine* Fläche treffen, die am meisten getroffene.
 * Das geht auf einer Karte mit einer Waldfläche *auf* einer Landfläche sofort
 * schief: Die Bucht nähme das Land weg und liesse den Wald stehen – ein Wald,
 * der über dem Meer hängt. Wer eine Bucht zieht, meint die Küste, und die
 * Küste ist alles, was dort liegt.
 *
 * Wasser bleibt verschont, und das ist kein Sonderfall, sondern der Sinn des
 * Wortes: Eine Bucht *ist* Wasser. Sie kann nicht das Meer wegnehmen, aus dem
 * sie besteht. Wer umgekehrt Land ins Wasser schieben will, braucht ein
 * anderes Wort – die Landzunge, und die gibt es noch nicht.
 */
export function buchtZiehen(
  features: Kartenfeature[],
  spur: Punkt[],
  radius: number,
): Kartenfeature[] | undefined {
  let etwasGeschah = false;
  const naechste: Kartenfeature[] = [];

  for (const f of features) {
    const teile = f.art === 'wasser' ? undefined : abtragen(f.punkte, spur, radius);
    if (!teile) {
      naechste.push(f);
      continue;
    }
    etwasGeschah = true;
    /*
     * Eine leere Liste heisst: Der Strich hat die Fläche ganz weggenommen.
     * Dann wird hier nichts angehängt, und genau das ist richtig.
     */
    for (let i = 0; i < teile.length; i++) {
      /*
       * **Wer den Namen behält.** Das grösste Stück – `abtragen` liefert nach
       * Fläche sortiert – bleibt dieselbe Fläche: gleiche Kennung, gleicher
       * Startwert, gleiche Seite. Die übrigen werden namenlose Nachbarn
       * derselben Bedeutung.
       *
       * Beide Hälften automatisch an dieselbe Seite zu hängen hiesse zu
       * behaupten, der Verfasser habe zwei Orte gemeint, wo er einen Kanal
       * gezogen hat. Eine namenlose Landschaft ist in diesem Buch der übliche
       * Zustand, kein unfertiger.
       *
       * Den **Startwert erben sie trotzdem**, und das ist kein Widerspruch:
       * An ihm hängen die Bäume. Ein Wald, der beim Durchtrennen auf einer
       * Seite neu ausgewürfelt würde, spränge vor den Augen des Verfassers an
       * einen anderen Ort – und der Strich, den er gezogen hat, hätte etwas
       * verändert, das er nicht angefasst hat.
       */
      naechste.push(
        i === 0
          ? { ...f, punkte: teile[i] }
          : { ...neuesFeature(f.art, teile[i]), seed: f.seed },
      );
    }
  }

  return etwasGeschah ? naechste : undefined;
}
