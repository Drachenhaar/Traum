/*
 * Die Bucht – das Abtragen.
 *
 * Der erste Eintrag im Wortschatz, mit dem man malen kann, ohne dass das
 * Programm etwas erfindet. Die Regel aus `kontur.ts` bleibt wörtlich stehen:
 *
 *   „Die Geografie gehört dem Verfasser, nur ihr Strich gehört uns."
 *
 * Geprüft wird deshalb vor allem eines: dass am Ende **das** dasteht, was
 * gezogen wurde – nicht mehr und nicht weniger.
 */
import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';

const S = ARBEIT;
execSync(`npx esbuild src/lib/karte/kontur.ts --bundle --format=esm --outfile=${S}/t/kontur.mjs`, {
  stdio: 'pipe',
});
const K = await import(S + '/t/kontur.mjs');

let ok = 0;
let bad = 0;
function wahr(was, bedingung, hinweis = '') {
  if (bedingung) {
    ok++;
  } else {
    bad++;
    console.error(`  ✗ ${was}${hinweis ? ` – ${hinweis}` : ''}`);
  }
}

/** Ein Quadrat als Landmasse – gross genug, dass eine Bucht Platz hat. */
const quadrat = (x0, y0, x1, y1) => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];

/**
 * Eine unruhige Küste – und **nicht** ein Quadrat.
 *
 * Der erste Anlauf prüfte an einem Quadrat und meldete zehn Prozent
 * Flächenverlust. Gemessen: Ein Quadrat verliert 9,9 %, dieselbe Küste 0,14 %.
 * Es liegt nicht an der Punktzahl (ein dicht abgetastetes Quadrat verliert
 * genauso viel), sondern an den **rechten Winkeln**: `glaette` rundet jede
 * 90°-Ecke und schneidet dabei ein Dreieck ab.
 *
 * Das ist kein Fehler, sondern die Aufgabe dieses Schrittes – und im Buch gibt
 * es keine rechtwinkligen Flächen, weil jede schon durch `glaette` gelaufen
 * ist. Wer an einem Quadrat prüft, prüft eine Form, die es nicht gibt.
 */
function kueste(seed = 5, cx = 500, cy = 500, r = 260, n = 40) {
  let z = seed;
  const zuf = () => ((z = (z * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const p = [];
  for (let i = 0; i < n; i++) {
    const w = (i / n) * Math.PI * 2;
    const rr = r * (0.9 + zuf() * 0.2);
    p.push([cx + Math.cos(w) * rr, cy + Math.sin(w) * rr]);
  }
  return p;
}

/** Liegt der Punkt in der Fläche? */
function drin(x, y, poly) {
  let ja = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ja = !ja;
  }
  return ja;
}

/** Der Flächeninhalt, vorzeichenlos. */
const inhalt = (p) => Math.abs(K.flaechenmass(p)) / 2;

/** Eine gerade Spur von A nach B, dicht genug für den Stempel. */
const spur = (ax, ay, bx, by, n = 30) => {
  const p = [];
  for (let i = 0; i <= n; i++) p.push([ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n]);
  return p;
};

const land = kueste();
const vorher = inhalt(land);

/* ==========================================================================
 * 1  DIE BUCHT FRISST GENAU DORT
 * ======================================================================= */

console.log('\n1 Die Bucht');

{
  /* Von aussen links in die Fläche hinein, bis knapp zur Mitte. */
  const teile = K.abtragen(land, spur(150, 500, 450, 500), 40);
  wahr('  es kommt etwas zurück', Array.isArray(teile) && teile.length === 1, `${teile?.length}`);

  const nachher = inhalt(teile[0]);
  wahr(`  die Fläche wird kleiner (${Math.round(vorher)} → ${Math.round(nachher)})`, nachher < vorher);

  /*
   * **Und nur um das Gezogene.** Ein Verfahren, das beim Abtragen nebenbei ein
   * Drittel des Landes verliert, hat die Karte mitgeschrieben.
   */
  const weg = (vorher - nachher) / vorher;
  wahr(`  und nur um das Gezogene (${(weg * 100).toFixed(1)} %)`, weg > 0.02 && weg < 0.2);

  /*
   * Der Weg über das Raster kostet für sich genommen fast nichts – das ist die
   * Zusicherung hinter `ZELLE_FEIN`. Ein Schnitt, der die Fläche kaum berührt,
   * darf sie kaum verändern.
   */
  const kaum = inhalt(K.abtragen(land, spur(235, 500, 250, 500), 6)[0]);
  wahr(
    `  der Weg durchs Raster allein kostet fast nichts (${(((vorher - kaum) / vorher) * 100).toFixed(2)} %)`,
    Math.abs(vorher - kaum) / vorher < 0.01,
  );
}

/*
 * Die Bucht liegt da, wo sie gezogen wurde – und nur dort.
 *
 * Gemessen wird nicht am Umriss, sondern an der Fläche selbst: Was im Strich
 * lag, gehört nicht mehr dazu; was daneben lag, schon.
 *
 * Der erste Anlauf suchte den linkesten Punkt auf Höhe des Striches und war
 * falsch: Der **Eingang** der Bucht liegt auf derselben Höhe und auf der alten
 * Küstenlinie. Gemessen wurde also die Küste, die dort noch stehen soll.
 */
{
  const teile = K.abtragen(land, spur(150, 500, 450, 500), 40);
  const nachher = teile[0];
  wahr('  vorher lag der Punkt im Land', drin(350, 500, land));
  wahr('  danach liegt er in der Bucht', !drin(350, 500, nachher));
  wahr('  ein Punkt daneben bleibt Land', drin(500, 350, land) && drin(500, 350, nachher));
  wahr('  und einer weiter innen auch', drin(600, 500, land) && drin(600, 500, nachher));
}

/* ==========================================================================
 * 2  EINE BUCHT, DIE DURCHTRENNT
 *
 * Der Fall, für den `konturenAus` überhaupt umgebaut wurde. Vorher behielt der
 * Konturenzieher nur die längste Schleife – die kleinere Hälfte einer
 * durchtrennten Landmasse wäre stillschweigend verschwunden.
 * ======================================================================= */

console.log('\n2 Durchtrennen');

{
  const teile = K.abtragen(land, spur(150, 500, 850, 500), 40);
  wahr(`  aus einer Landmasse werden zwei (${teile.length})`, teile.length === 2);
  wahr('  beide haben eine nennenswerte Fläche', teile.every((t) => inhalt(t) > vorher * 0.25));
  wahr(
    '  und zusammen sind sie kleiner als vorher',
    teile.reduce((n, t) => n + inhalt(t), 0) < vorher,
  );
}

/*
 * Und das Hauptstück kommt zuerst – nach **Fläche**, nicht nach Umfang.
 *
 * Auf der Seite behält das erste Stück Kennung, Name und Startwert; die
 * übrigen werden namenlose Nachbarn. Welches das erste ist, ist deshalb keine
 * Formalie, sondern die Frage, wo „die Mooshalde" nach dem Schnitt liegt.
 *
 * Geprüft an einer Form, bei der beide Masse **auseinanderfallen**: ein glatter
 * runder Kopf und ein zerfranster Lappen von weniger als halber Grösse. Der
 * Lappen hat mehr Rand und mehr Stützpunkte als der Kopf – wer nach Länge
 * sortierte, schöbe den Namen der Insel auf ihren abgetrennten Ausläufer.
 *
 * Der erste Anlauf prüfte an einem Lutscher – runder Kopf, langer schmaler
 * Stiel – und war zwar in der *Sache* richtig (der Stiel hatte wirklich mehr
 * Rand), bewies aber nichts: Nach dem Vereinfachen hatte der glatte Stiel nur
 * 24 Stützpunkte gegen 116 des Kopfes, also stand der Kopf ohnehin vorn. Die
 * Gegenprobe blieb grün. Was hier zählt, ist nicht der gemessene Umfang,
 * sondern die **Zahl der Punkte** – denn danach sortiert `konturenAus`, und
 * genau die soll überschrieben werden.
 */

console.log('\n2b Wer den Namen behält');

{
  /* Der glatte Kopf, links. */
  const kopf = [];
  for (let i = 0; i <= 60; i++) {
    const w = 0.09 * Math.PI + 1.82 * Math.PI * (i / 60);
    kopf.push([300 + Math.cos(w) * 115, 500 + Math.sin(w) * 115]);
  }
  /* Der zerfranste Lappen, rechts – kleiner, aber mit viel mehr Küste. */
  const lappen = [];
  for (let i = 0; i <= 90; i++) {
    const w = 1.09 * Math.PI + 1.82 * Math.PI * (i / 90);
    const rr = 68 * (1 + 0.22 * Math.sin(w * 11));
    lappen.push([640 + Math.cos(w) * rr, 500 + Math.sin(w) * rr]);
  }
  const hantel = [...kopf, lappen[0], ...lappen, lappen[lappen.length - 1]];

  const teile = K.abtragen(hantel, spur(470, 420, 470, 580, 40), 15);
  wahr(`  Kopf und Lappen werden zwei (${teile?.length})`, teile?.length === 2);
  wahr(
    `  der Lappen hat wirklich mehr Punkte (${teile[1]?.length} > ${teile[0]?.length})`,
    teile[1].length > teile[0].length,
    'sonst prüft die nächste Zusicherung nichts',
  );
  wahr(
    `  und trotzdem steht der Kopf vorn (${Math.round(inhalt(teile[0]))} vor ${Math.round(inhalt(teile[1]))})`,
    inhalt(teile[0]) > inhalt(teile[1]),
  );
}

/* ==========================================================================
 * 3  WAS NICHTS TUN SOLL
 * ======================================================================= */

console.log('\n3 Was nichts tut');

wahr(
  '  ein Strich neben der Fläche ändert nichts',
  K.abtragen(land, spur(50, 50, 120, 120), 40) === undefined,
);
wahr('  ein Tippen auch nicht', K.abtragen(land, [[500, 500]], 40) === undefined);
wahr('  und eine Fläche mit zwei Punkten ist keine', K.abtragen([[0, 0], [1, 1]], spur(0, 0, 10, 10), 5) === undefined);

/*
 * Ein Strich, der alles wegnimmt, gibt eine leere Liste zurück – **nicht**
 * `undefined`. Der Unterschied trägt Bedeutung: „nichts geändert" und „die
 * Fläche gibt es nicht mehr" sind zwei verschiedene Antworten, und die Seite
 * muss die zweite behandeln können.
 */
{
  const alles = K.abtragen(quadrat(400, 400, 500, 500), spur(300, 450, 600, 450), 200);
  wahr('  ein Strich, der alles wegnimmt, gibt eine leere Liste', Array.isArray(alles) && alles.length === 0);
}

/*
 * Ein Strich, der die Küste nur streift, hinterlässt keinen Krümel.
 *
 * Diese Zusicherung fehlte zuerst – der Krümelfilter in `abtragen` stand da,
 * ohne dass eine Zusicherung ihn hielt. Die Gegenprobe (Filter ausbauen, Test
 * laufen lassen) blieb grün, und ein Wächter, dem niemand zusieht, ist eine
 * Behauptung im Quelltext.
 *
 * Gemessen wurde dann, was er wirklich tut: An dieser Stelle bliebe ohne ihn
 * ein Bruchstück von 359 Flächeneinheiten übrig – ein Fleck von knapp
 * neunzehn Punkten Kantenlänge, kleiner als der Pinsel, der ihn erzeugt hat.
 * Auf der Karte wäre das eine zweite Landmasse mit eigenem Eintrag, eigener
 * Auswahl und eigenem Namensfeld. Niemand hat sie gemalt.
 */
{
  const streifen = [];
  for (let i = 0; i <= 60; i++) streifen.push([100 + i * 15, 692]);
  const teile = K.abtragen(land, streifen, 48);
  wahr(
    `  ein Streifschuss hinterlässt keinen Krümel (${teile?.length} Teil)`,
    teile?.length === 1,
    teile?.map((t) => Math.round(inhalt(t))).join(', '),
  );
  /*
   * Und was übrig ist, ist die Küste – nicht der Krümel. Gemessen an einem
   * Punkt tief im Land statt an einem Anteil: Der Streifschuss trägt den
   * Landstreifen unterhalb des Striches durchaus ab (rund sechzehn Prozent),
   * und eine Schwelle von „neunzig Prozent müssen bleiben" wäre eine Zahl
   * gewesen, die nichts über die Sache aussagt.
   */
  wahr('  und was bleibt, ist die Küste selbst', drin(500, 400, teile[0]));
}

/*
 * Eine Bucht mitten im Land ist ein See – und ein See ist in diesem Buch eine
 * eigene Fläche, keine Aussparung. Das Loch fällt weg, der Umriss bleibt ganz.
 */
{
  const teile = K.abtragen(land, spur(470, 500, 530, 500), 25);
  wahr('  eine Bucht mitten im Land lässt den Umriss ganz', teile.length === 1);
  wahr(
    `  und trägt dort nichts ab (${((inhalt(teile[0]) / vorher) * 100).toFixed(1)} % übrig)`,
    inhalt(teile[0]) > vorher * 0.97,
  );
}

/* ==========================================================================
 * 4  DIE KÜSTE ÜBERLEBT
 *
 * Der Preis des Weges über das Raster: Die Fläche geht hindurch und kommt
 * wieder heraus. Bei einer zu groben Zelle wäre eine Küste nach ein paar
 * Buchten weichgespült.
 * ======================================================================= */

console.log('\n4 Die Küste überlebt');

{
  const anfang = kueste();
  const einmal = K.abtragen(anfang, spur(180, 500, 300, 500), 30);
  wahr('  eine unruhige Küste übersteht eine Bucht', einmal?.length === 1);

  /* Und fünf hintereinander, jede an einer anderen Stelle. */
  let jetzt = anfang;
  for (let i = 0; i < 5; i++) {
    const w = (i / 5) * Math.PI * 2;
    const t = K.abtragen(jetzt, spur(500 + Math.cos(w) * 400, 500 + Math.sin(w) * 400, 500 + Math.cos(w) * 200, 500 + Math.sin(w) * 200), 22);
    if (t?.length) jetzt = t[0];
  }
  /*
   * Nicht weichgespült: Der Umriss muss danach immer noch Ecken haben. Eine
   * Küste, die nach fünf Bearbeitungen ein Kreis ist, hat ihre Geografie
   * verloren – und niemand hätte es bemerkt.
   */
  const abstaende = jetzt.map(([x, y]) => Math.hypot(x - 500, y - 500));
  const spanne = Math.max(...abstaende) - Math.min(...abstaende);
  wahr(`  und ist nach fünf Buchten noch keine Scheibe (Spanne ${Math.round(spanne)})`, spanne > 60);
  wahr(`  hat aber noch Substanz (${Math.round(inhalt(jetzt))})`, inhalt(jetzt) > 60000);
}

/*
 * Kein Sägeblatt – und diesmal gemessen statt behauptet.
 *
 * In `abtragen` steht, warum dort **nicht** noch einmal `verfeinere` läuft:
 * „Nach fünf Buchten wäre aus einer Küste ein Sägeblatt." Der Satz stand da
 * ohne Beleg, und die Gegenprobe – das Verfeinern wieder einbauen – blieb
 * grün. Also gemessen, an der Zackigkeit: dem Umfang einer Fläche, geteilt
 * durch den Umfang, den sie als Kreis hätte. 1,0 ist ein Kreis.
 *
 *              gemalt   nach fünf verschiedenen Buchten
 *   so wie es ist   1,06   →  1,81    532 Punkte
 *   mit Verfeinern  1,06   →  4,41   1532 Punkte
 *
 * Der Anstieg auf 1,8 ist die Geografie selbst – fünf tiefe Einschnitte
 * *sind* mehr Küste. Der Anstieg auf 4,4 ist das Verfahren, das sich selbst
 * zuhört: Jeder Durchgang legt sein Rauschen auf das Rauschen des vorigen,
 * und die Punktzahl wächst dabei ungebremst weiter, statt sich an der
 * Auflösung des Rasters zu decken.
 */
{
  const rund = [];
  for (let i = 0; i <= 40; i++) {
    const w = (i / 40) * Math.PI * 2;
    rund.push([500 + Math.cos(w) * 260, 500 + Math.sin(w) * 260]);
  }
  const umfang = (p) => {
    let u = 0;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      u += Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1]);
    }
    return u;
  };
  const zackigkeit = (p) => umfang(p) / (2 * Math.sqrt(Math.PI * inhalt(p)));

  let f = K.flaecheAus(rund, 28, 12345);
  for (let i = 1; i <= 5; i++) {
    const w = (i / 5) * Math.PI * 2;
    const s = [];
    for (let k = 0; k <= 30; k++) {
      const t = k / 30;
      s.push([500 + Math.cos(w) * (400 - 220 * t), 500 + Math.sin(w) * (400 - 220 * t)]);
    }
    const teile = K.abtragen(f, s, 26);
    if (teile?.length) f = teile[0];
  }
  wahr(
    `  fünf Buchten machen kein Sägeblatt (Zackigkeit ${zackigkeit(f).toFixed(2)})`,
    zackigkeit(f) < 2.5,
  );
  wahr(
    `  und die Punktzahl deckelt sich am Raster (${f.length})`,
    f.length < 800,
    'sonst wächst sie mit jeder Bearbeitung weiter',
  );
}

/*
 * Der Fixpunkt – die eigentliche Zusicherung hinter diesem Abschnitt.
 *
 * Dieselbe Bucht ein zweites Mal zu ziehen kann nichts Neues wegnehmen. Wenn
 * der Weg durchs Raster für sich genommen etwas kostet, muss es **hier**
 * auftauchen: Jede Wiederholung liefe erneut hindurch, und der Verlust
 * summierte sich, ohne dass irgendetwas abgetragen würde.
 *
 * Gemessen: null. Nicht „wenig", sondern Punkt für Punkt dieselbe Fläche.
 * Damit ist auch beantwortet, was der stetige Schwund bei acht verschiedenen
 * Buchten war – echtes Abtragen, nicht Verschleiss.
 *
 * Das ist stärker als „die Küste bleibt ungefähr erhalten" und der Grund,
 * warum man ohne Sorge zwanzigmal nachbessern darf.
 */
{
  const anfang = kueste();
  const hinein = spur(180, 500, 380, 500, 30);
  const einmal = K.abtragen(anfang, hinein, 30)[0];

  let jetzt = einmal;
  for (let i = 0; i < 7; i++) {
    const t = K.abtragen(jetzt, hinein, 30);
    if (t?.length) jetzt = t[0];
  }
  wahr(
    `  dieselbe Bucht siebenmal mehr kostet nichts (${Math.round(inhalt(einmal))} → ${Math.round(inhalt(jetzt))})`,
    Math.abs(inhalt(jetzt) - inhalt(einmal)) < 1,
  );
  wahr(
    `  und ändert keinen einzigen Punkt (${einmal.length} → ${jetzt.length})`,
    jetzt.length === einmal.length &&
      jetzt.every(([x, y], i) => x === einmal[i][0] && y === einmal[i][1]),
  );
}

/* ==========================================================================
 * 5  DER KONTURENZIEHER
 * ======================================================================= */

console.log('\n5 Alle Schleifen');

{
  /* Zwei getrennte Flecken in einer Maske ergeben zwei Schleifen. */
  const breite = 60;
  const hoehe = 30;
  const zellen = new Uint8Array(breite * hoehe);
  const fleck = (cx, cy, r) => {
    for (let y = 0; y < hoehe; y++)
      for (let x = 0; x < breite; x++)
        if (Math.hypot(x - cx, y - cy) < r) zellen[y * breite + x] = 1;
  };
  fleck(12, 15, 8);
  fleck(45, 15, 8);
  const m = { breite, hoehe, x0: 0, y0: 0, zelle: 4, zellen };

  wahr('  zwei Flecken ergeben zwei Schleifen', K.konturenAus(m).length === 2);
  wahr('  und die längste kommt zuerst', K.konturenAus(m)[0].length >= K.konturenAus(m)[1].length);
  wahr('  `konturAus` liefert weiterhin genau eine', Array.isArray(K.konturAus(m)) && K.konturAus(m).length > 3);
}

console.log(`\n  ${ok} bestanden, ${bad} gescheitert\n`);
process.exit(bad ? 1 : 0);
