/**
 * Die Weltkarte als Buchseite.
 *
 * Diese Datei hält alles, was nicht Geometrie ist: welche Karte offen liegt,
 * was gewählt ist, was rückgängig gemacht werden kann, und die eine Frage, die
 * eine Karte in Dragoncore erst zu einer Dragoncore-Karte macht –
 *
 *   *Gehört diese Fläche zu einer Seite im Buch?*
 *
 * Sie darf unbeantwortet bleiben. Eine namenlose Landschaft ist kein
 * unfertiger Zustand, sondern der übliche: Man malt eine Küste, weil man eine
 * Küste sieht, nicht weil man schon weiß, wie sie heißt. Nichts auf dieser
 * Seite mahnt deshalb, und nichts zählt, wie viele Flächen noch keinen Namen
 * haben.
 *
 * ---
 *
 * **Das Rückgängig.**
 *
 * Es liegt hier und nicht im Bauteil, weil es eine Frage der Bedeutung ist und
 * keine der Darstellung. Ein Schritt ist: eine Fläche entstand, eine Fläche
 * verschwand, eine Fläche bedeutet jetzt etwas anderes, eine Fläche gehört
 * jetzt zu einer Seite. Verschieben und Zoomen sind keine Schritte – wer die
 * Karte bewegt hat und „Zurück" drückt, will seinen letzten *Strich* zurück,
 * nicht seinen letzten Blick.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { AppendixSheet } from './Appendix';
import { useStudio, livingEntries } from '../../store/useStudio';
import { Weltkarte, Werkzeugleiste, type Werkzeug } from '../../components/karte/Weltkarte';
import {
  BEDEUTUNGEN,
  neueKarte,
  type Bedeutung,
  type Kartendokument,
  type Kartenfeature,
} from '../../lib/karte/modell';
import { cx } from '../../lib/utils';

export function WeltkarteSheet() {
  return (
    <AppendixSheet title="Weltkarte" rubric="Anhang · Die Länder">
      <Karte />
    </AppendixSheet>
  );
}

/** Wie viele Schritte zurückgenommen werden können. */
const SCHRITTE = 24;

function Karte() {
  const entries = useStudio((s) => s.entries);
  const karten = useStudio((s) => s.karten);
  const activeBookId = useStudio((s) => s.activeBookId);
  const speichereKarte = useStudio((s) => s.speichereKarte);

  /*
   * Die Karte entsteht erst beim Malen.
   *
   * Bis dahin liegt sie nur im Speicher. Eine leere Karte in die Datenbank zu
   * schreiben, weil jemand die Seite aufgeschlagen hat, hiesse zu behaupten,
   * dieses Buch habe eine Karte – und in jeder Sicherung stünde von da an ein
   * leeres Kartendokument, das niemand gewollt hat.
   */
  const [entwurf, setEntwurf] = useState<Kartendokument | null>(null);
  const karte = karten[0] ?? entwurf ?? neueKarte(activeBookId ?? '');

  const [werkzeug, setWerkzeug] = useState<Werkzeug>('land');
  const [gewaehlt, setGewaehlt] = useState<string | undefined>();
  const [verlauf, setVerlauf] = useState<Kartenfeature[][]>([]);

  const lebende = useMemo(() => livingEntries(entries), [entries]);
  /*
   * Die Namen kommen aus dem Buch, nicht aus der Karte.
   *
   * Deshalb reicht der Karte eine Zuordnung von Kennung auf Titel. Wer eine
   * Seite umbenennt, hat damit die Karte umbenannt – ohne dass irgendwo etwas
   * abgeglichen werden müsste, weil es nur eine Wahrheit gibt.
   */
  const namen = useMemo(
    () => new Map(lebende.map((e) => [e.id, e.title])),
    [lebende],
  );

  /** Jede bedeutungstragende Änderung geht hier durch – und nur hier. */
  const aendere = (naechste: Kartendokument) => {
    setVerlauf((v) => [...v.slice(-(SCHRITTE - 1)), karte.features]);
    setEntwurf(naechste);
    void speichereKarte(naechste);
  };

  const zurueck = () => {
    const vorher = verlauf[verlauf.length - 1];
    if (!vorher) return;
    setVerlauf((v) => v.slice(0, -1));
    const naechste = { ...karte, features: vorher };
    setEntwurf(naechste);
    setGewaehlt(undefined);
    void speichereKarte(naechste);
  };

  const flaeche = karte.features.find((f) => f.id === gewaehlt);

  const setzeArt = (art: Bedeutung) => {
    if (!flaeche) return;
    aendere({
      ...karte,
      features: karte.features.map((f) => (f.id === flaeche.id ? { ...f, art } : f)),
    });
  };

  const setzeEintrag = (entryId: string) => {
    if (!flaeche) return;
    aendere({
      ...karte,
      features: karte.features.map((f) =>
        f.id === flaeche.id ? { ...f, entryId: entryId || undefined } : f,
      ),
    });
  };

  const loesche = () => {
    if (!flaeche) return;
    aendere({ ...karte, features: karte.features.filter((f) => f.id !== flaeche.id) });
    setGewaehlt(undefined);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-4 text-sm text-ink-muted">
        Male grob, was wo ist. Land, Wasser, Wald – mehr Bedeutungen gibt es noch nicht, und
        mehr braucht eine Küste nicht, um eine zu sein.
      </p>

      <Weltkarte
        karte={karte}
        onChange={aendere}
        werkzeug={werkzeug}
        gewaehlt={gewaehlt}
        onWaehle={setGewaehlt}
        namen={namen}
      />

      <Werkzeugleiste
        werkzeug={werkzeug}
        onWerkzeug={(w) => {
          setWerkzeug(w);
          if (w !== 'waehlen') setGewaehlt(undefined);
        }}
        kannZurueck={verlauf.length > 0}
        onZurueck={zurueck}
      />

      {flaeche && (
        <section className="card mt-4 p-4">
          <h2 className="font-serif text-lg">Diese Fläche</h2>

          <div className="mt-3 flex flex-wrap gap-2">
            {BEDEUTUNGEN.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setzeArt(b.id)}
                aria-pressed={flaeche.art === b.id}
                className={cx(
                  'touch-target rounded-full border px-4 text-sm',
                  flaeche.art === b.id
                    ? 'border-brass-500 bg-brass-500 text-paper-50'
                    : 'border-line bg-cream-50 text-ink-muted',
                )}
              >
                {b.name}
              </button>
            ))}
          </div>

          <label className="mt-4 block text-sm text-ink-muted" htmlFor="karte-eintrag">
            Gehört zu einer Seite
          </label>
          <select
            id="karte-eintrag"
            className="input-base mt-1 w-full"
            value={flaeche.entryId ?? ''}
            onChange={(e) => setzeEintrag(e.target.value)}
          >
            <option value="">— namenlos —</option>
            {lebende.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
          {/*
            Kein Hinweis, keine Mahnung, kein Zähler.

            „Namenlos" steht als gleichwertige Wahl in der Liste und nicht als
            Leerzustand darüber – eine Landschaft ohne Namen ist nichts, was
            noch fehlt.
          */}
          {flaeche.entryId && (
            <p className="mt-2 text-sm">
              <Link className="text-brass-600 underline" to={`/eintrag/${flaeche.entryId}`}>
                {namen.get(flaeche.entryId) ?? 'Zur Seite'}
              </Link>
            </p>
          )}

          <button
            type="button"
            onClick={loesche}
            className="touch-target mt-4 flex items-center gap-2 text-sm text-ink-muted"
          >
            <Trash2 size={16} aria-hidden />
            Fläche entfernen
          </button>
        </section>
      )}
    </div>
  );
}
