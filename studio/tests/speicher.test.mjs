/*
 * Die Verwahrung.
 *
 * Zwei Dinge, die beide entscheiden, ob ein Buch in zehn Jahren noch da ist:
 *
 *   Bittet die Anwendung den Browser, es zu behalten – und liest sie seine
 *   Antwort richtig, auch wenn er gar keine gibt?
 *
 *   Mahnt sie zur Sicherung, wenn es fällig ist – **und besonders dann, wenn
 *   noch nie gesichert wurde?**
 *
 * Der zweite Punkt war jahrelang falsch, und zwar auf die unauffälligste Art:
 * Die Warnung erschien erst nach der ersten Sicherung, also erst, nachdem die
 * Gefahr vorüber war.
 */
import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';

const S = ARBEIT;
execSync(`npx esbuild src/lib/speicher.ts --bundle --format=esm --outfile=${S}/t/speicher.mjs`, {
  stdio: 'pipe',
});
const V = await import(S + '/t/speicher.mjs');

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

const TAG = 86_400_000;
const JETZT = 1_700_000_000_000;

/* ==========================================================================
 * 1  WANN EINE SICHERUNG FÄLLIG IST
 * ======================================================================= */

console.log('\n1 Wann gemahnt wird');

const faellig = (lage, tage = 14) => V.sicherungFaellig(lage, tage, JETZT);

/*
 * Der Fall, für den diese Datei überhaupt entstanden ist.
 *
 * Jemand schreibt seit einem Monat an seinem Buch und hat nie gesichert. Das
 * ist der dringendste Fall, den es gibt. Die alte Bedingung verlangte ein
 * Sicherungsdatum, um zu warnen – und wer nie gesichert hat, hat keines.
 */
wahr(
  '  nie gesichert, seit einem Monat geschrieben → fällig',
  faellig({ aeltesterEintrag: JETZT - 30 * TAG, eintraege: 12 }),
  'genau dieser Fall wurde vorher verschwiegen',
);

wahr(
  '  nie gesichert, aber erst seit gestern → noch nicht',
  !faellig({ aeltesterEintrag: JETZT - 1 * TAG, eintraege: 3 }),
);

wahr(
  '  vor drei Wochen gesichert → fällig',
  faellig({ letzteSicherung: JETZT - 21 * TAG, aeltesterEintrag: JETZT - 90 * TAG, eintraege: 40 }),
);

wahr(
  '  gestern gesichert → nicht fällig',
  !faellig({ letzteSicherung: JETZT - 1 * TAG, aeltesterEintrag: JETZT - 90 * TAG, eintraege: 40 }),
);

/*
 * Und die Sicherung schlägt das Alter der Einträge.
 *
 * Ein Buch, an dem seit Jahren geschrieben wird, hat einen sehr alten
 * ältesten Eintrag. Würde der weiter zählen, nachdem gesichert wurde, stünde
 * die Mahnung für immer da – und eine Mahnung, die immer dasteht, liest
 * niemand mehr.
 */
wahr(
  '  ein altes Buch, gestern gesichert, mahnt nicht',
  !faellig({ letzteSicherung: JETZT - 1 * TAG, aeltesterEintrag: JETZT - 900 * TAG, eintraege: 300 }),
);

/*
 * Auf einem leeren Buch schweigt sie. Jemanden zu mahnen, er möge das Nichts
 * sichern, das er noch nicht geschrieben hat, ist die Sorte Aufdringlichkeit,
 * mit der Programme das Vertrauen verlieren.
 */
wahr('  ein leeres Buch mahnt nicht', !faellig({ eintraege: 0 }));
wahr(
  '  auch nicht, wenn es lange leer ist',
  !faellig({ aeltesterEintrag: JETZT - 900 * TAG, eintraege: 0 }),
);
wahr(
  '  und ohne jeden Anhaltspunkt ebenfalls nicht',
  !faellig({ eintraege: 5 }),
  'weder Sicherung noch Eintragsdatum – dann ist nichts bekannt',
);

/* Die Frist ist einstellbar, nicht eingebrannt. */
wahr(
  '  bei sieben Tagen Frist ist zehn Tage überfällig',
  V.sicherungFaellig({ letzteSicherung: JETZT - 10 * TAG, eintraege: 1 }, 7, JETZT),
);
wahr(
  '  bei dreißig Tagen Frist nicht',
  !V.sicherungFaellig({ letzteSicherung: JETZT - 10 * TAG, eintraege: 1 }, 30, JETZT),
);

/* ==========================================================================
 * 2  WAS DER BROWSER SAGT – UND WAS ER VERSCHWEIGT
 *
 * Drei Zustände, und der dritte ist der, den man vergisst: Ein Browser, der
 * die Frage gar nicht kennt oder beim Zugriff wirft (privates Fenster,
 * strenge Einstellungen), sagt **nicht** „nein". Daraus „dein Buch ist
 * ungeschützt" zu machen wäre eine Behauptung über etwas, das niemand geprüft
 * hat.
 * ======================================================================= */

console.log('\n2 Was der Browser sagt');

/** Einen Browser vortäuschen. `undefined` heisst: kennt `storage` gar nicht. */
function alsBrowser(storage) {
  Object.defineProperty(globalThis, 'navigator', {
    value: storage === undefined ? {} : { storage },
    configurable: true,
    writable: true,
  });
}

{
  await alsBrowser({ persisted: async () => true, estimate: async () => ({ usage: 2_500_000, quota: 1_000_000_000 }) });
  const l = await V.speicherlage();
  wahr('  angemeldeter Speicher wird als dauerhaft gelesen', l.dauerhaft === true);
  wahr(`  und der Platz kommt mit (${l.belegt} von ${l.gesamt})`, l.belegt === 2_500_000);
}

{
  await alsBrowser({ persisted: async () => false });
  const l = await V.speicherlage();
  wahr('  ein Nein ist ein Nein', l.dauerhaft === false);
  wahr('  ohne Platzangabe bleibt der Platz leer', l.belegt === undefined);
}

{
  /* Der Browser kennt `storage` gar nicht. */
  await alsBrowser(undefined);
  const l = await V.speicherlage();
  wahr(
    '  ein Browser ohne die Frage sagt weder ja noch nein',
    l.dauerhaft === undefined,
    'nicht false – das wäre geraten',
  );
}

{
  /* Der Zugriff wirft – privates Fenster, strenge Einstellungen. */
  await alsBrowser({
    persisted: async () => {
      throw new Error('nicht erlaubt');
    },
  });
  const l = await V.speicherlage();
  wahr('  ein Fehler beim Fragen ist auch kein Nein', l.dauerhaft === undefined);
}

{
  /* `estimate` wirft, `persisted` antwortet – die Auskunft darf nicht mitfallen. */
  await alsBrowser({
    persisted: async () => true,
    estimate: async () => {
      throw new Error('kein Platz zu melden');
    },
  });
  const l = await V.speicherlage();
  wahr('  ein Platzfehler nimmt die Hauptauskunft nicht mit', l.dauerhaft === true);
}

/* ==========================================================================
 * 3  DIE BITTE
 * ======================================================================= */

console.log('\n3 Die Bitte');

{
  let gefragt = 0;
  await alsBrowser({
    persisted: async () => false,
    persist: async () => {
      gefragt++;
      return true;
    },
  });
  wahr('  ein Ja kommt als Ja zurück', (await V.umDauerhaftigkeitBitten()) === true);
  wahr('  und es wurde wirklich gefragt', gefragt === 1);
}

{
  /*
   * Schon angemeldet? Dann wird nicht noch einmal gefragt.
   *
   * In Firefox erscheint für diese Bitte eine Nachfrage am Bildschirmrand.
   * Sie jemandem zu zeigen, dessen Speicher längst dauerhaft ist, wäre eine
   * Störung ohne jeden Zweck.
   */
  let gefragt = 0;
  await alsBrowser({
    persisted: async () => true,
    persist: async () => {
      gefragt++;
      return true;
    },
  });
  wahr('  bei schon angemeldetem Speicher kommt sofort ja', (await V.umDauerhaftigkeitBitten()) === true);
  wahr('  und es wird nicht noch einmal gefragt', gefragt === 0, 'sonst fragt Firefox jedes Mal nach');
}

{
  await alsBrowser({ persisted: async () => false, persist: async () => false });
  wahr('  ein Nein ist kein Fehler, sondern ein Nein', (await V.umDauerhaftigkeitBitten()) === false);
}

{
  await alsBrowser(undefined);
  wahr(
    '  wo es die Frage nicht gibt, kommt undefined',
    (await V.umDauerhaftigkeitBitten()) === undefined,
  );
}

{
  await alsBrowser({
    persisted: async () => false,
    persist: async () => {
      throw new Error('abgelehnt');
    },
  });
  wahr('  und ein Wurf wird nicht durchgereicht', (await V.umDauerhaftigkeitBitten()) === undefined);
}

/* ==========================================================================
 * 4  BYTES, WIE EIN MENSCH SIE LIEST
 * ======================================================================= */

console.log('\n4 Grössen');

wahr('  999 B bleiben Bytes', V.alsGroesse(999) === '999 B');
wahr('  2 500 000 sind 2,5 MB', V.alsGroesse(2_500_000) === '2.5 MB');
/*
 * Mit tausend gerechnet und nicht mit 1024: Der Browser meldet seine
 * Schätzung dezimal, und eine Anzeige, die anders rechnet als ihre Quelle,
 * zeigt eine andere Zahl als die Einstellungen desselben Browsers.
 */
wahr('  1000 B sind 1,0 kB und nicht 0,98', V.alsGroesse(1000) === '1.0 kB');
wahr('  grosse Zahlen werden gerundet', V.alsGroesse(52_000_000) === '52 MB');
wahr('  Gigabyte kommen an', V.alsGroesse(3_100_000_000) === '3.1 GB');
wahr('  und nichts bleibt nichts', V.alsGroesse(undefined) === undefined);

console.log(`\n  ${ok} bestanden, ${bad} gescheitert\n`);
process.exit(bad ? 1 : 0);
