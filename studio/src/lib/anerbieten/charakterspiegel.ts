/**
 * Der Charakterspiegel.
 *
 * Er wiederholt nicht, was im Steckbrief steht – das kann man auf der Seite
 * selbst lesen, und ein Spiegel, der es noch einmal sagt, ist eine zweite
 * Seite ohne zweiten Nutzen. Er setzt in Beziehung, was ohnehin da ist.
 *
 * **Alles hier ist gerechnet, nichts erfunden.** Kein Modell, kein Dienst,
 * keine Herleitung über das Geschriebene hinaus. Jeder Satz, der hier
 * entsteht, führt auf Einträge zurück, die jemand selbst angelegt hat – und
 * genau die stehen als Belege dabei.
 *
 * Die Grenze, die dabei am schwersten zu halten war, ist die zwischen
 * **Beobachtung und Deutung**. „Elian steht in vier Ereignissen neben Mara"
 * ist zählbar. „Elian hängt an Mara" ist eine Deutung. Beides darf hier
 * stehen – aber nie in derselben Zeile und nie in derselben Kennzeichnung.
 * Was gezählt wurde, trägt `beobachtung`. Was ausgelegt wurde, trägt
 * `vermutung`, und der Leser sieht den Unterschied, bevor er den Satz liest.
 *
 * Und keine Frage wird beantwortet. Die offenen Fragen am Ende sind Fragen an
 * den Verfasser, nicht Rätsel mit hinterlegter Lösung. Wer sie beantwortet,
 * schreibt sie in die Welt – dann ist es sein Satz.
 */

import type { Entry, Relation } from '../../types';
import { buildRelationIndex, relationsOf } from '../relations';
import { asList, asText, templateFor } from '../templates';
import { leseZeit, ordnung } from '../chronik/zeit';
import type { Beleg, Wissensstand } from './beobachtung';

export interface Punkt {
  text: string;
  belege: Beleg[];
}

export interface Abschnitt {
  id: string;
  titel: string;
  /** Was für Sätze hier stehen – die Kennzeichnung gehört an den Abschnitt. */
  stand: Wissensstand;
  /** Eine Zeile, die sagt, woher diese Sätze kommen. */
  herkunft: string;
  punkte: Punkt[];
}

/* ------------------------------------------------------------- Hilfen ---- */

/** Wörter, die über niemanden etwas aussagen. */
const FUELL = new Set(
  `der die das den dem des ein eine einer eines einem einen und oder aber doch
   sich ihm ihn ihr ihre sein seine ist sind war waren wird werden hat haben
   nicht kein keine nur noch schon auch sehr mehr viel viele man alle alles
   von zu mit für auf aus bei nach vor über unter durch gegen ohne um im am
   er sie es wir ihr sie dann wenn als wie was wer wo weil dass ob`.split(/\s+/),
);

function woerter(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 5 && !FUELL.has(w));
}

/* ------------------------------------------------------- Die Abschnitte -- */

export interface Spiegelbild {
  entry: Entry;
  abschnitte: Abschnitt[];
  /** Wie tragfähig das Ganze ist – für den Satz, wenn es zu wenig ist. */
  tragfaehig: boolean;
}

export function charakterspiegel(
  entry: Entry,
  entries: Entry[],
  relations: Relation[],
): Spiegelbild {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const index = buildRelationIndex(relations);
  const kanten = relationsOf(index, entry.id).filter((r) => {
    const a = byId.get(r.otherId);
    return a && !a.deletedAt;
  });

  const abschnitte: Abschnitt[] = [];

  /* ------------------------------------------------ 1 Was geschrieben wurde */

  const tpl = templateFor(entry.type);
  const eigene: Punkt[] = [];
  for (const f of tpl.fields) {
    const roh = entry.fields[f.key];
    const wert = Array.isArray(roh) ? roh.filter(Boolean).join(', ') : asText(roh);
    if (!wert.trim()) continue;
    eigene.push({ text: `${f.label}: ${wert}`, belege: [{ entryId: entry.id, warum: f.label }] });
  }
  if (eigene.length) {
    abschnitte.push({
      id: 'selbstbild',
      titel: 'Was über ihn geschrieben wurde',
      stand: 'kanon',
      herkunft: 'Wörtlich von seiner eigenen Seite.',
      /*
       * Der einzige Abschnitt mit dem Stand `kanon` – und er ist es, weil
       * hier nichts hinzukommt: Es steht genau das, was jemand selbst
       * eingetragen hat. Alles darunter ist gerechnet.
       */
      punkte: eigene.slice(0, 8),
    });
  }

  /* -------------------------------------------- 2 Was seine Geschichte zeigt */

  const ereignisse = kanten.filter((r) => byId.get(r.otherId)?.type === 'event');
  if (ereignisse.length) {
    abschnitte.push({
      id: 'geschichte',
      titel: 'Was seine Geschichte zeigt',
      stand: 'beobachtung',
      herkunft: `Gezählt: ${ereignisse.length} ${ereignisse.length === 1 ? 'Ereignis' : 'Ereignisse'}, in denen er vorkommt.`,
      punkte: ereignisse.slice(0, 8).map((r) => {
        const a = byId.get(r.otherId)!;
        return {
          text: `${r.label} ${a.title}${a.beginn?.trim() ? ` · ${a.beginn.trim()}` : ''}`,
          belege: [{ entryId: a.id, warum: a.title }],
        };
      }),
    });
  }

  /* ------------------------------------------------ 3 Prägende Beziehungen */

  /*
   * Was eine Beziehung praegend macht, ist hier zaehlbar und nicht gefuehlt:
   * Zwei Figuren, die in denselben Ereignissen vorkommen, haben mehr
   * miteinander zu tun als zwei, die nur durch eine Kante verbunden sind.
   * Das ist eine schwache Messung – aber eine echte, und sie steht offen da.
   */
  const meineEreignisse = new Set(ereignisse.map((r) => r.otherId));
  const gemeinsam = new Map<string, number>();
  for (const evId of meineEreignisse) {
    for (const r of relationsOf(index, evId)) {
      if (r.otherId === entry.id) continue;
      const a = byId.get(r.otherId);
      if (!a || a.deletedAt || a.type !== 'character') continue;
      gemeinsam.set(r.otherId, (gemeinsam.get(r.otherId) ?? 0) + 1);
    }
  }
  const praegend = [...gemeinsam.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  if (praegend.length) {
    abschnitte.push({
      id: 'praegend',
      titel: 'Prägende Beziehungen',
      stand: 'beobachtung',
      herkunft: 'Gezählt: gemeinsame Ereignisse.',
      punkte: praegend.map(([id, n]) => {
        const a = byId.get(id)!;
        const wo = [...meineEreignisse]
          .filter((ev) => relationsOf(index, ev).some((r) => r.otherId === id))
          .slice(0, 4);
        return {
          text: `${a.title} – gemeinsam in ${n} ${n === 1 ? 'Ereignis' : 'Ereignissen'}`,
          belege: [
            { entryId: a.id, warum: a.title },
            ...wo.map((ev) => ({ entryId: ev, warum: byId.get(ev)?.title ?? '' })),
          ].filter((b) => b.warum),
        };
      }),
    });
  }

  /* -------------------------------------------------------- 4 Entwicklung */

  /*
   * Ueber `ordnung` und nicht ueber die Weltzeit selbst: Die ist ein Objekt
   * aus Jahr, Monat und Tag, keine Zahl. Zwei davon zu subtrahieren ergibt
   * `NaN`, und `NaN` sortiert nicht – die Reihenfolge waere die, in der die
   * Kanten zufaellig standen, und „Zuerst" und „Zuletzt" waeren geraten.
   */
  const datiert = ereignisse
    .map((r) => ({ r, e: byId.get(r.otherId)!, z: leseZeit(byId.get(r.otherId)!.beginn) }))
    .filter((x): x is typeof x & { z: NonNullable<typeof x.z> } => x.z !== undefined)
    .sort((a, b) => ordnung(a.z) - ordnung(b.z));
  if (datiert.length >= 3) {
    abschnitte.push({
      id: 'entwicklung',
      titel: 'Entwicklung',
      stand: 'beobachtung',
      herkunft: 'Nach den Daten geordnet, die auf den Ereignissen stehen.',
      punkte: [
        {
          text: `Zuerst: ${datiert[0].r.label} ${datiert[0].e.title} · ${datiert[0].e.beginn?.trim()}`,
          belege: [{ entryId: datiert[0].e.id, warum: datiert[0].e.title }],
        },
        {
          text: `Zuletzt: ${datiert[datiert.length - 1].r.label} ${datiert[datiert.length - 1].e.title} · ${datiert[datiert.length - 1].e.beginn?.trim()}`,
          belege: [
            {
              entryId: datiert[datiert.length - 1].e.id,
              warum: datiert[datiert.length - 1].e.title,
            },
          ],
        },
      ],
    });
  }

  /* ---------------------------------------------------------- 5 Spannungen */

  /*
   * Die einzige Deutung in dieser Datei – und sie ist so eng gefasst, wie sie
   * sich fassen liess.
   *
   * Verglichen wird, welche auffaelligen Woerter im Steckbrief stehen und
   * welche davon anderswo in der Welt wieder auftauchen. Ein Wort, das nur auf
   * der eigenen Seite steht, ist eine Behauptung, die die Welt noch nicht
   * eingeloest hat. Das ist *kein Fehler* – es kann eine Figur sein, die sich
   * selbst falsch einschaetzt, und das waere die interessanteste Sorte. Aber
   * es ist auffaellig, und darauf darf man hinweisen.
   *
   * Was hier ausdruecklich nicht steht: „Elian ist inkonsistent." Diese
   * Datei stellt fest, wo etwas steht und wo nicht. Was das bedeutet,
   * entscheidet der Verfasser.
   */
  const eigenText = [entry.description, asText(entry.fields.personality), asText(entry.fields.goals)]
    .filter(Boolean)
    .join(' ');
  const meine = new Set(woerter(eigenText));
  const anderswo = new Set<string>();
  for (const r of kanten) {
    const a = byId.get(r.otherId);
    if (!a) continue;
    for (const w of woerter(`${a.description} ${a.title}`)) anderswo.add(w);
  }
  const nurBehauptet = [...meine].filter((w) => !anderswo.has(w)).slice(0, 4);
  if (nurBehauptet.length >= 2 && kanten.length >= 4) {
    abschnitte.push({
      id: 'spannung',
      titel: 'Was noch nur auf seiner Seite steht',
      stand: 'vermutung',
      herkunft: 'Wörter aus seinem Steckbrief, die in den verbundenen Seiten nicht vorkommen.',
      punkte: [
        {
          text: `„${nurBehauptet.join('", „')}" – das steht bislang nur bei ihm selbst. Vielleicht fehlt die Stelle, an der es sich zeigt. Vielleicht ist es auch das, was er über sich glaubt.`,
          belege: [{ entryId: entry.id, warum: 'Sein eigener Eintrag' }],
        },
      ],
    });
  }

  /* ------------------------------------------------------ 6 Offene Fragen */

  const fragen: Punkt[] = [];
  if (!entry.beginn?.trim() && ereignisse.length >= 2) {
    fragen.push({
      text: 'Seine Ereignisse tragen Daten, er selbst nicht. Seit wann gibt es ihn?',
      belege: [{ entryId: entry.id, warum: 'Ohne Zeitangabe' }],
    });
  }
  if (praegend.length >= 1 && !asText(entry.fields.fears).trim()) {
    fragen.push({
      text: `Er steht oft neben ${byId.get(praegend[0][0])?.title}. Wovor hätte er Angst, wenn das aufhörte?`,
      belege: [{ entryId: praegend[0][0], warum: byId.get(praegend[0][0])?.title ?? '' }],
    });
  }
  if (asList(entry.fields.habits).length === 0 && kanten.length >= 5) {
    fragen.push({
      text: 'Über ihn ist viel entstanden, aber nichts Alltägliches. Was tut er jeden Tag?',
      belege: [{ entryId: entry.id, warum: 'Keine Gewohnheiten eingetragen' }],
    });
  }
  if (fragen.length) {
    abschnitte.push({
      id: 'fragen',
      titel: 'Offene Fragen',
      stand: 'vorschlag',
      herkunft: 'Fragen an dich – keine mit hinterlegter Antwort.',
      punkte: fragen,
    });
  }

  return {
    entry,
    abschnitte,
    /* Der Steckbrief allein ist kein Spiegel – dafür braucht es die Welt. */
    tragfaehig: abschnitte.some((a) => a.stand !== 'kanon'),
  };
}
