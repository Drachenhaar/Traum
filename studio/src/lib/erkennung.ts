/**
 * Wer und was in einem Text vorkommt.
 *
 * Anlass: Auf der Seite von „Bum" stand ein ganzer Absatz voller Namen –
 * Niko das Eichhörnchen, ein Eichhörnchen namens Tip, eine Schildkröte
 * namens Elsa, der Sumpf der Antworten – und das Buch bemerkte nichts davon.
 * Die Randnotizen des Romans konnten das nicht sehen: Sie erkennen nur, was
 * bereits als Eintrag existiert, und schlagen nie etwas vor, dessen Enden es
 * noch nicht gibt. Das ist dort richtig. Hier fehlte die andere Haelfte.
 *
 * Diese Datei findet zwei Dinge:
 *
 *   1. Bekanntes – Namen von Eintraegen, die es schon gibt. Angebot: verbinden.
 *   2. Neues – Namen, die der Satzbau selbst als Namen ausweist.
 *      Angebot: anlegen und verbinden.
 *
 * Das Deutsche macht den zweiten Fall ueberhaupt erst moeglich. Drei
 * Fuegungen benennen so eindeutig, dass man sich auf sie verlassen kann:
 *
 *   „ein Eichhörnchen namens Tip"     – „namens" kuendigt einen Namen an
 *   „Niko das Eichhörnchen"           – Apposition mit Artikel
 *   „der Sumpf der Antworten"         – Gattung mit Genitiv
 *
 * Alles andere waere Raten. Grossschreibung taugt nicht als Merkmal, weil im
 * Deutschen jedes Substantiv gross steht – „Die Figuren", „Zerstörung",
 * „Abenteuer" waeren sonst alle Namen.
 *
 * Und wie ueberall hier: **Es legt nichts von selbst an.** Jeder Fund
 * erscheint mit seinem Beleg – dem Satz, in dem er steht – und wartet auf
 * einen Fingertipp.
 */

import type { Entry, Relation } from '../types';
import { errate } from './gedanke';

/* ---------------------------------------------------------- Wortgrenzen */

const BUCHSTABE = /[\p{L}\p{N}]/u;
const GROSS = /\p{Lu}/u;

function istGrenze(text: string, pos: number): boolean {
  if (pos < 0 || pos >= text.length) return true;
  return !BUCHSTABE.test(text[pos]);
}

/** Alle Fundstellen von `nadel` in `heu`, nur an Wortgrenzen. */
function fundstellen(heu: string, nadel: string): number[] {
  if (!nadel) return [];
  const treffer: number[] = [];
  let von = 0;
  for (;;) {
    const i = heu.indexOf(nadel, von);
    if (i < 0) break;
    if (istGrenze(heu, i - 1) && istGrenze(heu, i + nadel.length)) treffer.push(i);
    von = i + nadel.length;
  }
  return treffer;
}

/**
 * Grob in Saetze zerlegen – der Beleg soll lesbar sein, nicht exakt.
 *
 * Von Hand statt mit einem Lookbehind: Das laeuft erst ab Safari 16.4, und
 * ein solcher Ausdruck hat in dieser App schon einmal beim Anlegen einer
 * Seite alles abgerissen. Zwei Schleifen sind das kleinere Uebel.
 */
function satzweise(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '.' || c === '!' || c === '?' || c === '\n') {
      const stueck = text.slice(start, i + 1).trim();
      if (stueck) out.push(stueck);
      start = i + 1;
    }
  }
  const rest = text.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

/* ------------------------------------------------------------------ Funde */

export interface Fund {
  /** Stabil ueber Neuberechnungen – die Oberflaeche merkt sich Abgelehntes daran. */
  id: string;
  name: string;
  /** Der Eintrag, wenn es ihn schon gibt. */
  vorhandenId?: string;
  /** Vermutete Art fuer einen neuen Eintrag. */
  type: string;
  /** Woran es haengt: „namens", „Apposition", oder das verratende Wort. */
  grund: string;
  /** Der Satz, in dem es steht. Der Beleg. */
  satz: string;
}

/*
 * Woerter, die niemals ein Name sind, auch wenn der Satzbau es nahelegt.
 * „Alles ist gut bis zu dem Tag" – „Tag" steht hinter einem Artikel und ist
 * trotzdem kein Name.
 */
const NIE_NAME = new Set([
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines',
  'und', 'oder', 'aber', 'als', 'wie', 'wenn', 'dann', 'auch', 'nur', 'noch', 'schon', 'immer',
  'sie', 'er', 'es', 'ihn', 'ihm', 'ihr', 'wir', 'ihnen', 'man', 'sich', 'alles', 'nichts',
  'tag', 'nacht', 'jahr', 'zeit', 'mal', 'weg', 'grund', 'ende', 'anfang', 'seite', 'stelle',
  'dinge', 'sache', 'leute', 'menschen', 'spiele', 'figuren', 'freunde', 'abenteuer',
  /*
   * Praepositionen. Kleingeschrieben faellt keine davon auf – am Satzanfang
   * aber schon: „Auf der Reise begegnet er …" lieferte prompt einen Ort
   * namens „Auf".
   */
  'auf', 'in', 'an', 'bei', 'mit', 'nach', 'vor', 'über', 'unter', 'aus', 'zu', 'für',
  'um', 'durch', 'gegen', 'ohne', 'seit', 'von', 'bis', 'hinter', 'neben', 'zwischen',
  'während', 'wegen', 'trotz', 'statt', 'nebenan', 'zusammen', 'später', 'dabei',
]);

function taugtAlsName(wort: string): boolean {
  const sauber = wort.replace(/[^\p{L}\p{N}-]/gu, '');
  if (sauber.length < 3) return false;
  if (!GROSS.test(sauber[0])) return false;
  return !NIE_NAME.has(sauber.toLowerCase());
}

/** Das naechste Wort ab `pos`, ohne Satzzeichen. */
function wortAb(satz: string, pos: number): { wort: string; ende: number } | undefined {
  let i = pos;
  while (i < satz.length && !BUCHSTABE.test(satz[i])) i++;
  let j = i;
  while (j < satz.length && (BUCHSTABE.test(satz[j]) || satz[j] === '-')) j++;
  const wort = satz.slice(i, j);
  return wort ? { wort, ende: j } : undefined;
}

/** Das Wort, das vor `pos` endet. */
function wortVor(satz: string, pos: number): string {
  let j = pos;
  while (j > 0 && !BUCHSTABE.test(satz[j - 1])) j--;
  let i = j;
  while (i > 0 && BUCHSTABE.test(satz[i - 1])) i--;
  return satz.slice(i, j);
}

const ARTIKEL = ['der', 'die', 'das'];
const GENITIV = ['der', 'des', 'von'];

/**
 * Namen finden, die der Satzbau selbst ausweist.
 *
 * Drei Fuegungen, mehr nicht – siehe Kopf der Datei. Jede liefert ihren Satz
 * als Beleg mit, damit man die Regel im Zweifel selbst pruefen kann.
 */
function neueNamen(text: string): Fund[] {
  const gefunden = new Map<string, Fund>();
  const merke = (name: string, type: string, grund: string, satz: string) => {
    const schluessel = name.toLowerCase();
    if (!gefunden.has(schluessel)) {
      gefunden.set(schluessel, { id: `neu:${schluessel}`, name, type, grund, satz });
    }
  };

  for (const satz of satzweise(text)) {
    const klein = satz.toLowerCase();

    /* 1. „… namens Tip" – die staerkste Fuegung, die es gibt. */
    for (const i of fundstellen(klein, 'namens')) {
      const naechstes = wortAb(satz, i + 'namens'.length);
      if (!naechstes || !taugtAlsName(naechstes.wort)) continue;
      /* Die Gattung steht davor: „ein Eichhörnchen namens Tip". */
      const gattung = wortVor(satz, i);
      const art = errate(gattung)?.type ?? 'character';
      merke(naechstes.wort, art, 'namens', satz);
    }

    /* 2. „Niko das Eichhörnchen" – Name, Artikel, Gattung. */
    for (const artikel of ARTIKEL) {
      for (const i of fundstellen(klein, artikel)) {
        /* Am Satzanfang ist der Artikel kein Anschluss, sondern der Beginn. */
        if (i === 0) continue;
        const name = wortVor(satz, i);
        if (!taugtAlsName(name)) continue;

        /*
         * Ein Gattungswort ist kein Name. „Sumpf der Antworten" lieferte sonst
         * zweimal etwas: einmal richtig den ganzen Ort ueber die Genitivregel,
         * und einmal falsch einen Herrn „Sumpf" ueber diese hier.
         */
        if (errate(name)) continue;

        /*
         * Steht vor dem Namen selbst ein Artikel, ist es keine Apposition,
         * sondern ein Substantiv mit Relativsatz: „die Birke die nebenan
         * steht" ist keine Person namens Birke.
         */
        const davor = wortVor(satz, satz.toLowerCase().lastIndexOf(name.toLowerCase(), i));
        if (ARTIKEL.includes(davor.toLowerCase()) || ['den','dem','des','ein','eine','einen','einem','einer'].includes(davor.toLowerCase())) {
          continue;
        }

        const gattung = wortAb(satz, i + artikel.length);
        if (!gattung || GROSS.test(gattung.wort[0]) === false) continue;
        const art = errate(gattung.wort)?.type ?? 'character';
        merke(name, art, `„${name} ${artikel} ${gattung.wort}"`, satz);
      }
    }

    /* 3. „der Sumpf der Antworten" – Gattung mit Genitiv. */
    for (const fuge of GENITIV) {
      for (const i of fundstellen(klein, fuge)) {
        if (i === 0) continue;
        const gattung = wortVor(satz, i);
        const art = errate(gattung);
        if (!art || !GROSS.test(gattung[0] ?? '')) continue;
        const dahinter = wortAb(satz, i + fuge.length);
        if (!dahinter || !taugtAlsName(dahinter.wort)) continue;
        const name = `${gattung} ${fuge} ${dahinter.wort}`;
        merke(name, art.type, `„${art.grund}" mit Zusatz`, satz);
      }
    }
  }

  return [...gefunden.values()];
}

/** Bekannte Eintraege, die im Text genannt werden. */
function bekannte(text: string, welt: Entry[]): Fund[] {
  const heu = text.toLowerCase();
  const saetzeListe = satzweise(text);
  const out: Fund[] = [];

  for (const e of welt) {
    const titel = e.title.trim();
    if (titel.length < 4) continue;
    if (!fundstellen(heu, titel.toLowerCase()).length) continue;
    const satz =
      saetzeListe.find((s) => s.toLowerCase().includes(titel.toLowerCase())) ?? '';
    out.push({ id: `alt:${e.id}`, name: titel, vorhandenId: e.id, type: e.type, grund: 'steht im Buch', satz });
  }
  return out;
}

/**
 * Alles, was dieser Text an Wesen und Orten hergibt.
 *
 * Bekanntes zuerst – das ist die sicherere Aussage. Was schon mit dieser
 * Seite verbunden ist, faellt heraus: Es waere ein Angebot, das nichts
 * aendert.
 */
export function findeWesen(
  text: string,
  welt: Entry[],
  eigeneId: string,
  schonVerbunden: Set<string>,
  grenze = 12,
): Fund[] {
  if (!text.trim()) return [];

  const andere = welt.filter((e) => e.id !== eigeneId && !e.deletedAt);
  const alt = bekannte(text, andere).filter((f) => !schonVerbunden.has(f.vorhandenId!));

  /* Was es schon gibt, wird nicht noch einmal als „neu" angeboten. */
  const bereits = new Set(andere.map((e) => e.title.trim().toLowerCase()));
  const neu = neueNamen(text).filter((f) => !bereits.has(f.name.toLowerCase()));

  return [...alt, ...neu].slice(0, grenze);
}

/** Nur fuer die Oberflaeche: Welche Eintraege haengen schon an dieser Seite? */
export function verbundenMit(relations: Relation[], id: string): Set<string> {
  const s = new Set<string>();
  for (const r of relations) {
    if (r.fromId === id) s.add(r.toId);
    else if (r.toId === id) s.add(r.fromId);
  }
  return s;
}
