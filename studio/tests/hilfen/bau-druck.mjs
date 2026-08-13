/** Baut `lib/druck/weltbuch.ts` mit ersetzter Datenbank zu einem Buendel. */
import * as esbuild from 'esbuild';
import { fileURLToPath } from 'node:url';
import { stub } from './db-stub.mjs';

const wurzel = fileURLToPath(new URL('../..', import.meta.url));
await esbuild.build({
  entryPoints: [wurzel + 'src/lib/druck/weltbuch.ts'],
  bundle: true,
  format: 'esm',
  outfile: process.argv[2],
  plugins: [stub],
  logLevel: 'error',
});
