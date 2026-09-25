/**
 * Der Dienstbote – damit das Buch auch ohne Netz aufgeht.
 *
 * ---
 *
 * **Was vorher geschah, gemessen.**
 *
 * Die App verspricht an mehreren Stellen, vollständig lokal zu sein: Nichts
 * verlässt dieses Gerät, keine Anmeldung, kein Server. Das stimmte für die
 * Daten und stimmte nicht für das Buch selbst. Im Versuch – Flugmodus, und
 * der Browser hatte seinen Zwischenspeicher geräumt, wie er es nach ein paar
 * Tagen tut:
 *
 *     ERR_INTERNET_DISCONNECTED
 *     No internet
 *     Try: Checking the network cables, modem, and router
 *
 * Englisch, vom Browser, mit einem Rat über Kabel und Router. Dahinter lagen
 * die Seiten unversehrt in der Datenbank – unerreichbar, weil das Programm
 * fehlte, das sie hätte anzeigen können. Wer im Zug etwas nachschlagen will,
 * erfährt an dieser Stelle, dass sein Buch doch jemand anderem gehört.
 *
 * ---
 *
 * **Was vorgehalten wird, und was nicht.**
 *
 *     Code   1,4 MB   vollständig, beim ersten Besuch
 *     Bilder 1,7 MB   unterwegs, was man angesehen hat
 *
 * Der Code ist unteilbar: Fehlt ein einziges nachgeladenes Stück, führt eine
 * Seite ins Leere, und zwar genau dann, wenn kein Netz da ist, um es zu
 * holen. Deshalb kommt er ganz.
 *
 * Bilder sind teilbar. Ein Wappen, das fehlt, ist eine blasse Stelle; ein
 * fehlendes Stück Code ist ein Absturz. 1,7 MB ungefragt über ein
 * Mobilfunknetz zu ziehen, nur damit jedes Wappen bereitläge, das dieser
 * Leser vielleicht nie aufschlägt, wäre die teurere Hälfte für die
 * geringere Not. Was er ansieht, behält er.
 *
 * ---
 *
 * **Warum hier nichts „sofort übernimmt".**
 *
 * Der bequeme Weg wäre `skipWaiting()` – die neue Fassung reisst das Ruder
 * an sich, sobald sie da ist. Sie ist auch der Weg, auf dem Programme dieser
 * Art kaputtgehen: Die neue Fassung löscht beim Aufräumen die Vorräte der
 * alten, und die alte Seite, die noch offen im Browser steht, lädt gleich
 * darauf ein Stück Code nach, das es nicht mehr gibt. Mitten im Schreiben.
 *
 * Deshalb wartet eine neue Fassung, bis die letzte offene Seite der alten
 * geschlossen ist. Das kostet einen Besuch Verzögerung und kostet niemanden
 * einen Satz.
 *
 * ---
 *
 * **Der Notausgang.**
 *
 * Ein Dienstbote, der falsch liegt, liegt hartnäckig falsch: Er liefert sein
 * veraltetes Zeug aus, auch wenn draussen längst eine heile Fassung steht.
 * Wer ihn loswerden muss, veröffentlicht unter demselben Namen `sw.js` eine
 * Datei mit genau diesem Inhalt:
 *
 *     self.addEventListener('install', () => self.skipWaiting());
 *     self.addEventListener('activate', (e) => e.waitUntil((async () => {
 *       for (const n of await caches.keys()) await caches.delete(n);
 *       await self.registration.unregister();
 *       for (const c of await self.clients.matchAll()) c.navigate(c.url);
 *     })()));
 *
 * Hier ist `skipWaiting` richtig: Es gibt nichts mehr zu schützen.
 *
 * ---
 *
 * Die drei Marken unten setzt `scripts/dienstbote-bauen.mjs` beim Bauen ein.
 * Diese Datei wird nicht gebündelt und nicht von TypeScript gelesen – sie
 * läuft allein in ihrem eigenen Faden, ohne Fenster und ohne DOM.
 */

/* eslint-env serviceworker */

/** Wechselt mit jedem Build, weil die Dateinamen mit ihrem Inhalt wechseln. */
const FASSUNG = '__FASSUNG__';

/** Alles, was zum Starten und Blättern nötig ist. Vollständig. */
const WERK = __WERK__;

/** Die Bilder dieses Builds – nicht zum Vorhalten, zum Aufräumen. */
const BILDER = __BILDER__;

const WERKVORRAT = `dragoncore-werk-${FASSUNG}`;
const BILDVORRAT = 'dragoncore-bilder';

/*
 * Der Start, an dem alles hängt.
 *
 * Nicht `/index.html`: Unter GitHub Pages liegt das Buch in einem
 * Unterordner, und der Dienstbote kennt seinen eigenen Ort nur über
 * `registration.scope`. Ein fest geschriebener Pfad wäre genau die Sorte
 * Annahme, die erst in der Veröffentlichung auffliegt.
 */
const START = new URL('index.html', self.registration.scope).href;

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const vorrat = await caches.open(WERKVORRAT);
      /*
       * `addAll` ist mit Absicht alles-oder-nichts: Reisst die Verbindung
       * mitten im Holen ab, schlägt die Einrichtung fehl und dieser
       * Dienstbote wird nie tätig. Besser gar keiner als einer mit Löchern –
       * ein halber Vorrat fällt erst auf, wenn kein Netz mehr da ist.
       */
      await vorrat.addAll(WERK.map((p) => new URL(p, self.registration.scope).href));
    })(),
  );
  /* Kein skipWaiting. Die Begründung steht oben. */
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const namen = await caches.keys();
      await Promise.all(
        namen.map((n) => {
          if (n === WERKVORRAT || n === BILDVORRAT) return undefined;
          /* Vorräte früherer Fassungen. Ihre Dateien gibt es nicht mehr. */
          return caches.delete(n);
        }),
      );

      /*
       * Die Bilder überleben den Wechsel – sie tragen ihren Inhalt im Namen,
       * ein einmal geholtes Bild bleibt also richtig. Nur die, die es in
       * diesem Build nicht mehr gibt, fliegen raus; sonst wüchse der Vorrat
       * über die Jahre um jedes je ersetzte Wappen.
       */
      const bilder = await caches.open(BILDVORRAT);
      const gueltig = new Set(BILDER.map((p) => new URL(p, self.registration.scope).href));
      for (const anfrage of await bilder.keys()) {
        if (!gueltig.has(anfrage.url)) await bilder.delete(anfrage);
      }

      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (e) => {
  const anfrage = e.request;

  /*
   * Wovon der Dienstbote die Finger lässt.
   *
   * Nur GET (ein POST zu beantworten, ohne ihn abzuschicken, wäre eine Lüge
   * über etwas Geschehenes) und nur der eigene Ordner. Alles andere geht
   * unberührt ans Netz – der Dienstbote steht zwischen jeder einzelnen
   * Anfrage dieser Seite und der Welt, und diese Stellung missbraucht man am
   * besten gar nicht.
   *
   * Hier stand daneben eine Prüfung auf die eigene Herkunft. Sie war
   * überflüssig, und das Gegenproben hat es gezeigt: Sie liess sich
   * herausnehmen, ohne dass eine einzige Prüfung anschlug. `scope` ist eine
   * vollständige Adresse samt Herkunft – was mit ihr beginnt, kommt
   * zwangsläufig von hier. Dieselbe Regel zweimal zu schreiben heisst, sie
   * eines Tages nur einmal zu ändern.
   */
  if (anfrage.method !== 'GET') return;
  const ziel = new URL(anfrage.url);
  if (!ziel.href.startsWith(self.registration.scope)) return;

  /*
   * Ein Seitenaufruf bekommt immer den Einband.
   *
   * Das Buch führt seine Adressen hinter der Raute (`#/figur/…`), die also
   * nie an einen Server geht – hier landet nur der erste Aufruf und das
   * Neuladen. Der Suchteil (`?neuanfang`) wird bewusst weggeworfen: Er wird
   * im Fenster ausgewertet, nicht beim Holen, und er darf nicht dazu führen,
   * dass ausgerechnet die Seite ohne Netz nicht kommt.
   */
  if (anfrage.mode === 'navigate') {
    e.respondWith(
      (async () => {
        const hinterlegt = await caches.match(START);
        if (hinterlegt) return hinterlegt;
        return fetch(anfrage);
      })(),
    );
    return;
  }

  e.respondWith(
    (async () => {
      const hinterlegt = await caches.match(anfrage);
      if (hinterlegt) return hinterlegt;

      const antwort = await fetch(anfrage);

      /*
       * Nur unversehrte, eigene Antworten werden aufbewahrt.
       *
       * `response.ok` schliesst 404 und 500 aus – eine hinterlegte
       * Fehlermeldung wäre ein Fehler, der nie wieder weggeht. `type !==
       * 'basic'` schliesst undurchsichtige Antworten aus, bei denen niemand
       * sehen kann, ob sie überhaupt geglückt sind.
       */
      if (antwort.ok && antwort.type === 'basic' && istBild(ziel.pathname)) {
        const vorrat = await caches.open(BILDVORRAT);
        await vorrat.put(anfrage, antwort.clone());
      }
      return antwort;
    })(),
  );
});

/** Woran ein Bild zu erkennen ist – an seiner Endung, sonst an nichts. */
function istBild(pfad) {
  return /\.(webp|png|jpe?g|svg|avif|gif)$/i.test(pfad);
}
