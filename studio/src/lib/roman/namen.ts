/**
 * Wer und was im Manuskript vorkommt, ohne dass es die Welt schon kennt.
 *
 * `randnotizen.ts` erkennt, was **bereits** ein Eintrag ist. Diese Datei geht
 * die andere Richtung: Sie liest den Text und schlägt vor, was daraus ein
 * Eintrag werden könnte. Der Auftrag verlangt genau das – „Der Autor soll
 * diese Informationen nicht vorher manuell ausfüllen müssen."
 *
 * ---
 *
 * **Warum das im Deutschen schwer ist, und was hier trotzdem geht.**
 *
 * Im Englischen erkennt man Namen an der Grossschreibung. Im Deutschen ist
 * *jedes* Substantiv gross – „Der Wald war still" und „Denis war still" sehen
 * für einen Zeichenvergleich gleich aus. Wer hier nur auf Grossbuchstaben
 * schaut, schlägt dem Verfasser „Wald", „Tag" und „Hand" als Figuren vor, und
 * nach dem dritten Mal schaltet er die Erkennung ab.
 *
 * Zwei Merkmale tragen deshalb die Entscheidung, und beide sind grob:
 *
 * **1. Steht ein Begleiter davor?** Gewöhnliche Substantive kommen fast immer
 * mit Artikel – „der Wald", „ein Haus", „diese Tür". Namen stehen nackt:
 * „Denis ging", „Elara schwieg". Ein Wort, das **nie** einen Begleiter vor
 * sich hat, ist mit ziemlicher Sicherheit ein Name.
 *
 * **2. Steht es im Wörterbuch?** Für alles, was doch mit Artikel auftaucht –
 * „der Nebelwald", „das Mondtor" –, entscheidet eine Liste gewöhnlicher
 * Wörter. „Wald" steht darin, „Nebelwald" nicht. Erfundene Zusammensetzungen
 * sind der Normalfall in einer erfundenen Welt, und genau sie rutschen durch.
 *
 * ---
 *
 * **Was diese Datei ausdrücklich nicht tut: etwas anlegen.**
 *
 * Sie gibt Vorschläge zurück. Ob daraus Welt wird, entscheidet der Verfasser
 * mit einem Griff – und wenn er nie greift, ist das eine gültige Antwort und
 * keine offene Aufgabe. Dieselbe Haltung wie in `randnotizen.ts`, und aus
 * demselben Grund: Eine Welt, die sich hinter dem Rücken ihres Verfassers
 * füllt, ist nicht mehr seine.
 */

import type { Entry } from '../../types';
import { istRomanTeil } from './struktur';

/* --------------------------------------------------------- Die Begleiter -- */

/**
 * Wörter, nach denen ein Substantiv folgt – und damit kein Name.
 *
 * Artikel, Possessiv- und Demonstrativpronomen in allen Fällen. Wer „der
 * Nebelwald" schreibt, meint einen Ort und nicht jemanden namens Nebelwald;
 * das Wort kann trotzdem ein Eintrag werden, aber es kommt über den zweiten
 * Weg herein und nicht über diesen.
 */
const BEGLEITER = new Set([
  'der','die','das','den','dem','des',
  'ein','eine','einen','einem','einer','eines',
  'kein','keine','keinen','keinem','keiner','keines',
  'mein','meine','meinen','meinem','meiner','meines',
  'dein','deine','deinen','deinem','deiner','deines',
  'sein','seine','seinen','seinem','seiner','seines',
  'ihr','ihre','ihren','ihrem','ihrer','ihres',
  'unser','unsere','unseren','unserem','unserer','unseres',
  'euer','eure','euren','eurem','eurer','eures',
  'dieser','diese','dieses','diesen','diesem',
  'jener','jene','jenes','jenen','jenem',
  'jeder','jede','jedes','jeden','jedem',
  'manche','mancher','manches','manchen','manchem',
  'welche','welcher','welches','welchen','welchem',
  'alle','allen','aller','alles','allem',
  'viele','vielen','vieler','wenige','wenigen',
  'zwei','drei','vier','fünf','sechs','sieben','acht','neun','zehn',
]);

/**
 * Wörter, die einen Ort ankündigen.
 *
 * „nach Mondsee", „im Nebelwald", „aus Kupferstadt". Sie entscheiden nicht,
 * *ob* etwas ein Eintrag wird, sondern **welcher Art** – und sie irren sich
 * gutmütig: „bei Denis" macht aus Denis keinen Ort, weil das Merkmal nur
 * zählt, wenn es öfter zutrifft als das Gegenteil.
 */
const ORTSWORTE = new Set(['in', 'im', 'nach', 'zum', 'zur', 'richtung', 'gen']);

/*
 * Warum so wenige.
 *
 * Die erste Fassung führte hier zwanzig Präpositionen – „von", „bei", „an",
 * „vor", „über", „aus". Gemessen an echter Prosa machte das aus einer Figur
 * einen Ort: „Von Marun sprach danach niemand mehr."
 *
 * Fast jede deutsche Präposition steht auch vor Menschen. Übrig bleiben die
 * sieben, nach denen ein grossgeschriebenes Wort fast immer ein Ort ist – und
 * selbst „nach" braucht noch die Verbprüfung darüber. Ein Ort weniger zu
 * erkennen kostet einen Griff; eine Figur als Ort anzulegen kostet Vertrauen.
 */

/**
 * Verben, nach denen ein „nach" **kein** Ort ist.
 *
 * „Später fragte Elara nach Marun." – gemessen an echter Prosa wurde Marun
 * dadurch zum Ort, weil „nach" davorstand. Das Wort ist im Deutschen
 * doppeldeutig: „nach Mondsee" ist eine Richtung, „nach Marun" eine Frage.
 * Was die beiden unterscheidet, steht ein Wort weiter vorn.
 */
const FRAGEVERBEN = new Set([
  'fragte','fragt','fragen','suchte','sucht','suchen','rief','ruft','rufen',
  'sehnte','sehnt','forschte','forscht','erkundigte','erkundigt','tastete','tastet',
  'griff','greift','langte','langt','schaute','schaut','sah','sieht','blickte','blickt',
]);

/**
 * Wörter, die eine sprechende oder handelnde Person ankündigen – oder ihr
 * folgen. „Denis sagte", „fragte Elara", „Marun nickte".
 */
const PERSONENWORTE = new Set([
  'sagte','sagt','fragte','fragt','antwortete','antwortet','rief','ruft',
  'flüsterte','flüstert','murmelte','murmelt','erwiderte','erwidert',
  'nickte','nickt','lachte','lacht','schwieg','schweigt','seufzte','seufzt',
  'ging','geht','kam','kommt','stand','steht','sah','sieht','blickte','blickt',
  'wusste','weiss','weiß','dachte','denkt','wandte','wendet','trat','tritt',
  'griff','greift','hob','hebt','legte','legt','nahm','nimmt',
]);

/**
 * Wörter, die Sätze beginnen, ohne Namen zu sein.
 *
 * Der blinde Fleck der ganzen Erkennung – und er wurde erst durch eine
 * Prüfung sichtbar. Am Satzanfang ist **jedes** Wort gross: „Plötzlich",
 * „Der", „Sie", „Dann". Ohne diese Liste bekäme der Verfasser jedes zweite
 * Adverb als Figur vorgeschlagen.
 *
 * Es ist ein geschlossener Kreis von Wörtern und deshalb eine Liste, die
 * wirklich vollständig werden kann – anders als das Wörterbuch der
 * Substantive darunter. Pronomen, Konjunktionen, häufige Adverbien; die
 * Begleiter kommen aus der Liste darüber dazu.
 */
const FUNKTIONSWORT = new Set([
  ...BEGLEITER,
  'ich','du','er','sie','es','wir','ihr','man','sich','mir','mich','dir','dich',
  'ihm','ihn','uns','euch','ihnen','wer','was','wen','wem','wessen',
  'und','oder','aber','denn','doch','sondern','als','wenn','weil','dass','ob',
  'damit','obwohl','während','bevor','nachdem','seit','bis','sobald','falls',
  'plötzlich','dann','danach','später','zuerst','endlich','schliesslich',
  'schließlich','nun','jetzt','heute','gestern','morgens','abends','damals',
  'manchmal','immer','nie','niemals','oft','selten','wieder','noch','schon',
  'hier','dort','da','überall','nirgends','draussen','draußen','drinnen',
  'oben','unten','vorn','hinten','links','rechts','weit','nah',
  'vielleicht','wahrscheinlich','sicher','natürlich','tatsächlich','wirklich',
  'so','sehr','ganz','fast','kaum','nur','auch','sogar','eben','gerade',
  'ja','nein','nicht','nichts','etwas','jemand','niemand','alles',
  'es','warum','wieso','weshalb','wohin','woher','wie','wo','wann',
  'trotzdem','deshalb','darum','dennoch','außerdem','ausserdem','zudem',
  'einmal','zweimal','erst','zuletzt','inzwischen','unterdessen','stattdessen',
]);

/**
 * Endungen, an denen man deutsche Ortsnamen erkennt.
 *
 * Der klassische Griff, und hier ist er richtig: Erfundene Orte werden fast
 * immer zusammengesetzt – Nebel**wald**, Mond**see**, Kupfer**stadt**,
 * Drachen**fels**. Gemessen an echter Prosa war das die einzige Auskunft, die
 * blieb: „Der Nebelwald schwieg" hat einen Artikel (also keine Person) und
 * kein Ortswort davor (also kein Hinweis) – und wurde deshalb zur Figur.
 *
 * Sie gelten nur für zusammengesetzte Wörter. „Wald" allein steht ohnehin im
 * Wörterbuch darunter und fällt vorher heraus.
 */
const ORTSENDUNGEN = [
  'wald','see','berg','burg','stein','stadt','dorf','tal','fluss','bach',
  'land','reich','feld','moor','heide','hain','furt','brücke','tor','pass',
  'schlucht','mark','gau','hof','fels','kluft','steg','hafen','au',
];

function klingtNachOrt(wort: string): boolean {
  const klein = wort.toLowerCase();
  return ORTSENDUNGEN.some((e) => klein.length > e.length + 2 && klein.endsWith(e));
}

/* -------------------------------------------------------- Das Wörterbuch -- */

/**
 * Gewöhnliche deutsche Wörter, die gross geschrieben vorkommen.
 *
 * Ausdrücklich **keine** vollständige Liste – die gibt es nicht, und der
 * Versuch wäre ein Fass ohne Boden. Es sind die Wörter, die in Prosa so
 * häufig sind, dass ein Vorschlag daraus die ganze Erkennung entwertet:
 * Körperteile, Tageszeiten, Räume, Naturdinge, Verwandtschaft, Abstrakta.
 *
 * Wer ein Wort vermisst, das fälschlich vorgeschlagen wurde, trägt es hier
 * nach. Das ist ausdrücklich der vorgesehene Weg – und billiger als jede
 * Grammatik, die wir hier nicht bauen wollen.
 */
const GEWOEHNLICH = new Set(
  (
    'abend arm atem auge augen bein beine berg blick blut boden brot bruder ' +
    'dach dorf donner dunkel ecke ende erde fenster feuer finger flamme fluss ' +
    'frage frau fuss füsse gesicht gott hals hand hände haar haus herz himmel ' +
    'hoffnung hunger jahr jahre junge kind kinder kopf körper kraft kälte land ' +
    'leben licht liebe luft mann mauer meer mensch menschen messer minute ' +
    'mond morgen mutter nacht name nebel ohr ort platz rand raum regen rücken ' +
    'schatten schmerz schnee schritt schulter schwert see seite sinn sommer ' +
    'sonne stadt stein stelle stimme strasse straße stunde sturm tag tage tal ' +
    'tisch tochter tod ton tor tür vater vogel wald wand wasser weg welt wind ' +
    'winter wort worte wunde zeit zimmer'
  ).split(' '),
);

/* --------------------------------------------------------- Der Fund ------- */

export type Namensart = 'person' | 'ort' | 'ding';

export interface Namensfund {
  /** Das Wort, wie es im Text steht. */
  name: string;
  /** Wie oft es vorkommt. */
  anzahl: number;
  /** Wofür wir es halten – eine Vermutung, keine Feststellung. */
  art: Namensart;
  /** Der Satz, in dem es zuerst steht. Er ist der Beleg. */
  beleg: string;
}

/** Die Eintragsart, die zu einem Fund gehört. */
export const ART_ZU_TYP: Record<Namensart, string> = {
  person: 'character',
  ort: 'location',
  ding: 'artifact',
};

/** Wie ein Fund heisst, wenn man ihn benennt. */
export const ART_NAME: Record<Namensart, string> = {
  person: 'Figur',
  ort: 'Ort',
  ding: 'Gegenstand',
};

/**
 * Wie oft ein Wort vorkommen muss, um vorgeschlagen zu werden.
 *
 * Zweimal. Einmal ist zu wenig – jeder Text enthält Wörter, die genau einmal
 * gross dastehen, weil ein Satz mit ihnen beginnt. Dreimal wäre zu streng:
 * Eine Figur, die in einer Szene auftaucht und wieder verschwindet, ist
 * trotzdem eine Figur.
 */
const MINDESTENS = 2;

const WORTGRENZE = /[^\p{L}\p{N}]+/u;

/** Grob in Sätze zerlegen – für den Beleg. Genauer muss es nicht sein. */
function saetze(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Namen im Text finden, die die Welt noch nicht kennt.
 *
 * `bekannt` sind die vorhandenen Einträge: Was es schon gibt, wird nicht noch
 * einmal vorgeschlagen. Verglichen wird kleingeschrieben, damit „Denis" und
 * „denis" dieselbe Figur meinen.
 */
export function findeNamen(text: string, bekannt: Entry[] = []): Namensfund[] {
  if (!text?.trim()) return [];

  const schonDa = new Set(
    bekannt
      .filter((e) => !istRomanTeil(e.type))
      .map((e) => e.title.trim().toLowerCase())
      .filter(Boolean),
  );

  interface Zaehler {
    name: string;
    anzahl: number;
    /**
     * Wie oft es **mitten** im Satz stand.
     *
     * Getrennt von `anzahl`, und das ist der Kern: Die Häufigkeit entscheidet,
     * ob ein Wort wichtig genug ist; der Satzanfang entscheidet gar nichts,
     * weil dort jedes Wort gross ist. Gemessen: „Denis ging. … kam Denis
     * zurück" wurde beim ersten Versuch gar nicht gefunden, weil nur die
     * Vorkommen mitten im Satz gezählt wurden – und Figuren beginnen Sätze.
     */
    mitten: number;
    /** Wie oft ein Begleiter davorstand. */
    mitBegleiter: number;
    ortspunkte: number;
    personenpunkte: number;
    beleg: string;
  }
  const nach = new Map<string, Zaehler>();

  for (const satz of saetze(text)) {
    const woerter = satz.split(WORTGRENZE).filter(Boolean);
    for (let i = 0; i < woerter.length; i++) {
      const wort = woerter[i];
      /*
       * Das erste Wort eines Satzes ist immer gross und sagt deshalb nichts.
       * Es zählt trotzdem mit – aber nur, wenn dasselbe Wort auch mitten im
       * Satz auftaucht; sonst hätte jeder Satzanfang einen Vorschlag zur
       * Folge.
       */
      const amAnfang = i === 0;
      if (!/^\p{Lu}/u.test(wort)) continue;
      if (wort.length <= 2) continue;

      const klein = wort.toLowerCase();
      if (schonDa.has(klein)) continue;

      const vor = i > 0 ? woerter[i - 1].toLowerCase() : '';
      /*
       * Steht kurz vorher ein Frageverb?
       *
       * Ein Fenster und nicht das eine Wort davor: „fragte **Elara** nach
       * Marun" hat ein Subjekt dazwischen, und genau daran ist die erste,
       * engere Fassung gescheitert. Vier Wörter zurück reichen für
       * „erkundigte sich der Alte nach …" und hören auf, bevor der
       * vorhergehende Satzteil hereinredet.
       */
      let frageverbNah = false;
      for (let k = i - 2; k >= 0 && k >= i - 5; k--) {
        if (FRAGEVERBEN.has(woerter[k].toLowerCase())) {
          frageverbNah = true;
          break;
        }
      }
      const nachWort = i + 1 < woerter.length ? woerter[i + 1].toLowerCase() : '';

      let z = nach.get(klein);
      if (!z) {
        z = { name: wort, anzahl: 0, mitten: 0, mitBegleiter: 0, ortspunkte: 0, personenpunkte: 0, beleg: satz };
        nach.set(klein, z);
      }
      z.anzahl++;
      if (!amAnfang) z.mitten++;
      if (BEGLEITER.has(vor)) z.mitBegleiter++;
      /*
       * Ein Ortswort zählt nur, wenn davor kein Frageverb steht. „nach
       * Mondsee" ist eine Richtung, „fragte nach Marun" ist es nicht.
       */
      if (ORTSWORTE.has(vor) && !frageverbNah) z.ortspunkte++;
      if (PERSONENWORTE.has(nachWort) || PERSONENWORTE.has(vor)) z.personenpunkte++;
    }
  }

  /*
   * Gebeugte Formen zur Grundform schlagen.
   *
   * „Der Nebelwald schwieg" und „am Rand des Nebelwaldes" sind für einen
   * Zeichenvergleich zwei Wörter – und gemessen an echter Prosa fiel der
   * Nebelwald deshalb durch: einmal so, einmal so, keins zweimal.
   *
   * Zusammengelegt wird nur, wenn die **Grundform selbst vorkommt**. „Denis"
   * schluckt kein „Deni", weil es kein „Deni" gibt; „Nebelwaldes" fällt an
   * „Nebelwald", weil der dasteht. Ohne diese Bedingung würde aus jedem Namen
   * auf -s ein kürzerer erfunden.
   */
  const ENDUNGEN = ['es', 's', 'en', 'n'];
  for (const [klein, z] of [...nach]) {
    for (const endung of ENDUNGEN) {
      if (!klein.endsWith(endung)) continue;
      const stamm = klein.slice(0, -endung.length);
      const grund = nach.get(stamm);
      /*
       * `stamm.length <= 2` ist Gürtel und Hosenträger und **von keiner
       * Prüfung erreicht** – die Gegenprobe blieb grün. Um sie auszulösen,
       * bräuchte es ein dreibuchstabiges Wort auf -n, dessen zweibuchstabiger
       * Rest ebenfalls zweimal im Text steht und alle Filter passiert. Das
       * steht hier, damit niemand die Zeile für geprüft hält.
       */
      if (!grund || stamm.length <= 2) continue;
      grund.anzahl += z.anzahl;
      grund.mitten += z.mitten;
      grund.mitBegleiter += z.mitBegleiter;
      grund.ortspunkte += z.ortspunkte;
      grund.personenpunkte += z.personenpunkte;
      nach.delete(klein);
      break;
    }
  }

  const funde: Namensfund[] = [];
  for (const z of nach.values()) {
    if (z.anzahl < MINDESTENS) continue;

    const klein = z.name.toLowerCase();
    /*
     * Funktionswörter und gewöhnliche Substantive fallen immer – unabhängig
     * davon, ob ein Begleiter davorstand. „Der" steht am Satzanfang nackt da
     * und wäre sonst eine Figur.
     */
    if (FUNKTIONSWORT.has(klein) || GEWOEHNLICH.has(klein)) continue;

    /*
     * Einmal mitten im Satz – oder häufig genug, dass es nicht am Zufall
     * liegt.
     *
     * Gemessen: „Denis ging. Denis kam. Denis schwieg." steht dreimal am
     * Satzanfang und wurde mit der ersten, strengeren Regel gar nicht
     * gefunden. Figuren beginnen Sätze; das ist kein Sonderfall, sondern
     * Prosa. Was diese Lockerung wieder hereinlassen würde – „Plötzlich",
     * „Dann", „Später" –, fängt die Liste darüber ab.
     */
    if (z.mitten === 0 && z.anzahl < 3) continue;
    /*
     * Der Kern der Entscheidung.
     *
     * Ein Wort ohne jeden Begleiter ist ein Name – das ist im Deutschen das
     * verlässlichste Merkmal, das ohne Wörterbuch zu haben ist. Ein Wort
     * *mit* Begleiter muss durch die Liste gewöhnlicher Wörter: „der
     * Nebelwald" bleibt, „der Wald" fällt.
     */
    const nackt = z.mitBegleiter === 0;

    /*
     * Die Art. Ortsworte schlagen Personenworte, weil „bei Denis" seltener
     * ist als „nach Mondsee" – und weil ein falsch geratener Ort weniger
     * stört als eine falsch geratene Figur: Ein Ort hat kein Gesicht, das
     * dann leer bliebe.
     */
    let art: Namensart;
    if (z.ortspunkte > 0 && z.ortspunkte >= z.personenpunkte) art = 'ort';
    else if (klingtNachOrt(z.name)) art = 'ort';
    else if (!nackt) {
      /*
       * Wer einen Artikel trägt, ist keine Person.
       *
       * Im Deutschen steht vor einem Namen kein Artikel – „der Denis" ist
       * Mundart und keine Prosa. Ohne diese Zeile wurde „Der Nebelwald
       * schwieg" zu einer Figur, weil „schwieg" ein Verb ist, das auch
       * Menschen tun.
       */
      art = 'ding';
    } else if (z.personenpunkte > 0 || nackt) art = 'person';
    else art = 'ding';

    funde.push({ name: z.name, anzahl: z.anzahl, art, beleg: z.beleg });
  }

  /*
   * Häufigstes zuerst, bei Gleichstand alphabetisch. Eine feste Reihenfolge
   * zählt hier mehr als eine kluge: Eine Liste, die bei jedem Tastendruck
   * springt, liest niemand zu Ende.
   */
  return funde.sort((a, b) => b.anzahl - a.anzahl || a.name.localeCompare(b.name, 'de'));
}
