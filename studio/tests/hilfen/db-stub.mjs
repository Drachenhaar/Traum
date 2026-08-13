/**
 * Die Datenbank, ersetzt.
 *
 * `lib/druck/weltbuch.ts` holt Titelbilder aus IndexedDB. Die gibt es in Node
 * nicht – und fuer das, was hier geprueft wird (Satzspiegel, Umbrueche,
 * maskierte Zeichen), braucht es sie auch nicht. Deshalb bekommt esbuild beim
 * Buendeln einen Ersatz untergeschoben, der immer „kein Bild" antwortet.
 *
 * Ein Ersatz und kein Abschalten der Bilder: So laeuft derselbe Zweig wie im
 * Betrieb, nur ohne Datei am Ende.
 */
export const stub = {
  name: 'db-stub',
  setup(build) {
    build.onResolve({ filter: /db\/db$/ }, () => ({ path: 'dbstub', namespace: 'stub' }));
    build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
      contents:
        'export const db = { imageBlobs: { get: async () => undefined }, images: { get: async () => undefined } };',
      loader: 'js',
    }));
  },
};
