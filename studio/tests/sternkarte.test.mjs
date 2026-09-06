/**
 * Die Sternkarte: den Rahmen füllen, und nicht alles benennen.
 *
 * Was `kartenbild` hier einmal geprüft hat – Ausschnitt und Schriftgrösse
 * aus den Sternen zu rechnen – ist mit der Himmelskugel weggefallen: Das
 * Bildfeld *ist* jetzt der Ausschnitt. Geblieben ist, was weiterhin gilt.
 *
 * Beide Regeln sind messbar, also werden sie gemessen. Jede Prüfung wurde
 * gegengeprüft – der Fehler, den sie fangen soll, wurde absichtlich wieder
 * eingebaut, bis sie ausschlug.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { ARBEIT } from './arbeit.mjs';

const bau = join(ARBEIT, 'sternkarte');
mkdirSync(bau, { recursive: true });

const buendeln = (quelle, ziel) =>
  execFileSync(
    'npx',
    ['esbuild', quelle, '--bundle', '--format=esm', `--outfile=${join(bau, ziel)}`, '--log-level=error'],
    { cwd: join(import.meta.dirname, '..'), stdio: 'inherit' },
  );

buendeln('src/lib/sternkarte.ts', 'sternkarte.mjs');
buendeln('src/lib/graph.ts', 'graph.mjs');

const { einpassen, namenSetzen, schriftbreite, namenskasten, FALTKARTE } = await import(
  join(bau, 'sternkarte.mjs')
);
const { GraphSimulation } = await import(join(bau, 'graph.mjs'));

let geprueft = 0;
const pruefe = (was, fn) => {
  fn();
  geprueft++;
  console.log(`  ✓ ${was}`);
};

/* =======================================================================
 * Werkzeug: Welten in beliebiger Grösse
 * ==================================================================== */

/** Ein Baum mit ein paar Querverbindungen – nah genug an einer echten Welt. */
function welt(n) {
  const knoten = [];
  const kanten = [];
  for (let i = 0; i < n; i++) knoten.push({ id: `n${i}`, titel: `Stern ${i}` });
  let k = 0;
  for (let i = 1; i < n; i++) {
    kanten.push({ id: `k${k++}`, source: `n${i}`, target: `n${Math.floor(i / 3)}` });
    if (i % 5 === 0 && i > 10) kanten.push({ id: `k${k++}`, source: `n${i}`, target: `n${i - 7}` });
  }
  return { knoten, kanten };
}

function simulation(w, streckung) {
  const grad = new Map();
  for (const k of w.kanten) {
    grad.set(k.source, (grad.get(k.source) ?? 0) + 1);
    grad.set(k.target, (grad.get(k.target) ?? 0) + 1);
  }
  const sim = new GraphSimulation({
    linkDistance: 210,
    charge: 6200,
    gravity: 0.008,
    streckung,
  });
  sim.setData(
    w.knoten.map((e) => ({
      id: e.id,
      r: 4 + Math.min(7, (grad.get(e.id) ?? 0) * 1.1),
      color: '#fff',
      label: e.titel,
      type: 't',
    })),
    w.kanten.map((k) => ({ ...k, color: '#fff', label: '' })),
  );
  return sim;
}

const verhaeltnis = (sim) => {
  const b = sim.bounds();
  return (b.maxY - b.minY) / (b.maxX - b.minX);
};

/** Wie die Karte vor dieser Arbeit lag: rund, egal wie der Rahmen aussieht. */
function rundGesetzt(w) {
  const sim = simulation(w, 1);
  for (let i = 0; i < FALTKARTE.setzen; i++) sim.tick();
  return verhaeltnis(sim);
}

/* =======================================================================
 * 1 · Der Rahmen wird gefüllt
 * ==================================================================== */

console.log('\n1 · Der Rahmen wird gefüllt');

/* Hochkant wie ein Telefon, quer wie ein Tablett, und einmal rund. */
const RAHMEN = [
  ['Telefon hochkant', 1.44],
  ['Tablett quer', 0.68],
  ['quadratisch', 1.0],
];

const GROESSEN = [12, 50, 400];

for (const [rahmenName, ziel] of RAHMEN) {
  for (const n of GROESSEN) {
    const w = welt(n);
    const sim = simulation(w, ziel);
    const erreicht = einpassen(sim, ziel);
    pruefe(
      `${n} Sterne, ${rahmenName}: ${erreicht.toFixed(2)} statt ${ziel} ` +
        `(${(((erreicht / ziel) * 100 - 100) | 0).toString()} %)`,
      () => {
        /*
         * Zehn Prozent, nicht sechs. Die Schranke in `FALTKARTE` gilt für
         * die Runde, in der abgebrochen wird – nach der letzten möglichen
         * Runde darf es etwas mehr sein, sonst prüfte dieser Test die
         * Zufallszahlen der Simulation mit.
         */
        assert.ok(
          Math.abs(erreicht / ziel - 1) < 0.1,
          `${erreicht.toFixed(3)} liegt zu weit von ${ziel} entfernt`,
        );
      },
    );
  }
}

/*
 * Die Gegenprobe zur ganzen Übung.
 *
 * Der erste Versuch prüfte, ob die Anordnung ohne Einpassen *rund* wird. Bei
 * fünfzig und vierhundert Sternen tut sie das (0.96 und 0.97), bei zwölf
 * aber nicht: da kam 1.39 heraus – zufällig fast der hochkante Rahmen. Die
 * Prüfung schlug an und hatte recht. Bei wenigen Sternen ist die Form eben
 * nicht rund, sie ist beliebig, und ein Test, der auf ein Zufallsergebnis
 * hofft, prüft nichts.
 *
 * Der Vorwurf ist ohnehin nicht »rund«, sondern »kümmert sich nicht um den
 * Rahmen«. Und das ist ohne Glück zu messen: Dieselbe Welt ergab hochkant
 * und quer haargenau dieselbe Anordnung.
 */
pruefe('ohne Einpassen ist die Anordnung in jedem Rahmen dieselbe', () => {
  for (const n of GROESSEN) {
    const gleich = rundGesetzt(welt(n));
    /* Es gibt nur eine Form, also kann sie höchstens einen Rahmen treffen. */
    const hochkant = Math.abs(gleich / 1.44 - 1);
    const quer = Math.abs(gleich / 0.68 - 1);
    assert.ok(
      hochkant > 0.1 || quer > 0.1,
      `${n} Sterne: ${gleich.toFixed(2)} kann nicht beide Rahmen treffen`,
    );
    /* Und mit Einpassen trifft dieselbe Welt beide. */
    const a = einpassen(simulation(welt(n), 1.44), 1.44);
    const b = einpassen(simulation(welt(n), 0.68), 0.68);
    assert.ok(a / b > 1.7, `${n} Sterne: ${a.toFixed(2)} und ${b.toFixed(2)} unterscheiden sich kaum`);
  }
});

/*
 * Wie viel vom Rahmen das Sternfeld einnimmt – die Zahl, um die es geht.
 * Hier nur die Form der Anordnung; wie sie am Himmel hängt und was davon
 * im Bild landet, prüft `tests/himmel.test.mjs`.
 */
pruefe('die eingepasste Anordnung hat die Form des Rahmens, die runde nicht', () => {
  const [rw, rh] = [390, 560];
  const fuellung = (verh) => {
    /* Ein Bild im Verhältnis `verh` in einen Rahmen einpassen: was bleibt? */
    const massstab = Math.min(rw / 1, rh / verh);
    return Math.min((1 * massstab) / rw, (verh * massstab) / rh);
  };
  /* Eingepasst füllt der Rahmen sich immer – darauf ist Verlass. */
  for (const n of GROESSEN) {
    const eingepasst = fuellung(einpassen(simulation(welt(n), rh / rw), rh / rw));
    assert.ok(eingepasst > 0.9, `${n} Sterne: eingepasst nur ${(eingepasst * 100) | 0} %`);
  }
  /*
   * Rund gesetzt nicht. Für zwölf Sterne allerdings schon – da kam die
   * runde Anordnung zufällig auf 1.39 und füllt damit 97 Prozent, mehr als
   * die eingepasste mit 95. Das ist kein Einwand, sondern der Grund: Ein
   * Verfahren, das den Rahmen nicht kennt, trifft ihn manchmal. Verlassen
   * kann man sich darauf nicht, und bei fünfzig und vierhundert Sternen
   * bleibt ein Drittel der Höhe schwarz.
   */
  for (const n of [50, 400]) {
    const rund = fuellung(rundGesetzt(welt(n)));
    assert.ok(rund < 0.75, `${n} Sterne: rund gesetzt füllt schon ${(rund * 100) | 0} %`);
  }
});

/*
 * Nachfassen darf nie schaden.
 *
 * Ehrlich gesagt schlägt diese Prüfung auch dann nicht an, wenn man das
 * Gedächtnis für die beste Runde im Modul wieder ausbaut – das wurde
 * ausprobiert, über siebenunddreissig Grössen und fünf Zielformen, und
 * nirgends wurde es mit mehr Runden schlechter. Seit die Spirale schon in
 * der Zielform beginnt, liegt die erste Messung nah genug, dass die
 * Korrektur nicht mehr übers Ziel hinausschiesst.
 *
 * Das Gedächtnis bleibt trotzdem drin: Es kostet nichts und macht die
 * Zusage »Nachfassen kann nur helfen« zu einer Eigenschaft des Verfahrens
 * statt zu einer Beobachtung. Die Prüfung hier hält die Zusage fest, auch
 * wenn sie den Grund dafür heute nicht allein trägt.
 */
pruefe('mehr Runden machen es nie schlechter', () => {
  const abstand = (ist, ziel) => Math.abs(Math.log(ist / ziel));
  for (const n of [12, 18, 24, 50]) {
    for (const [, ziel] of RAHMEN) {
      const ohne = einpassen(simulation(welt(n), ziel), ziel, { ...FALTKARTE, runden: 0 });
      const mit = einpassen(simulation(welt(n), ziel), ziel, { ...FALTKARTE, runden: 8 });
      assert.ok(
        abstand(mit, ziel) <= abstand(ohne, ziel) + 1e-9,
        `${n} Sterne, Ziel ${ziel}: acht Runden (${mit.toFixed(3)}) schlechter als keine (${ohne.toFixed(3)})`,
      );
    }
  }
});

pruefe('eine leere Welt bringt das Einpassen nicht durcheinander', () => {
  const sim = simulation({ knoten: [], kanten: [] }, 1.44);
  assert.equal(einpassen(sim, 1.44), 1);
});

/* =======================================================================
 * 2 · Wie breit ein Wort wird
 * ==================================================================== */

console.log('\n2 · Wie breit ein Wort wird');

pruefe('länger ist breiter', () => {
  assert.ok(schriftbreite('Ha', 12) < schriftbreite('Hallo', 12));
  assert.ok(schriftbreite('Hallo', 12) < schriftbreite('Hallo Welt', 12));
});

pruefe('schmale Zeichen zählen weniger als breite', () => {
  assert.ok(schriftbreite('iiii', 12) < schriftbreite('nnnn', 12));
  assert.ok(schriftbreite('nnnn', 12) < schriftbreite('mmmm', 12));
  assert.ok(schriftbreite('nnnn', 12) < schriftbreite('NNNN', 12));
});

pruefe('die Grösse geht linear ein', () => {
  assert.ok(Math.abs(schriftbreite('Mooshalde', 24) - 2 * schriftbreite('Mooshalde', 12)) < 1e-9);
});

/* =======================================================================
 * 3 · Nicht alle Namen
 * ==================================================================== */

console.log('\n3 · Nicht alle Namen');

const MASS = { groesse: 12, luft: 1.5, laenge: 22 };

const stossen = (a, b) => !(a.r <= b.l || b.r <= a.l || a.u <= b.o || b.u <= a.o);
const kuerzen = (t) => (t.length > 22 ? `${t.slice(0, 21)}…` : t);

const stern = (id, x, y, rang, label = id) => ({ id, x, y, r: 5, rang, label });

pruefe('wo Platz ist, bekommt jeder Stern seinen Namen', () => {
  const sterne = [stern('a', 0, 0, 3), stern('b', 400, 0, 2), stern('c', 0, 400, 1)];
  const namen = namenSetzen(sterne, MASS);
  assert.equal(namen.size, 3);
});

pruefe('wo kein Platz ist, bleiben Sterne namenlos', () => {
  /* Zwölf Sterne auf engstem Raum – da passen nicht zwölf Namen hin. */
  const sterne = [];
  for (let i = 0; i < 12; i++) {
    sterne.push(stern(`s${i}`, (i % 4) * 14, Math.floor(i / 4) * 14, 12 - i, `Wegscheide ${i}`));
  }
  const namen = namenSetzen(sterne, MASS);
  assert.ok(namen.size < sterne.length, `${namen.size} von ${sterne.length} – da wurde nichts gekürzt`);
  assert.ok(namen.size >= 1, 'gar kein Name ist auch falsch');
});

/*
 * Der Vortritt.
 *
 * Der erste Versuch setzte zwei Sterne dicht nebeneinander und erwartete,
 * dass nur einer seinen Namen bekommt. Beide bekamen ihn – zu Recht: Es
 * gibt vier Lagen, der eine steht darunter, der andere darüber. Die
 * Prüfung hatte unrecht, nicht der Satz.
 *
 * Der Vortritt zeigt sich erst, wo es wirklich eng ist. Und er zeigt sich
 * nicht daran, *wie viele* Namen stehen, sondern *welche*: Dieselbe enge
 * Wolke, einmal so und einmal umgekehrt gewichtet, muss andere Namen
 * tragen – und in beiden Fällen den des hellsten Sterns.
 */
pruefe('der hellste Stern bekommt den Vortritt', () => {
  /*
   * Eine Wolke aus zwölf Sternen auf einem Punkt. Es gibt acht Lagen, also
   * können nicht alle einen Namen bekommen – und wer leer ausgeht, muss der
   * schwächste sein. Dreht man die Helligkeit um, muss ein anderer leer
   * ausgehen.
   *
   * Zwei frühere Fassungen dieser Prüfung waren untauglich:
   *
   * Die erste setzte zwei Sterne dicht nebeneinander und erwartete, dass
   * nur einer seinen Namen bekommt. Beide bekamen ihn – zu Recht, der eine
   * steht darunter, der andere darüber. Die Prüfung hatte unrecht.
   *
   * Die zweite zählte auf »fünf Sterne, vier Lagen, vier Namen«. Als aus
   * vier Lagen acht wurden, blieb sie grün – aber nur noch aus Zufall, weil
   * die längeren Namen sich in den schrägen Lagen gegenseitig im Weg lagen.
   * Eine Prüfung, die an einer festen Zahl von Lagen hängt, prüft die Zahl
   * und nicht die Regel.
   */
  const wolke = (rang) =>
    Array.from({ length: 12 }, (_, i) => stern(`s${i}`, 0, 0, rang(i), `Haldensteg ${i}`));

  const vorne = namenSetzen(wolke((i) => 12 - i), MASS);
  const hinten = namenSetzen(wolke((i) => i), MASS);

  assert.ok(vorne.size < 12, `${vorne.size} von 12 Namen auf einem Punkt – da fiel keiner weg`);
  assert.ok(vorne.size >= 4, `nur ${vorne.size} Namen – das ist zu wenig`);
  assert.equal(hinten.size, vorne.size, 'die Zahl darf nicht von der Helligkeit abhängen');

  assert.ok(vorne.has('s0'), 'der hellste Stern der einen Gewichtung ging leer aus');
  assert.ok(!vorne.has('s11'), 'der schwächste bekam einen Namen');
  assert.ok(hinten.has('s11'), 'der hellste Stern der anderen Gewichtung ging leer aus');
  assert.ok(!hinten.has('s0'), 'bei umgedrehter Helligkeit ging derselbe leer aus');
});

/*
 * Wozu die vier schrägen Lagen da sind.
 *
 * Ein Stern, dem oben, unten, rechts und links der Weg verstellt ist, hat
 * mit vier Lagen keinen Namen mehr – mit acht schon. Am Gerät war das der
 * Unterschied zwischen zwanzig und vierundzwanzig gesetzten Namen, seit
 * die Namen zusätzlich in den Horizont passen müssen.
 */
pruefe('ist gerade kein Platz, geht der Name schräg', () => {
  const g = MASS.groesse;
  const mitte = { id: 'mitte', x: 0, y: 0, r: 4, rang: 10, label: 'Aa' };
  /* Vier Scheiben, die genau die vier geraden Lagen zustellen. */
  const sperren = [
    { id: 'unten', x: 0, y: g, r: 3 },
    { id: 'oben', x: 0, y: -g * 0.92, r: 2.5 },
    { id: 'rechts', x: g * 1.17, y: 0, r: 3 },
    { id: 'links', x: -g * 1.17, y: 0, r: 3 },
  ].map((s) => ({ ...s, rang: 0, label: 'x' }));

  const namen = namenSetzen([mitte, ...sperren], MASS);
  const zug = namen.get('mitte');
  assert.ok(zug, 'der Stern in der Mitte bekam gar keinen Namen');
  assert.notEqual(zug.anker, 'middle', 'der Name steht gerade darüber oder darunter');
  assert.ok(
    Math.abs(zug.y - mitte.y - g * 0.3) > 1e-9,
    'der Name steht genau seitlich – dann war eine gerade Lage doch frei',
  );
});

pruefe('kein Name liegt auf einem anderen', () => {
  for (const dichte of [10, 22, 40, 90]) {
    const sterne = [];
    for (let i = 0; i < 60; i++) {
      sterne.push(
        stern(`s${i}`, (i % 8) * dichte, Math.floor(i / 8) * dichte, 60 - i, `Mooshalde ${i}`),
      );
    }
    const namen = namenSetzen(sterne, MASS);
    const kaesten = [...namen].map(([id, zug]) => {
      const s = sterne.find((x) => x.id === id);
      return namenskasten(zug, s.label, MASS.groesse);
    });
    for (let i = 0; i < kaesten.length; i++) {
      for (let j = i + 1; j < kaesten.length; j++) {
        assert.ok(
          !stossen(kaesten[i], kaesten[j]),
          `Dichte ${dichte}: zwei Namen überlappen (${i}, ${j})`,
        );
      }
    }
  }
});

pruefe('kein Name liegt auf einer Sternscheibe', () => {
  for (const dichte of [10, 22, 40, 90]) {
    const sterne = [];
    for (let i = 0; i < 60; i++) {
      sterne.push(
        stern(`s${i}`, (i % 8) * dichte, Math.floor(i / 8) * dichte, 60 - i, `Mooshalde ${i}`),
      );
    }
    const namen = namenSetzen(sterne, MASS);
    for (const [id, zug] of namen) {
      const kasten = namenskasten(zug, sterne.find((x) => x.id === id).label, MASS.groesse);
      for (const s of sterne) {
        assert.ok(
          !stossen(kasten, { l: s.x - s.r, r: s.x + s.r, o: s.y - s.r, u: s.y + s.r }),
          `Dichte ${dichte}: der Name von ${id} liegt auf dem Stern ${s.id}`,
        );
      }
    }
  }
});

pruefe('ein Name steht bei seinem Stern und nicht irgendwo', () => {
  const sterne = [];
  for (let i = 0; i < 40; i++) sterne.push(stern(`s${i}`, (i % 8) * 60, Math.floor(i / 8) * 60, i, `Ort ${i}`));
  const namen = namenSetzen(sterne, MASS);
  for (const [id, zug] of namen) {
    const s = sterne.find((x) => x.id === id);
    const weite = Math.hypot(zug.x - s.x, zug.y - s.y);
    assert.ok(weite < s.r + MASS.groesse * 2, `${id}: der Name steht ${weite.toFixed(0)} entfernt`);
  }
});

pruefe('dieselbe Welt ergibt dieselbe Karte, gleich in welcher Reihenfolge sie kommt', () => {
  const sterne = [];
  for (let i = 0; i < 50; i++) {
    /* Viele gleiche Ränge – genau da entscheidet sonst die Listenfolge. */
    sterne.push(stern(`s${i}`, (i % 7) * 26, Math.floor(i / 7) * 26, i % 3, `Haldensteg ${i}`));
  }
  const a = namenSetzen(sterne, MASS);
  const gemischt = [...sterne].reverse();
  const b = namenSetzen(gemischt, MASS);
  assert.deepEqual(
    [...a.keys()].sort(),
    [...b.keys()].sort(),
    'andere Reihenfolge, andere Namen',
  );
  for (const [id, zug] of a) assert.deepEqual(zug, b.get(id), `${id} steht woanders`);
});

pruefe('lange Namen werden gekürzt, und das schmalere Wort passt öfter', () => {
  const lang = [];
  const kurz = [];
  for (let i = 0; i < 30; i++) {
    const [x, y] = [(i % 6) * 40, Math.floor(i / 6) * 40];
    lang.push(stern(`s${i}`, x, y, 30 - i, `Ein sehr langer Name ${i}`));
    kurz.push(stern(`s${i}`, x, y, 30 - i, `N${i}`));
  }
  assert.ok(
    namenSetzen(kurz, MASS).size > namenSetzen(lang, MASS).size,
    'kurze Namen passen nicht öfter als lange – dann zählt die Breite nicht mit',
  );
});

pruefe('ein Stern ohne Namen bekommt keinen leeren Zug', () => {
  const namen = namenSetzen([stern('a', 0, 0, 1, ''), stern('b', 300, 0, 1, 'Da')], MASS);
  assert.ok(!namen.has('a'));
  assert.ok(namen.has('b'));
});

pruefe('keine Sterne, keine Namen', () => {
  assert.equal(namenSetzen([], MASS).size, 0);
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
