/**
 * Woraus der Spiegel liest.
 *
 * Ausschliesslich aus dem, was der Verfasser selbst geschrieben hat. Kein
 * Modell, kein Dienst, keine Herleitung ueber das Geschriebene hinaus. Das
 * ist keine Sparsamkeit, sondern die Bedingung: Ein Spiegel, der etwas
 * hinzuerfindet, zeigt nicht mehr das Werk.
 *
 * Hier steht nur das Sammeln und Zaehlen. Was daraus eine Beobachtung wird,
 * entscheiden die Regeln nebenan – und ob sie ueberhaupt gezeigt wird, die
 * Schwelle darueber.
 */

import type { Entry } from '../../types';
import { asList, asText, templateFor } from '../templates';

/**
 * Woerter, die nichts ueber eine Welt aussagen.
 *
 * Bewusst grosszuegig. Ein Motiv, das durch ein Fuellwort entsteht, ist kein
 * Motiv – und eine falsche Beobachtung kostet mehr Vertrauen, als eine
 * verpasste wert waere.
 */
const FUELLWOERTER = new Set(
  `der die das den dem des ein eine einer eines einem einen und oder aber doch denn
   sondern wenn dann als wie was wer wo wohin woher warum weil dass ob nicht kein
   keine keiner nur noch schon auch sehr mehr viel viele wenig wenige alle alles
   man sich ihm ihn ihr ihre ihres sein seine seiner mein meine dein deine
   ist sind war waren wird werden wurde wurden hat haben hatte hatten kann koennen
   konnte muss muessen soll sollen darf duerfen mag moegen will wollen
   ich du er sie es wir ihr mich dir mir uns euch
   an auf aus bei bis durch fuer gegen hinter in mit nach neben ohne seit ueber
   um unter vom von vor waehrend zu zum zur zwischen am im ins beim
   hier dort dann noch wieder immer nie oft manchmal etwas nichts jeder jede jedes
   dieser diese dieses jener jene jenes selbst schon eben gerade
   ihrer ihren seinem seinen dessen deren
   gibt geben gab gibt es macht machen machte tut tun tat geht gehen ging
   steht stehen stand liegt liegen lag kommt kommen kam
   gross grosse grossen klein kleine kleinen alt alte alten neu neue neuen
   erste ersten zweite letzte lange langen kurz kurze
   teil teile art arten form formen weise ort orte zeit zeiten jahr jahre tag tage
   welt welten seite seiten name namen`
    .split(/\s+/)
    .filter(Boolean),
);

/** Umlaute und Endungen abschleifen, damit „Wald“, „Wälder“ und „Waldes“ eines sind. */
export function stamm(wort: string): string {
  let w = wort
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss');

  /*
   * Nur die haeufigsten Endungen, und nur wenn genug Wort uebrigbleibt.
   * Eine echte Grundformbildung braeuchte ein Woerterbuch; hier genuegt es,
   * Beugungen desselben Wortes zusammenzufuehren – und es ist besser, zwei
   * Formen getrennt zu lassen, als zwei Woerter faelschlich zu vereinen.
   */
  for (const endung of ['ern', 'end', 'ung', 'er', 'en', 'es', 'em', 'e', 'n', 's']) {
    if (w.length - endung.length >= 4 && w.endsWith(endung)) {
      w = w.slice(0, -endung.length);
      break;
    }
  }
  return w;
}

/** Der ganze geschriebene Text eines Eintrags – Titel, Beschreibung, Felder. */
export function textVon(entry: Entry): string {
  const tpl = templateFor(entry.type);
  const teile: string[] = [entry.title, entry.subtitle, entry.category, entry.description, ...entry.tags];

  for (const f of tpl.fields) {
    if (f.kind === 'images' || f.kind === 'entries' || f.kind === 'palette') continue;
    const v = entry.fields[f.key];
    teile.push(asText(v), ...asList(v));
  }

  for (const b of entry.blocks) {
    const d = b.data as Record<string, unknown>;
    for (const wert of Object.values(d)) if (typeof wert === 'string') teile.push(wert);
  }

  return teile.filter(Boolean).join(' ');
}

/** Ein Wort und wo es vorkommt. */
export interface Wortspur {
  stamm: string;
  /** Die haeufigste geschriebene Form – so steht es im Spiegel. */
  form: string;
  /** Eintraege, in denen es vorkommt. */
  in: string[];
  /** Wie viele verschiedene Eintragstypen. Nur so wird ein Motiv unabhaengig. */
  typen: Set<string>;
}

export function wortspuren(entries: Entry[]): Wortspur[] {
  const spuren = new Map<string, { formen: Map<string, number>; in: Set<string>; typen: Set<string> }>();

  for (const e of entries) {
    /* Je Eintrag zaehlt ein Wort nur einmal – sonst gewinnt der laengste Text. */
    const gesehen = new Set<string>();
    for (const roh of textVon(e).split(/[^\p{L}]+/u)) {
      if (roh.length < 4) continue;
      const s = stamm(roh);
      if (s.length < 4 || FUELLWOERTER.has(s) || FUELLWOERTER.has(roh.toLowerCase())) continue;
      if (gesehen.has(s)) continue;
      gesehen.add(s);

      let eintrag = spuren.get(s);
      if (!eintrag) {
        eintrag = { formen: new Map(), in: new Set(), typen: new Set() };
        spuren.set(s, eintrag);
      }
      eintrag.formen.set(roh, (eintrag.formen.get(roh) ?? 0) + 1);
      eintrag.in.add(e.id);
      eintrag.typen.add(e.type);
    }
  }

  return [...spuren.entries()]
    .map(([s, v]) => ({
      stamm: s,
      form: [...v.formen.entries()].sort((a, b) => b[1] - a[1])[0][0],
      in: [...v.in],
      typen: v.typen,
    }))
    .sort((a, b) => b.in.length - a.in.length);
}

/* ------------------------------------------------------------- Farben ---- */

export interface Farbspur {
  /** Der Farbkreis in zwölf Feldern – „warmes Rot“, „Moosgrün“ … */
  ton: string;
  in: string[];
}

const TOENE: { name: string; von: number; bis: number }[] = [
  { name: 'Rot', von: 345, bis: 15 },
  { name: 'Rostrot', von: 15, bis: 40 },
  { name: 'Bernstein', von: 40, bis: 60 },
  { name: 'Gold', von: 60, bis: 75 },
  { name: 'Grün', von: 75, bis: 165 },
  { name: 'Türkis', von: 165, bis: 195 },
  { name: 'Blau', von: 195, bis: 255 },
  { name: 'Violett', von: 255, bis: 290 },
  { name: 'Purpur', von: 290, bis: 345 },
];

function tonVon(hex: string): string | undefined {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return undefined;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  /*
   * Fast farblos: ein Grauwert, kein Ton.
   *
   * Die Grenze lag zuerst bei 0,09 und war damit zu grob: Moosgruen
   * (#55604A) hat eine Buntheit von 0,086 und wurde als Grau gezaehlt. Eine
   * gedaempfte Farbe ist aber eine Farbe – und wer viel davon benutzt, hat
   * eine Vorliebe, keine Farblosigkeit. Bei 0,05 bleibt Nebelgrau grau und
   * Moosgruen gruen.
   */
  if (d < 0.05) return max < 0.28 ? 'Dunkel' : max > 0.82 ? 'Hell' : 'Grau';

  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = (h * 60 + 360) % 360;

  const treffer = TOENE.find((t) => (t.von > t.bis ? h >= t.von || h < t.bis : h >= t.von && h < t.bis));
  return treffer?.name;
}

export function farbspuren(entries: Entry[]): Farbspur[] {
  const nach = new Map<string, Set<string>>();

  for (const e of entries) {
    const roh = e.fields['palette'];
    const werte = Array.isArray(roh) ? roh : typeof roh === 'string' ? [roh] : [];
    const hier = new Set<string>();
    for (const w of werte) {
      /* Eintraege der Form „Name #RRGGBB“ oder nur „#RRGGBB“. */
      for (const hex of String(w).match(/#[0-9a-f]{6}/gi) ?? []) {
        const ton = tonVon(hex);
        if (ton) hier.add(ton);
      }
    }
    for (const ton of hier) {
      if (!nach.has(ton)) nach.set(ton, new Set());
      nach.get(ton)!.add(e.id);
    }
  }

  return [...nach.entries()]
    .map(([ton, ids]) => ({ ton, in: [...ids] }))
    .sort((a, b) => b.in.length - a.in.length);
}
