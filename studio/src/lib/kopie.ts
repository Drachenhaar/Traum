/**
 * Ein Buch abschreiben.
 *
 * Die ganze Umschrift steht hier als reine Funktion – ohne Datenbank, ohne
 * Speicher, ohne Oberfläche. Das ist der einzige Grund, warum sie prüfbar ist:
 * Man gibt ihr ein Buch und sieht nach, ob in der Abschrift noch irgendwo eine
 * Kennung des Originals steht.
 *
 * ---
 *
 * **Was hier schiefging, und warum es niemandem auffiel.**
 *
 * Die Bildmetadaten wurden mit *derselben Kennung* und einer neuen `bookId`
 * gespeichert. `images.id` ist der Primärschlüssel – ein `put` darauf ist kein
 * Anlegen, sondern ein Überschreiben. Die Abschrift bekam also keine eigenen
 * Bilder; sie **nahm dem Original seine weg**. Buch A stand danach ohne
 * Tafeln da, und die einzige Spur war, dass sie in Buch B auftauchten.
 *
 * Sichtbar wurde es nicht sofort, weil im Speicher beide Bücher noch ihre
 * Listen hatten. Erst wer das Original neu aufschlug, sah die Lücke – und
 * wusste dann nicht mehr, woher sie kam.
 *
 * Dazu kam ein zweiter Schaden aus demselben Fehler: Beim Löschen eines
 * Buches prüft der Code, ob noch ein anderer Datensatz auf eine Datei zeigt,
 * bevor er sie wegwirft. Diese Prüfung war richtig gedacht und konnte nie
 * greifen, weil es nach einer Abschrift eben *nicht* zwei Datensätze gab,
 * sondern einen. Das Löschen des einen Buches nahm der Abschrift die Bilder
 * mit.
 *
 * ---
 *
 * **Die Lösung, so klein wie möglich.**
 *
 * Ein Feld: `blobId`. Der Datensatz beschreibt, *dass ein Buch dieses Bild
 * zeigt*; die Datei liegt unter `blobId`. Fehlt das Feld, ist es die eigene
 * Kennung – deshalb braucht kein einziger Bestandsdatensatz angefasst zu
 * werden, und es gibt keine Wanderung.
 *
 *   Buch A ─ Bilddatensatz A1 ─┐
 *                              ├── Datei X
 *   Buch B ─ Bilddatensatz B1 ─┘
 *
 * Zwei Datensätze, eine Datei. Ein Artbook zu verdoppeln kostet weiter ein
 * paar Kilobyte statt ein paar hundert Megabyte – und die Prüfung beim
 * Löschen funktioniert endlich, weil es jetzt wirklich zwei Datensätze sind.
 */

import type {
  CanvasBoard,
  Entry,
  LibraryBook,
  Relation,
  StoredImageMeta,
  StoredKlang,
} from '../types';
import { newId } from './utils';
import { templateFor } from './templates';

export interface Bestand {
  entries: Entry[];
  relations: Relation[];
  images: StoredImageMeta[];
  boards: CanvasBoard[];
  klaenge: StoredKlang[];
}

/**
 * Die Referenzkarte.
 *
 * Für jede Art von Kennung eine eigene Zuordnung. Sie in einer einzigen Karte
 * zusammenzuwerfen wäre bequem und falsch: Eintragskennungen und
 * Bildkennungen leben in verschiedenen Tabellen, und eine gemeinsame Karte
 * würde eine Kollision zwischen ihnen stillschweigend auflösen.
 */
export interface Umschrift {
  entries: Map<string, string>;
  images: Map<string, string>;
  boards: Map<string, string>;
  klaenge: Map<string, string>;
}

/** Ein Wert wird nur ersetzt, wenn er wirklich zur Kopie gehört. */
function um(karte: Map<string, string>, wert: string | undefined): string | undefined {
  if (!wert) return wert;
  return karte.get(wert) ?? wert;
}

/**
 * Eine Liste umschreiben – und Verweise, die ins Leere zeigen, fallen lassen.
 *
 * Ein Verweis auf eine Seite, die nicht mitkopiert wurde (etwa aus einem
 * beschädigten Bestand), gehört nicht in die Abschrift: Er zeigte sonst
 * weiter ins Originalbuch, und genau das soll es nicht geben.
 */
function umListe(karte: Map<string, string>, werte: string[] | undefined): string[] | undefined {
  if (!werte) return werte;
  return werte.map((w) => karte.get(w)).filter((w): w is string => !!w);
}

/**
 * Die Bestandsaufnahme: welche alte Kennung wird welche neue?
 *
 * Getrennt vom Umschreiben, damit beim Umschreiben schon *alle* neuen
 * Kennungen feststehen. Eine Beziehung kann auf eine Seite zeigen, die in der
 * Liste später kommt – wer beides in einem Durchgang macht, verliert sie.
 */
export function umschriftFuer(bestand: Bestand): Umschrift {
  return {
    entries: new Map(bestand.entries.map((e) => [e.id, newId('e')])),
    images: new Map(bestand.images.map((m) => [m.id, newId('img')])),
    boards: new Map(bestand.boards.map((b) => [b.id, newId('board')])),
    klaenge: new Map(bestand.klaenge.map((k) => [k.id, newId('klang')])),
  };
}

/**
 * Einen Eintrag abschreiben.
 *
 * Die längste Funktion dieser Datei, und jede Zeile darin steht für einen Ort,
 * an dem eine Kennung stecken kann. Sie einzeln aufzuzählen ist unschön und
 * die einzige ehrliche Möglichkeit: Es gibt keine allgemeine Regel, die einer
 * Zeichenkette ansieht, ob sie ein Verweis ist.
 */
function schreibeEintrag(e: Entry, u: Umschrift, bookId: string): Entry {
  const tpl = templateFor(e.type);
  const felder: Entry['fields'] = {};
  for (const [key, wert] of Object.entries(e.fields ?? {})) {
    const def = tpl.fields.find((f) => f.key === key);
    if (Array.isArray(wert) && def?.kind === 'entries') {
      felder[key] = umListe(u.entries, wert) ?? [];
    } else if (Array.isArray(wert) && def?.kind === 'images') {
      felder[key] = umListe(u.images, wert) ?? [];
    } else {
      felder[key] = wert;
    }
  }

  return {
    ...e,
    id: u.entries.get(e.id)!,
    bookId,
    coverImage: um(u.images, e.coverImage),
    linkedEntryIds: umListe(u.entries, e.linkedEntryIds) ?? [],
    atmosphaere: e.atmosphaere
      ? { ...e.atmosphaere, klangId: um(u.klaenge, e.atmosphaere.klangId) ?? e.atmosphaere.klangId }
      : undefined,
    blocks: (e.blocks ?? []).map((b) => ({
      ...b,
      /* Die Blockkennung ist buchintern und wird nirgends von aussen benutzt –
       * sie darf trotzdem neu sein, damit zwei Buecher keine gemeinsame
       * Kennung tragen, an der jemand spaeter etwas festmacht. */
      id: newId('blk'),
      data: {
        ...b.data,
        imageIds: umListe(u.images, b.data.imageIds),
        entryIds: umListe(u.entries, b.data.entryIds),
        tiles: b.data.tiles?.map((t) => ({ ...t, imageId: um(u.images, t.imageId) })),
        cards: b.data.cards?.map((c) => ({ ...c, imageId: um(u.images, c.imageId) })),
      },
    })),
  };
}

/**
 * Der ganze Bestand eines Buches, abgeschrieben.
 *
 * Gibt zurück, was gespeichert werden muss – und schreibt selbst nichts. Wer
 * hier eine Datenbank sucht, findet keine.
 */
export function schreibeAb(
  bestand: Bestand,
  bookId: string,
  u: Umschrift = umschriftFuer(bestand),
): Bestand {
  return {
    entries: bestand.entries.map((e) => schreibeEintrag(e, u, bookId)),

    relations: bestand.relations
      /* Eine Kante, deren Enden nicht beide mitkopiert werden, gibt es nicht. */
      .filter((r) => u.entries.has(r.fromId) && u.entries.has(r.toId))
      .map((r) => ({
        ...r,
        id: newId('rel'),
        bookId,
        fromId: u.entries.get(r.fromId)!,
        toId: u.entries.get(r.toId)!,
      })),

    /*
     * Neue Kennung, geteilte Datei.
     *
     * Hier stand einmal nur `{ ...m, bookId }` – dieselbe Kennung, andere
     * Buchzugehoerigkeit. Beim Speichern ueberschrieb das den Datensatz des
     * Originals, und Buch A verlor seine Tafeln an Buch B.
     */
    images: bestand.images.map((m) => ({
      ...m,
      id: u.images.get(m.id)!,
      bookId,
      blobId: m.blobId ?? m.id,
    })),

    boards: bestand.boards.map((b) => ({
      ...b,
      id: u.boards.get(b.id)!,
      bookId,
      items: (b.items ?? []).map((i) => ({
        ...i,
        id: newId('ci'),
        /*
         * `refId` bedeutet je nach Art etwas anderes – bei einem Bild eine
         * Bildkennung, bei einem Eintrag eine Eintragskennung. Ohne diese
         * Unterscheidung zeigte die abgeschriebene Flaeche weiter auf die
         * Seiten des Originalbuchs, und wer das Original loeschte, hatte eine
         * Flaeche voller leerer Kaesten.
         */
        refId:
          i.kind === 'image'
            ? um(u.images, i.refId)
            : i.kind === 'entry'
              ? um(u.entries, i.refId)
              : i.refId,
      })),
    })),

    klaenge: bestand.klaenge.map((k) => ({ ...k, id: u.klaenge.get(k.id)!, bookId })),
  };
}

/**
 * Was von den Buchdaten selbst nicht mitkopiert werden darf.
 *
 * Ein Buch trägt Kennungen seiner eigenen Seiten – zuletzt gelesene, wie oft
 * gelesen, welche Entdeckungen als Absicht gelten, was Dragoncore schon
 * gesagt hat. Übernimmt man sie wörtlich, zeigt die Abschrift auf die Seiten
 * des Originals: eine Verlaufsliste, die beim Antippen ins andere Buch führt.
 *
 * Umzuschreiben wäre möglich und wäre falsch. Eine Abschrift ist nicht dasselbe
 * Buch mit derselben Lesegeschichte – sie ist ein neues Exemplar. Ein frisch
 * gebundenes Buch hat kein Lesebändchen.
 */
export function frischeBuchdaten(u: Umschrift, quelle: LibraryBook): Partial<LibraryBook> {
  return {
    lastSpreadKey: undefined,
    recentIds: [],
    visits: undefined,
    /*
     * Die Entdeckungen tragen Kennungen in ihren eigenen Bezeichnern
     * („offene-enden:e_abc"). Sie umzuschreiben hiesse, ein Textformat zu
     * zerlegen, das nur zufaellig so aussieht. Eine Abschrift faengt hier
     * ohne Vorgeschichte an – das ist ehrlicher und kostet nichts.
     */
    entdeckungenAbsicht: [],
    anerbieten: [],
    /* Das Zeichen und alles Gestaltete bleibt – es ist dasselbe Buch. */
    emblemImageId: um(u.images, quelle.emblemImageId),
  };
}
