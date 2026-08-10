/**
 * Was steckt in einem hingeworfenen Gedanken?
 *
 * „Ellen – Die Sternenwächterin" ist eine Figur mit einem Beinamen. „miep –
 * Ort der Walküren" ist ein Ort mit einer Notiz. Beides schreibt man in einer
 * Sekunde hin, und beides landete bisher gleichermassen unter „Notizen", wo
 * es niemand wiederfindet, der nach Figuren sucht.
 *
 * Zwei Regeln, mehr steht hier nicht:
 *
 *   1. Ein Gedankenstrich trennt Namen und Beisatz.
 *   2. Bestimmte Woerter verraten die Art – „Waechterin" eine Figur,
 *      „Ort" einen Ort, „Schlacht" ein Ereignis.
 *
 * Beides ist Wortvergleich, keine KI, und wird auch nicht so genannt. Und
 * beides **ordnet nichts von selbst ein**: Die Vermutung erscheint als
 * Angebot mit ihrem Grund daneben, ein Fingertipp nimmt sie an, Nichtstun
 * lehnt sie ab. Eine Regel, die meistens richtig liegt, darf man anbieten;
 * eine, die einsortiert, muesste immer richtig liegen – und das tut keine.
 */

/* --------------------------------------------------------------- Zerlegen */

export interface Zerlegt {
  titel: string;
  untertitel: string;
}

/*
 * Was als Trenner zaehlt.
 *
 * Halbgeviert und Geviert trennen immer – sie stehen im Deutschen nie in
 * einem Wort. Der schlichte Bindestrich braucht Luft auf mindestens einer
 * Seite, sonst zerrisse er jeden Doppelnamen: „Alt-Arven" ist ein Ortsname,
 * kein Titel mit Beisatz, und „Sankt-Aelfric" auch nicht.
 *
 * „miep -Ort der Walküren" hat die Luft links. Das genuegt: Wer so tippt,
 * meint einen Trenner.
 */
const STRICHE = /\s+[-–—]\s*|\s*[-–—]\s+|\s*[–—]\s*/;

/** Ein linker Teil laenger als das ist kein Name mehr, sondern ein Satz. */
const NAME_HOECHSTENS = 40;

/**
 * „Ellen – Die Sternenwächterin" → Titel „Ellen", Untertitel „Die
 * Sternenwächterin".
 *
 * Ohne Strich bleibt alles Titel. Ist der linke Teil zu lang, ebenfalls –
 * dann war der Strich ein Gedankenstrich im Satz und keine Trennung.
 */
export function zerlege(text: string): Zerlegt {
  const roh = text.trim();
  const stelle = roh.search(STRICHE);
  if (stelle <= 0) return { titel: roh, untertitel: '' };

  const links = roh.slice(0, stelle).trim();
  const rechts = roh.slice(stelle).replace(STRICHE, '').trim();
  if (!links || !rechts || links.length > NAME_HOECHSTENS) {
    return { titel: roh, untertitel: '' };
  }
  return { titel: links, untertitel: rechts };
}

/* ----------------------------------------------------------------- Erraten */

export interface Vermutung {
  type: string;
  /** Das Wort, an dem es haengt – der Beleg, der danebensteht. */
  grund: string;
}

/*
 * Verraeterische Woerter je Art.
 *
 * Bewusst nur solche, die kaum etwas anderes bedeuten koennen. Jedes weitere
 * Wort erhoeht die Zahl der Vermutungen und senkt ihre Trefferquote – und ein
 * Vorschlag, der meistens falsch ist, ist schlimmer als keiner: Man hoert auf
 * hinzusehen.
 *
 * Nicht dabei: alles, was gleichzeitig ein gewoehnliches Wort ist. „Stein"
 * koennte ein Gegenstand sein oder ein Nachname oder ein Material.
 */
const WOERTER: { type: string; woerter: string[] }[] = [
  {
    type: 'character',
    woerter: [
      'wächter', 'wächterin', 'hüter', 'hüterin', 'könig', 'königin', 'fürst', 'fürstin',
      'ritter', 'ritterin', 'magier', 'magierin', 'hexe', 'hexer', 'zauberer', 'zauberin',
      'priester', 'priesterin', 'schmied', 'schmiedin', 'wirt', 'wirtin', 'bäcker', 'bäckerin',
      'jäger', 'jägerin', 'krieger', 'kriegerin', 'söldner', 'söldnerin', 'händler', 'händlerin',
      'seherin', 'seher', 'barde', 'bardin', 'mönch', 'nonne', 'gelehrter', 'gelehrte',
      'kapitän', 'kapitänin', 'anführer', 'anführerin', 'herzog', 'herzogin', 'graf', 'gräfin',
      'kaiser', 'kaiserin', 'prinz', 'prinzessin', 'meister', 'meisterin', 'schülerin', 'schüler',
      'erzähler', 'erzählerin', 'bote', 'botin', 'wanderer', 'wanderin', 'dieb', 'diebin',
    ],
  },
  {
    type: 'location',
    woerter: [
      'ort', 'dorf', 'stadt', 'burg', 'festung', 'turm', 'hafen', 'insel', 'tal', 'schlucht',
      'gebirge', 'berg', 'wald', 'hain', 'moor', 'sumpf', 'wüste', 'steppe', 'see', 'fluss',
      'quelle', 'höhle', 'grotte', 'ruine', 'tempel', 'kloster', 'palast', 'schloss', 'markt',
      'gasse', 'brücke', 'pass', 'küste', 'bucht', 'landstrich', 'reich', 'königreich', 'provinz',
    ],
  },
  {
    type: 'moment',
    woerter: [
      'schlacht', 'krieg', 'aufstand', 'belagerung', 'untergang', 'gründung', 'geburt',
      'krönung', 'hochzeit', 'vertrag', 'friede', 'flucht', 'ankunft', 'abschied', 'erdbeben',
      'seuche', 'hungersnot', 'brand', 'sturm', 'wende', 'thronstreit', 'verrat',
    ],
  },
  {
    type: 'creature',
    woerter: [
      'drache', 'drachen', 'greif', 'geist', 'dämon', 'wyrm', 'kobold', 'troll', 'riese',
      'riesin', 'elf', 'elfe', 'zwerg', 'zwergin', 'nymphe', 'sirene', 'chimäre', 'ungeheuer',
      'bestie', 'schwarmwesen', 'urwesen',
    ],
  },
  {
    type: 'artifact',
    woerter: [
      'schwert', 'klinge', 'dolch', 'axt', 'speer', 'bogen', 'schild', 'rüstung', 'krone',
      'zepter', 'amulett', 'talisman', 'siegel', 'schlüssel', 'kelch', 'spiegel', 'laterne',
      'relikt', 'artefakt',
    ],
  },
  {
    type: 'lore',
    woerter: [
      'legende', 'sage', 'mythos', 'märchen', 'lied', 'ballade', 'prophezeiung', 'weissagung',
      'gerücht', 'brauch', 'ritual', 'zeitalter', 'chronik',
    ],
  },
  {
    type: 'plant',
    woerter: ['kraut', 'blume', 'blüte', 'baum', 'eiche', 'birke', 'farn', 'moos', 'pilz', 'ranke', 'wurzel'],
  },
];

/*
 * Wortgrenzen von Hand statt mit `\b`.
 *
 * `\b` ist in JavaScript an ASCII gebunden: Nach „Wächterin" stimmt es, vor
 * „Ätherwald" nicht, weil „Ä" fuer die Regex kein Buchstabe ist. Ein
 * Zeichenvergleich kennt das Problem nicht – dieselbe Loesung wie bei den
 * Randnotizen des Romans.
 */
const BUCHSTABE = /[\p{L}\p{N}]/u;

function istGrenze(text: string, pos: number): boolean {
  if (pos < 0 || pos >= text.length) return true;
  return !BUCHSTABE.test(text[pos]);
}

/**
 * Steht das Wort im Text – als eigenes Wort oder am Ende eines
 * zusammengesetzten?
 *
 * Der zweite Fall ist der wichtigere: „Sternenwächterin" ist eine Wächterin,
 * „Nebelmoor" ein Moor, „Königsschwert" ein Schwert. Deutsche Komposita
 * tragen ihre Art hinten, und genau deshalb funktioniert diese Regel hier
 * ueberhaupt.
 */
function stecktDrin(klein: string, wort: string): boolean {
  let von = 0;
  for (;;) {
    const i = klein.indexOf(wort, von);
    if (i < 0) return false;
    /* Rechts muss Schluss sein, links darf ein Wortanfang oder eine Fuge stehen. */
    if (istGrenze(klein, i + wort.length)) return true;
    von = i + 1;
  }
}

/**
 * Welche Art koennte das sein?
 *
 * Gibt `undefined` zurueck, wenn nichts sicher genug ist – das ist der
 * haeufige Fall und der richtige. Bei mehreren Treffern gewinnt das laengste
 * Wort: „Königreich" schlaegt „König", sonst waere jedes Reich eine Person.
 */
export function errate(text: string): Vermutung | undefined {
  const klein = text.toLowerCase();
  if (!klein.trim()) return undefined;

  let beste: Vermutung | undefined;
  let laenge = 0;
  for (const { type, woerter } of WOERTER) {
    for (const wort of woerter) {
      if (wort.length <= laenge || !stecktDrin(klein, wort)) continue;
      beste = { type, grund: wort };
      laenge = wort.length;
    }
  }
  return beste;
}

/* ------------------------------------------------- Art aus der Beziehung */

/**
 * Welche Art hat das Gegenueber einer Beziehung?
 *
 * Wer „lebt in" waehlt und dann „Wald" tippt, meint einen Ort – das sagt
 * schon die Beziehung, ganz ohne das Wort anzusehen. Diese Tabelle ist
 * deshalb die *erste* Auskunft; das Wortraten kommt erst danach.
 *
 * Nicht jede Beziehung sagt etwas. „enthaelt" kann auf alles zeigen, „ging
 * voraus" auch. Wo nichts Sicheres steht, steht hier nichts – dann
 * entscheidet das Wort, und wenn auch das schweigt, wird gefragt.
 */
const ZIEL_ART: Record<string, { hin?: string; her?: string }> = {
  lives_in: { hin: 'location', her: 'character' },
  grows_in: { hin: 'biome', her: 'plant' },
  made_of: { hin: 'material' },
  comes_from: { hin: 'location' },
  wears: { hin: 'clothing', her: 'character' },
  owns: { her: 'character' },
  ruled: { hin: 'location', her: 'character' },
  plays_at: { hin: 'location' },
  pov: { hin: 'character' },
  appears_in: { her: 'character' },
  parent_of: { hin: 'character', her: 'character' },
  married_to: { hin: 'character', her: 'character' },
  related: { hin: 'character', her: 'character' },
  causes: { hin: 'moment', her: 'moment' },
  precedes: { hin: 'moment', her: 'moment' },
  follows_dna: { hin: 'law' },
  created_by: { hin: 'prompt' },
};

/**
 * Die beste Vermutung fuer einen neuen Eintrag, den man mitten im Verbinden
 * anlegt.
 *
 * Reihenfolge mit Absicht: erst die Beziehung, dann das Wort. „Nebelwald"
 * unter „lebt in" ist ein Ort, auch wenn „wald" das ohnehin sagt; „Bum"
 * unter „lebt in" ist ebenfalls ein Ort, obwohl das Wort nichts verraet.
 * Umgekehrt hilft das Wort dort, wo die Beziehung schweigt.
 */
export function zielArt(beziehung: string, hinaus: boolean, name: string): string {
  const ausBeziehung = hinaus ? ZIEL_ART[beziehung]?.hin : ZIEL_ART[beziehung]?.her;
  if (ausBeziehung) return ausBeziehung;
  return errate(name)?.type ?? 'page';
}
