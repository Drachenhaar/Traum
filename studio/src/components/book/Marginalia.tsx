/**
 * Beziehungen als Fußnoten.
 *
 * Dieselben Daten wie im Weltgraphen, nur nicht als Netz gezeichnet, sondern
 * gelesen: „Heimat von — Waldkoi, Nebeleiche“. Der Nutzer versteht die Welt,
 * ohne einen Graphen entziffern zu müssen.
 *
 * Die Wurzeln tragen das Buch. Sie stehen nicht im Vordergrund – aber sie sind
 * immer da.
 */

import { Link } from 'react-router-dom';
import type { Entry, Relation } from '../../types';
import type { RelationIndex } from '../../lib/relations';
import { groupRelations, relationsOf } from '../../lib/relations';
import { gruppiereBeziehungen } from '../../lib/beziehungsgruppen';

/**
 * Was dasteht, wenn nichts dasteht.
 *
 * Keine technischen Leerzustände: „Noch keine Relationen“ ist eine Aussage
 * über die Datenbank. „Wer lebt an diesem Ort?“ ist eine über die Welt – und
 * sie beantwortet sich manchmal von selbst, während man sie liest.
 */
function leereFrage(type: string): string {
  switch (type) {
    case 'location':
    case 'biome':
      return 'Wer lebt an diesem Ort? Was steht darin, wem gehört er?';
    case 'character':
    case 'creature':
    case 'animal':
      return 'Wo ist zuhause, wer gehört dazu, was gehört ihm?';
    case 'moment':
      return 'Noch ist niemand mit diesem Ereignis verbunden – weder Ursache noch Folge.';
    case 'szene':
      return 'Diese Szene hat noch keinen Ort, keine Perspektive und niemanden, der darin vorkommt.';
    case 'material':
    case 'plant':
      return 'Woher kommt das, und was entsteht daraus?';
    default:
      return 'Diese Seite steht noch für sich allein.';
  }
}

/** Die Zeitspanne einer Verbindung, wie sie in einer Fußnote stünde. */
function spanneVon(r: Relation): string {
  const b = r.beginn?.trim();
  const e = r.ende?.trim();
  if (b && e) return `${b}–${e}`;
  if (b) return `ab ${b}`;
  if (e) return `bis ${e}`;
  return '';
}

export function Marginalia({
  entry,
  relIndex,
  entriesById,
  heading,
}: {
  entry: Entry;
  relIndex: RelationIndex;
  entriesById: Map<string, Entry>;
  /** Steht nichts darüber, braucht der Block eine eigene Überschrift. */
  heading?: boolean;
}) {
  const groups = groupRelations(
    relationsOf(relIndex, entry.id).filter((r) => {
      const other = entriesById.get(r.otherId);
      return other && !other.deletedAt;
    }),
  );

  /*
   * Eine Seite ohne Verbindungen schweigt nicht mehr.
   *
   * Bisher verschwand dieser ganze Bereich – und damit der einzige Hinweis
   * darauf, dass es ihn ueberhaupt gibt. Wer seine erste Figur anlegt, sieht
   * eine schoene Seite und erfaehrt nie, dass diese Welt aus Verbindungen
   * besteht. Also steht dort jetzt eine Frage, in der Sprache der Welt und
   * nicht der Datenbank: kein „0 Relationen", kein leerer Kasten.
   */
  if (groups.length === 0) {
    return (
      <aside className={heading ? '' : 'mt-9'}>
        {heading ? (
          <p className="rubric mb-3">Verbindungen</p>
        ) : (
          <span aria-hidden className="rule-gild mb-5 block w-full opacity-60" />
        )}
        <p className="font-serif text-[15px] italic leading-relaxed text-ink-faint/80">
          {leereFrage(entry.type)}
        </p>
      </aside>
    );
  }

  return (
    <aside className={heading ? '' : 'mt-9'}>
      {heading ? (
        <p className="rubric mb-3">Verbindungen</p>
      ) : (
        <span aria-hidden className="rule-gild mb-5 block w-full opacity-60" />
      )}

      {/*
        Zwei Ebenen: die Frage, dann die Beschriftung.

        Wer einen Ort mit dreissig Verbindungen aufschlaegt, hat keine
        Vokabelfrage („beherbergt"? „Schauplatz von"?), sondern vier echte:
        Wer ist hier, was ist hier, wozu gehoert das hier, was ist hier
        geschehen. Bei wenigen Kanten entfaellt die obere Ebene wieder –
        dort ist die Beschriftung selbst schon die Antwort.
      */}
      {gruppiereBeziehungen(groups).map(({ gruppe, gruppen }) => (
        <section key={gruppe.id} className="mb-7 last:mb-0">
          {gruppe.frage && (
            <p className="mb-3 font-serif text-[14.5px] italic text-ink-faint/75">{gruppe.frage}</p>
          )}
          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {gruppen.map((group) => (
          <div key={group.label}>
            <p className="rubric mb-1.5">{group.label}</p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const other = entriesById.get(item.otherId);
                if (!other) return null;
                return (
                  <li key={item.relation.id}>
                    <Link
                      to={`/eintrag/${other.id}`}
                      className="group inline-flex items-baseline gap-2 font-serif text-[15px] leading-snug text-ink transition-colors hover:text-gild-600"
                    >
                      <span
                        aria-hidden
                        className="inline-block h-[5px] w-[5px] shrink-0 translate-y-[-3px] rounded-full"
                        style={{ background: group.color }}
                      />
                      <span className="border-b border-transparent group-hover:border-gild-500/40">
                        {other.title}
                      </span>
                      {/*
                        Trägt die Verbindung eine eigene Zeit, gehört sie
                        hierher: „herrschte über Aschen, 1032–1050“ ist eine
                        andere Aussage als „herrschte über Aschen“.
                      */}
                      {spanneVon(item.relation) && (
                        <span className="shrink-0 font-serif text-[12.5px] tabular-nums text-ink-faint/80">
                          {spanneVon(item.relation)}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
            ))}
          </div>
        </section>
      ))}
    </aside>
  );
}

/**
 * Die Merkmalsliste eines Eintrags.
 *
 * Kein Formular, keine Rahmen – eine gesetzte Liste, wie die Angaben unter
 * einer Abbildung im Katalog. Leere Felder erscheinen gar nicht.
 */
export function FieldNotes({ rows }: { rows: { label: string; value: string }[] }) {
  const filled = rows.filter((r) => r.value.trim().length > 0);
  if (filled.length === 0) return null;

  return (
    <dl className="mt-7 space-y-2">
      {filled.map((row) => (
        <div key={row.label} className="flex gap-3 leading-snug">
          <dt className="rubric w-[38%] shrink-0 pt-[3px] text-right">{row.label}</dt>
          <dd className="font-serif text-[15px] text-ink">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
