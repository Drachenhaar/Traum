/**
 * Wo die Tests ihre Zwischendateien ablegen.
 *
 * Jede Pruefung baut die Quelldatei, die sie prueft, mit esbuild zu einem
 * Buendel zusammen und laedt es. Das braucht einen Ort – und einen, der nicht
 * im Quellbaum liegt: Sonst faende der naechste Durchlauf seine eigenen
 * Erzeugnisse und der Typpruefer auch.
 *
 * Der Ordner steht in `.gitignore` und wird vom Testlaeufer angelegt.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ARBEIT = join(dirname(fileURLToPath(import.meta.url)), '..', '.testbau');
