/**
 * Was der Spiegel sehen kann.
 *
 * Jede Regel bekommt das Werk und gibt Beobachtungen zurueck – oder nichts.
 * Nichts ist der Normalfall und kein Versagen: Der Spiegel „darf lieber lange
 * schweigen als oberflaechliche Aussagen produzieren".
 *
 * Drei Gesetze gelten fuer jede Regel hier, ohne Ausnahme:
 *
 * 1. **Werk vor Person.** Keine Beobachtung spricht ueber den Verfasser. Nicht
 *    „du bist", sondern „in deinen Welten faellt auf". Das ist keine
 *    Formulierungsfrage – es ist der Unterschied zwischen einem Werkzeug und
 *    einer Anmassung.
 * 2. **Nichts ohne Grundlage.** Jede Beobachtung nennt die Eintraege, auf denen
 *    sie beruht. Wer fragt „warum zeigt mir das Buch das?", bekommt eine
 *    Antwort und keine Andeutung.
 * 3. **Nutzen vor Atmosphaere.** Jede Beobachtung erfuellt einen der fuenf
 *    Zwecke. Was keinen erfuellt, wird nicht gezeigt, egal wie schoen es
 *    klingt.
 */

import type { Entry, Relation } from '../../types';
import { templateFor, asList, asText } from '../templates';
import { relationType } from '../relations';
import { farbspuren, wortspuren, type Wortspur } from './lesen';
import { datiere } from '../chronik/zustand';
import { ausOrdnung, jahrLaenge, schreibeJahr } from '../chronik/zeit';

export type Zweck = 'widerspruch' | 'moeglichkeit' | 'entwicklung' | 'muster' | 'frage';

export interface Beobachtung {
  id: string;
  /** Das Motiv oder Thema, in einem oder zwei Worten. */
  motiv: string;
  /** Was der Spiegel gesehen hat – ein Satz, ruhig, ohne Urteil. */
  text: string;
  zweck: Zweck;
  /** Die Eintraege, auf denen sie beruht. Ohne diese wird nichts gezeigt. */
  belege: string[];
  /** Wie das Buch darauf gekommen ist – wortwoertlich, nicht poetisch. */
  herkunft: string;
  /** Wie viel dahintersteht. Bestimmt die Reihenfolge. */
  staerke: number;
}

export interface Werk {
  entries: Entry[];
  relations: Relation[];
}

type Regel = (w: Werk) => Beobachtung[];

/* ------------------------------------------------------- 1 Wiederkehrende */

/**
 * Ein Motiv ist erst eines, wenn es in Dingen auftaucht, die nichts
 * miteinander zu tun haben. Ein Wort, das nur in Orten vorkommt, ist eine
 * Beschreibung; eines, das in Orten, Figuren und Geschichten vorkommt, ist
 * eine Spur.
 */
const MOTIV_MINDESTENS = 4;
const MOTIV_TYPEN = 2;

function motive(w: Werk): Wortspur[] {
  return wortspuren(w.entries).filter(
    (s) => s.in.length >= MOTIV_MINDESTENS && s.typen.size >= MOTIV_TYPEN,
  );
}

const wiederkehrend: Regel = (w) =>
  motive(w)
    .slice(0, 4)
    .map((s) => ({
      id: `motiv:${s.stamm}`,
      motiv: s.form.charAt(0).toUpperCase() + s.form.slice(1),
      text: `„${s.form}“ kehrt in ${s.in.length} Seiten wieder – über ${s.typen.size} verschiedene Arten von Einträgen hinweg.`,
      zweck: 'muster' as const,
      belege: s.in,
      herkunft: `Das Wort erscheint in ${s.in.length} Einträgen, verteilt auf ${[...s.typen].map((t) => templateFor(t as Entry['type']).labelPlural).join(', ')}.`,
      staerke: s.in.length * s.typen.size,
    }));

/* --------------------------------------------------------------- 2 Farbe */

const farbklang: Regel = (w) => {
  const spuren = farbspuren(w.entries).filter((f) => f.in.length >= 4);
  if (spuren.length === 0) return [];

  const [erste, zweite] = spuren;
  const gesamt = spuren.reduce((n, f) => n + f.in.length, 0);
  /* Nur, wenn ein Ton wirklich heraussticht – sonst ist es nur eine Palette. */
  if (erste.in.length < gesamt * 0.34) return [];

  /*
   * Und nur, wenn er den zweiten deutlich hinter sich lässt.
   *
   * Ohne diese Zeile stand „häufiger als jeder andere Ton“ auch dann da,
   * wenn zwei Töne gleichauf lagen – eine Aussage, die schlicht nicht stimmt.
   * Ein Fünftel Vorsprung ist die Grenze; darunter schweigt der Spiegel
   * lieber, als sich auf einen Zufall der Sortierung zu verlassen.
   */
  if (zweite && erste.in.length < zweite.in.length * 1.2) return [];

  return [
    {
      id: `farbe:${erste.ton}`,
      motiv: erste.ton,
      text: `${erste.ton} liegt über ${erste.in.length} deiner Farbklänge – häufiger als jeder andere Ton.`,
      zweck: 'muster',
      belege: erste.in,
      herkunft: `Aus den Farbwerten der Seiten: ${spuren
        .slice(0, 4)
        .map((f) => `${f.ton} ${f.in.length}×`)
        .join(', ')}.`,
      staerke: erste.in.length,
    },
  ];
};

/* --------------------------------------------------------- 3 Beziehungen */

const beziehungsformen: Regel = (w) => {
  if (w.relations.length < 10) return [];

  const nach = new Map<string, string[]>();
  for (const r of w.relations) {
    if (!nach.has(r.type)) nach.set(r.type, []);
    nach.get(r.type)!.push(r.fromId, r.toId);
  }

  const sortiert = [...nach.entries()].sort((a, b) => b[1].length - a[1].length);
  const [haeufigste] = sortiert;
  if (!haeufigste) return [];

  const anzahl = haeufigste[1].length / 2;
  if (anzahl < 4) return [];

  return [
    {
      id: `beziehung:${haeufigste[0]}`,
      motiv: relationType(haeufigste[0]).label,
      text: `„${relationType(haeufigste[0]).label}“ ist die Verbindung, die deine Welt am häufigsten knüpft – ${anzahl}-mal.`,
      zweck: 'muster',
      belege: [...new Set(haeufigste[1])],
      herkunft: `Von ${w.relations.length} Verbindungen sind ${anzahl} von dieser Art.`,
      staerke: anzahl,
    },
  ];
};

/* ------------------------------------------------------- 4 Blinder Fleck */

/**
 * Was erstaunlich selten vorkommt.
 *
 * Nicht als Vorwurf. Eine Vorlage fragt nach vielem, und niemand beantwortet
 * alles – aber wenn eine Frage bei fast allen Seiten einer Art offenbleibt,
 * liegt dort ungenutzter Raum. Das ist der Unterschied zwischen „du hast
 * vergessen" und „hier ist noch nichts".
 */
const blinderFleck: Regel = (w) => {
  const nachTyp = new Map<string, Entry[]>();
  for (const e of w.entries) {
    if (!nachTyp.has(e.type)) nachTyp.set(e.type, []);
    nachTyp.get(e.type)!.push(e);
  }

  const funde: Beobachtung[] = [];

  for (const [typ, liste] of nachTyp) {
    if (liste.length < 5) continue;
    const tpl = templateFor(typ as Entry['type']);

    for (const f of tpl.fields) {
      if (f.kind === 'images' || f.kind === 'entries' || f.kind === 'palette') continue;
      const leer = liste.filter((e) => {
        const v = e.fields[f.key];
        return !asText(v).trim() && asList(v).length === 0 && v !== true;
      });
      /* Fast alle, aber nicht buchstaeblich alle: Ein Feld, das nie jemand
         angefasst hat, ist eher unpassend als ein blinder Fleck. */
      const anteil = leer.length / liste.length;
      if (anteil < 0.85 || leer.length === liste.length) continue;

      funde.push({
        id: `leer:${typ}:${f.key}`,
        motiv: f.label,
        text: `${liste.length} ${tpl.labelPlural} stehen im Buch – bei ${leer.length} davon ist „${f.label}“ noch offen. Hier könnte unentdeckter Raum liegen.`,
        zweck: 'moeglichkeit',
        belege: leer.map((e) => e.id),
        herkunft: `Das Feld „${f.label}“ der Vorlage „${tpl.label}“ ist bei ${leer.length} von ${liste.length} Seiten leer.`,
        staerke: leer.length,
      });
    }
  }

  /* Hoechstens zwei – sonst liest sich der Spiegel wie eine Mängelliste. */
  return funde.sort((a, b) => b.staerke - a.staerke).slice(0, 2);
};

/* ----------------------------------------------------- 5 Über die Zeit */

/**
 * Was sich veraendert hat.
 *
 * Verglichen wird die aeltere Haelfte der Arbeit mit der juengeren – nach
 * Anlagedatum, nicht nach Weltzeit. Nur Unterschiede, keine Deutung: „Deine
 * Welten haben sich veraendert" und dann, was anders ist.
 */
const veraenderung: Regel = (w) => {
  const nachAlter = [...w.entries].sort((a, b) => a.createdAt - b.createdAt);
  if (nachAlter.length < 24) return [];

  const mitte = Math.floor(nachAlter.length / 2);
  const frueh = nachAlter.slice(0, mitte);
  const spaet = nachAlter.slice(mitte);

  /* Mindestens ein paar Wochen Abstand – sonst vergleicht man einen Nachmittag. */
  const spanne = nachAlter[nachAlter.length - 1].createdAt - nachAlter[0].createdAt;
  if (spanne < 1000 * 60 * 60 * 24 * 21) return [];

  const anteil = (liste: Entry[]) => {
    const n = new Map<string, number>();
    for (const e of liste) n.set(e.type, (n.get(e.type) ?? 0) + 1);
    return n;
  };

  const a = anteil(frueh);
  const b = anteil(spaet);
  const typen = new Set([...a.keys(), ...b.keys()]);

  let staerkste: { typ: string; delta: number } | undefined;
  for (const t of typen) {
    const va = (a.get(t) ?? 0) / frueh.length;
    const vb = (b.get(t) ?? 0) / spaet.length;
    const delta = vb - va;
    if (!staerkste || Math.abs(delta) > Math.abs(staerkste.delta)) staerkste = { typ: t, delta };
  }
  if (!staerkste || Math.abs(staerkste.delta) < 0.12) return [];

  const tpl = templateFor(staerkste.typ as Entry['type']);
  const mehr = staerkste.delta > 0;
  const betroffen = (mehr ? spaet : frueh).filter((e) => e.type === staerkste!.typ).map((e) => e.id);

  return [
    {
      id: `wandel:${staerkste.typ}`,
      motiv: tpl.labelPlural,
      text: mehr
        ? `${tpl.labelPlural} nehmen in deiner jüngeren Arbeit deutlich mehr Raum ein als in der früheren.`
        : `${tpl.labelPlural} standen früher stärker im Vordergrund als heute.`,
      zweck: 'entwicklung',
      belege: betroffen,
      herkunft: `Die ältere Hälfte deiner Seiten (${frueh.length}) gegen die jüngere (${spaet.length}), nach Anlagedatum – der Anteil verschiebt sich um ${Math.round(Math.abs(staerkste.delta) * 100)} Punkte.`,
      staerke: Math.round(Math.abs(staerkste.delta) * 100),
    },
  ];
};

/* ------------------------------------------------- 6 Wandel in der Welt */

/**
 * Wie sich die Welt ueber ihre eigenen Jahrhunderte veraendert.
 *
 * Nicht zu verwechseln mit `veraenderung` darueber: Die vergleicht die
 * aeltere Haelfte *der Arbeit* mit der juengeren, nach Anlagedatum. Das ist
 * eine Aussage ueber den Verfasser und seine Monate.
 *
 * Hier geht es um die Welt selbst. Was erzaehlen die fruehen Jahrhunderte,
 * was die spaeten? Das ist die interessantere Frage – und die einzige, die
 * einer Welt gehoert statt ihrem Schreiber.
 *
 * Verglichen werden Motive, nicht Eintragsarten: „Nebel" sagt mehr ueber
 * eine Zeit als „drei Orte mehr".
 */
const MINDESTENS_DATIERT = 12;
/** Unter zwanzig Jahren Spanne ist „frueh und spaet" kein Unterschied. */
const MINDESTSPANNE_JAHRE = 20;

const weltwandel: Regel = (w) => {
  const datiert = datiere(w.entries).filter((d) => d.zeit.von !== undefined);
  if (datiert.length < MINDESTENS_DATIERT) return [];

  const sortiert = [...datiert].sort((a, b) => a.zeit.von! - b.zeit.von!);
  const spanne = sortiert[sortiert.length - 1].zeit.von! - sortiert[0].zeit.von!;
  if (spanne < jahrLaenge() * MINDESTSPANNE_JAHRE) return [];

  const mitte = Math.floor(sortiert.length / 2);
  const frueh = sortiert.slice(0, mitte);
  const spaet = sortiert.slice(mitte);
  const grenze = ausOrdnung(spaet[0].zeit.von!).jahr;

  /* Anteil je Motiv in beiden Haelften. */
  const anteile = (liste: typeof frueh) => {
    const n = new Map<string, { anzahl: number; ids: string[]; form: string }>();
    for (const s of wortspuren(liste.map((d) => d.entry))) {
      n.set(s.stamm, { anzahl: s.in.length, ids: s.in, form: s.form });
    }
    return n;
  };

  const a = anteile(frueh);
  const b = anteile(spaet);

  let staerkste:
    | { stamm: string; form: string; ids: string[]; delta: number; spaeter: boolean }
    | undefined;

  /*
   * Der Vergleich muss bei gleichem Ausschlag immer dasselbe ergeben.
   *
   * Bei einer Welt, die frueh vom Krieg und spaet vom Handel erzaehlt, sind
   * beide Beobachtungen gleich stark und beide wahr. Welche erschien, entschied
   * vorher die Reihenfolge einer Menge – also der Zufall. Zweimal dasselbe
   * Buch haette zwei verschiedene Spiegelungen ergeben, und ein Spiegel, der
   * bei gleichem Bild etwas anderes zeigt, ist keiner.
   *
   * Entschieden wird jetzt nach Ausschlag, dann nach Belegen, zuletzt nach
   * dem Wort selbst. Das bevorzugt nichts – es legt nur fest.
   */
  for (const stamm of [...new Set([...a.keys(), ...b.keys()])].sort()) {
    const va = (a.get(stamm)?.anzahl ?? 0) / frueh.length;
    const vb = (b.get(stamm)?.anzahl ?? 0) / spaet.length;
    const delta = vb - va;
    /* Mindestens drei Seiten in der staerkeren Haelfte – sonst ist es Zufall. */
    const stark = delta > 0 ? b.get(stamm) : a.get(stamm);
    if (!stark || stark.anzahl < 3) continue;

    if (!staerkste) {
      staerkste = { stamm, form: stark.form, ids: stark.ids, delta, spaeter: delta > 0 };
      continue;
    }
    const besser =
      Math.abs(delta) > Math.abs(staerkste.delta) ||
      (Math.abs(delta) === Math.abs(staerkste.delta) && stark.anzahl > staerkste.ids.length);
    if (besser) {
      staerkste = { stamm, form: stark.form, ids: stark.ids, delta, spaeter: delta > 0 };
    }
  }

  if (!staerkste || Math.abs(staerkste.delta) < 0.25) return [];

  return [
    {
      id: `weltwandel:${staerkste.stamm}`,
      motiv: staerkste.form.charAt(0).toUpperCase() + staerkste.form.slice(1),
      text: staerkste.spaeter
        ? `„${staerkste.form}“ gehört in deiner Welt eher der späteren Zeit an – nach ${schreibeJahr(grenze)} kommt es deutlich häufiger vor.`
        : `„${staerkste.form}“ gehört in deiner Welt eher der frühen Zeit an – vor ${schreibeJahr(grenze)} kommt es deutlich häufiger vor.`,
      zweck: 'entwicklung',
      belege: staerkste.ids,
      herkunft: `${datiert.length} datierte Seiten, geteilt am Jahr ${schreibeJahr(grenze)}: ${frueh.length} davor, ${spaet.length} danach. Der Anteil verschiebt sich um ${Math.round(Math.abs(staerkste.delta) * 100)} Punkte.`,
      staerke: Math.round(Math.abs(staerkste.delta) * 100),
    },
  ];
};

/* ------------------------------------------------------- 7 Die Gegenfrage */

/**
 * Eine einzige Frage.
 *
 * Keine Liste. „Eine gute Frage ist wertvoller als zehn durchschnittliche."
 * Jede haengt an einer Bedingung im Werk – eine Frage ohne Anlass waere ein
 * Kalenderspruch.
 */
const FRAGEN: { wenn: (w: Werk, m: Wortspur[]) => string[] | undefined; frage: (m: string) => string }[] = [
  {
    wenn: (_w, m) => m.find((s) => s.typen.size >= 3)?.in,
    frage: (m) => `„${m}“ zieht sich durch viele Teile deiner Welt. Wer darin würde es nicht bemerken?`,
  },
  {
    wenn: (w) => {
      const ohne = w.entries.filter(
        (e) => !w.relations.some((r) => r.fromId === e.id || r.toId === e.id),
      );
      return ohne.length >= 5 ? ohne.map((e) => e.id) : undefined;
    },
    frage: () => 'Manche Seiten stehen ohne jede Verbindung. Was hielte sie, wenn sie eine hätten?',
  },
  {
    wenn: (w) => {
      const tot = w.entries.filter((e) => e.ende?.trim());
      return tot.length >= 3 ? tot.map((e) => e.id) : undefined;
    },
    frage: () => 'Einiges in deiner Welt ist zu Ende gegangen. Was ist an seine Stelle getreten?',
  },
];

const gegenfrage: Regel = (w) => {
  const m = motive(w);
  for (const eintrag of FRAGEN) {
    const belege = eintrag.wenn(w, m);
    if (!belege || belege.length === 0) continue;
    const motivWort = m[0]?.form ?? '';
    return [
      {
        id: `frage:${eintrag.frage('x').slice(0, 20)}`,
        motiv: 'Eine Frage',
        text: eintrag.frage(motivWort),
        zweck: 'frage',
        belege,
        herkunft: `Die Frage steht, weil ${belege.length} Seiten den Anlass dazu geben.`,
        staerke: 1,
      },
    ];
  }
  return [];
};

/* ------------------------------------------------------------- Zusammen */

const REGELN: Regel[] = [
  wiederkehrend,
  farbklang,
  beziehungsformen,
  blinderFleck,
  veraenderung,
  weltwandel,
  gegenfrage,
];

/**
 * Alles, was der Spiegel sieht.
 *
 * Ohne Belege wird nichts gezeigt – das ist die harte Grenze und nicht
 * verhandelbar. Eine Beobachtung ohne nachpruefbare Grundlage waere genau
 * die Blackbox, die es nicht geben soll.
 */
export function spiegle(werk: Werk): Beobachtung[] {
  /*
   * Erst aufräumen, dann sehen.
   *
   * Eine Beziehung, deren Enden es nicht mehr gibt, bleibt in der Datenbank
   * liegen – und der Spiegel zählte sie mit. Das ergab Beobachtungen, deren
   * Belege ins Leere führten: „fünfmal verknüpft“ bei drei Verbindungen.
   * Genau das darf hier nie passieren, denn die Grundlage ist das Einzige,
   * was den Spiegel von einer Behauptung unterscheidet.
   */
  const vorhanden = new Set(werk.entries.map((e) => e.id));
  const w: Werk = {
    entries: werk.entries,
    relations: werk.relations.filter((r) => vorhanden.has(r.fromId) && vorhanden.has(r.toId)),
  };

  return REGELN.flatMap((r) => r(w))
    .filter((b) => b.belege.length > 0 && b.belege.every((id) => vorhanden.has(id)))
    .sort((a, b) => b.staerke - a.staerke);
}

/**
 * Die tiefe Spiegelung.
 *
 * Nur, wenn ein einziges Motiv durch viele voneinander unabhaengige Teile der
 * Welt laeuft. Selten – und ohne Abzeichen, ohne Punkte, ohne Feier.
 */
export function tiefeSpiegelung(beobachtungen: Beobachtung[], w: Werk): Beobachtung | undefined {
  const m = motive(w);
  const stark = m.find((s) => s.typen.size >= 4 && s.in.length >= 8);
  if (!stark) return undefined;
  return beobachtungen.find((b) => b.id === `motiv:${stark.stamm}`);
}
