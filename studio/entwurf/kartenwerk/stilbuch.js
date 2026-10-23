/* =====================================================================
 * STILBUCH — Gestaltung, getrennt von Rendertechnik
 *
 * Ein Stilbuch sagt, *wie* etwas aussieht. Es sagt nie, *wo* etwas
 * steht – das ist das Streuwerk, und das ist in allen Stilen dasselbe.
 * Darum ist ein Stilwechsel kein anderer Wald, sondern derselbe Wald,
 * anders gezeichnet.
 *
 * Ein Eintrag ist entweder `bild` (Atlasfeld) oder `pinsel` (Code).
 * Beide Stilbücher hier mischen beides – in verschiedene Richtungen,
 * damit der hybride Weg nicht nur behauptet ist.
 *
 * ---
 *
 * **Was hier noch Behelf ist.** Die Atlasfelder werden beim Start aus
 * Code gebacken, weil die echten Grafiken noch fehlen. Jedes Feld
 * bekommt dabei ein Vielfaches des Aufwands, den man sich je Bild und
 * Bild leisten könnte – Facetten, Schichtung, Streulicht,
 * Kontaktschatten. Wenn die PNG-Dateien kommen, tritt ein Laden an die
 * Stelle des Backens. Der Maler merkt davon nichts.
 * ================================================================== */

import { Atlas, MIPS, amOrt } from './kartenwerk.js';

/* ------------------------------------------------------------------
 * Werkzeug für die Backfunktionen
 * --------------------------------------------------------------- */

function mische(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round((pa >> 16 & 255) + ((pb >> 16 & 255) - (pa >> 16 & 255)) * t);
  const g = Math.round((pa >> 8 & 255) + ((pb >> 8 & 255) - (pa >> 8 & 255)) * t);
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return `rgb(${r},${g},${bl})`;
}

/** Ein Grat durch wiederholtes Halbieren – kein Dreieck, ein Kamm. */
function grat(p0, p1, tiefe, rauh, r) {
  if (tiefe === 0) return [p0, p1];
  const mx = (p0[0] + p1[0]) / 2;
  const my = (p0[1] + p1[1]) / 2 - (r() - 0.35) * rauh;
  return [
    ...grat(p0, [mx, my], tiefe - 1, rauh * 0.55, r).slice(0, -1),
    ...grat([mx, my], p1, tiefe - 1, rauh * 0.55, r),
  ];
}

function zug(ctx, punkte) {
  ctx.beginPath();
  ctx.moveTo(punkte[0][0], punkte[0][1]);
  for (let i = 1; i < punkte.length; i++) ctx.lineTo(punkte[i][0], punkte[i][1]);
}

/* ==================================================================
 * DER BERG
 *
 * Das aufwendigste Feld, und das, an dem sich die Qualitätsfrage
 * entscheidet. Sechs Durchgänge:
 *
 *   1. Silhouette aus einem fraktalen Grat
 *   2. Schattenflanke
 *   3. Lichtflanke
 *   4. Facetten – die eigentliche Felsstruktur
 *   5. Schnee mit gezackter Grenze und Geröll darunter
 *   6. Kontaktschatten und Kontur
 *
 * Je Bild sind das einige hundert Pfadstücke. Bei zweihundert Bergen
 * und sechzig Bildern in der Sekunde wäre das undenkbar; gebacken ist
 * es einmal.
 * =============================================================== */
function backeBerg(ctx, w, h, p, variante, saat) {
  const r = (() => { let s = (saat * 2654435761) >>> 0 || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; })();

  const boden = h * 0.97;
  const mitte = w / 2 + (r() - 0.5) * w * 0.12;
  const spitze = [mitte, h * (0.06 + r() * 0.07)];
  const linksFuss = [w * 0.03, boden];
  const rechtsFuss = [w * 0.97, boden];

  /* 1 · Die Silhouette */
  const kammL = grat(linksFuss, spitze, 5, h * 0.17, r);
  const kammR = grat(spitze, rechtsFuss, 5, h * 0.15, r);
  const umriss = [...kammL, ...kammR.slice(1)];

  ctx.save();
  zug(ctx, umriss); ctx.closePath(); ctx.clip();

  /* 2 · Schattenflanke als Grundton */
  const g = ctx.createLinearGradient(0, h * 0.1, 0, boden);
  g.addColorStop(0, mische(p.fels, p.licht, 0.5));
  g.addColorStop(1, mische(p.fels, p.schatten, 0.55));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  /* 3 · Lichtflanke: alles links des Grats */
  const abwurf = [...kammL.map(([x, y]) => [x, y]), [mitte, boden], [0, boden]];
  const gl = ctx.createLinearGradient(w * 0.1, h * 0.2, w * 0.55, boden);
  gl.addColorStop(0, p.licht);
  gl.addColorStop(1, mische(p.licht, p.fels, 0.75));
  ctx.fillStyle = gl;
  zug(ctx, abwurf); ctx.closePath(); ctx.fill();

  /* 4 · Facetten — Fels sieht aus wie Fels, weil er bricht */
  for (let i = 0; i < 26; i++) {
    const t = r();
    const bx = w * (0.1 + r() * 0.8);
    const by = h * (0.15 + t * 0.78);
    const gr = w * (0.07 + r() * 0.17);
    const hell = bx < mitte;
    ctx.fillStyle = hell
      ? mische(p.licht, p.fels, 0.25 + r() * 0.5)
      : mische(p.schatten, p.fels, 0.2 + r() * 0.55);
    ctx.globalAlpha = 0.30 + r() * 0.33;
    ctx.beginPath();
    ctx.moveTo(bx, by - gr);
    ctx.lineTo(bx + gr * (0.5 + r() * 0.6), by + gr * (0.2 + r() * 0.5));
    ctx.lineTo(bx - gr * (0.3 + r() * 0.7), by + gr * (0.5 + r() * 0.6));
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  /* Schichtlinien – feine Striche quer zur Flanke */
  ctx.strokeStyle = p.grat;
  ctx.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    const y0 = h * (0.22 + r() * 0.68);
    ctx.globalAlpha = 0.10 + r() * 0.16;
    ctx.lineWidth = w * (0.004 + r() * 0.008);
    ctx.beginPath();
    const x0 = w * (0.08 + r() * 0.78);
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(x0 + w * 0.08, y0 + h * 0.02, x0 + w * (0.1 + r() * 0.2), y0 + h * (0.01 + r() * 0.05));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  /* 5 · Schnee – nur auf den hohen Varianten */
  if (variante >= 2) {
    const grenze = h * (0.22 + r() * 0.1);
    const schneeKante = [];
    for (let x = 0; x <= w; x += w / 22) {
      schneeKante.push([x, grenze + Math.sin(x / w * 9 + saat) * h * 0.035 + (amOrt(x, saat, 3) - 0.5) * h * 0.05]);
    }
    ctx.save();
    zug(ctx, [[0, 0], [w, 0], ...schneeKante.reverse()]);
    ctx.closePath(); ctx.clip();
    const gs = ctx.createLinearGradient(0, 0, w * 0.6, grenze);
    gs.addColorStop(0, p.schnee);
    gs.addColorStop(1, mische(p.schnee, p.fels, 0.35));
    ctx.fillStyle = gs;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    /* Geröll unter der Schneegrenze */
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = mische(p.schnee, p.fels, 0.3 + r() * 0.4);
      ctx.globalAlpha = 0.5;
      const sx = r() * w, sy = grenze + r() * h * 0.14;
      ctx.beginPath();
      ctx.ellipse(sx, sy, w * 0.02 + r() * w * 0.025, h * 0.008 + r() * h * 0.012, 0, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* Umgebungsverdunkelung am Fuß */
  const gf = ctx.createLinearGradient(0, boden - h * 0.3, 0, boden);
  gf.addColorStop(0, 'rgba(0,0,0,0)');
  gf.addColorStop(1, 'rgba(20,14,6,0.26)');
  ctx.fillStyle = gf;
  ctx.fillRect(0, boden - h * 0.3, w, h * 0.3);

  ctx.restore();

  /* 6 · Die Kontur – eine Feder, oben fein, unten kräftig */
  ctx.strokeStyle = p.kontur;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (let i = 1; i < umriss.length; i++) {
    const t = Math.abs(umriss[i][1] - spitze[1]) / h;
    ctx.lineWidth = w * (0.006 + t * 0.012);
    ctx.beginPath();
    ctx.moveTo(umriss[i - 1][0], umriss[i - 1][1]);
    ctx.lineTo(umriss[i][0], umriss[i][1]);
    ctx.stroke();
  }
  /* Der Grat selbst, als innere Linie */
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = w * 0.008;
  zug(ctx, kammL.slice(Math.floor(kammL.length * 0.35)));
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/* ==================================================================
 * DER BAUM
 * =============================================================== */
function backeBaum(ctx, w, h, p, variante, saat) {
  const r = (() => { let s = (saat * 40503) >>> 0 || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; })();
  const boden = h * 0.97, mx = w / 2;

  /* Kontaktschatten – das, was einen Baum auf den Boden stellt */
  ctx.fillStyle = 'rgba(20,16,8,0.17)';
  ctx.beginPath();
  ctx.ellipse(mx + w * 0.07, boden - h * 0.01, w * 0.3, h * 0.028, 0, 0, 7);
  ctx.fill();

  ctx.strokeStyle = p.stamm;
  ctx.lineCap = 'round';
  ctx.lineWidth = w * 0.065;
  ctx.beginPath();
  ctx.moveTo(mx, boden);
  ctx.lineTo(mx + (r() - 0.5) * w * 0.05, h * 0.55);
  ctx.stroke();

  const nadel = variante % 2 === 0;
  const ballen = [];
  if (nadel) {
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      ballen.push([mx + (r() - 0.5) * w * 0.1, h * (0.18 + t * 0.44), w * (0.12 + t * 0.26)]);
    }
  } else {
    for (let i = 0; i < 6; i++) {
      ballen.push([mx + (r() - 0.5) * w * 0.52, h * (0.22 + r() * 0.34), w * (0.16 + r() * 0.13)]);
    }
  }

  /* Drei Töne: Schatten zuerst, dann Grundton, dann Streiflicht.
     Das ist der ganze Unterschied zwischen Symbol und Körper. */
  for (const [ton, dx, dy, s] of [
    [p.laubSchatten, w * 0.05, h * 0.03, 1.0],
    [p.laub, 0, 0, 0.92],
    [p.laubLicht, -w * 0.06, -h * 0.035, 0.6],
  ]) {
    ctx.fillStyle = ton;
    ctx.beginPath();
    for (const [bx, by, br] of ballen) ctx.ellipse(bx + dx, by + dy, br * s, br * s * 1.05, 0, 0, 7);
    ctx.fill();
  }

  /* Ein paar Spitzen heraus, damit die Silhouette nicht aus Kugeln besteht */
  ctx.strokeStyle = p.laubSchatten;
  ctx.lineWidth = w * 0.022;
  ctx.globalAlpha = 0.8;
  for (let i = 0; i < (nadel ? 7 : 5); i++) {
    const [bx, by, br] = ballen[Math.floor(r() * ballen.length)];
    const a = r() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(a) * br * 1.22, by + Math.sin(a) * br * 1.22);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/* ==================================================================
 * DAS BAUWERK
 * =============================================================== */
function backeBurg(ctx, w, h, p, variante, saat) {
  const boden = h * 0.95, mx = w / 2;
  ctx.fillStyle = 'rgba(20,16,8,0.2)';
  ctx.beginPath();
  ctx.ellipse(mx + w * 0.08, boden, w * 0.4, h * 0.03, 0, 0, 7);
  ctx.fill();

  const koerper = (x, bw, bh, zinnen) => {
    const g = ctx.createLinearGradient(x, 0, x + bw, 0);
    g.addColorStop(0, p.mauerLicht);
    g.addColorStop(0.55, p.mauer);
    g.addColorStop(1, p.mauerSchatten);
    ctx.fillStyle = g;
    ctx.fillRect(x, boden - bh, bw, bh);
    if (zinnen) {
      const n = 3, zb = bw / (n * 2 - 1);
      for (let i = 0; i < n; i++) ctx.fillRect(x + i * 2 * zb, boden - bh - zb * 0.85, zb, zb * 0.9);
    }
    ctx.strokeStyle = p.kontur;
    ctx.lineWidth = w * 0.012;
    ctx.strokeRect(x, boden - bh, bw, bh);
    /* Fenster */
    ctx.fillStyle = p.kontur;
    for (let i = 0; i < 2; i++) {
      ctx.fillRect(x + bw * (0.34 + i * 0.3), boden - bh * (0.72 - i * 0.22), bw * 0.1, bh * 0.16);
    }
  };
  koerper(w * 0.12, w * 0.3, h * 0.72, true);
  koerper(w * 0.52, w * 0.22, h * 0.45, true);
  ctx.fillStyle = p.mauer;
  ctx.fillRect(w * 0.42, boden - h * 0.3, w * 0.12, h * 0.3);
  ctx.strokeRect(w * 0.42, boden - h * 0.3, w * 0.12, h * 0.3);
}

/* ==================================================================
 * PINSEL — dieselbe Schnittstelle, nur ohne Atlas
 *
 * Gras und Schilf bleiben Code: Sie sind klein, sie sind viele, und
 * ein Bild von sechzehn Bildpunkten lohnt den Atlasplatz nicht. Dass
 * beide Wege nebeneinander laufen, ist der Beweis des hybriden
 * Ansatzes – nicht ein Nachteil.
 * =============================================================== */
function pinselGras(ctx, s, p) {
  ctx.strokeStyle = p.gras;
  ctx.lineWidth = s.h * 0.1;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  for (let k = -1; k <= 1; k++) {
    ctx.moveTo(s.x + k * s.h * 0.18, s.y);
    ctx.quadraticCurveTo(s.x + k * s.h * 0.3, s.y - s.h * 0.5, s.x + k * s.h * 0.52, s.y - s.h);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function pinselSchilf(ctx, s, p) {
  ctx.strokeStyle = p.schilf;
  ctx.lineWidth = s.h * 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(s.x + s.h * 0.1, s.y - s.h);
  ctx.stroke();
  ctx.fillStyle = p.schilf;
  ctx.beginPath();
  ctx.ellipse(s.x + s.h * 0.1, s.y - s.h, s.h * 0.08, s.h * 0.2, 0, 0, 7);
  ctx.fill();
}

/* ==================================================================
 * DIE ZWEI STILBÜCHER
 * =============================================================== */

export const ARTBOOK = {
  id: 'artbook',
  name: 'Artbook',
  papier: '#F5EFE3',
  koernung: { farbe: '#E2D7C0', staerke: 0.05, dichte: 0.5 },
  land: '#EFE7D4', landKante: '#C3B497',
  wasser: '#D6E3E4', wasserTief: '#BFD2D4', brandung: '#F1F6F4',
  wiese: '#DFE6CF', sumpf: '#D5DAC4', wald: '#E2E6D6',
  weg: '#DCCCAA', wegKante: '#B8A47E',
  marke: '#8C6D31',
  fels: { fels: '#CFC4AE', licht: '#F0E9DA', schatten: '#9B9078', grat: '#857B66', schnee: '#FBF8F2', kontur: '#8B7F66' },
  baum: { laub: '#7F8C68', laubLicht: '#9DAA80', laubSchatten: '#5A6749', stamm: '#6B6047' },
  bau: { mauer: '#DACDB2', mauerLicht: '#F0E7D3', mauerSchatten: '#B3A484', kontur: '#8B7F66' },
  klein: { gras: '#8E9B74', schilf: '#7E8A6A', laub: '#7F8C68', laubSchatten: '#5A6749', stamm: '#6B6047' },
  /* Artbook: Fels und Bauwerk als Bild, Bewuchs als Feder. */
  bilder: { berge: 8, burg: 1 },
  pinselArten: { wald: 'baum', wiese: 'gras', sumpf: 'schilf' },
};

export const PERGAMENT = {
  id: 'pergament',
  name: 'Pergament',
  papier: '#E4D2A9',
  koernung: { farbe: '#C9AE78', staerke: 0.09, dichte: 1.6 },
  land: '#DFCCA0', landKante: '#8A6F43',
  wasser: '#9BB5B2', wasserTief: '#7FA09F', brandung: '#C8D8CE',
  wiese: '#D3C68D', sumpf: '#BDB782', wald: '#C9BE8C',
  weg: '#D8C69A', wegKante: '#86683B',
  marke: '#52381A',
  fels: { fels: '#BFA678', licht: '#E8D3A4', schatten: '#7E6238', grat: '#5C4727', schnee: '#F5ECD6', kontur: '#53401F' },
  baum: { laub: '#56693F', laubLicht: '#74884C', laubSchatten: '#36452A', stamm: '#45371F' },
  bau: { mauer: '#C8AE7E', mauerLicht: '#E7D2A3', mauerSchatten: '#8A6B3C', kontur: '#4A3519' },
  klein: { gras: '#7E7A42', schilf: '#5E6436' },
  /* Pergament: alles, was Körper hat, als Bild – auch die Bäume. */
  bilder: { berge: 8, wald: 5, burg: 1 },
  pinselArten: { wiese: 'gras', sumpf: 'schilf' },
};

/* ------------------------------------------------------------------
 * Ein Stilbuch backen und benutzbar machen
 * --------------------------------------------------------------- */

const MASSE = {
  /* Je Art: Bildgröße im Atlas und das Verhältnis Höhe→Breite.
     Diese Tabelle ist zugleich die Anforderung an echte Grafiken. */
  berge: { px: 420, breiteZuHoehe: 1.55, streuung: 0.42 },
  wald: { px: 190, breiteZuHoehe: 0.78 },
  burg: { px: 260, breiteZuHoehe: 1.1 },
};

export function backeStilbuch(def) {
  const t0 = performance.now();
  const atlas = new Atlas(4096);
  const eintraege = new Map();

  for (const [art, anzahl] of Object.entries(def.bilder)) {
    const mass = MASSE[art];
    const liste = [];
    for (let v = 0; v < anzahl; v++) {
      const h = mass.px;
      /* Die Varianten unterscheiden sich schon im Zuschnitt – sonst
         erkennt das Auge dieselbe Silhouette unter acht Nummern. */
      const streu = mass.streuung ? 1 + (amOrt(v, 3, 17) - 0.5) * mass.streuung : 1;
      const w = Math.round(h * mass.breiteZuHoehe * streu);
      const feld = atlas.backe(`${art}_${v}`, w, h, w / 2, h * 0.97, (ctx) => {
        if (art === 'berge') backeBerg(ctx, w, h, def.fels, v % 4 === 0 ? 1 : v % 3, 1000 + v * 37);
        else if (art === 'wald') backeBaum(ctx, w, h, def.baum, v, 500 + v * 91);
        else backeBurg(ctx, w, h, def.bau, v, 200 + v);
      });
      liste.push(feld);
    }
    eintraege.set(art, { art: 'bild', felder: liste });
  }

  for (const [art, welcher] of Object.entries(def.pinselArten)) {
    const male = welcher === 'gras' ? pinselGras
      : welcher === 'schilf' ? pinselSchilf
      : pinselFederbaum;
    eintraege.set(art, { art: 'pinsel', male });
  }

  const msBacken = performance.now() - t0;

  return {
    def,
    atlas,
    msBacken,
    felder: atlas.felder.size,
    uebergelaufen: atlas.uebergelaufen ?? 0,

    /**
     * Ein Stück Staffage zeichnen.
     *
     * Der Maler fragt nie, ob etwas ein Bild oder ein Pinsel ist –
     * das entscheidet das Stilbuch. Genau hier sitzt die Trennung von
     * Rendertechnik und Gestaltung.
     */
    zeichne(ctx, s, massstab) {
      const e = eintraege.get(s.art);
      if (!e) return;

      if (e.art === 'pinsel') {
        e.male(ctx, s, def.klein);
        return;
      }

      const feld = e.felder[s.variante % e.felder.length];
      const hoehe = s.h;
      const breite = hoehe * (feld.w / feld.h);

      /*
       * Die Mipstufe nach der *gezeichneten* Größe wählen, nicht nach
       * dem Zoom allein. Ein kleiner Baum bei hoher Vergrößerung
       * braucht dieselbe Stufe wie ein großer bei niedriger.
       */
      const zielPx = hoehe * massstab;
      let stufe = 0;
      for (let i = MIPS.length - 1; i >= 0; i--) {
        if (feld.h * MIPS[i] >= zielPx * 0.85) { stufe = i; break; }
      }
      const q = feld.stufen[stufe];

      ctx.save();
      ctx.translate(s.x, s.y);
      if (s.dreh) ctx.rotate(s.dreh);
      if (s.spiegel) ctx.scale(-1, 1);
      ctx.drawImage(
        atlas.leinwand, q.x, q.y, q.w, q.h,
        -breite * (feld.ankerX / feld.w), -hoehe * (feld.ankerY / feld.h),
        breite, hoehe,
      );
      ctx.restore();
    },
  };
}

/**
 * Der Federbaum des Artbook-Stils.
 *
 * Kein Bild, sondern Striche – und das ist hier die Gestaltungsabsicht,
 * nicht ein fehlendes Bild. Artbook ist eine Zeichnung; ein gemalter Baum
 * wäre darin der Fremdkörper. Dass derselbe Wald im Pergament aus Bildern
 * besteht, ist genau der Punkt: Das Streuwerk ist dasselbe.
 */
function pinselFederbaum(ctx, s, p) {
  const h = s.h;
  ctx.strokeStyle = p.stamm;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(0.4, h * 0.075);
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(s.x, s.y - h * 0.4);
  ctx.stroke();

  const nadel = s.variante % 2 === 0;
  ctx.fillStyle = p.laub;
  ctx.beginPath();
  if (nadel) {
    ctx.moveTo(s.x, s.y - h);
    ctx.lineTo(s.x + h * 0.33, s.y - h * 0.44);
    ctx.lineTo(s.x + h * 0.19, s.y - h * 0.48);
    ctx.lineTo(s.x + h * 0.41, s.y - h * 0.07);
    ctx.lineTo(s.x - h * 0.41, s.y - h * 0.07);
    ctx.lineTo(s.x - h * 0.19, s.y - h * 0.48);
    ctx.lineTo(s.x - h * 0.33, s.y - h * 0.44);
    ctx.closePath();
  } else {
    ctx.ellipse(s.x - h * 0.08, s.y - h * 0.6, h * 0.3, h * 0.33, 0, 0, 7);
    ctx.ellipse(s.x + h * 0.16, s.y - h * 0.52, h * 0.24, h * 0.26, 0, 0, 7);
  }
  ctx.fill();
  /* Eine Schattenseite rechts – zwei Töne genügen für Körper. */
  ctx.save();
  ctx.beginPath(); ctx.rect(s.x + h * 0.06, s.y - h * 1.1, h, h * 1.2); ctx.clip();
  ctx.fillStyle = p.laubSchatten;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  if (nadel) {
    ctx.moveTo(s.x, s.y - h);
    ctx.lineTo(s.x + h * 0.33, s.y - h * 0.44);
    ctx.lineTo(s.x + h * 0.19, s.y - h * 0.48);
    ctx.lineTo(s.x + h * 0.41, s.y - h * 0.07);
    ctx.lineTo(s.x - h * 0.41, s.y - h * 0.07);
    ctx.closePath();
  } else {
    ctx.ellipse(s.x - h * 0.08, s.y - h * 0.6, h * 0.3, h * 0.33, 0, 0, 7);
    ctx.ellipse(s.x + h * 0.16, s.y - h * 0.52, h * 0.24, h * 0.26, 0, 0, 7);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}
