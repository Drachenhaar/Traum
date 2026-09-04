/**
 * Die Ansatzmarken – wo das Buch Tiefe hat.
 *
 * ---
 *
 * **Das Problem, gemeldet in einem Satz.**
 *
 * „Man muss noch raten, ob man nun umblättert oder die Tiefe erwischt."
 *
 * Und das stimmte. Die Randstreifen sind vierunddreissig Punkte breit und
 * beginnen zwölf Punkte vom Rand – unsichtbar. Wer daneben aufsetzt, blättert
 * um. Blättern ist kein Schaden, aber es ist eine Antwort auf eine Frage, die
 * niemand gestellt hat, und man muss sie zurücknehmen, bevor man es noch
 * einmal versucht. Nach dem dritten Mal hört man auf, es zu versuchen.
 *
 * Die Geste war fertig gebaut, gemessen und richtig eingestellt – und trotzdem
 * praktisch unauffindbar. Eine Bedienung, die man nicht findet, gibt es nicht.
 *
 * ---
 *
 * **Warum eine Marke und keine Fläche.**
 *
 * Der naheliegende Weg wäre, den ganzen Streifen einzufärben. Das wäre eine
 * Bedienungsanleitung auf der Seite: vier getönte Balken um jedes Blatt, immer
 * sichtbar, und das Buch sähe aus wie ein Formular mit Rahmen.
 *
 * Ein Buch löst das seit Jahrhunderten anders. Es hat **Daumenkerben** – ein
 * Einschnitt an der Aussenkante, den man sieht, ohne ihn anzusehen, und der
 * nichts erklärt. Genau das ist hier gebaut: eine schmale Kerbe am äusseren
 * Ende des Streifens. Sie sagt „hier", nicht „so geht das".
 *
 * ---
 *
 * **Sie steht nur, wo es wirklich weitergeht.**
 *
 * Dieselbe Frage wie in `Raumschicht.runter`, mit derselben Funktion gestellt:
 * `gesteErlaubt`. Nicht eine zweite Meinung, die auseinanderlaufen kann –
 * sonst gäbe es Marken, unter denen nichts liegt, und das wäre schlimmer als
 * gar keine Marke. Die Regel „nichts erfinden" gilt auch für ein Versprechen
 * von vier Punkten Breite.
 *
 * ---
 *
 * **Antippen geht auch.**
 *
 * Das dritte Gesetz sagt: erst spüren, wohin man geht, dann sehen. Die Geste
 * bleibt deshalb der Hauptweg, und die Marke nimmt ihr nichts weg – ein Zug,
 * der auf ihr beginnt, wird ganz normal zur Reise, weil `BEDIENELEMENTE`
 * keinen Knopf kennt und der Rand dem Raum gehört.
 *
 * Aber wer nicht ziehen will oder nicht ziehen kann, kommt jetzt trotzdem
 * hinein. Über die Tastatur ging das mit Alt und Pfeiltaste immer schon; dass
 * es mit dem Finger nicht ging, war keine Entscheidung, sondern eine Lücke.
 */

import { useEffect, useLayoutEffect, useState } from 'react';
import { fenster } from './Raumschicht';
import { konfig, beiKonfig } from '../../lib/raum/konfig';
import type { Richtung } from '../../lib/raum/geste';
import { geltendeKarte, useRaum } from '../../lib/raum/useRaum';
import { gesteErlaubt } from '../../lib/raum/tiefenkarte';

const ALLE: Richtung[] = ['links', 'rechts', 'oben', 'unten'];

/**
 * Die Kerbe: sechsundfünfzig Punkte lang, vier dick.
 *
 * Der erste Bau nahm zweiundsiebzig auf zehn mit einem kräftigen Goldverlauf –
 * im gerenderten Bild waren das zwei gelbe Pillen auf dem Papier, und sie
 * sahen aus wie Haftnotizen. Eine Marke, die lauter ist als die Überschrift
 * der Seite, hat ihre Aufgabe verfehlt: Sie soll gefunden werden, wenn man
 * sie sucht, und übersehen, wenn man liest.
 */
const LAENGE = 56;
const DICKE = 4;

/**
 * Wo die Kerbe liegt – abgeleitet aus denselben Zahlen wie `randRichtung`.
 *
 * Sie sitzt am **äusseren** Ende des Streifens und ist schmaler als er. Das
 * ist Absicht: Der Streifen ist vierunddreissig Punkte breit und reicht damit
 * bis in den Satzspiegel hinein – gemessen auf 390 Punkten überlappt er die
 * letzten achtzehn Punkte der Textspalte. Eine Marke in voller Streifenbreite
 * läge also auf den Wörtern. Die schmale Kerbe zeigt den Anfang des Streifens;
 * der Rest von ihm bleibt stumm und funktioniert trotzdem.
 */
function kerbenlage(
  r: Richtung,
  feld: ReturnType<typeof fenster>,
  ein: number,
): { x: number; y: number; breite: number; hoehe: number } {
  const waagerecht = r === 'links' || r === 'rechts';
  const breite = waagerecht ? DICKE : LAENGE;
  const hoehe = waagerecht ? LAENGE : DICKE;
  const x =
    r === 'links' ? ein : r === 'rechts' ? feld.breite - ein - DICKE : (feld.breite - LAENGE) / 2;
  const y =
    r === 'oben'
      ? ein + feld.oben
      : r === 'unten'
        ? feld.hoehe - ein - feld.unten - DICKE
        : (feld.hoehe - LAENGE) / 2;
  return { x, y, breite, hoehe };
}

/**
 * Dieselbe Lage, nur als CSS.
 *
 * Abgeleitet und nicht zweitgerechnet: Es gab in diesem Projekt schon
 * mehrfach zwei Stellen, die dasselbe ausrechneten, und sie sind jedes Mal
 * auseinandergelaufen, ohne dass etwas kaputt aussah. Wer die Kerbe
 * verschiebt, verschiebt damit auch den Punkt, an dem nachgesehen wird, ob
 * dort schon etwas liegt.
 */
function stellung(r: Richtung, feld: ReturnType<typeof fenster>, ein: number) {
  const l = kerbenlage(r, feld, ein);
  return { left: l.x, top: l.y, width: l.breite, height: l.hoehe };
}

/*
 * Kein Richtungszeichen in der Marke.
 *
 * Es stand hier, klein und blass neben der Kerbe, und es war falsch – aus
 * zwei Gründen. Praktisch: Bei vier Punkten Kerbenbreite hat ein Zeichen von
 * zwanzig Punkten keinen Platz mehr, ohne in den Text zu ragen. Grundsätzlich:
 * Das dritte Gesetz sagt, dass man zuerst *spürt*, wohin man geht, und erst
 * dann sieht. Das grosse Zeichen kommt einem mitten in der Geste entgegen –
 * es hier vorwegzunehmen, nähme dem Augenblick des Erkennens seinen Anlass.
 *
 * Die Kerbe sagt „hier". Was dort liegt, sagt der Bogen. Für alle, die keine
 * Geste sehen, sagt es das `aria-label`.
 */

const WOHIN: Record<Richtung, string> = {
  links: 'zur Welt',
  rechts: 'zu den Wesen',
  oben: 'zum Wissen',
  unten: 'zu den Notizen',
};

export function Ansatzmarken({
  /** Öffnet die Richtung – dieselbe Folge wie am Ende einer vollen Geste. */
  onOeffne,
}: {
  onOeffne: (r: Richtung) => void;
}) {
  const ort = useRaum((s) => s.ort);
  const tiefe = useRaum((s) => s.tiefe);
  const phase = useRaum((s) => s.phase);
  const wahlPfad = useRaum((s) => s.wahlPfad);
  /*
   * `geltendeKarte` und nicht `tiefenkarte` – derselbe Griff wie in
   * `Tiefenmarke`, und aus demselben Grund: Wer das Fach der Seite direkt
   * liest, bekommt auf jeder Seite ohne eigene Tiefe eine leere Karte und
   * zeigt gar nichts an, obwohl die Geste dort sehr wohl etwas öffnet.
   */
  const karte = useRaum(geltendeKarte);

  /*
   * Das Feld wird gemessen, nicht geraten – und beim Drehen des Geräts neu.
   * Es steht in einem Zustand statt in einem Ref, weil sich die Marken danach
   * wirklich verschieben müssen.
   */
  const [feld, setzeFeld] = useState(() => fenster());
  useEffect(() => {
    const neu = () => setzeFeld(fenster());
    neu();
    window.addEventListener('resize', neu);
    window.addEventListener('orientationchange', neu);
    const abKonfig = beiKonfig(neu);
    return () => {
      window.removeEventListener('resize', neu);
      window.removeEventListener('orientationchange', neu);
      abKonfig();
    };
  }, []);

  /*
   * Wo schon ein Bedienelement an der Kante sitzt, tritt die Kerbe zurück.
   *
   * ---
   *
   * **Der Fehler, den diese Datei selbst verursacht hat.**
   *
   * Die Charakterseite trägt ein Daumenregister an der Aussenkante. Ihr
   * Quelltext beschreibt den Entwurf in einem Satz: „Ein Tipp gehört ihnen,
   * ein Zug gehört dem Raum." Das war ein guter Kompromiss – bis die Kerbe
   * **antippbar** wurde. Seither lag sie mit ihrer Trefferfläche über den
   * Reitern, und wer das Register am äusseren Rand antippte, landete in der
   * Tiefe. Gemessen: an (376, 422) lagen drei Lagen Ansatzmarke über dem
   * Registerknopf; die Reiter selbst reichen von 334 bis 390, die Kerbe von
   * 367 bis 385.
   *
   * Gemeldet wurde es als: „Wenn ich mich rechts durchnavigieren möchte,
   * klicke ich unweigerlich auf die Tiefe."
   *
   * Die Antwort ist nicht, das Register auf die andere Seite zu legen – dort
   * liegt derselbe Streifen für eine andere Richtung, und der Fehler zöge mit
   * um. Sie ist: **Eine Kerbe wird nicht über etwas gelegt, das schon da
   * ist.** Der Streifen bleibt; ein Zug von dort führt weiter in die Tiefe,
   * genau wie beschrieben. Nur das Bild und sein Tipp treten zurück.
   *
   * Gefragt wird nicht nach Namen, sondern nach dem, was wirklich unter dem
   * Punkt liegt – `elementsFromPoint`. Eine Liste bekannter Bauteile wäre beim
   * nächsten Bauteil unvollständig, ohne dass etwas auffällt.
   */
  /*
   * Diese beiden stehen **vor** dem Effekt und vor jedem vorzeitigen
   * Zurückkehren – und das ist keine Kosmetik.
   *
   * Sie standen darunter. Sobald eine Geste begann, kehrte die Komponente bei
   * `phase !== 'ruhe'` zurück, bevor `ein` zugewiesen war; der Effekt lief
   * trotzdem und griff in ein Feld, das es in diesem Durchlauf nie gegeben
   * hatte. Das Ergebnis war kein falsches Bild, sondern ein Absturz –
   * „Diese Seite ist gerissen", genau beim Ziehen vom Rand.
   *
   * **Ein Haken läuft auch dann, wenn der Anstrich vorher aufgibt.** Was er
   * anfasst, muss deshalb schon dastehen.
   */
  const ein = konfig().geste.randEinzugPx;
  const stand = { ort, tiefe };

  const [verdeckt, setVerdeckt] = useState<Richtung[]>([]);
  useLayoutEffect(() => {
    const mitte = (r: Richtung) => {
      const l = kerbenlage(r, feld, ein);
      return [l.x + l.breite / 2, l.y + l.hoehe / 2] as const;
    };
    const jetzt = ALLE.filter((r) => {
      const [x, y] = mitte(r);
      return document
        .elementsFromPoint(x, y)
        .some((e) => !e.closest('[data-ansatzmarke]') && e.closest('button, a[href]'));
    });
    setVerdeckt((alt) =>
      alt.length === jetzt.length && alt.every((r, i) => r === jetzt[i]) ? alt : jetzt,
    );
  });

  /*
   * Während einer Geste treten die Marken zurück.
   *
   * Ab da spricht der Bogen, und er sagt dasselbe, nur genauer. Zwei Zeichen
   * für einen Vorgang gleichzeitig wären ein Gedränge – und ausgerechnet in
   * dem Augenblick, in dem der Blick woanders hingehört.
   */
  if (phase !== 'ruhe') return null;

  const offen = ALLE.filter(
    (r) => gesteErlaubt(karte, stand, r, wahlPfad) && !verdeckt.includes(r),
  );
  if (!offen.length) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[44]">
      {offen.map((r) => (
        <button
          key={r}
          type="button"
          data-ansatzmarke={r}
          /*
           * Nur die erste Kerbe trägt das Leitfaden-Merkmal. Der Wegweiser
           * nimmt ohnehin das erste Element, das er findet, und vier Ziele
           * für einen Satz wären drei zu viel.
           */
          data-leitfaden={r === offen[0] ? 'tiefe' : undefined}
          onClick={() => onOeffne(r)}
          aria-label={`${karte[r]?.name ?? WOHIN[r]} öffnen`}
          className="dc-ansatz pointer-events-auto absolute no-tap-highlight"
          style={stellung(r, feld, ein)}
        >
          {/*
            Die Kerbe selbst füllt den Knopf; die Trefferfläche wächst in der
            CSS über ein `::after` nach aussen. So ist das Ziel
            vierundvierzig Punkte gross und das Bild trotzdem vier.
          */}
          <span aria-hidden className="dc-ansatz-kerbe absolute inset-0 block rounded-full" />

        </button>
      ))}
    </div>
  );
}
