/*
 * Der Körper des Buches.
 *
 * Ein Gefühl lässt sich nicht prüfen. Prüfbar ist, was das Gefühl trägt: dass
 * der Deckel sich am Anfang wehrt und in der Mitte kippt, dass ein halber Zug
 * zurückfällt und ein schneller nicht, dass ein schweres Buch langsamer ist
 * als ein leichtes. Das sind Aussagen über Zahlen, und die Zahlen stehen in
 * `lib/buch/koerper.ts` – ohne DOM, ohne Zeit, ohne React.
 *
 * Genau deshalb ist diese Datei möglich. Läge dieselbe Mathematik in den
 * Komponenten, bliebe als Prüfung nur „am Gerät nachwischen", und das ist
 * keine Prüfung, sondern eine Meinung.
 *
 * ---
 *
 * Was hier **nicht** steht: ob es sich gut anfühlt. Das entscheidet ein
 * Daumen auf einem iPhone, und dafür gibt es das Stimmzimmer. Diese Datei
 * sorgt nur dafür, dass die Regler, an denen dieser Daumen dreht, das tun,
 * was auf ihnen steht.
 */
import { execSync } from 'child_process';
import { readFileSync } from 'node:fs';
import { ARBEIT } from './arbeit.mjs';
const S = ARBEIT;
for (const [aus, ein] of [
  ['b-koerper', 'src/lib/buch/koerper.ts'],
  ['b-konfig', 'src/lib/raum/konfig.ts'],
])
  execSync(`npx esbuild ${ein} --bundle --format=esm --outfile=${S}/t/${aus}.mjs`, {
    stdio: 'pipe',
  });
const M = await import(S + '/t/b-koerper.mjs');
const K = await import(S + '/t/b-konfig.mjs');

let ok = 0,
  bad = 0;
const p = (n, ist, soll) => {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else {
    bad++;
    console.log('FEHLER', n, '\n  ist :', JSON.stringify(ist), '\n  soll:', JSON.stringify(soll));
  }
};
const wahr = (n, b) => p(n, !!b, true);

const k = K.VORGABE;
/** Eine Konfiguration mit einem geänderten Wert – ohne die anderen zu verlieren. */
const mit = (gruppe, werte) => ({ ...k, [gruppe]: { ...k[gruppe], ...werte } });

/* ------------------------------------------------------------ Berührung -- */

console.log('\n1 Die Berührung');

{
  const b = M.beruehrung(k);
  wahr('  ein Hub entsteht überhaupt', b.hub > 0);
  wahr('  und bleibt klein genug, um nicht zu springen', b.hub <= k.buch.hub);
  wahr('  das Buch wächst, aber kaum', b.skala > 1 && b.skala < 1.05);
  wahr('  der Schatten wandert weiter als das Buch steigt', b.schattenweg > b.hub);
}

/*
 * Der Kern der Gruppe: *ein* Regler dreht alles.
 *
 * Wenn „Gewicht" nur eine von drei Zahlen bewegte, wäre es kein Gewicht,
 * sondern ein Etikett – und man müsste beim Stimmen doch wieder drei Regler
 * suchen. Die Prüfung ist deshalb keine Formalität, sondern die Zusicherung,
 * auf der das ganze Stimmzimmer beruht.
 */
{
  const leicht = M.beruehrung(mit('buch', { gewicht: 0 }));
  const schwer = M.beruehrung(mit('buch', { gewicht: 1 }));
  wahr('  ein schweres Buch hebt weniger', schwer.hub < leicht.hub);
  wahr('  es wächst weniger', schwer.skala < leicht.skala);
  wahr('  und sein Schatten wandert weniger', schwer.schattenweg < leicht.schattenweg);
}

/* ---------------------------------------------------------------- Deckel -- */

console.log('\n2 Der Deckel');

p('  geschlossen ist geschlossen', M.deckelverlauf(0, 0.55), 0);
p('  offen ist offen', M.deckelverlauf(1, 0.55), 1);

/*
 * Die drei Abschnitte: wehren, kippen, ankommen.
 *
 * Eine gleichmäßige Kurve wäre bei der Hälfte der Zeit auf der Hälfte des
 * Weges. Der Deckel darf das nicht sein – sonst ist er ein Rechteck, das sich
 * dreht. „Er hat sich gewehrt" heißt in Zahlen: bei einem Drittel der Zeit
 * ist noch deutlich weniger als ein Drittel des Weges getan.
 */
{
  const w = k.buch.deckelwiderstand;
  wahr('  am Anfang passiert wenig', M.deckelverlauf(0.25, w) < 0.25);
  wahr('  über den Kipppunkt geht es schnell', M.deckelverlauf(0.75, w) > 0.75);
  /* Und dazwischen fällt nichts zurück – die Kurve steigt durchgehend. */
  let steigt = true;
  let vorher = -1;
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const v = M.deckelverlauf(t, w);
    if (v < vorher - 1e-9) steigt = false;
    vorher = v;
  }
  wahr('  und die Bewegung geht nie rückwärts', steigt);
}

/*
 * Der Widerstand ist der Regler, der den Kipppunkt verschiebt.
 *
 * Mehr Widerstand heißt: An derselben Stelle der Zeit ist weniger Weg getan.
 * Geprüft an mehreren Stellen, nicht an einer – eine einzelne Stichprobe
 * könnte zufällig stimmen, während die Kurve daneben etwas anderes tut.
 */
{
  let immer = true;
  for (const t of [0.1, 0.2, 0.3, 0.4, 0.5]) {
    if (!(M.deckelverlauf(t, 0.9) < M.deckelverlauf(t, 0.1))) immer = false;
  }
  wahr('  mehr Widerstand heißt: später kippen', immer);
}

p('  der Winkel beginnt bei null', M.deckelwinkel(0, k), -0);
p('  und endet beim eingestellten Endwinkel', M.deckelwinkel(1, k), -k.buch.deckelWinkelGrad);

/*
 * Nie ganz 180 Grad.
 *
 * Ein Deckel, der flach auf dem Tisch liegt, sieht aus wie eine umgeklappte
 * Fläche. Die paar fehlenden Grad sind der ganze Unterschied zwischen
 * „Rechteck" und „Buch", und sie dürfen deshalb nicht versehentlich über eine
 * Vorlage verlorengehen.
 */
for (const [name, v] of Object.entries(K.BUCHVORLAGEN)) {
  const kk = { ...k, buch: { ...k.buch, ...(v.buch ?? {}) } };
  wahr(`  ${name}: der Deckel bleibt unter 180 Grad`, kk.buch.deckelWinkelGrad < 180);
}

/*
 * Der Körper folgt dem Deckel, nicht umgekehrt.
 *
 * Träge heißt: Am Anfang bewegt sich der Körper weniger als der Deckel schon
 * geschafft hat. Wäre es andersherum, schöbe sich das Buch zur Seite, bevor
 * etwas aufgeht – und das sieht aus wie ein Fehler, weil es einer wäre.
 */
{
  const traege = M.koerperweg(0.3, mit('buch', { koerpertraegheit: 0.9 }));
  const flink = M.koerperweg(0.3, mit('buch', { koerpertraegheit: 0 }));
  wahr('  ein träger Körper hinkt hinterher', traege < flink);
  p('  am Ende ist er trotzdem ganz da', Math.round(M.koerperweg(1, k) * 1000) / 1000, 1);
  p('  und am Anfang bei null', M.koerperweg(0, k), 0);
}

/* -------------------------------------------------------------- Blättern -- */

console.log('\n3 Das Blatt');

/* 390 Punkte ist das Referenzgerät. */
const BREITE = 390;

p('  ohne Zug kein Weg', M.blattweg(0, BREITE, k), 0);
wahr(
  '  ein voller Zug ist ein voller Weg',
  M.blattweg(-BREITE * k.seite.wegAnteil, BREITE, k) >= 0.999,
);
wahr('  weiter ziehen geht nicht über eins hinaus', M.blattweg(-BREITE * 2, BREITE, k) <= 1);
wahr('  und die Richtung ist dem Weg egal', M.blattweg(80, BREITE, k) === M.blattweg(-80, BREITE, k));

p('  nach links heißt vorwärts', M.blattrichtung(-40), 'vor');
p('  nach rechts heißt zurück', M.blattrichtung(40), 'zurueck');

/*
 * Die Entscheidung beim Loslassen – der wichtigste Test dieser Datei.
 *
 * Hier steht der Unterschied zwischen einem Buch und einem Schalter. Ein
 * halber Zug muss zurückfallen, sonst blättert das Buch bei jedem Zögern.
 * Ein schneller kurzer Wisch muss durchgehen, sonst muss man jedes Mal quer
 * über den Bildschirm ziehen.
 */
{
  const langsam = 0.05;
  wahr(
    '  ein knapper Zug fällt zurück',
    M.blattEntscheidung(k.seite.schwelle - 0.05, langsam, k) === 'zurueck',
  );
  wahr(
    '  über der Schwelle legt sich die Seite um',
    M.blattEntscheidung(k.seite.schwelle + 0.05, langsam, k) === 'blaettern',
  );
  wahr(
    '  ein kurzer schneller Wisch reicht auch',
    M.blattEntscheidung(k.seite.schnellMindestweg + 0.02, k.seite.schnellTempoPxProMs + 0.2, k) ===
      'blaettern',
  );
  /*
   * Die Gegenprobe, ohne die der Schnellwisch alles verschluckt: Ein Tippen
   * ist schnell und hat fast keinen Weg. Es darf nicht blättern.
   */
  wahr(
    '  ein Tippen ist kein Wisch',
    M.blattEntscheidung(0.01, 3, k) === 'zurueck',
  );
}

/* Die Schwelle ist wirklich eine Stellschraube und keine Zierde. */
{
  const streng = mit('seite', { schwelle: 0.8, schnellMindestweg: 0.9 });
  p('  eine hohe Schwelle hält denselben Zug zurück', M.blattEntscheidung(0.5, 0.05, streng), 'zurueck');
}

p('  in Ruhe steht die Seite gerade', M.blattwinkel(0, k), -0);
/*
 * Knapp über die Senkrechte – nicht hundertachtzig.
 *
 * Der Falz liegt auf dem Telefon am linken Bildschirmrand. Alles jenseits der
 * Senkrechten schwingt aus dem Bild, und die zweite Hälfte der Bewegung wäre
 * unsichtbar. Genau das war der Fehler, den erst ein Bildstreifen zeigte.
 */
p('  ganz gedreht steht sie knapp hinter der Senkrechten', M.blattwinkel(1, k), -k.seite.maxWinkelGrad);
wahr('  und nie so weit, dass sie aus dem Bild schwingt', k.seite.maxWinkelGrad <= 110);

/* Das hereinfallende Blatt ist das Spiegelbild: hochkant herein, flach hin. */
p('  das Blatt kommt hochkant herein', M.blattwinkelZurueck(0, k), -k.seite.maxWinkelGrad);
p('  und legt sich flach hin', M.blattwinkelZurueck(1, k), -0);

/*
 * Die Wölbung ist am stärksten in der Mitte.
 *
 * Ein flach liegendes Blatt ist nicht gebogen, ein ganz umgelegtes auch
 * nicht. Dazwischen schon – und genau das macht aus einer Drehung eine
 * Seite. Eine Wölbung, die am Rand am stärksten wäre, sähe aus wie ein
 * Fehler im Verlauf.
 */
{
  const mitte = M.kruemmung(0.5, k);
  wahr('  in der Mitte gebogen', mitte > 0);
  wahr('  am Anfang flach', M.kruemmung(0, k) < mitte * 0.2);
  wahr('  am Ende wieder flach', M.kruemmung(1, k) < mitte * 0.2);
  p('  und der Regler schaltet sie ganz ab', M.kruemmung(0.5, mit('seite', { kruemmung: 0 })), 0);
}

wahr('  der Blattschatten wächst mit dem Weg', M.blattschatten(0.8, k) > M.blattschatten(0.2, k));
p('  ohne Zug kein Schatten', M.blattschatten(0, k), 0);

/*
 * Der Schub – was man tatsächlich sieht.
 *
 * Eins zu eins mit dem Finger, und das ist der ganze Unterschied zu
 * `blattweg`: Der darf empfindlich sein, weil er nur *entscheidet*. Was sich
 * bewegt, muss genau so weit gehen wie der Daumen, sonst klebt es nicht daran,
 * sondern flieht davor.
 *
 * Hier stand vorher `blattkante` – „wo steht die Kante des gedrehten Blattes",
 * als Kosinus des Winkels. Die Frage gehörte zum Drehmodell und ist mit ihm
 * weggefallen: Die Kante steht dort, wohin der Finger die Seite geschoben hat.
 */
p('  ohne Zug kein Schub', M.blattschub(0, 390), 0);
p('  vierzig Punkte Zug sind vierzig Punkte Schub', M.blattschub(-40, 390), 40);
p('  und die Richtung ist ihm egal', M.blattschub(40, 390), M.blattschub(-40, 390));
p('  weiter als die Seite breit ist geht es nicht', M.blattschub(-900, 390), 390);
{
  /* Streng eins zu eins über den ganzen Weg – keine Kurve, keine Beschleunigung. */
  let eins = true;
  for (let d = 0; d <= 390; d += 13) if (M.blattschub(-d, 390) !== d) eins = false;
  wahr('  und dazwischen nirgends schneller oder langsamer', eins);
}

/*
 * Die Neigung ist nur noch eine Andeutung.
 *
 * Sie darf dem Blatt Dicke geben und darf nicht mehr behaupten, hier drehe
 * sich etwas um einen Falz. Auf einer einzelnen Seite gibt es nichts, worauf
 * eine gedrehte Seite fallen könnte – und genau so sah es am Gerät auch aus.
 */
wahr('  die Neigung bleibt eine Andeutung', Math.abs(M.blattwinkel(1, k)) <= 25);
wahr('  aber sie ist da', Math.abs(M.blattwinkel(1, k)) > 2);

/* ---------------------------------------------------------------- Dauern -- */

console.log('\n4 Die Zeit');

/*
 * Gewicht ist Zeit.
 *
 * Derselbe Regler, der den Hub kleiner macht, macht die Bewegung länger. Das
 * ist die eine Verbindung, die „schwer" überhaupt erst als Wort trägt: Etwas
 * Schweres bewegt sich weniger *und* langsamer. Fiele eine der beiden Hälften
 * weg, hätte man einen Regler mit zwei verschiedenen Wirkungen, und das ist
 * kein Regler mehr, sondern eine Falle.
 */
{
  const leicht = M.dauer(1000, mit('buch', { gewicht: 0 }));
  const schwer = M.dauer(1000, mit('buch', { gewicht: 1 }));
  wahr('  ein schweres Buch braucht länger', schwer > leicht);
  wahr('  aber nicht unerträglich viel länger', schwer / leicht < 2);
  wahr('  und nichts wird schneller als drei Viertel', leicht >= 750);
}

/* -------------------------------------------------------------- Vorlagen -- */

console.log('\n5 Die Buchvorlagen');

/*
 * Vier Charaktere, keine vier Produkte.
 *
 * Geprüft wird nicht, ob sie „gut" sind – das entscheidet der Daumen. Geprüft
 * wird, dass sie sich in der Richtung unterscheiden, die ihr Name verspricht.
 * Eine Vorlage namens SCHWER, die leichter ist als LEICHT, wäre schlimmer als
 * gar keine Vorlage.
 */
{
  const bau = (name) => ({
    ...k,
    buch: { ...k.buch, ...(K.BUCHVORLAGEN[name]?.buch ?? {}) },
    seite: { ...k.seite, ...(K.BUCHVORLAGEN[name]?.seite ?? {}) },
  });

  wahr('  LEICHT ist leichter als SCHWER', bau('LEICHT').buch.gewicht < bau('SCHWER').buch.gewicht);
  wahr(
    '  LEICHT öffnet schneller als SCHWER',
    M.dauer(bau('LEICHT').buch.oeffnenMs, bau('LEICHT')) <
      M.dauer(bau('SCHWER').buch.oeffnenMs, bau('SCHWER')),
  );
  wahr(
    '  LEICHT hebt sich weiter als SCHWER',
    M.beruehrung(bau('LEICHT')).hub > M.beruehrung(bau('SCHWER')).hub,
  );

  /*
   * ALT ist weich, nicht kaputt.
   *
   * Der Auftrag nennt „alt" ausdrücklich als Charakter, und die naheliegende
   * Umsetzung wäre ein Zufallsgenerator gewesen. Ein altes Buch ist aber
   * nicht unberechenbar – es hat seine Steifigkeit verloren. In Zahlen:
   * weniger Widerstand als ein schweres, mehr Dämpfung, weniger Krümmung.
   */
  wahr(
    '  ALT wehrt sich weniger als SCHWER',
    bau('ALT').buch.deckelwiderstand < bau('SCHWER').buch.deckelwiderstand,
  );
  wahr('  ALT ist stärker gedämpft', bau('ALT').seite.federDaempfung > k.seite.federDaempfung);
  wahr('  ALT wölbt sich weniger', bau('ALT').seite.kruemmung < k.seite.kruemmung);

  /* Und derselbe Aufruf gibt zweimal dasselbe – kein Zufall im Spiel. */
  wahr(
    '  ALT bewegt sich jedes Mal gleich',
    M.deckelverlauf(0.4, bau('ALT').buch.deckelwiderstand) ===
      M.deckelverlauf(0.4, bau('ALT').buch.deckelwiderstand),
  );

  /* NATÜRLICH ist die Vorgabe und darf nichts verstellen. */
  p('  NATÜRLICH ist die Vorgabe', K.BUCHVORLAGEN['NATÜRLICH'], {});
}

/* ------------------------------------------------------ Zwei Achsen ------ */

console.log('\n6 Raum und Buch stören einander nicht');

/*
 * Die Bedienungsvorlagen (RUHIG, ANTWORTFREUDIG …) und die Buchvorlagen sind
 * zwei Achsen. Wenn eine Buchvorlage nebenbei die Gestenwerte änderte, wäre
 * das Stimmzimmer nicht mehr zu benutzen: Man drehte am Einband und verlöre
 * seine Schwellen.
 */
for (const [name, v] of Object.entries(K.BUCHVORLAGEN)) {
  const gruppen = Object.keys(v);
  wahr(
    `  ${name} fasst nur „buch" und „seite" an`,
    gruppen.every((g) => g === 'buch' || g === 'seite'),
  );
}

/* Und die Gegenrichtung: Keine Bedienungsvorlage fasst das Buch an. */
for (const [name, v] of Object.entries(K.VORLAGEN)) {
  wahr(`  ${name} lässt das Buch in Ruhe`, !v.buch && !v.seite);
}

/* --------------------------------------------------------- Die Feder ----- */

console.log('\n7 Die Feder');

p('  am Anfang ganz ausgelenkt', M.federverlauf(0, k.seite.federHaerte, k.seite.federDaempfung), 0);
wahr(
  '  am Ende angekommen',
  Math.abs(M.federverlauf(1, k.seite.federHaerte, k.seite.federDaempfung) - 1) < 0.05,
);
/*
 * Eine stark gedämpfte Feder schwingt nicht über. Das ist der Unterschied
 * zwischen „Papier legt sich hin" und „Gummiblatt".
 */
{
  let ueber = 0;
  for (let t = 0; t <= 1.0001; t += 0.01) {
    const v = M.federverlauf(t, k.seite.federHaerte, 60);
    if (v > 1.02) ueber++;
  }
  p('  stark gedämpft schwingt sie nicht über', ueber, 0);
}

/* =========================================================================
 * DIE ÜBERGABE: VOM UMSCHLAG INS BUCH
 *
 * Gemeldet: „Wenn man das Buch aufschlägt und man in das Buch kommt, ist der
 * Wechsel nicht sehr smooth."
 *
 * Drei Ursachen, gemessen auf 390 × 844, und alle drei sind hier festgehalten,
 * weil keine davon in einer reinen Funktion steht – nur im Quelltext.
 * ========================================================================= */
const ohneProsa = (q) => q.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const lies = (pf) => readFileSync(new URL(pf, import.meta.url), 'utf8');
const cover = lies('../src/components/book/Cover.tsx');
const schale = ohneProsa(lies('../src/components/book/BookShell.tsx'));
const css = ohneProsa(lies('../src/index.css'));

/*
 * 1. Das Loch.
 *
 * Der Kasten, der das Buch enthält, trug `opacity: opening ? 0 : 1`. Die
 * ganze Szene blendete kurz vor der Übergabe aus, und weil das Buchinnere
 * seinerseits bei null anfängt, sah der Leser dazwischen den dunklen Tisch.
 * Gemessen an der Sichtbarkeit des Papiers in den letzten Bildern davor:
 * 0,98 → 0,91 → 0,71 → 0,54. Danach: durchgehend 1,00.
 *
 * Ein Loch fällt mehr auf als ein Schnitt.
 */
{
  const q = ohneProsa(cover);
  const kasten = q.indexOf('flex flex-col items-center');
  const buehne = q.indexOf('book-stage');
  wahr('Ü1 Umschlag: Bühne und Kasten sind gefunden', kasten >= 0 && buehne > kasten);
  wahr('  das Buch blendet vor der Übergabe nicht aus',
    !/opening \? 0 : 1/.test(q.slice(kasten, buehne)));
  wahr('  aber der Beitext tritt ab', /opening \? 0 : 1/.test(q.slice(buehne)));
}

/*
 * 2. Die Richtung.
 *
 * `scale(0.58)` liess das Buch während des Schwungs von 287 auf 168 Punkte
 * schrumpfen – es bewegte sich vom Leser **weg** – und sprang im nächsten
 * Bild auf 386. Die Umschlagbewegung zielte auf eine Doppelseite, die das
 * Buchinnere auf einem Telefon gar nicht zeigt.
 */
{
  const regel = css.match(/@media \(max-width: 767px\)[\s\S]{0,400}?\.book-offen\s*\{([^}]*)\}/);
  wahr('Ü2 es gibt eine eigene Stellung für schmale Geräte', !!regel);
  const skala = Number((regel?.[1] ?? '').match(/scale\(([\d.]+)\)/)?.[1] ?? 1);
  wahr(`  und sie schrumpft das Buch nicht vom Leser weg (scale ${skala})`, skala >= 0.8);
}

/*
 * 3. Das falsche Wort.
 *
 * Jede ankommende Seite bekam `turnForward` – neun Grad Drehung, drei Prozent
 * Versatz. Das ist die Geste des Umblätterns. Im Augenblick des Aufschlagens
 * sagt sie „die nächste Seite" statt „das Innere".
 */
wahr('Ü3 das Aufschlagen hat eine eigene Bewegung', /@keyframes dcAufschlag/.test(css));
wahr('  und die Buchhülle benutzt sie', /buch-aufschlag/.test(schale));
wahr('  sie unterscheidet Aufschlagen von Blättern',
  /ausDemUmschlag/.test(schale) && /animate-turnForward/.test(schale));

/*
 * Und sie gilt **einmal**. Ohne das Zurücksetzen bekäme auch die erste
 * umgeblätterte Seite die Aufschlagbewegung – ein Buch, das sich beim
 * Weiterblättern noch einmal öffnet.
 */
wahr('  genau einmal, nicht bei jeder Seite',
  /aufgeschlagen\.current = false/.test(schale));

/* Wer die Bewegung abgestellt hat, bekommt auch diese nicht. */
wahr('  und wer keine Bewegung will, bekommt keine',
  /prefers-reduced-motion[\s\S]{0,200}buch-aufschlag/.test(css));

/* -------------------------------------------------------------------------
 * 4. Der durchgehende Übergang
 *
 * Die Umschlagseite ist buchförmig (286 auf 390, Verhältnis 0,73), die
 * Buchseite bildschirmförmig (390 auf 784, Verhältnis 0,50). **Zwei
 * verschiedene Seitenverhältnisse – keine Skalierung bringt sie zur Deckung.**
 * Solange das Ziel eine andere Form hat als der Ausgangspunkt, bleibt ein
 * Schnitt, egal wie lange man an Dauern dreht.
 *
 * Deshalb wird gemessen statt gestimmt: Der Umschlag gibt das Rechteck seiner
 * aufgedeckten Seite mit, das Innere setzt sich mit einer Umkehrung dorthin
 * und lässt sie los. Gemessen am Gerät: letztes Umschlagbild 185,118 258×351 –
 * erstes Buchbild 185,118 258×351, identisch; danach wächst es über
 * 271×394, 308×516, 352×658 auf 390×784.
 * ----------------------------------------------------------------------- */
const app = ohneProsa(lies('../src/App.tsx'));

wahr('Ü4 der Umschlag misst seine aufgedeckte Seite',
  /getBoundingClientRect\(\)/.test(ohneProsa(cover)) && /onOpen\(/.test(ohneProsa(cover)));
wahr('  und reicht sie über die Navigation weiter', /ausDemUmschlag: true, von/.test(app));
wahr('  das Innere setzt sich dorthin', /von\.breite/.test(schale) && /von\.hoehe/.test(schale));

/*
 * `useLayoutEffect` und nicht `useEffect` – das ist die tragende Zeile.
 * Zwischen dem Setzen der Umkehrung und dem ersten sichtbaren Bild darf
 * nichts liegen, sonst blitzt die Seite einmal in voller Grösse auf. Ein
 * Blitzer ist schlimmer als der Schnitt, den er beheben soll.
 */
wahr('  vor dem ersten Anstrich, nicht danach', /useLayoutEffect\(\(\) => \{[\s\S]{0,400}von\.breite/.test(schale));

/*
 * Zwei Bilder warten, nicht eines: Ein einzelnes `requestAnimationFrame`
 * liegt noch im selben Anstrich, der Browser fasst Setzen und Lösen zusammen,
 * und es bewegt sich gar nichts.
 */
wahr('  und lässt erst im übernächsten Bild los',
  /requestAnimationFrame\([\s\S]{0,120}requestAnimationFrame\(/.test(schale));

/*
 * Der Kasten gehört dem Blättern. Ein liegengebliebener `transform` wäre dort
 * ein zweiter Besitzer derselben Eigenschaft – genau der Fehler, der das
 * Blättern schon einmal gekostet hat.
 */
wahr('  danach räumt es seine Spuren weg',
  /el\.style\.transform = ''/.test(schale) && /transitionend/.test(schale));

wahr('  wer keine Bewegung will, bekommt keine',
  /prefers-reduced-motion[\s\S]{0,80}return/.test(schale));

/*
 * Und die Einblendung hat **kein** `to`.
 *
 * Mit `to { opacity: 1 }` und `both` bliebe der Endwert stehen – die
 * Ansatzkerbe, die im Ruhezustand bei 0,72 liegt, wäre danach für immer auf
 * 1. Ohne `to` nimmt der Browser den eigenen Wert des Elements als Ziel.
 * Am Gerät nachgemessen: Kerbe 0,72, Kopfzeile 1 – dieselbe Regel, zwei
 * richtige Ergebnisse.
 */
{
  const bild = css.match(/@keyframes dcEintritt\s*\{([\s\S]*?)\n  \}/);
  wahr('  die Einblendung existiert', !!bild);
  wahr('  und schreibt keinen Endwert fest', !!bild && !/\bto\b|100%/.test(bild[1]));
}

console.log(`\n${ok} bestanden, ${bad} gescheitert`);
process.exit(bad ? 1 : 0);
