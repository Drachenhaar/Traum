/**
 * Die Himmelskugel.
 *
 * Der Betrachter steht in der Mitte und sieht sich um. Was daran stimmen
 * muss, ist Geometrie und deshalb nachzurechnen: dass die Abstände vom
 * Mittelpunkt aus erhalten bleiben, dass die Blickachsen ein rechtes
 * Dreibein bilden, dass die Projektion genau das ins Bild bringt, was vor
 * einem liegt, und dass man sich nicht verlaufen kann.
 *
 * Jede Zusicherung wurde gegengeprüft: der Fehler, den sie fangen soll,
 * absichtlich wieder eingebaut, bis sie ausschlug.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { ARBEIT } from './arbeit.mjs';

const bau = join(ARBEIT, 'himmel');
mkdirSync(bau, { recursive: true });
execFileSync(
  'npx',
  [
    'esbuild',
    'src/lib/himmel.ts',
    '--bundle',
    '--format=esm',
    `--outfile=${join(bau, 'himmel.mjs')}`,
    '--log-level=error',
  ],
  { cwd: join(import.meta.dirname, '..'), stdio: 'inherit' },
);

const {
  anDenHimmel,
  achsen,
  aufDenSchirm,
  brennweite,
  begrenzen,
  sternenhimmel,
  milchstrasse,
  imBild,
  verblassen,
  punktePfad,
  nachHelligkeit,
  saatAus,
  SPANNE,
  SICHTFELD,
  KAPPE,
} = await import(join(bau, 'himmel.mjs'));

let geprueft = 0;
const pruefe = (was, fn) => {
  fn();
  geprueft++;
  console.log(`  ✓ ${was}`);
};

const grad = (bogen) => (bogen * 180) / Math.PI;
const laenge = (d) => Math.hypot(d.x, d.y, d.z);
const winkel = (a, b) =>
  Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z)));

/** Eine Punktwolke, die ein hochkantes Rechteck ausfüllt. */
function wolke(n, breite = 400, hoehe = 620) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const w = i * 2.399963; // goldener Winkel
    const r = Math.sqrt((i + 0.5) / n);
    p.push({ x: (Math.cos(w) * r * breite) / 2, y: (Math.sin(w) * r * hoehe) / 2 });
  }
  return p;
}

/* =======================================================================
 * 1 · Die Anordnung an den Himmel
 * ==================================================================== */

console.log('\n1 · Die Anordnung an den Himmel');

pruefe('jede Richtung hat die Länge eins', () => {
  for (const n of [1, 2, 50, 400]) {
    for (const d of anDenHimmel(wolke(n)).richtungen) {
      assert.ok(Math.abs(laenge(d) - 1) < 1e-12, `Länge ${laenge(d)}`);
    }
  }
});

pruefe('der äusserste Stern steht genau unter der Spanne', () => {
  const mitte = { x: 0, y: 0, z: 1 };
  for (const n of [2, 50, 400]) {
    const { richtungen } = anDenHimmel(wolke(n));
    let weiteste = 0;
    for (const d of richtungen) weiteste = Math.max(weiteste, winkel(mitte, d));
    assert.ok(
      Math.abs(weiteste - SPANNE) < 1e-9,
      `${n} Sterne: der äusserste steht bei ${grad(weiteste).toFixed(2)}° statt ${grad(SPANNE)}°`,
    );
  }
});

/*
 * Die eine Eigenschaft, wegen der genau diese Abbildung gewählt ist.
 *
 * Mittabstandstreu heisst: Der Abstand vom Mittelpunkt der Anordnung
 * verhält sich zum Winkel am Himmel überall gleich. Bei der
 * Zentralprojektion oder der stereografischen wäre das schon in der Mitte
 * des Feldes um Prozente daneben.
 */
pruefe('Abstände vom Mittelpunkt bleiben massstäblich', () => {
  const punkte = wolke(300);
  const { richtungen } = anDenHimmel(punkte);
  const mx = (Math.min(...punkte.map((p) => p.x)) + Math.max(...punkte.map((p) => p.x))) / 2;
  const my = (Math.min(...punkte.map((p) => p.y)) + Math.max(...punkte.map((p) => p.y))) / 2;
  const mitte = { x: 0, y: 0, z: 1 };

  let kleinstes = Infinity;
  let groesstes = 0;
  punkte.forEach((p, i) => {
    const flach = Math.hypot(p.x - mx, p.y - my);
    if (flach < 1e-6) return;
    const je = winkel(mitte, richtungen[i]) / flach;
    kleinstes = Math.min(kleinstes, je);
    groesstes = Math.max(groesstes, je);
  });
  assert.ok(
    groesstes / kleinstes - 1 < 1e-9,
    `der Massstab schwankt um ${((groesstes / kleinstes - 1) * 100).toFixed(3)} %`,
  );
});

pruefe('oben auf dem Blatt ist oben am Himmel', () => {
  const { richtungen } = anDenHimmel([
    { x: 0, y: -100 },
    { x: 0, y: 100 },
    { x: 100, y: 0 },
    { x: -100, y: 0 },
  ]);
  assert.ok(richtungen[0].y > 0, 'der obere Punkt liegt nicht oben');
  assert.ok(richtungen[1].y < 0, 'der untere Punkt liegt nicht unten');
  assert.ok(richtungen[2].x > 0, 'der rechte Punkt liegt nicht rechts');
  assert.ok(richtungen[3].x < 0, 'der linke Punkt liegt nicht links');
});

pruefe('die Richtung um den Mittelpunkt bleibt erhalten', () => {
  const punkte = wolke(200);
  const { richtungen } = anDenHimmel(punkte);
  const mx = (Math.min(...punkte.map((p) => p.x)) + Math.max(...punkte.map((p) => p.x))) / 2;
  const my = (Math.min(...punkte.map((p) => p.y)) + Math.max(...punkte.map((p) => p.y))) / 2;
  punkte.forEach((p, i) => {
    const flach = Math.atan2(-(p.y - my), p.x - mx);
    const oben = Math.atan2(richtungen[i].y, richtungen[i].x);
    const diff = Math.abs(((flach - oben + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    assert.ok(diff < 1e-9, `Punkt ${i} liegt in einer anderen Richtung`);
  });
});

pruefe('die Welt ist hochkant so hoch wie das Blatt', () => {
  /* Das Blatt ist 400 breit und 620 hoch – die Welt am Himmel genauso. */
  const { weite } = anDenHimmel(wolke(400, 400, 620));
  assert.ok(
    weite.senkrecht > weite.waagerecht,
    `senkrecht ${grad(weite.senkrecht).toFixed(1)}°, waagerecht ${grad(weite.waagerecht).toFixed(1)}°`,
  );
  assert.ok(
    Math.abs(weite.senkrecht / weite.waagerecht - 620 / 400) < 0.02,
    'das Verhältnis stimmt nicht mit dem Blatt überein',
  );
});

pruefe('eine leere Anordnung und ein einzelner Stern werfen nichts um', () => {
  assert.deepEqual(anDenHimmel([]).richtungen, []);
  const einer = anDenHimmel([{ x: 7, y: 3 }]);
  assert.deepEqual(einer.richtungen, [{ x: 0, y: 0, z: 1 }]);
  assert.equal(einer.weite.waagerecht, 0);
});

/* =======================================================================
 * 2 · Der Blick
 * ==================================================================== */

console.log('\n2 · Der Blick');

pruefe('die drei Achsen stehen senkrecht aufeinander und sind eins lang', () => {
  for (const gier of [-1.2, -0.3, 0, 0.5, 1.4]) {
    for (const neigung of [-1.1, 0, 0.2, 0.9]) {
      const { rechts, oben, vorn } = achsen({ gier, neigung });
      for (const [name, d] of [['rechts', rechts], ['oben', oben], ['vorn', vorn]]) {
        assert.ok(Math.abs(laenge(d) - 1) < 1e-12, `${name} ist ${laenge(d)} lang`);
      }
      const senkrecht = (a, b) => Math.abs(a.x * b.x + a.y * b.y + a.z * b.z) < 1e-12;
      assert.ok(senkrecht(rechts, oben), 'rechts und oben stehen nicht senkrecht');
      assert.ok(senkrecht(rechts, vorn), 'rechts und vorn stehen nicht senkrecht');
      assert.ok(senkrecht(oben, vorn), 'oben und vorn stehen nicht senkrecht');
    }
  }
});

pruefe('geradeaus geschaut liegt der Mittelpunkt in der Mitte', () => {
  const b = achsen({ gier: 0, neigung: 0 });
  const lage = aufDenSchirm({ x: 0, y: 0, z: 1 }, b, 500);
  assert.ok(lage);
  assert.ok(Math.abs(lage.x) < 1e-12 && Math.abs(lage.y) < 1e-12, `${lage.x}, ${lage.y}`);
});

pruefe('rechts ist rechts und oben ist oben', () => {
  const b = achsen({ gier: 0, neigung: 0 });
  const rechts = aufDenSchirm({ x: Math.sin(0.3), y: 0, z: Math.cos(0.3) }, b, 500);
  const oben = aufDenSchirm({ x: 0, y: Math.sin(0.3), z: Math.cos(0.3) }, b, 500);
  assert.ok(rechts.x > 0 && Math.abs(rechts.y) < 1e-12, 'rechts liegt nicht rechts');
  /* Auf dem Schirm wächst y nach unten: oben heisst kleineres y. */
  assert.ok(oben.y < 0 && Math.abs(oben.x) < 1e-12, 'oben liegt nicht oben');
});

pruefe('wer nach rechts schaut, sieht den Stern rechts von sich in der Mitte', () => {
  const d = { x: Math.sin(0.4), y: 0, z: Math.cos(0.4) };
  const lage = aufDenSchirm(d, achsen({ gier: 0.4, neigung: 0 }), 500);
  assert.ok(Math.abs(lage.x) < 1e-9 && Math.abs(lage.y) < 1e-9, `${lage.x}, ${lage.y}`);
});

pruefe('wer nach oben schaut, sieht den Stern über sich in der Mitte', () => {
  const d = { x: 0, y: Math.sin(0.5), z: Math.cos(0.5) };
  const lage = aufDenSchirm(d, achsen({ gier: 0, neigung: 0.5 }), 500);
  assert.ok(Math.abs(lage.x) < 1e-9 && Math.abs(lage.y) < 1e-9, `${lage.x}, ${lage.y}`);
});

pruefe('was hinter einem liegt, kommt nicht ins Bild', () => {
  const b = achsen({ gier: 0, neigung: 0 });
  assert.equal(aufDenSchirm({ x: 0, y: 0, z: -1 }, b, 500), null, 'genau hinten');
  assert.equal(aufDenSchirm({ x: 1, y: 0, z: 0 }, b, 500), null, 'genau seitlich');
  assert.equal(
    aufDenSchirm({ x: Math.sin(1.5), y: 0, z: Math.cos(1.5) }, b, 500),
    null,
    '86 Grad daneben',
  );
  assert.ok(aufDenSchirm({ x: Math.sin(1.2), y: 0, z: Math.cos(1.2) }, b, 500), '69 Grad daneben');
});

pruefe('das Sichtfeld füllt genau die Höhe', () => {
  const halbeHoehe = 400;
  const f = brennweite(halbeHoehe, SICHTFELD);
  const b = achsen({ gier: 0, neigung: 0 });
  const oben = { x: 0, y: Math.sin(SICHTFELD / 2), z: Math.cos(SICHTFELD / 2) };
  const lage = aufDenSchirm(oben, b, f);
  assert.ok(
    Math.abs(-lage.y - halbeHoehe) < 1e-9,
    `der Rand des Sichtfelds landet bei ${(-lage.y).toFixed(2)} statt ${halbeHoehe}`,
  );
});

/*
 * Die Eigenschaft, wegen der Verbindungslinien gerade gezeichnet werden
 * dürfen: Die Zentralprojektion bildet Grosskreise auf Geraden ab. Wäre das
 * nicht so, wäre jede gerade Linie zwischen zwei Sternen eine kleine Lüge.
 */
pruefe('ein Grosskreisbogen wird eine Gerade', () => {
  const a = { x: Math.sin(-0.5), y: Math.sin(0.3) * 0.6, z: 0.7 };
  const b = { x: Math.sin(0.6), y: Math.sin(-0.2), z: 0.75 };
  const norm = (d) => {
    const l = laenge(d);
    return { x: d.x / l, y: d.y / l, z: d.z / l };
  };
  const blick = achsen({ gier: 0.1, neigung: -0.05 });
  const f = brennweite(400);
  const A = aufDenSchirm(norm(a), blick, f);
  const B = aufDenSchirm(norm(b), blick, f);
  for (let t = 0.05; t < 1; t += 0.05) {
    /* Ein Punkt auf dem Grosskreisbogen zwischen a und b. */
    const zwischen = norm({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    });
    const P = aufDenSchirm(zwischen, blick, f);
    assert.ok(P, `bei t=${t.toFixed(2)} fiel der Punkt aus dem Bild`);
    /* Abstand von der Geraden AB. */
    const laengeAB = Math.hypot(B.x - A.x, B.y - A.y);
    const abstand =
      Math.abs((B.x - A.x) * (A.y - P.y) - (A.x - P.x) * (B.y - A.y)) / laengeAB;
    assert.ok(abstand < 1e-9, `bei t=${t.toFixed(2)} liegt der Punkt ${abstand} neben der Geraden`);
  }
});

pruefe('am Anschlag steht der äusserste Stern in der Mitte', () => {
  const { richtungen, weite } = anDenHimmel(wolke(300));
  const gehalten = begrenzen({ gier: 99, neigung: 99 }, weite);
  assert.ok(Math.abs(gehalten.gier - weite.waagerecht) < 1e-12);
  assert.ok(Math.abs(gehalten.neigung - weite.senkrecht) < 1e-12);

  /* Und in jeder erlaubten Blickrichtung ist mindestens ein Stern zu sehen. */
  const f = brennweite(400);
  for (const gier of [-weite.waagerecht, 0, weite.waagerecht]) {
    for (const neigung of [-weite.senkrecht, 0, weite.senkrecht]) {
      const blick = achsen(begrenzen({ gier, neigung }, weite));
      const sichtbar = richtungen.filter((d) => {
        const lage = aufDenSchirm(d, blick, f);
        return lage && Math.abs(lage.x) < 250 && Math.abs(lage.y) < 400;
      }).length;
      assert.ok(
        sichtbar > 0,
        `bei ${grad(gier).toFixed(0)}°/${grad(neigung).toFixed(0)}° ist kein einziger Stern zu sehen`,
      );
    }
  }
});

pruefe('innerhalb der Grenzen wird nichts verbogen', () => {
  const weite = { waagerecht: 1, senkrecht: 0.6 };
  assert.deepEqual(begrenzen({ gier: 0.3, neigung: -0.2 }, weite), { gier: 0.3, neigung: -0.2 });
});

/* =======================================================================
 * 3 · Der Himmel dahinter
 * ==================================================================== */

console.log('\n3 · Der Himmel dahinter');

pruefe('derselbe Startwert ergibt denselben Himmel', () => {
  assert.deepEqual(sternenhimmel(4711, 200), sternenhimmel(4711, 200));
  assert.deepEqual(milchstrasse(4711, 150), milchstrasse(4711, 150));
});

pruefe('ein anderer Startwert ergibt einen anderen Himmel', () => {
  const a = sternenhimmel(1, 200);
  const b = sternenhimmel(2, 200);
  const gleich = a.filter((p, i) => p.d.x === b[i].d.x && p.d.y === b[i].d.y).length;
  assert.ok(gleich < 5, `${gleich} von 200 Sternen stehen an derselben Stelle`);
});

pruefe('der Hintergrund reicht weiter als die Welt', () => {
  /*
   * Sonst stiesse man beim Umsehen auf eine Kante aus Schwarz: Am Anschlag
   * steht der Blick `SPANNE` neben der Mitte und reicht ein halbes
   * Sichtfeld darüber hinaus.
   */
  assert.ok(KAPPE > SPANNE + SICHTFELD / 2, `Kappe ${grad(KAPPE).toFixed(0)}°`);
  const mitte = { x: 0, y: 0, z: 1 };
  let weiteste = 0;
  for (const s of sternenhimmel(4711, 3000)) weiteste = Math.max(weiteste, winkel(mitte, s.d));
  assert.ok(weiteste > SPANNE + SICHTFELD / 2, `der Himmel endet bei ${grad(weiteste).toFixed(0)}°`);
  assert.ok(weiteste <= KAPPE + 1e-9, `ein Stern steht bei ${grad(weiteste).toFixed(0)}° draussen`);
});

pruefe('der Hintergrund ist über den Raumwinkel gestreut, nicht über den Winkel', () => {
  /*
   * Gleichmässig über den *Winkel* gestreut lägen halb so viele Sterne
   * jenseits der halben Kappe wie diesseits. Über den Raumwinkel gestreut
   * liegt dort der weitaus grössere Teil, weil dort mehr Kugelfläche ist.
   */
  const mitte = { x: 0, y: 0, z: 1 };
  const sterne = sternenhimmel(4711, 4000);
  const aussen = sterne.filter((s) => winkel(mitte, s.d) > KAPPE / 2).length / sterne.length;
  const erwartet = (1 - Math.cos(KAPPE / 2)) / (1 - Math.cos(KAPPE));
  assert.ok(
    Math.abs(aussen - (1 - erwartet)) < 0.03,
    `${(aussen * 100) | 0} % liegen aussen, erwartet ${((1 - erwartet) * 100) | 0} %`,
  );
  assert.ok(aussen > 0.6, `nur ${(aussen * 100) | 0} % aussen – das ist über den Winkel gestreut`);
});

pruefe('das Band ist ein Band und keine Streuung', () => {
  for (const saat of [1, 77, 4711]) {
    const band = milchstrasse(saat, 400);
    assert.ok(band.length > 200, `${saat}: nur ${band.length} Sterne im Band`);
    /*
     * Ein Band liegt nahe einer Ebene. Gemessen über die kleinste
     * Streuung: Es muss eine Richtung geben, in der die Sterne kaum
     * auseinanderliegen. Bei gleichmässiger Streuung gäbe es die nicht.
     */
    const n = band.length;
    const s = [0, 0, 0];
    for (const p of band) {
      s[0] += p.d.x;
      s[1] += p.d.y;
      s[2] += p.d.z;
    }
    /* Streuung quer zur Ebene, aus der Streuungsmatrix als kleinster Eigenwert. */
    const m = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (const p of band) {
      const v = [p.d.x - s[0] / n, p.d.y - s[1] / n, p.d.z - s[2] / n];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m[i][j] += (v[i] * v[j]) / n;
    }
    /* Kleinster Eigenwert über die Potenzmethode auf der Inversen wäre Aufwand –
       es genügt, in vielen Richtungen zu suchen und das Minimum zu nehmen. */
    let kleinste = Infinity;
    let groesste = 0;
    for (let a = 0; a < 400; a++) {
      const t = zufaellig(a);
      const q =
        t[0] * (m[0][0] * t[0] + m[0][1] * t[1] + m[0][2] * t[2]) +
        t[1] * (m[1][0] * t[0] + m[1][1] * t[1] + m[1][2] * t[2]) +
        t[2] * (m[2][0] * t[0] + m[2][1] * t[1] + m[2][2] * t[2]);
      kleinste = Math.min(kleinste, q);
      groesste = Math.max(groesste, q);
    }
    assert.ok(
      groesste / kleinste > 3,
      `${saat}: Streuung längs zu quer nur ${(groesste / kleinste).toFixed(2)} – das ist kein Band`,
    );
  }
});

/** Gleichmässig verteilte Richtungen für die Suche oben – fest, nicht zufällig. */
function zufaellig(i) {
  const z = 1 - (2 * (i + 0.5)) / 400;
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  const w = i * 2.399963;
  return [r * Math.cos(w), r * Math.sin(w), z];
}

pruefe('das Band ist dunkler als die Sterne davor', () => {
  const mittel = (m) => m.reduce((s, p) => s + p.helle, 0) / m.length;
  assert.ok(mittel(milchstrasse(4711, 300)) < mittel(sternenhimmel(4711, 300)) * 0.7);
});

/*
 * Wenige helle, viele schwache.
 *
 * Der erste Versuch zählte, wie viele Sterne heller als 0.5 sind, und
 * verlangte weniger als ein Viertel. Das ging schief, sobald die
 * Helligkeitsspanne verschoben wurde: Bei 27 Prozent schlug er an, obwohl
 * die Verteilung genauso schief war wie vorher. Die Prüfung hing an den
 * Konstanten statt an der Form.
 */
pruefe('es gibt wenige helle und viele schwache Sterne', () => {
  const werte = sternenhimmel(4711, 2000)
    .map((p) => p.helle)
    .sort((a, b) => a - b);
  const min = werte[0];
  const max = werte[werte.length - 1];
  const median = werte[Math.floor(werte.length / 2)];
  const lage = (median - min) / (max - min);
  assert.ok(lage < 0.3, `der Median liegt bei ${(lage * 100) | 0} % der Spanne – fast gleichmässig`);
  assert.ok(max > min * 2, `hellster ${max.toFixed(2)}, schwächster ${min.toFixed(2)}`);
});

pruefe('null Sterne sind null Sterne', () => {
  assert.equal(sternenhimmel(1, 0).length, 0);
  assert.equal(milchstrasse(1, 0).length, 0);
});

/* =======================================================================
 * 4 · Zeichnen
 * ==================================================================== */

console.log('\n4 · Zeichnen');

const RAND = { breite: 500, hoehe: 800 };

pruefe('nur was im Bild liegt, wird gezeichnet', () => {
  const sterne = sternenhimmel(4711, 3000);
  const blick = achsen({ gier: 0, neigung: 0 });
  const f = brennweite(RAND.hoehe / 2);
  const drin = imBild(sterne, blick, f, RAND);
  assert.ok(drin.length > 50, `nur ${drin.length} Sterne im Bild`);
  assert.ok(drin.length < sterne.length * 0.5, `${drin.length} von ${sterne.length} – da wurde nichts weggelassen`);
  for (const p of drin) {
    assert.ok(Math.abs(p.x) <= RAND.breite / 2 + 1e-9, `x=${p.x}`);
    assert.ok(Math.abs(p.y) <= RAND.hoehe / 2 + 1e-9, `y=${p.y}`);
  }
});

pruefe('wer sich umdreht, sieht andere Sterne', () => {
  const sterne = sternenhimmel(4711, 3000);
  const f = brennweite(RAND.hoehe / 2);
  const hier = imBild(sterne, achsen({ gier: 0, neigung: 0 }), f, RAND);
  const dort = imBild(sterne, achsen({ gier: 1.2, neigung: 0 }), f, RAND);
  const gleich = new Set(hier.map((p) => `${p.x},${p.y}`));
  const doppelt = dort.filter((p) => gleich.has(`${p.x},${p.y}`)).length;
  assert.equal(doppelt, 0, `${doppelt} Sterne stehen nach dem Umsehen an derselben Stelle`);
  assert.ok(dort.length > 50, `nach dem Umsehen nur ${dort.length} Sterne – da ist ein Loch`);
});

/*
 * Lange Linien verblassen.
 *
 * Der Grund ist nicht Geschmack: Man sieht immer nur einen Ausschnitt der
 * Kugel, und eine Verbindung zu einem Stern weit ausserhalb durchquert das
 * ganze Bild, ohne dass beide Enden zu sehen wären.
 */
pruefe('kurze Linien bleiben, lange verschwinden', () => {
  const d = 700;
  assert.equal(verblassen(0, d), 1, 'eine Linie ohne Länge ist voll da');
  assert.equal(verblassen(0.2 * d, d), 1, 'eine kurze Linie wird angetastet');
  assert.equal(verblassen(0.95 * d, d), 0, 'eine sehr lange Linie ist noch zu sehen');
  assert.ok(verblassen(0.5 * d, d) > 0 && verblassen(0.5 * d, d) < 1, 'dazwischen liegt nichts');
});

pruefe('das Verblassen ist stetig und geht nie zurück', () => {
  const d = 700;
  let vorher = 1.0001;
  for (let l = 0; l <= d; l += d / 400) {
    const jetzt = verblassen(l, d);
    assert.ok(jetzt <= vorher + 1e-12, `bei ${l.toFixed(0)}: ${jetzt} nach ${vorher}`);
    /*
     * Und ohne Sprung: Beim Umsehen ändert sich die Länge einer Linie
     * fortwährend. An einer harten Schwelle gingen Linien beim Wischen an
     * und aus. Ein Schritt von einem Vierhundertstel darf höchstens ein
     * Hundertstel Deckkraft kosten.
     */
    assert.ok(vorher - jetzt < 0.011, `Sprung von ${vorher} auf ${jetzt} bei ${l.toFixed(0)}`);
    vorher = jetzt;
  }
  assert.equal(vorher, 0);
});

/*
 * Das Verblassen setzt sanft ein und hört sanft auf.
 *
 * Eine gerade Rampe wäre auch stetig und ginge auch nie zurück – die beiden
 * Prüfungen oben schlagen bei ihr nicht an, das wurde ausprobiert. Sie hat
 * aber an ihrem Anfang und ihrem Ende einen Knick: Das Verblassen beginnt
 * und endet dort schlagartig, und beim Umsehen sieht man genau das. Was
 * `3x² − 2x³` besser kann, ist deshalb nicht die Stetigkeit, sondern die
 * Steigung an den Rändern – und das ist zu messen.
 */
pruefe('das Verblassen beginnt und endet sanft', () => {
  const d = 700;
  const schritt = d / 600;
  const stufen = [];
  for (let l = 0; l < d; l += schritt) {
    stufen.push({ t: l / d, ab: verblassen(l, d) - verblassen(l + schritt, d) });
  }
  const groesste = Math.max(...stufen.map((s) => s.ab));
  const nahAmAnfang = stufen.filter((s) => s.t > 0.31 && s.t < 0.36);
  const nahAmEnde = stufen.filter((s) => s.t > 0.79 && s.t < 0.84);
  for (const [wo, menge] of [['Anfang', nahAmAnfang], ['Ende', nahAmEnde]]) {
    const dort = Math.max(...menge.map((s) => s.ab));
    assert.ok(
      dort < groesste * 0.5,
      `am ${wo} fällt es mit ${dort.toFixed(5)} fast so steil wie in der Mitte (${groesste.toFixed(5)})`,
    );
  }
});

pruefe('ohne Bildfeld wird nichts verblasst', () => {
  assert.equal(verblassen(100, 0), 1);
});

pruefe('der Pfad enthält jeden Punkt und nichts sonst', () => {
  const punkte = imBild(sternenhimmel(4711, 500), achsen({ gier: 0, neigung: 0 }), brennweite(400), RAND);
  const d = punktePfad(punkte);
  assert.equal((d.match(/M/g) ?? []).length, punkte.length);
  assert.ok(!/NaN|Infinity|undefined/.test(d), `Pfad enthält Unfug: ${d.slice(0, 120)}`);
  assert.equal(punktePfad([]), '');
});

pruefe('die Lagen enthalten zusammen alle Punkte, und keinen zweimal', () => {
  const punkte = imBild(sternenhimmel(4711, 3000), achsen({ gier: 0, neigung: 0 }), brennweite(400), RAND);
  for (const stufen of [1, 3, 4, 8]) {
    const lagen = nachHelligkeit(punkte, stufen);
    assert.equal(lagen.reduce((s, l) => s + l.punkte.length, 0), punkte.length);
    const gesehen = new Set();
    for (const l of lagen) for (const p of l.punkte) gesehen.add(p);
    assert.equal(gesehen.size, punkte.length, `${stufen} Stufen: ein Punkt kam mehrfach vor`);
    assert.ok(lagen.every((l) => l.punkte.length > 0), 'eine leere Lage wäre ein Knoten ohne Inhalt');
  }
});

pruefe('hellere Punkte landen in helleren Lagen', () => {
  const punkte = imBild(sternenhimmel(4711, 3000), achsen({ gier: 0, neigung: 0 }), brennweite(400), RAND);
  const lagen = nachHelligkeit(punkte, 4);
  for (let i = 1; i < lagen.length; i++) {
    const vorher = Math.max(...lagen[i - 1].punkte.map((p) => p.helle));
    const jetzt = Math.min(...lagen[i].punkte.map((p) => p.helle));
    assert.ok(vorher <= jetzt + 1e-9, `Lage ${i} beginnt bei ${jetzt} unter dem Ende ${vorher}`);
  }
  /* Und die Deckkraft einer Lage ist der Mittelwert ihrer Punkte. */
  for (const l of lagen) {
    const mittel = l.punkte.reduce((s, p) => s + p.helle, 0) / l.punkte.length;
    assert.ok(Math.abs(l.helle - mittel) < 1e-12, `${l.helle} statt ${mittel}`);
  }
});

pruefe('dieselbe Welt bekommt dieselbe Saat, eine andere eine andere', () => {
  assert.equal(saatAus('mooshalde'), saatAus('mooshalde'));
  assert.notEqual(saatAus('mooshalde'), saatAus('mooshaldf'));
  assert.notEqual(saatAus(''), saatAus('a'));
  assert.ok(Number.isInteger(saatAus('ein ziemlich langer Bandtitel mit Umlauten äöü')));
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
