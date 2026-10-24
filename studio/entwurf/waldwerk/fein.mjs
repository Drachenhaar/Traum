/* Acht Bäume in der Machart der Illustration: viele kleine Laubbüschel
   statt eines Vielecks. Derselbe Vertrag – Anker unten, Licht links oben. */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import { writeFileSync } from 'node:fs';
const b = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
await p.setContent('<canvas id=c width=1024 height=1024></canvas>');
const r = await p.evaluate(() => {
  const W = 152, H = 190, MIPS = [1, 0.5, 0.25];
  const c = document.getElementById('c'), X = c.getContext('2d');
  const felder = [], arten = {};
  let sp = 0, ze = 0, zh = 0;

  const male = (x, w, h, variante) => {
    let s = (1000 + variante * 7919) >>> 0;
    const r = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    const mx = w / 2, boden = h * 0.955;
    const nadel = variante % 2 === 0;

    x.fillStyle = 'rgba(40,34,20,0.17)';
    x.beginPath(); x.ellipse(mx + w * 0.07, boden - h * 0.006, w * 0.23, h * 0.019, 0, 0, 7); x.fill();

    /* Stamm mit Rinde und Ästen */
    const kipp = (r() - 0.5) * w * 0.07;
    const ansatz = nadel ? boden - h * 0.3 : boden - h * 0.42;
    x.strokeStyle = '#5E5440'; x.lineCap = 'round'; x.lineWidth = w * 0.055;
    x.beginPath(); x.moveTo(mx, boden); x.quadraticCurveTo(mx + kipp * 0.4, (boden + ansatz) / 2, mx + kipp, ansatz); x.stroke();
    x.strokeStyle = '#7A6E55'; x.lineWidth = w * 0.02;
    x.beginPath(); x.moveTo(mx - w * 0.012, boden - h * 0.02); x.quadraticCurveTo(mx + kipp * 0.4 - w * 0.015, (boden + ansatz) / 2, mx + kipp - w * 0.015, ansatz); x.stroke();
    x.strokeStyle = '#5E5440';
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.0;
      x.lineWidth = w * (0.012 + r() * 0.016);
      x.beginPath(); x.moveTo(mx + kipp, ansatz + h * 0.02);
      x.quadraticCurveTo(mx + kipp + Math.cos(a) * w * 0.16, ansatz - h * 0.06,
        mx + kipp + Math.cos(a) * w * 0.3, ansatz - h * 0.12 - r() * h * 0.06);
      x.stroke();
    }

    /* Laub: viele kleine Büschel. Das ist der ganze Unterschied. */
    const my = nadel ? h * 0.42 : h * 0.34;
    const rx = nadel ? w * 0.3 : w * 0.38;
    const ry = nadel ? h * 0.34 : h * 0.26;
    const n = 110 + Math.floor(r() * 50);
    for (let i = 0; i < n; i++) {
      const a = r() * 6.283, d = Math.sqrt(r());
      let bx = mx + kipp * 0.5 + Math.cos(a) * d * rx;
      let by = my + Math.sin(a) * d * ry;
      if (nadel) { const t = (by - (my - ry)) / (ry * 2); bx = mx + kipp * 0.5 + (bx - mx - kipp * 0.5) * (0.25 + t * 0.95); }
      const lic = Math.max(0, 1 - (bx - (mx - rx)) / (rx * 2.1) - (by - (my - ry)) / (ry * 2.6));
      x.fillStyle = lic > 0.66 ? '#A7B28D' : lic > 0.36 ? '#7F8C68' : lic > 0.16 ? '#67745120' .slice(0,7) : '#4E5A3A';
      const br = w * (0.035 + r() * 0.045);
      x.beginPath();
      for (let k = 0; k < 3; k++) {
        const aa = (k / 3) * 6.283 + a;
        x.ellipse(bx + Math.cos(aa) * br * 0.45, by + Math.sin(aa) * br * 0.45, br * 0.6, br * 0.48, aa, 0, 7);
      }
      x.fill();
    }
  };

  const platz = (w, h) => {
    if (sp + w > 1024) { sp = 0; ze += zh + 2; zh = 0; }
    const q = { x: sp, y: ze, w, h }; sp += w + 2; if (h > zh) zh = h; return q;
  };
  arten.wald = { varianten: 8, breiteZuHoehe: 0.8, ankerX: 0.5, ankerY: 0.96, stufen: MIPS, herkunft: [], felder: [] };
  for (let v = 0; v < 8; v++) {
    const stufen = [];
    for (const m of MIPS) {
      const q = platz(Math.round(W * m), Math.round(H * m));
      X.save(); X.beginPath(); X.rect(q.x, q.y, q.w, q.h); X.clip();
      X.translate(q.x, q.y); X.scale(m, m); male(X, W, H, v); X.restore();
      stufen.push([q.x, q.y, q.w, q.h]);
    }
    arten.wald.felder.push(stufen);
    arten.wald.herkunft.push('fein');
  }
  return { png: c.toDataURL('image/png'), verzeichnis: { satz: 'fein', breite: 1024, hoehe: 1024, arten } };
});
writeFileSync('karte/fein/atlas.png', Buffer.from(r.png.split(',')[1], 'base64'));
writeFileSync('karte/fein/atlas.json', JSON.stringify(r.verzeichnis, null, 1));
console.log('feiner Satz gebacken');
await b.close();
