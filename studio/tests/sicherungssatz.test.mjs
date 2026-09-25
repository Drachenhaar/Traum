/**
 * Die Zeile am geschlossenen Buch: wo dieses Buch liegt.
 *
 * Die Rechnung dahinter (`sicherungFaellig`) gab es lange und war sorgfältig
 * – sie hatte nur **einen Aufrufer: die Einstellungsseite.** Die Warnung
 * stand damit dort, wo nur hingeht, wer ohnehin an Sicherungen denkt.
 *
 * Geprüft wird hier deshalb zweierlei, und das zweite ist das wichtigere:
 *
 *   **Sagt sie es?**      Wer nie gesichert hat, muss es erfahren.
 *   **Schweigt sie?**     Ein leeres Buch, ein frisch gesichertes, ein
 *                         abgeschaltetes – dort darf kein Wort stehen.
 *
 * Eine Zeile, die zu oft dasteht, wird zur Tapete; danach liest sie niemand
 * mehr, auch nicht an dem Tag, an dem sie recht hat.
 *
 * Jede Zusage wurde gegengeprobt: der Fehler absichtlich wieder eingebaut, bis
 * die Prüfung anschlug.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { ARBEIT } from './arbeit.mjs';

const wurzel = join(import.meta.dirname, '..');
const bau = join(ARBEIT, 'sicherungssatz');
rmSync(bau, { recursive: true, force: true });
mkdirSync(bau, { recursive: true });
execFileSync(
  'npx',
  ['esbuild', 'src/lib/speicher.ts', '--bundle', '--format=esm',
   `--outfile=${join(bau, 'speicher.mjs')}`, '--log-level=error'],
  { cwd: wurzel, stdio: 'inherit' },
);
const { sicherungssatz } = await import(join(bau, 'speicher.mjs'));

let geprueft = 0;
const pruefe = (was, fn) => {
  fn();
  geprueft++;
  console.log(`  ✓ ${was}`);
};

const TAG = 86_400_000;
const JETZT = 1_700_000_000_000;
const satz = (lage, tage = 14) => sicherungssatz({ eintraege: 50, ...lage }, tage, JETZT);

/* =======================================================================
 * 1 · WANN SIE SCHWEIGT
 * ==================================================================== */

console.log('\n1 · Wann sie schweigt');

pruefe('ein leeres Buch bleibt still', () => {
  /*
   * Jemanden zu mahnen, er möge das Nichts sichern, das er noch nicht
   * geschrieben hat, ist die Sorte Aufdringlichkeit, mit der Programme das
   * Vertrauen verlieren.
   */
  assert.equal(satz({ eintraege: 0, aeltesterEintrag: JETZT - 900 * TAG }), undefined);
});

pruefe('ein frisch gesichertes Buch bleibt still', () => {
  assert.equal(satz({ letzteSicherung: JETZT - 2 * TAG }), undefined);
});

pruefe('genau an der Frist noch still', () => {
  /*
   * Die Grenze ist „länger als", nicht „mindestens". Am vierzehnten Tag
   * steht nichts da; das ist die Zusage, die aus `sicherungFaellig` kommt.
   */
  assert.equal(satz({ letzteSicherung: JETZT - 14 * TAG }), undefined);
  assert.ok(satz({ letzteSicherung: JETZT - 14 * TAG - 1000 }));
});

pruefe('wer sie abgestellt hat, hört nichts mehr', () => {
  /* „nie" ist in der Oberfläche 3650 Tage. */
  assert.equal(satz({ letzteSicherung: JETZT - 400 * TAG }, 3650), undefined);
});

/* =======================================================================
 * 2 · WANN SIE SPRICHT
 * ==================================================================== */

console.log('\n2 · Wann sie spricht');

pruefe('wer nie gesichert hat, erfährt es', () => {
  /*
   * Der wichtigste Fall, und der, den die alte Rechnung einmal verschwieg:
   * Ohne Datum war die Bedingung falsch, und ausgerechnet wer am meisten zu
   * verlieren hatte, bekam keine Warnung.
   */
  const s = satz({ aeltesterEintrag: JETZT - 30 * TAG });
  assert.ok(s, 'kein Satz');
  assert.match(s, /keine Sicherung ausserhalb dieses Browsers/);
});

pruefe('sie sagt, wie viele Seiten auf dem Spiel stehen', () => {
  /*
   * „Fällig" erklärt nichts. Eine Zahl erklärt alles: Wer 50 Seiten
   * geschrieben hat, versteht ohne weiteres Wort, worum es geht.
   */
  assert.match(satz({ eintraege: 50, aeltesterEintrag: JETZT - 30 * TAG }), /50 Seiten/);
});

pruefe('eine einzige Seite heisst nicht „1 Seiten"', () => {
  const s = satz({ eintraege: 1, aeltesterEintrag: JETZT - 30 * TAG });
  assert.match(s, /dieser einen Seite/, s);
  assert.doesNotMatch(s, /1 Seiten/);
});

pruefe('wer schon gesichert hat, hört das Alter', () => {
  assert.equal(
    satz({ letzteSicherung: JETZT - 20 * TAG }),
    'Die letzte Sicherung ist 20 Tage alt.',
  );
});

/* =======================================================================
 * 3 · DER TON
 * ==================================================================== */

console.log('\n3 · Der Ton');

pruefe('sie schimpft nicht', () => {
  /*
   * Gesetz 3: „nichts mahnt". Ein Ausrufezeichen, ein „musst", ein „Achtung"
   * macht aus einer Auskunft eine Aufforderung – und aus einem Buch ein
   * Programm.
   */
  const alle = [
    satz({ aeltesterEintrag: JETZT - 30 * TAG }),
    satz({ letzteSicherung: JETZT - 20 * TAG }),
  ];
  for (const s of alle) {
    assert.doesNotMatch(s, /!|Achtung|Warnung|musst|solltest|dringend|Fehler/i, s);
  }
});

pruefe('sie redet vom Buch, nicht vom Programm', () => {
  const s = satz({ aeltesterEintrag: JETZT - 30 * TAG });
  assert.match(s, /Seiten/);
  assert.doesNotMatch(s, /Datensatz|Datenbank|Backup|Export/i, s);
});

/* =======================================================================
 * 4 · OB SIE IRGENDWO STEHT
 * ==================================================================== */

console.log('\n4 · Ob sie irgendwo steht');

const lies = (p) => readFileSync(join(wurzel, p), 'utf8');

pruefe('der Einband zeigt sie', () => {
  /*
   * Ohne diese Zeile wäre der Satz das, was die Rechnung vorher war:
   * durchdacht, geprüft und an keiner Stelle sichtbar.
   */
  const q = lies('src/components/book/Cover.tsx');
  /* Ohne Prosa gesucht: Ein auskommentierter Aufruf ist keiner. */
  const ohneProsa = q.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(ohneProsa, /\n\s*<Sicherungszeile \/>/);
  assert.match(ohneProsa, /import \{ Sicherungszeile \}/);
});

pruefe('sie rechnet mit dem echten Bestand', () => {
  const q = lies('src/components/book/Sicherungszeile.tsx');
  /*
   * Der **Aufruf**, nicht der Name.
   *
   * Die erste Fassung suchte nur „livingEntries" – und fand die
   * `import`-Zeile, die auch dann dasteht, wenn niemand die Funktion mehr
   * benutzt. Beim Gegenproben blieb sie grün, während die Zeile den
   * Papierkorb mitzählte. Derselbe Fehler ist in diesem Projekt schon
   * einmal passiert; er sieht jedes Mal harmlos aus.
   */
  assert.match(q, /livingEntries\(entries\)/, 'zählt auch den Papierkorb mit');
  assert.match(q, /lastBackupAt/);
  assert.match(q, /backupReminderDays/);
});

pruefe('sie ist hell genug, um gelesen zu werden', () => {
  /*
   * Am Bildschirm gemessen, nicht an der gesetzten Farbe: `/45` ergab auf
   * dem Einband **2,65:1** bei 12,5 px kursiv – unter der Schwelle von
   * 4,5:1. Der einzige Satz, der vor einem unwiederbringlichen Verlust
   * warnt, war der unleserlichste auf der Seite.
   *
   * Geprüft wird hier nur, dass niemand still wieder unter die gemessene
   * Stufe rutscht. Die Zahl dahinter steht im Bauteil.
   */
  const q = lies('src/components/book/Sicherungszeile.tsx');
  const treffer = q.match(/\btext-paper-400\/(\d+)\b/);
  assert.ok(treffer, 'die Zeile hat gar keine Schriftfarbe mehr');
  assert.ok(Number(treffer[1]) >= 70, `zu blass: /${treffer[1]} (gemessen: /65 ≙ 4,31:1)`);
});

pruefe('sie führt an eine Stelle, an der man sichern kann', () => {
  const q = lies('src/components/book/Sicherungszeile.tsx');
  assert.match(q, /navigate\('\/kolophon'\)/);
  const kolophon = lies('src/pages/SettingsPage.tsx');
  assert.match(kolophon, /exportAll/, 'dort wird gar nicht gesichert');
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
