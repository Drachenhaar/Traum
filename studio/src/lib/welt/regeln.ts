/**
 * Was der Welt auffällt.
 *
 * Eine Regel liest, was dasteht, und hält es gegen das, was ebenfalls
 * dasteht. Sie kann sich nichts ausdenken – das ist der Grund, warum hier
 * feste Regeln stehen und keine Maschine, die Text errät.
 *
 * Und sie ändert **nie** etwas. Jeder Befund ist eine Frage an den Verfasser,
 * keine Korrektur. Eine Fantasy-Welt darf ungewöhnliche Regeln haben: Wenn
 * der Waldkoi im Nebelwald lebt und eine Blüte frisst, die nur in der
 * Glutwüste wächst, dann ist das vielleicht ein Fehler – oder das
 * Interessanteste an ihm. Diese Datei weiß das nicht und behauptet es auch
 * nicht. Sie sagt nur: *hier ist etwas.*
 *
 * Deshalb sind alle Texte als Beobachtung formuliert und nicht als Vorwurf.
 * „Möglicher Widerspruch" statt „Fehler". „Noch nichts bekannt" statt
 * „fehlt". Wer seine eigene Welt ansieht, soll etwas entdecken und nicht
 * abgemahnt werden.
 *
 * Eine neue Regel ist ein Eintrag in `WELTREGELN` und sonst nichts.
 */

import type { Befund } from '../chronik/pruefung';
import { pruefe } from '../chronik/pruefung';
import {
  folge,
  hatBeziehung,
  ohneBeziehung,
  ohneBild,
  vomTyp,
  type Weltsicht,
} from './abfrage';

export type Schwere = 'widerspruch' | 'frage' | 'luecke';

/**
 * Eine Regel.
 *
 * `name` und `beschreibung` stehen hier, weil eine Regel erklärbar sein muss:
 * Wer einen Befund nicht versteht, soll nachlesen können, wonach überhaupt
 * gesucht wurde – und wer ihn für Unsinn hält, soll sehen, dass dahinter kein
 * Orakel steht, sondern ein Satz, den ein Mensch geschrieben hat.
 */
export interface Weltregel {
  id: string;
  name: string;
  beschreibung: string;
  schwere: Schwere;
  pruefe: (sicht: Weltsicht) => Befund[];
}

/* ------------------------------------------------------- Was wo lebt ---- */

/** Typen, die einen Lebensraum haben können. */
const LEBEWESEN = ['creature', 'animal'];
const PFLANZEN = ['plant'];
const ORTE = ['location', 'biome'];

/**
 * Wo etwas vorkommt – der Ort hinter einem Lebewesen oder einer Pflanze.
 *
 * Ein Wesen „lebt in" seinem Ort, eine Pflanze „wächst in" ihrem. Zwei Arten
 * für dieselbe Frage, deshalb beide.
 */
function vorkommen(sicht: Weltsicht, id: string): string[] {
  return [...folge(sicht, id, 'lives_in'), ...folge(sicht, id, 'grows_in')].map((e) => e.id);
}

/**
 * Ein Ort und alles, was ihn enthält.
 *
 * Wer im Observatorium lebt, lebt auch in der Mooshalde. Ohne diesen Aufstieg
 * meldete die Habitat-Regel jeden Bewohner eines Zimmers als Widerspruch zu
 * einer Pflanze, die im selben Wald wächst. Die Höhe ist begrenzt: Ein Zyklus
 * in „enthält" wäre sonst eine Endlosschleife, und Zyklen gibt es in
 * selbstgebauten Welten.
 */
function ortMitUmgebung(sicht: Weltsicht, id: string, tiefe = 6): Set<string> {
  const gesehen = new Set<string>([id]);
  let rand = [id];
  for (let i = 0; i < tiefe && rand.length; i++) {
    const naechste: string[] = [];
    for (const x of rand) {
      for (const eltern of folge(sicht, x, 'contains', 'herein')) {
        if (gesehen.has(eltern.id)) continue;
        gesehen.add(eltern.id);
        naechste.push(eltern.id);
      }
    }
    rand = naechste;
  }
  return gesehen;
}

/* ------------------------------------------------------------- Regeln ---- */

/**
 * Die Zeitregeln der Chronik.
 *
 * Sie stehen seit langem in `chronik/pruefung.ts` und werden dort auch vom
 * Zeitstrahl benutzt. Sie werden hier *nicht* abgeschrieben, sondern
 * aufgerufen: Zwei Fassungen derselben Regel wären zwei Fassungen, die
 * auseinanderlaufen.
 */
const zeitregeln: Weltregel = {
  id: 'zeit',
  name: 'Die Zeit der Welt',
  beschreibung:
    'Ende vor Beginn, Wirkung vor Ursache, jemand, der nach seinem Tod noch auftritt – und Zeitangaben, die sich nicht lesen lassen.',
  schwere: 'widerspruch',
  pruefe: (sicht) => pruefe(sicht.datierte, sicht.relations, sicht.kalender),
};

/**
 * Der Waldkoi und die Sonnenblüte.
 *
 * Ein Wesen lebt hier, ernährt sich aber von etwas, das nur dort wächst.
 * Genau der Fall aus dem Auftrag – und der Grund, warum das ein *möglicher*
 * Widerspruch ist und kein Fehler: Vielleicht wandert es. Vielleicht wird es
 * beliefert. Vielleicht ist gerade das seine Geschichte.
 */
const nahrungWeitWeg: Weltregel = {
  id: 'nahrung-fern',
  name: 'Nahrung aus der Ferne',
  beschreibung:
    'Ein Wesen lebt an einem Ort, ernährt sich aber von etwas, dessen einziges bekanntes Vorkommen woanders liegt.',
  schwere: 'frage',
  pruefe: (sicht) => {
    const befunde: Befund[] = [];
    for (const wesen of vomTyp(sicht, ...LEBEWESEN)) {
      const zuhause = vorkommen(sicht, wesen.id);
      if (!zuhause.length) continue;
      const umher = new Set(zuhause.flatMap((o) => [...ortMitUmgebung(sicht, o)]));

      /* Was es benutzt oder woraus es besteht – so weit reicht das Modell. */
      const nahrung = [...folge(sicht, wesen.id, 'uses'), ...folge(sicht, wesen.id, 'made_of')];
      for (const n of nahrung) {
        if (!PFLANZEN.includes(n.type)) continue;
        const waechst = vorkommen(sicht, n.id);
        if (!waechst.length) continue;
        const erreichbar = waechst.some((o) =>
          [...ortMitUmgebung(sicht, o)].some((x) => umher.has(x)),
        );
        if (erreichbar) continue;
        const dort = sicht.byId.get(waechst[0]);
        const hier = sicht.byId.get(zuhause[0]);
        befunde.push({
          id: `nahrung-fern:${wesen.id}:${n.id}`,
          art: 'frage',
          betrifft: [wesen.id, n.id],
          text: `„${wesen.title}“ lebt in ${hier ? `„${hier.title}“` : 'seinem Gebiet'}, braucht aber „${n.title}“ – und die wächst bisher nur in ${dort ? `„${dort.title}“` : 'einer anderen Gegend'}. Ein weiter Weg für eine Mahlzeit.`,
        });
      }
    }
    return befunde;
  },
};

/**
 * Woher das Holz kommt.
 *
 * Ein Gegenstand besteht aus einem Material, das Material stammt von einer
 * Pflanze – und die wächst nirgends. Die Kette endet im Nichts.
 */
const herkunftEndetOffen: Weltregel = {
  id: 'herkunft-offen',
  name: 'Eine Kette, die im Nichts endet',
  beschreibung:
    'Ein Material stammt von etwas, dessen Vorkommen nirgends steht – die Herkunft bricht ab.',
  schwere: 'luecke',
  pruefe: (sicht) => {
    const befunde: Befund[] = [];
    for (const material of vomTyp(sicht, 'material')) {
      const quellen = folge(sicht, material.id, 'comes_from');
      if (!quellen.length) continue;
      for (const q of quellen) {
        if (vorkommen(sicht, q.id).length) continue;
        if (hatBeziehung(sicht, q.id, 'contains', 'herein')) continue;
        befunde.push({
          id: `herkunft-offen:${material.id}:${q.id}`,
          art: 'luecke',
          betrifft: [q.id, material.id],
          text: `„${material.title}“ stammt von „${q.title}“ – aber wo „${q.title}“ vorkommt, ist noch nirgends festgehalten.`,
        });
      }
    }
    return befunde;
  },
};

/**
 * Was noch nirgendwo steht.
 *
 * Eine Regel für viele Fälle: Pflanze ohne Biom, Wesen ohne Lebensraum,
 * Gebäude ohne Ort, Material ohne Herkunft. Sie zählt und nennt, statt
 * hundert einzelne Zeilen zu erzeugen – hundert Hinweise sind kein Hinweis.
 */
interface Luecke {
  typen: string[];
  art: string;
  richtung: 'hinaus' | 'herein' | 'egal';
  einzeln: (titel: string) => string;
  viele: (n: number) => string;
}

const LUECKEN: Luecke[] = [
  {
    typen: PFLANZEN,
    art: 'grows_in',
    richtung: 'hinaus',
    einzeln: (t) => `Wo „${t}“ wächst, ist noch nicht gesagt.`,
    viele: (n) => `${n} Pflanzen wachsen bisher nirgendwo – ihr Boden fehlt noch.`,
  },
  {
    typen: LEBEWESEN,
    art: 'lives_in',
    richtung: 'hinaus',
    einzeln: (t) => `„${t}“ hat noch keinen Ort, an dem es lebt.`,
    viele: (n) => `${n} Wesen haben noch keinen Lebensraum.`,
  },
  {
    typen: ['material'],
    art: 'comes_from',
    richtung: 'hinaus',
    einzeln: (t) => `Woher „${t}“ stammt, ist noch offen.`,
    viele: (n) => `Bei ${n} Materialien ist die Herkunft noch offen.`,
  },
  {
    typen: ['architecture'],
    art: 'contains',
    richtung: 'herein',
    einzeln: (t) => `„${t}“ steht noch an keinem Ort.`,
    viele: (n) => `${n} Bauwerke stehen noch an keinem Ort.`,
  },
  {
    typen: ['character'],
    art: 'lives_in',
    richtung: 'hinaus',
    einzeln: (t) => `„${t}“ hat noch kein Zuhause in deiner Welt.`,
    viele: (n) => `${n} Figuren haben noch kein Zuhause.`,
  },
];

const offeneEnden: Weltregel = {
  id: 'offene-enden',
  name: 'Offene Enden',
  beschreibung:
    'Eine Pflanze ohne Boden, ein Wesen ohne Lebensraum, ein Material ohne Herkunft, ein Bauwerk ohne Ort, eine Figur ohne Zuhause.',
  schwere: 'luecke',
  pruefe: (sicht) =>
    LUECKEN.flatMap((l) => {
      const offen = ohneBeziehung(sicht, l.typen, l.art, l.richtung);
      if (!offen.length) return [];
      if (offen.length <= 3) {
        return offen.map((e) => ({
          id: `offen:${l.art}:${e.id}`,
          art: 'luecke' as const,
          betrifft: [e.id],
          text: l.einzeln(e.title),
        }));
      }
      return [
        {
          id: `offen:${l.art}`,
          art: 'luecke' as const,
          betrifft: offen.map((e) => e.id),
          text: l.viele(offen.length),
        },
      ];
    }),
};

/**
 * Eine Fraktion ohne Heimat.
 *
 * Wer zu jemandem gehört, gehört meist auch irgendwohin. Steht bei einer
 * Gemeinschaft kein Ort, fehlt der Welt ein Stück Landkarte.
 */
const fraktionOhneHeimat: Weltregel = {
  id: 'fraktion-ohne-heimat',
  name: 'Eine Gemeinschaft ohne Ort',
  beschreibung: 'Figuren gehören zu etwas, das selbst nirgendwo zuhause ist.',
  schwere: 'luecke',
  pruefe: (sicht) => {
    const gemeinschaften = new Set<string>();
    for (const r of sicht.relations) {
      if (r.type === 'member_of') gemeinschaften.add(r.toId);
    }
    return [...gemeinschaften]
      .map((id) => sicht.byId.get(id))
      .filter((e): e is NonNullable<typeof e> => !!e)
      .filter(
        (e) =>
          !ORTE.includes(e.type) &&
          !hatBeziehung(sicht, e.id, 'lives_in', 'hinaus') &&
          !hatBeziehung(sicht, e.id, 'contains', 'herein') &&
          !hatBeziehung(sicht, e.id, 'ruled', 'hinaus'),
      )
      .map((e) => ({
        id: `fraktion-ohne-heimat:${e.id}`,
        art: 'luecke' as const,
        betrifft: [e.id],
        text: `Zu „${e.title}“ gehören Figuren – aber wo „${e.title}“ selbst zuhause ist, steht noch nirgends.`,
      }));
  },
};

/**
 * Noch ohne Bild.
 *
 * Nur für Orte und Bauwerke, und nur wenn sie im Buch schon etwas bedeuten –
 * gemessen daran, wie viele Verbindungen an ihnen hängen. Eine gerade
 * angelegte Seite ohne Bild ist keine Lücke, sondern eine junge Seite.
 */
const ohneTafel: Weltregel = {
  id: 'ohne-bild',
  name: 'Noch ohne Bild',
  beschreibung: 'Ein Ort, an dem in deiner Welt viel hängt, hat noch keine Tafel.',
  schwere: 'luecke',
  pruefe: (sicht) => {
    const wichtig = ohneBild(sicht, [...ORTE, 'architecture']).filter((e) => {
      const grad =
        (sicht.index.out.get(e.id)?.length ?? 0) + (sicht.index.in.get(e.id)?.length ?? 0);
      return grad >= 3;
    });
    if (!wichtig.length) return [];
    if (wichtig.length <= 3) {
      return wichtig.map((e) => ({
        id: `ohne-bild:${e.id}`,
        art: 'luecke' as const,
        betrifft: [e.id],
        text: `„${e.title}“ trägt viel in deiner Welt – und hat noch kein Bild.`,
      }));
    }
    return [
      {
        id: 'ohne-bild',
        art: 'luecke' as const,
        betrifft: wichtig.map((e) => e.id),
        text: `${wichtig.length} Orte, an denen in deiner Welt viel hängt, haben noch kein Bild.`,
      },
    ];
  },
};

/**
 * Eine Seite ganz für sich.
 *
 * Kein Widerspruch und kein Fehler – aber in einem Buch, das vom Verbinden
 * lebt, ist eine Seite ohne jede Verbindung eine Frage wert.
 */
const ohneVerbindung: Weltregel = {
  id: 'ohne-verbindung',
  name: 'Seiten ganz für sich',
  beschreibung: 'Einträge, an denen keine einzige Verbindung hängt.',
  schwere: 'luecke',
  pruefe: (sicht) => {
    /* Romanteile haengen an ihrem Kapitel, Gedanken sind absichtlich lose. */
    const egal = new Set(['roman', 'kapitel', 'szene', 'page', 'prompt', 'asset']);
    const allein = sicht.lebende.filter(
      (e) =>
        !egal.has(e.type) &&
        !(sicht.index.out.get(e.id)?.length ?? 0) &&
        !(sicht.index.in.get(e.id)?.length ?? 0),
    );
    if (allein.length < 2) return [];
    return [
      {
        id: 'ohne-verbindung',
        art: 'luecke',
        betrifft: allein.map((e) => e.id),
        text: `${allein.length} Seiten stehen noch ganz für sich – ohne eine einzige Verbindung zum Rest deiner Welt.`,
      },
    ];
  },
};

/* ---------------------------------------------------------- Das Register -- */

export const WELTREGELN: Weltregel[] = [
  zeitregeln,
  nahrungWeitWeg,
  herkunftEndetOffen,
  fraktionOhneHeimat,
  offeneEnden,
  ohneTafel,
  ohneVerbindung,
];

const RANG: Record<Schwere, number> = { widerspruch: 0, frage: 1, luecke: 2 };

/**
 * Alle Regeln auf eine Welt.
 *
 * Widersprüche zuerst – sie sind das, wovon der Verfasser wissen muss.
 * Lücken zuletzt: Sie sind kein Fehler, sondern unfertige Arbeit.
 *
 * Eine Regel, die wirft, nimmt nicht die anderen mit. Eine Welt kann seltsam
 * sein, und eine seltsame Welt darf nicht dazu führen, dass gar nichts mehr
 * angezeigt wird.
 */
export function pruefeWelt(sicht: Weltsicht): Befund[] {
  const alle: Befund[] = [];
  for (const regel of WELTREGELN) {
    try {
      alle.push(...regel.pruefe(sicht));
    } catch (err) {
      console.error(`Regel „${regel.id}" ist gestolpert`, err);
    }
  }
  return alle.sort((a, b) => RANG[a.art] - RANG[b.art]);
}

export type { Befund };
