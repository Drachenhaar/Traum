// Die Zeitlogik direkt pruefen - ohne Browser, ohne Oberflaeche.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { ARBEIT } from './arbeit.mjs';
import { execSync } from 'child_process';
const S = ARBEIT;
mkdirSync(S+'/t', { recursive: true });
// TS -> JS mit esbuild (liegt als Vite-Abhaengigkeit bereit)
execSync(`npx esbuild src/lib/chronik/zeit.ts --bundle --format=esm --outfile=${S}/t/zeit.mjs`, { stdio:'pipe' });
const Z = await import(S+'/t/zeit.mjs');

let ok=0, bad=0;
const p = (name, ist, soll) => {
  const gleich = JSON.stringify(ist) === JSON.stringify(soll);
  if (gleich) ok++; else { bad++; console.log('FEHLER', name, '\n  ist :', JSON.stringify(ist), '\n  soll:', JSON.stringify(soll)); }
};
const lese = (t) => { const z = Z.leseZeit(t); return z ? [z.jahr, z.monat ?? null, z.tag ?? null, z.genauigkeit] : null; };

p('Jahr',            lese('1032'),        [1032,null,null,'jahr']);
p('Jahr-Monat',      lese('1032-04'),     [1032,4,null,'monat']);
p('Jahr-Monat-Tag',  lese('1032-04-17'),  [1032,4,17,'tag']);
p('Tag.Monat.Jahr',  lese('12.4.1032'),   [1032,4,12,'tag']);
p('Leerzeichen',     lese('  1032  '),    [1032,null,null,'jahr']);
p('vor der Zeit',    lese('300 v. Z.'),   [-300,null,null,'jahr']);
p('negatives Jahr',  lese('-300'),        [-300,null,null,'jahr']);
p('Unsinn',          lese('irgendwann'),  null);
p('mehrdeutig 4/5/1032 abgelehnt', lese('4/5/1032') === null || lese('4/5/1032')[0] === 4, true);
p('Monat 13 abgelehnt', lese('1032-13'),  null);
p('Tag 44 abgelehnt',   lese('1032-04-44'), null);
p('leer',            lese(''),            null);

// Ordnung: Reihenfolge muss stimmen
const o = (t) => Z.ordnung(Z.leseZeit(t));
p('1031 < 1032',        o('1031') < o('1032'), true);
p('1032-03 < 1032-04',  o('1032-03') < o('1032-04'), true);
p('-300 < 0',           o('-300') < o('0'), true);
p('Jahresanfang',       o('1032') === o('1032-01-01'), true);
p('Ende deckt Jahr ab', Z.ordnungEnde(Z.leseZeit('1032')) > o('1032'), true);

// Hin und zurueck
const rund = Z.ausOrdnung(o('1032-04-17'));
p('Rueckrechnung', [rund.jahr, rund.monat, rund.tag], [1032,4,17]);

// Zeitraum
const r = Z.leseZeitraum('1032','1078');
p('bestand 1050',   Z.bestandBei(r, o('1050')), true);
p('bestand 1020 nicht', Z.bestandBei(r, o('1020')), false);
p('bestand 1090 nicht', Z.bestandBei(r, o('1090')), false);
p('Ende einschliessend', Z.bestandBei(r, o('1078')), true);
const offen = Z.leseZeitraum('1032', undefined);
p('offenes Ende gilt weiter', Z.bestandBei(offen, o('9999')), true);
const offenVorn = Z.leseZeitraum(undefined, '1078');
p('offener Anfang', Z.bestandBei(offenVorn, o('-500')), true);

// Schreiben
p('schreibe Jahr',  Z.leseZeit('1032') && Z.schreibeZeit(Z.leseZeit('1032')), '1032');
p('schreibe v.Z.',  Z.leseZeit('300 v. Z.') && Z.schreibeZeit(Z.leseZeit('300 v. Z.')), '300 v. Z.');

/* ---- Unschaerfe: "um 874" war bisher unlesbar ---- */
const u = (t) => { const z = Z.leseZeit(t); return z ? [z.jahr, z.genauigkeit, z.ungefaehr ?? false] : null; };
p('um 874',            u('um 874'),          [874,'jahr',true]);
p('ca. 1200',          u('ca. 1200'),        [1200,'jahr',true]);
p('ca 1200 ohne Punkt',u('ca 1200'),         [1200,'jahr',true]);
p('etwa 1032-04',      u('etwa 1032-04'),    [1032,'monat',true]);
p('gegen 12.4.1032',   u('gegen 12.4.1032'), [1032,'tag',true]);
p('vermutlich 300 v. Z.', u('vermutlich 300 v. Z.'), [-300,'jahr',true]);
p('genaues Jahr bleibt scharf', u('874'),    [874,'jahr',false]);
p('Unschaerfe nur am Anfang',   u('874 um'), null);
p('blosses "um" ist keine Zeit', u('um'),    null);
p('Umschreiben behaelt die Unschaerfe',
  Z.schreibeZeit(Z.leseZeit('um 874')), 'um 874');
p('Umschreiben ohne Unschaerfe', Z.schreibeZeit(Z.leseZeit('874')), '874');
p('Unschaerfe rechnet mit dem genannten Jahr',
  Z.ordnung(Z.leseZeit('um 874')), Z.ordnung(Z.leseZeit('874')));

console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);
process.exit(bad ? 1 : 0);
