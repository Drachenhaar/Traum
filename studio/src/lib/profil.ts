/**
 * Das Profil.
 *
 * Dragoncore fragt nicht „Welche Funktionen möchtest du aktivieren?", sondern
 * „Was möchtest du erschaffen?". Aus dieser einen Antwort leitet es ab, wie
 * viel von seiner eigenen Komplexität es zunächst zeigt.
 *
 * Drei Dinge sind an dieser Datei entschieden worden, und alle drei hätten
 * auch anders ausfallen können:
 *
 * **Erstens: Das Profil ordnet und faltet, es entfernt nie.**
 * Der Brief verlangt beides – „Was zuerst sichtbar ist" und „Wenn die Antwort
 * Nein lautet, bleibt sie verborgen" –, und zugleich, dass keine getrennten
 * Versionen entstehen. Der einzige Weg, beides zu halten: Nichts wird je
 * ausgeblendet, es wird nach hinten gelegt. Hinter jeder Falte steht „Weiteres
 * im Buch", und dahinter steht alles. Ein Spielleiter, der einen Roman
 * schreiben will, findet den Schreibraum – er muss nur einmal mehr tippen als
 * ein Erzähler. Eine Oberfläche, die etwas wirklich wegnimmt, wäre eine
 * Beschränkung, und aus einem Buch würden sechs Programme.
 *
 * **Zweitens: Die Schwerpunkte werden abgeleitet, nicht gespeichert.**
 * Der Brief nennt `writingFocus`, `visualFocus`, `simulationFocus`,
 * `technicalFocus` als Felder. Als Felder wären sie eine zweite Wahrheit neben
 * der Absicht – zwei Dinge, die dasselbe sagen und auseinanderlaufen können.
 * Hier ist die Absicht die Wahrheit und die Schwerpunkte ihre Auslegung.
 *
 * **Drittens: Werkzeuge tragen Gewichte, keine Modus-Listen.**
 * Man könnte je Absicht aufschreiben, welche Werkzeuge sie zeigt – sechs
 * Listen mit zwanzig Einträgen, die bei jedem neuen Werkzeug an sechs Stellen
 * gepflegt werden wollen und dabei auseinanderlaufen. Stattdessen sagt jedes
 * Werkzeug einmal, welchen Schwerpunkten es dient, und die Reihenfolge fällt
 * daraus. Ein neues Profil ist damit eine Zeile und kein Umbau – und genau das
 * verlangt der Brief für Lehrer, Historiker, Drehbuch und alles, was noch
 * kommt.
 */

/* ------------------------------------------------------------- Absicht ---- */

export type Absicht = 'erzaehlen' | 'welt' | 'spiel' | 'entwerfen' | 'zeigen' | 'frei';

export interface AbsichtDef {
  id: Absicht;
  /** Wie sie sich nennt. */
  name: string;
  /** Der Satz auf der Karte – in der ersten Person, weil man sich selbst meint. */
  satz: string;
  /** Was dabei entsteht, in drei Bewegungen. */
  zeile: string;
  /** Die Vorgabe für die Tiefe. Der Brief ordnet sie den Zielgruppen zu. */
  tiefe: Tiefe;
  anmutung: Anmutung;
  /** Wie stark diese Absicht die vier Schwerpunkte bedient. 0 bis 1. */
  schwerpunkte: Record<Schwerpunkt, number>;
}

/* --------------------------------------------------------- Schwerpunkte ---- */

/**
 * Die vier Richtungen, in die eine Welt wachsen kann.
 *
 * Sie sind keine Kategorien von Menschen, sondern von Tätigkeiten – deshalb
 * hat jede Absicht von jedem etwas. Ein Spielleiter schreibt auch, ein
 * Erzähler baut auch Welt. Nur die Gewichte unterscheiden sich, und deshalb
 * ist die Oberfläche verschoben und nicht ausgetauscht.
 */
export type Schwerpunkt = 'schreiben' | 'welt' | 'spiel' | 'bild' | 'system';

export const SCHWERPUNKTE: Schwerpunkt[] = ['schreiben', 'welt', 'spiel', 'bild', 'system'];

/* ------------------------------------------------------------- Tiefe ------ */

/**
 * Wie viel von selbst offensteht.
 *
 * Vier Stufen, und die unterste ist die wichtigste: Wer von komplexer Software
 * schnell abgeschreckt wird, soll bei „Sanft" ein Buch mit drei Möglichkeiten
 * sehen und nicht ein Werkzeug mit zwanzig.
 */
export type Tiefe = 'sanft' | 'standard' | 'tief' | 'system';

export const TIEFEN: { id: Tiefe; name: string; satz: string }[] = [
  { id: 'sanft', name: 'Sanft', satz: 'Wenig steht offen. Das Buch führt.' },
  { id: 'standard', name: 'Standard', satz: 'Das Übliche liegt bereit, der Rest ist einen Griff entfernt.' },
  { id: 'tief', name: 'Tief', satz: 'Fast alles ist unmittelbar erreichbar.' },
  { id: 'system', name: 'System', satz: 'Auch was darunter liegt: Kennungen, Arten, Rohdaten.' },
];

/** Rang einer Tiefe – für Vergleiche wie „ab Standard sichtbar". */
export const TIEFENRANG: Record<Tiefe, number> = { sanft: 0, standard: 1, tief: 2, system: 3 };

/** Wie viele Werkzeuge vorn stehen dürfen, bevor gefaltet wird. */
const OFFEN_JE_TIEFE: Record<Tiefe, number> = { sanft: 4, standard: 7, tief: 11, system: 99 };

/* ---------------------------------------------------------- Anmutung ------ */

/**
 * Wie das Buch sich anfühlt.
 *
 * Bewusst nur drei, obwohl der Brief fünf Charaktere beschreibt. „Autor" und
 * „Worldbuilder" unterscheiden sich in dem, was vorn liegt – nicht darin, wie
 * eine Seite aussieht; beide wollen ein Buch. Eine Anmutung, die man nicht
 * sehen kann, wäre eine Einstellung ohne Wirkung.
 */
export type Anmutung = 'buch' | 'artbook' | 'werkstatt';

export const ANMUTUNGEN: { id: Anmutung; name: string; satz: string }[] = [
  { id: 'buch', name: 'Buch', satz: 'Ruhige Seiten, viel Text, dezente Bilder.' },
  { id: 'artbook', name: 'Artbook', satz: 'Große Bilder, wenig Text, viel Raum.' },
  { id: 'werkstatt', name: 'Werkstatt', satz: 'Mehr auf einer Seite. Dichter gesetzt, näher beieinander.' },
];

/* ------------------------------------------------------------ Die Absichten */

export const ABSICHTEN: AbsichtDef[] = [
  {
    id: 'erzaehlen',
    name: 'Eine Geschichte',
    satz: 'Ich möchte eine Geschichte und ihre Welt erschaffen.',
    zeile: 'Figuren verstehen. Handlung verweben. Kapitel wachsen lassen.',
    tiefe: 'sanft',
    anmutung: 'buch',
    schwerpunkte: { schreiben: 1, welt: 0.55, spiel: 0.05, bild: 0.25, system: 0.05 },
  },
  {
    id: 'welt',
    name: 'Eine ganze Welt',
    satz: 'Ich möchte eine vollständige Welt erschaffen.',
    zeile: 'Orte, Kulturen, Geschichte und Regeln miteinander verbinden.',
    tiefe: 'standard',
    anmutung: 'buch',
    schwerpunkte: { schreiben: 0.4, welt: 1, spiel: 0.2, bild: 0.5, system: 0.35 },
  },
  {
    id: 'spiel',
    name: 'Eine Welt zum Spielen',
    satz: 'Ich möchte eine Welt zum Spielen erschaffen.',
    zeile: 'Eine Runde vorbereiten, die am Tisch lebendig bleibt.',
    tiefe: 'tief',
    anmutung: 'buch',
    schwerpunkte: { schreiben: 0.3, welt: 0.7, spiel: 1, bild: 0.35, system: 0.2 },
  },
  {
    id: 'entwerfen',
    name: 'Eine Welt als System',
    satz: 'Ich möchte eine Welt als System entwerfen.',
    zeile: 'Zustände, Abhängigkeiten und Regeln sichtbar machen.',
    tiefe: 'system',
    anmutung: 'werkstatt',
    schwerpunkte: { schreiben: 0.2, welt: 0.8, spiel: 0.3, bild: 0.25, system: 1 },
  },
  {
    id: 'zeigen',
    name: 'Ein Artbook',
    satz: 'Ich möchte meine Welt vor allem sehen.',
    zeile: 'Bilder sammeln, Farben finden, Entwürfe nebeneinanderlegen.',
    tiefe: 'sanft',
    anmutung: 'artbook',
    schwerpunkte: { schreiben: 0.2, welt: 0.45, spiel: 0.05, bild: 1, system: 0.05 },
  },
  {
    id: 'frei',
    name: 'Noch offen',
    satz: 'Ich weiß es noch nicht. Ich möchte einfach anfangen.',
    zeile: 'Einen Namen, ein Bild, einen Gedanken. Alles Weitere später.',
    tiefe: 'sanft',
    anmutung: 'buch',
    /*
     * Bewusst flach und niedrig.
     *
     * „Noch offen" heisst nicht „alles ein bisschen", sondern „noch nichts
     * entschieden". Gleichmaessige mittlere Gewichte wuerden alles gleich weit
     * nach vorn holen – und damit genau die Wand erzeugen, vor der dieser Weg
     * schuetzen soll. Ausgeglichen und *leise*: Was vorn steht, entscheidet
     * dann die Tiefe, und die ist hier sanft.
     */
    schwerpunkte: { schreiben: 0.5, welt: 0.5, spiel: 0.3, bild: 0.5, system: 0.1 },
  },
];

export function absichtById(id: string | undefined): AbsichtDef | undefined {
  return ABSICHTEN.find((a) => a.id === id);
}

/* ------------------------------------------------------------- Das Profil -- */

/**
 * Was über einen Verfasser feststeht.
 *
 * `dazu` und `weg` sind der Grund, warum das hier ein Profil ist und keine
 * Zielgruppe: Ein Erzähler, der einmal „Reise" dazugeholt hat, ist kein
 * Weltenbauer geworden – er ist ein Erzähler mit einem Werkzeug mehr. Eine
 * ausdrückliche Entscheidung wiegt schwerer als jede Ableitung und überlebt
 * deshalb auch einen Wechsel der Absicht.
 */
export interface Profil {
  absicht: Absicht;
  tiefe: Tiefe;
  anmutung: Anmutung;
  /** Was ausdrücklich dazugeholt wurde – steht vorn, egal was die Absicht sagt. */
  dazu: string[];
  /** Was ausdrücklich weggelegt wurde – bleibt hinten, egal was die Absicht sagt. */
  weg: string[];
}

/**
 * Das Profil eines Buches, das noch keines hat.
 *
 * „Noch offen" und sanft: die vorsichtigste aller Annahmen. Ein Buch aus der
 * Zeit vor dieser Datei bekommt damit nicht plötzlich zwanzig Werkzeuge auf
 * den Tisch gelegt.
 */
export const PROFIL_VORGABE: Profil = {
  absicht: 'frei',
  tiefe: 'sanft',
  anmutung: 'buch',
  dazu: [],
  weg: [],
};

/**
 * Aus einer Absicht ein volles Profil machen.
 *
 * Die ausdrücklichen Entscheidungen (`dazu`, `weg`) werden mitgenommen: Wer
 * die Absicht wechselt, verliert nicht, was er sich einmal geholt hat.
 */
export function profilAus(absicht: Absicht, alt?: Profil): Profil {
  const def = absichtById(absicht) ?? ABSICHTEN[ABSICHTEN.length - 1];
  return {
    absicht: def.id,
    tiefe: def.tiefe,
    anmutung: def.anmutung,
    dazu: alt?.dazu ?? [],
    weg: alt?.weg ?? [],
  };
}

/**
 * Die alten Wege in Absichten übersetzen.
 *
 * Fünf Wege gab es, und sie wurden gefragt, angezeigt – und danach nie wieder
 * benutzt. Wer einen gewählt hat, hat damit trotzdem etwas über sich gesagt,
 * und das soll nicht verlorengehen, nur weil das Feld jetzt anders heißt.
 *
 * `chronist` wird zu `welt` und nicht zu `entwerfen`: „Geschichte ordnen und
 * nichts verlieren" ist Weltenbau mit langem Atem, nicht Systementwurf.
 */
const AUS_ALTEM_WEG: Record<string, Absicht> = {
  erzaehler: 'erzaehlen',
  weltenbauer: 'welt',
  spielleiter: 'spiel',
  traumweber: 'frei',
  chronist: 'welt',
};

export function profilAusAltemWeg(weg: string | undefined): Profil {
  const absicht = weg ? AUS_ALTEM_WEG[weg] : undefined;
  if (!absicht) return PROFIL_VORGABE;
  /*
   * Die Tiefe bleibt sanft, auch wenn die Absicht mehr erlaubte.
   *
   * Ein Buch, das gestern vier Werkzeuge zeigte, soll nach einer
   * Programmaenderung nicht elf zeigen. Wer mehr will, stellt es einmal um –
   * das ist ein Griff. Ungefragt mehr zu zeigen ist ein Schreck.
   */
  return { ...profilAus(absicht), tiefe: 'sanft' };
}

/** Ein gespeichertes Profil einlesen – auch wenn es beschädigt oder alt ist. */
export function heileProfil(roh: unknown, alterWeg?: string): Profil {
  if (!roh || typeof roh !== 'object') return profilAusAltemWeg(alterWeg);
  const p = roh as Partial<Profil>;
  const def = absichtById(p.absicht);
  if (!def) return profilAusAltemWeg(alterWeg);
  return {
    absicht: def.id,
    tiefe: p.tiefe && p.tiefe in TIEFENRANG ? p.tiefe : def.tiefe,
    anmutung: ANMUTUNGEN.some((a) => a.id === p.anmutung) ? (p.anmutung as Anmutung) : def.anmutung,
    dazu: Array.isArray(p.dazu) ? p.dazu.filter((x) => typeof x === 'string') : [],
    weg: Array.isArray(p.weg) ? p.weg.filter((x) => typeof x === 'string') : [],
  };
}

/**
 * Das Profil einer Quelle, die vielleicht keines hat.
 *
 * Bewusst beim *Lesen* abgeleitet und nicht einmalig in die Datenbank
 * gestempelt. Eine Wanderung waere ein Schreibvorgang ueber jedes vorhandene
 * Buch, der nur eines koennte: schiefgehen. So bleibt ein altes Buch alt, bis
 * jemand wirklich etwas umstellt – und dann steht das Profil da, weil es
 * jemand gesetzt hat, und nicht, weil ein Programm es vermutet hat.
 *
 * Nimmt `LibraryBook` und `Settings` gleichermassen: Beide tragen dieselben
 * zwei Felder, und die Oberflaeche liest mal das eine, mal das andere.
 */
export function profilVon(quelle: { profil?: unknown; weg?: string } | undefined): Profil {
  if (!quelle) return PROFIL_VORGABE;
  return heileProfil(quelle.profil, quelle.weg);
}

/** Die Schwerpunkte eines Profils – abgeleitet, nie gespeichert. */
export function schwerpunkteVon(profil: Profil): Record<Schwerpunkt, number> {
  return (absichtById(profil.absicht) ?? ABSICHTEN[ABSICHTEN.length - 1]).schwerpunkte;
}

/* ----------------------------------------------------------- Die Ordnung --- */

/**
 * Ein Werkzeug, das sich einordnen lassen will.
 *
 * `gewicht` sagt, welchen Schwerpunkten es dient – nicht, welchen Zielgruppen.
 * Der Unterschied ist der ganze Punkt: Ein Werkzeug weiß nichts über
 * Spielleiter, nur etwas über das Spielen. Kommt morgen ein Profil „Lehrer"
 * dazu, ändert sich hier keine Zeile.
 *
 * `ab` ist die Tiefe, ab der es auch dann vorn erscheinen darf, wenn kein
 * Schwerpunkt es hochträgt – für alles, was erst mit Erfahrung Sinn ergibt.
 */
export interface Werkzeug {
  id: string;
  gewicht: Partial<Record<Schwerpunkt, number>>;
  ab?: Tiefe;
}

export interface Geordnet<T> {
  /** Was von selbst offen liegt. */
  vorn: T[];
  /** Was hinter „Weiteres" steht – nie weniger als der Rest, nie nichts. */
  weiter: T[];
}

/**
 * Wie schwer ein Werkzeug für dieses Profil wiegt.
 *
 * Das Skalarprodukt aus den Gewichten des Werkzeugs und den Schwerpunkten des
 * Profils. Ein Werkzeug, das dem Spielen dient, wiegt bei „Eine Welt zum
 * Spielen" schwer und bei „Ein Artbook" fast nichts – ohne dass irgendwo eine
 * Liste steht, die beides gegeneinander aufzählt.
 */
export function gewichtFuer(werkzeug: Werkzeug, profil: Profil): number {
  const s = schwerpunkteVon(profil);
  let summe = 0;
  for (const k of SCHWERPUNKTE) summe += (werkzeug.gewicht[k] ?? 0) * s[k];
  return summe;
}

/**
 * Werkzeuge in „vorn" und „weiter" teilen.
 *
 * Die Reihenfolge ist überall dieselbe – auch hinter der Falte, damit das
 * Aufklappen nichts umsortiert. Was einmal weiter unten stand, steht dort
 * wieder, und man findet es beim zweiten Mal ohne zu suchen.
 */
export function ordne<T extends { id: string }>(
  werkzeuge: (T & Werkzeug)[],
  profil: Profil,
): Geordnet<T & Werkzeug> {
  const rang = TIEFENRANG[profil.tiefe];
  const bewertet = werkzeuge
    .map((w, i) => ({
      w,
      /* Die ursprüngliche Stelle bricht Gleichstand – sonst wackelt die Liste. */
      i,
      gewicht: gewichtFuer(w, profil),
      /* Ausdrücklich dazugeholt schlägt jede Ableitung, weggelegt ebenso. */
      dazu: profil.dazu.includes(w.id),
      abgelegt: profil.weg.includes(w.id),
    }))
    .sort((a, b) => b.gewicht - a.gewicht || a.i - b.i);

  const platz = OFFEN_JE_TIEFE[profil.tiefe];
  const vorn: (T & Werkzeug)[] = [];
  const weiter: (T & Werkzeug)[] = [];

  for (const e of bewertet) {
    if (e.abgelegt) {
      weiter.push(e.w);
      continue;
    }
    if (e.dazu) {
      vorn.push(e.w);
      continue;
    }
    /* Zu tief für diese Stufe – etwa Rohdaten bei „Sanft". */
    if (e.w.ab && TIEFENRANG[e.w.ab] > rang) {
      weiter.push(e.w);
      continue;
    }
    if (vorn.length < platz) vorn.push(e.w);
    else weiter.push(e.w);
  }

  /*
   * Dazugeholtes wurde vorn angehaengt und steht sonst hinter allem – auch
   * hinter dem, was weniger wiegt. Einmal nach Gewicht nachsortieren stellt es
   * an seinen Platz.
   */
  vorn.sort(
    (a, b) =>
      gewichtFuer(b, profil) - gewichtFuer(a, profil) ||
      werkzeuge.indexOf(a) - werkzeuge.indexOf(b),
  );
  return { vorn, weiter };
}

/**
 * Zeigt dieses Profil technische Innereien?
 *
 * Die einzige Stelle, an der aus einer Stufe eine Ja-Nein-Frage wird –
 * Kennungen, Beziehungsarten und Rohdaten stehen entweder da oder nicht.
 */
export function zeigtInnereien(profil: Profil): boolean {
  return profil.tiefe === 'system';
}
