/**
 * Import und Export.
 *
 * Formate:
 *  - Buchsicherung     → ein Band mit allem, was zu ihm gehört
 *  - Bibliothekssicherung → alle Bände und die Geräteeinstellungen
 *  - Einzeleintrag     → JSON mit einem Eintrag und seinen Bildern
 *  - Druckansicht      → in sich geschlossene HTML-Datei mit eingebetteten Bildern
 *
 * Buch- und Bibliothekssicherung sind dieselbe Datei in zwei Größen: Beide
 * tragen ein Feld `books`, einmal mit einem Band darin, einmal mit allen.
 * Zwei Formate wären zwei Importwege, und der zweite wäre der schlechter
 * geprüfte.
 *
 * Eine Datei *ohne* `books` stammt aus der Zeit, in der ein Dragoncore ein
 * Buch war. Sie kommt als neuer Band in die Bibliothek – niemals als Ersatz
 * für sie.
 *
 * Der Import prüft die Datei gegen ein Zod-Schema und meldet klar, was fehlt.
 */

import { db, FRESH_SETTINGS } from '../db/db';
import { blobToDataUrl } from './images';
import { backupSchema, singleEntrySchema, type BackupFile } from './schemas';
import { buchAusAltenEinstellungen } from './bibliothek';
import type {
  CanvasBoard,
  Entry,
  LibraryBook,
  Relation,
  Settings,
  StoredImageMeta,
} from '../types';
import { escapeHtml, fileStamp, newId } from './utils';
import { blockDef, blockImageIds } from './blocks';
import { asBool, asList, asText, templateFor, templatesByFamily } from './templates';
import { relationsOf, type RelationIndex } from './relations';

export const EXPORT_VERSION = 1;

/* ------------------------------------------------------------------ Export */

interface ImageExport extends StoredImageMeta {
  dataUrl?: string;
}

/** Bild-Metadaten (plus optional die Bilddaten) für den Export einsammeln. */
async function packImages(metas: StoredImageMeta[], withData: boolean): Promise<ImageExport[]> {
  if (!withData) return metas.map((m) => ({ ...m }));
  const out: ImageExport[] = [];
  for (const meta of metas) {
    const record = await db.imageBlobs.get(meta.id);
    out.push({ ...meta, dataUrl: record ? await blobToDataUrl(record.full) : undefined });
  }
  return out;
}

/** Ein Objekt ohne die genannten Schluessel – ohne das Original anzufassen. */
function auslassen<T extends object, K extends keyof T>(wert: T, schluessel: K[]): Omit<T, K> {
  const kopie = { ...wert };
  for (const k of schluessel) delete kopie[k];
  return kopie;
}

/**
 * Die ganze Bibliothek – alle Bände, alle Seiten, die Geräteeinstellungen.
 *
 * Die einzige Sicherung, aus der sich ein Gerät vollständig wiederherstellen
 * lässt. Wer nur einen Band weitergeben will, nimmt `buildBookBackup`.
 */
export async function buildFullBackup(withImages: boolean): Promise<string> {
  const [entries, relations, boards, images, settings, books] = await Promise.all([
    db.entries.toArray(),
    db.relations.toArray(),
    db.boards.toArray(),
    db.images.toArray(),
    db.settings.get('settings'),
    db.books.toArray(),
  ]);
  const payload = {
    app: 'dragoncore-studio' as const,
    kind: 'library' as const,
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    books,
    entries,
    relations,
    boards,
    images: await packImages(images, withImages),
    /*
     * Alles ausser dem Schluessel der Zeile.
     *
     * Vorher stand hier eine Liste der mitzunehmenden Felder – und wer ein
     * neues Feld hinzufuegte, ohne daran zu denken, verlor es bei jeder
     * Sicherung. Lautlos: kein Fehler, keine Meldung, erst beim
     * Zurueckspielen war es fort.
     *
     * Eine Sperrliste ist hier sicherer als eine Erlaubnisliste. Vergisst man
     * sie zu pflegen, wird zu viel gesichert statt zu wenig – und das ist der
     * harmlosere Fehler.
     */
    settings: settings ? auslassen(settings, ['id']) : undefined,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Ein einzelnes Buch sichern.
 *
 * Nur die Daten dieses Bandes – nicht die Bibliothek, nicht die anderen
 * Bücher, nicht die Geräteeinstellungen. So lässt sich ein Buch weitergeben,
 * ohne alles andere mitzugeben, und auf einem anderen Gerät neben die dort
 * vorhandenen stellen.
 */
export async function buildBookBackup(bookId: string, withImages: boolean): Promise<string> {
  const [buch, entries, relations, boards, images] = await Promise.all([
    db.books.get(bookId),
    db.entries.where('bookId').equals(bookId).toArray(),
    db.relations.where('bookId').equals(bookId).toArray(),
    db.boards.where('bookId').equals(bookId).toArray(),
    db.images.where('bookId').equals(bookId).toArray(),
  ]);
  if (!buch) throw new Error('Dieses Buch steht nicht in der Bibliothek.');

  const payload = {
    app: 'dragoncore-studio' as const,
    kind: 'book' as const,
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    books: [buch],
    entries,
    relations,
    boards,
    images: await packImages(images, withImages),
    /*
     * Keine Einstellungen. Was diesem Buch gehoert, steht im Band selbst;
     * was dem Geraet gehoert – Navigation, Erinnerung ans Sichern –, geht
     * niemanden etwas an, der nur ein Buch bekommt.
     */
  };
  return JSON.stringify(payload, null, 2);
}

/** Alle Bild-IDs, die zu einem Eintrag gehören (Cover, Felder, Blöcke). */
export function collectEntryImages(entry: Entry): string[] {
  const ids = new Set<string>();
  if (entry.coverImage) ids.add(entry.coverImage);
  for (const value of Object.values(entry.fields)) {
    if (Array.isArray(value)) value.forEach((v) => v.startsWith('img_') && ids.add(v));
  }
  entry.blocks.forEach((b) => blockImageIds(b).forEach((id) => ids.add(id)));
  return [...ids];
}

export async function buildEntryExport(entry: Entry, withImages = true): Promise<string> {
  const wanted = new Set(collectEntryImages(entry));
  const metas = (await db.images.toArray()).filter((m) => wanted.has(m.id));
  // Die Beziehungen des Eintrags gehören dazu – ohne sie wäre er aus der Welt
  // herausgeschnitten statt exportiert.
  const relations = (await db.relations.toArray()).filter(
    (r) => r.fromId === entry.id || r.toId === entry.id,
  );
  const payload = {
    app: 'dragoncore-studio' as const,
    kind: 'entry' as const,
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    entry,
    relations,
    images: await packImages(metas, withImages),
  };
  return JSON.stringify(payload, null, 2);
}

export function backupFileName(prefix = 'dragoncore-studio'): string {
  return `${prefix}_${fileStamp()}.json`;
}

/* ------------------------------------------------------------------ Import */

export interface ImportResult {
  ok: boolean;
  message: string;
  entries: number;
  images: number;
  /** Welcher Band beim Einlesen entstanden ist – falls einer entstand. */
  buchId?: string;
}

/**
 * Sicherung einlesen.
 *
 * Drei Wege, und der Auftrag verlangt jeden einzelnen:
 *
 *   **`bibliothek`** – nur für eine Bibliothekssicherung. Sie ersetzt das
 *   ganze Gerät: alle Bände, alle Seiten, alle Einstellungen. Das ist
 *   Wiederherstellung nach einem Verlust, sonst nichts.
 *
 *   **`buch`** – die Datei kommt als *neuer Band* in die vorhandene
 *   Bibliothek. Alles darin bekommt dessen Kennung. Nichts, was schon da ist,
 *   wird angefasst. Das ist der Weg für eine Buchsicherung, für ein fremdes
 *   Buch – und für jede alte Sicherung aus der Zeit, in der ein Dragoncore
 *   ein Buch war (§21).
 *
 *   **`merge`** – die Inhalte kommen in das gerade offene Buch. Für einzelne
 *   Seiten, die jemand weitergegeben hat.
 *
 * `aktivesBuch` ist nur für `merge` nötig; ohne offenes Buch lässt sich
 * nirgends hineinlegen.
 */
export async function importBackup(
  text: string,
  mode: 'bibliothek' | 'buch' | 'merge',
  aktivesBuch?: string,
): Promise<ImportResult> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, message: 'Die Datei ist kein gültiges JSON.', entries: 0, images: 0 };
  }

  // Einzeleintrag oder Vollsicherung?
  const single = singleEntrySchema.safeParse(raw);
  const parsed = single.success
    ? ({
        app: 'dragoncore-studio',
        version: single.data.version,
        exportedAt: single.data.exportedAt,
        entries: [single.data.entry],
        relations: single.data.relations,
        boards: [],
        images: single.data.images,
      } as BackupFile)
    : null;

  let data: BackupFile;
  if (parsed) {
    data = parsed;
    mode = 'merge'; // Ein einzelner Eintrag ersetzt nie das ganze Archiv.
  } else {
    const result = backupSchema.safeParse(raw);
    if (!result.success) {
      const issue = result.error.issues[0];
      const where = issue?.path.join('.') || 'Datei';
      return {
        ok: false,
        message: `Die Datei passt nicht zum erwarteten Format (${where}: ${issue?.message ?? 'unbekannt'}).`,
        entries: 0,
        images: 0,
      };
    }
    data = result.data;
  }

  const buecher = (data.books ?? []) as unknown as LibraryBook[];
  let entries = data.entries as unknown as Entry[];
  let relations = (data.relations ?? []) as unknown as Relation[];
  let boards = (data.boards ?? []) as unknown as CanvasBoard[];
  const images = data.images as unknown as (StoredImageMeta & { dataUrl?: string })[];

  /*
   * Eine Bibliothekssicherung braucht mehr als einen Band. Wer eine
   * Buchsicherung mit „ganze Bibliothek ersetzen" einliest, hat sich
   * vergriffen – und wuerde alles andere verlieren.
   */
  if (mode === 'bibliothek' && buecher.length === 0) {
    return {
      ok: false,
      message:
        'Diese Datei enthält keine Bibliothek, sondern ein einzelnes Buch. Lies sie als neues Buch ein – dann bleibt alles andere stehen.',
      entries: 0,
      images: 0,
    };
  }

  /*
   * Wohin gehört das alles?
   *
   * Beim Einlesen als Buch entsteht *ein* Band, und alles bekommt dessen
   * Kennung – auch dann, wenn die Datei schon Kennungen mitbringt. Sonst
   * hinge der Inhalt am Band eines fremden Geräts, den es hier nicht gibt.
   */
  let neuerBand: LibraryBook | undefined;
  if (mode === 'buch') {
    neuerBand = buecher[0]
      ? { ...buecher[0], lastOpenedAt: Date.now(), archived: false }
      : buchAusAltenEinstellungen((data.settings ?? {}) as Record<string, unknown>);

    /* Ein Band mit dieser Kennung kann hier schon stehen – dann ein neuer. */
    if (await db.books.get(neuerBand.id)) {
      neuerBand = { ...neuerBand, id: `buch_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}` };
    }
    const bookId = neuerBand.id;

    /*
     * Neue Kennungen, wenn eine schon vergeben ist.
     *
     * Ohne das ist „als neues Buch einlesen" kein Hinzufügen, sondern ein
     * Umzug: Eine Seite mit bekannter Kennung würde überschrieben und trüge
     * danach die Kennung des neuen Bandes – sie wäre aus dem alten Buch
     * *verschwunden*. Wer seine eigene Buchsicherung ein zweites Mal
     * einliest, um sie danebenzulegen, hätte damit das Original geleert.
     *
     * Kollidiert auch nur eine, werden alle umgeschrieben. Halb umbenannt
     * hiesse: Beziehungen zwischen alten und neuen Kennungen, also eine
     * Abschrift, die still an der Vorlage hängt.
     */
    const vorhanden = new Set(await db.entries.toCollection().primaryKeys());
    if (entries.some((e) => vorhanden.has(e.id))) {
      const neu = new Map(entries.map((e) => [e.id, newId('e')]));
      const um = (alt: string) => neu.get(alt) ?? alt;
      entries = entries.map((e) => ({
        ...e,
        id: um(e.id),
        linkedEntryIds: (e.linkedEntryIds ?? []).map(um),
      }));
      relations = relations.map((r) => ({
        ...r,
        id: newId('rel'),
        fromId: um(r.fromId),
        toId: um(r.toId),
      }));
      boards = boards.map((b) => ({
        ...b,
        id: newId('board'),
        items: (b.items ?? []).map((i) =>
          i.kind === 'entry' && i.refId ? { ...i, refId: um(i.refId) } : i,
        ),
      }));
    }

    entries = entries.map((e) => ({ ...e, bookId }));
    relations = relations.map((r) => ({ ...r, bookId }));
    boards = boards.map((b) => ({ ...b, bookId }));
    images.forEach((m) => {
      m.bookId = bookId;
    });
  } else if (mode === 'merge' && aktivesBuch) {
    entries = entries.map((e) => ({ ...e, bookId: aktivesBuch }));
    relations = relations.map((r) => ({ ...r, bookId: aktivesBuch }));
    boards = boards.map((b) => ({ ...b, bookId: aktivesBuch }));
    images.forEach((m) => {
      m.bookId = aktivesBuch;
    });
  }

  // Beziehungen, deren Gegenstück fehlt, würden im Graphen ins Leere zeigen.
  const knownIds = new Set(entries.map((e) => e.id));
  if (mode === 'merge') {
    (await db.entries.toArray()).forEach((e) => knownIds.add(e.id));
  }
  const usableRelations = relations.filter((r) => knownIds.has(r.fromId) && knownIds.has(r.toId));
  const droppedRelations = relations.length - usableRelations.length;

  try {
    await db.transaction(
      'rw',
      [db.entries, db.relations, db.boards, db.images, db.imageBlobs, db.settings, db.books],
      async () => {
      if (mode === 'bibliothek') {
        await Promise.all([
          db.entries.clear(),
          db.relations.clear(),
          db.boards.clear(),
          db.images.clear(),
          db.imageBlobs.clear(),
          db.books.clear(),
        ]);
      }
      if (buecher.length && mode !== 'merge') {
        /* Beim Buchimport nur der eine, umgeschriebene Band. */
        await db.books.bulkPut(mode === 'buch' ? [neuerBand!] : buecher);
      } else if (neuerBand) {
        await db.books.put(neuerBand);
      }

      await db.entries.bulkPut(entries);
      if (usableRelations.length) await db.relations.bulkPut(usableRelations);
      if (boards.length) await db.boards.bulkPut(boards);

      for (const img of images) {
        const { dataUrl, ...meta } = img;
        await db.images.put(meta);
        if (dataUrl) {
          const blob = await dataUrlToBlob(dataUrl);
          // Für den Import genügt dasselbe Bild als Vorschau – es wird beim
          // nächsten Anzeigen ohnehin verkleinert dargestellt.
          await db.imageBlobs.put({ id: meta.id, full: blob, thumb: blob });
        }
      }

      /*
       * Einstellungen zurueckholen – aber nur beim Wiederherstellen der
       * ganzen Bibliothek.
       *
       * Was einem Buch gehoert, steht seit der Bibliothek im Band selbst und
       * kommt mit ihm. Was hier noch zurueckkommt, ist das Geraet: die
       * Navigation, die Erinnerung ans Sichern, das zuletzt offene Buch.
       *
       * Beim *Zusammenfuehren* und beim *Buchimport* bleibt es dabei, dass
       * nichts angefasst wird: Wer fremde Seiten in sein Buch legt oder ein
       * Buch ins Regal stellt, will nicht sein Geraet umbauen.
       */
      if (mode === 'bibliothek' && data.settings) {
        const current = await db.settings.get('settings');
        const uebernommen = { ...(data.settings as Partial<Settings>) };
        /* Zeigt die Sicherung auf ein Buch, das nicht mitkam, lieber keines. */
        if (uebernommen.activeBookId && !buecher.some((b) => b.id === uebernommen.activeBookId)) {
          delete uebernommen.activeBookId;
        }
        await db.settings.put({
          ...(current ?? FRESH_SETTINGS),
          ...uebernommen,
          id: 'settings',
        } as Settings);
      }
      },
    );
  } catch (err) {
    return {
      ok: false,
      message: `Import fehlgeschlagen: ${(err as Error).message}`,
      entries: 0,
      images: 0,
    };
  }

  const imagesWithData = images.filter((i) => i.dataUrl).length;
  const parts = [
    `${entries.length} Einträge`,
    `${usableRelations.length} Verbindungen`,
    `${images.length} Bilder`,
  ];
  let message = `${parts.join(', ')} übernommen`;
  if (images.length && !imagesWithData) {
    message += ' – die Datei enthielt keine Bilddaten, nur die Angaben dazu';
  }
  if (droppedRelations > 0) {
    message += `; ${droppedRelations} Verbindungen ohne Gegenstück wurden ausgelassen`;
  }
  if (neuerBand) message += ` – als „${neuerBand.title}“ in deine Bibliothek gestellt`;
  else if (mode === 'bibliothek') message += ` – ${buecher.length} Bände wiederhergestellt`;
  return {
    ok: true,
    message: `${message}.`,
    entries: entries.length,
    images: images.length,
    buchId: neuerBand?.id,
  };
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/* --------------------------------------------------- Druckfreundliches HTML */

/** Eintrag als eigenständige HTML-Seite – Bilder sind eingebettet. */
export async function renderEntryHtml(entry: Entry): Promise<string> {
  const imageIds = collectEntryImages(entry);
  const srcById = new Map<string, string>();
  for (const id of imageIds) {
    const record = await db.imageBlobs.get(id);
    if (record) srcById.set(id, await blobToDataUrl(record.full));
  }

  const img = (id: string | undefined, caption = '') => {
    if (!id) return '';
    const src = srcById.get(id);
    if (!src) return '';
    return `<figure><img src="${src}" alt="${escapeHtml(caption)}" />${
      caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''
    }</figure>`;
  };

  const tpl = templateFor(entry.type);

  const fieldsHtml = tpl.fields
    .map((def) => {
      const value = entry.fields[def.key];
      if (def.kind === 'boolean') {
        return `<div class="field"><dt>${escapeHtml(def.label)}</dt><dd>${asBool(value) ? 'ja' : 'nein'}</dd></div>`;
      }
      if (def.kind === 'images') {
        const ids = asList(value);
        if (!ids.length) return '';
        return `<div class="field wide"><dt>${escapeHtml(def.label)}</dt><dd class="gallery">${ids
          .map((id) => img(id))
          .join('')}</dd></div>`;
      }
      if (def.kind === 'entries') {
        const ids = asList(value);
        if (!ids.length) return '';
        return `<div class="field"><dt>${escapeHtml(def.label)}</dt><dd>${ids.length} verknüpfte Einträge</dd></div>`;
      }
      if (def.kind === 'palette') {
        const swatches = asList(value);
        if (!swatches.length) return '';
        return `<div class="field wide"><dt>${escapeHtml(def.label)}</dt><dd class="swatches">${swatches
          .map((raw) => {
            const [color, ...rest] = raw.split('|');
            return `<span class="swatch"><i style="background:${escapeHtml(color)}"></i>${escapeHtml(
              rest.join('|') || color,
            )}</span>`;
          })
          .join('')}</dd></div>`;
      }
      if (def.kind === 'tags') {
        const tags = asList(value);
        if (!tags.length) return '';
        return `<div class="field"><dt>${escapeHtml(def.label)}</dt><dd>${tags.map(escapeHtml).join(', ')}</dd></div>`;
      }
      const text = asText(value);
      if (!text) return '';
      return `<div class="field"><dt>${escapeHtml(def.label)}</dt><dd>${escapeHtml(text).replace(
        /\n/g,
        '<br />',
      )}</dd></div>`;
    })
    .join('');

  const blocksHtml = entry.blocks
    .map((block) => {
      const d = block.data;
      switch (block.type) {
        case 'heading': {
          const level = d.level ?? 2;
          return `<h${level + 1}>${escapeHtml(d.text ?? '')}</h${level + 1}>`;
        }
        case 'text':
          return `<p>${escapeHtml(d.text ?? '').replace(/\n/g, '<br />')}</p>`;
        case 'quote':
          return `<blockquote>${escapeHtml(d.text ?? '')}${
            d.source ? `<cite>${escapeHtml(d.source)}</cite>` : ''
          }</blockquote>`;
        case 'note':
          return `<aside class="note">${escapeHtml(d.text ?? '').replace(/\n/g, '<br />')}</aside>`;
        case 'image':
          return img(d.imageId, d.caption ?? '');
        case 'gallery':
          return `<div class="gallery">${(d.imageIds ?? []).map((id) => img(id)).join('')}</div>`;
        case 'moodboard':
          return `<div class="gallery">${(d.tiles ?? [])
            .map((t) => img(t.imageId, t.caption))
            .join('')}</div>`;
        case 'palette':
          return `<div class="swatches">${(d.swatches ?? [])
            .map(
              (s) =>
                `<span class="swatch"><i style="background:${escapeHtml(s.color)}"></i>${escapeHtml(
                  s.name || s.color,
                )}</span>`,
            )
            .join('')}</div>`;
        case 'materials':
          return `<ul class="materials">${(d.materials ?? [])
            .map(
              (m) =>
                `<li><i style="background:${escapeHtml(m.color)}"></i><b>${escapeHtml(
                  m.name,
                )}</b> ${escapeHtml([m.finish, m.note].filter(Boolean).join(' · '))}</li>`,
            )
            .join('')}</ul>`;
        case 'references':
          return `<ul class="refs">${(d.cards ?? [])
            .map(
              (c) =>
                `<li>${img(c.imageId)}<div><b>${escapeHtml(c.title)}</b><br />${escapeHtml(
                  c.note,
                )}<br /><small>${escapeHtml(c.source)}</small></div></li>`,
            )
            .join('')}</ul>`;
        case 'checklist':
          return `<ul class="checklist">${(d.items ?? [])
            .map((i) => `<li class="${i.done ? 'done' : ''}">${i.done ? '☑' : '☐'} ${escapeHtml(i.text)}</li>`)
            .join('')}</ul>`;
        case 'prompt':
          return `<div class="prompt"><b>Prompt${
            d.model ? ` (${escapeHtml(d.model)})` : ''
          }</b><pre>${escapeHtml(d.prompt ?? '')}</pre>${
            d.negativePrompt ? `<b>Negativ</b><pre>${escapeHtml(d.negativePrompt)}</pre>` : ''
          }</div>`;
        case 'assetList':
          return `<p class="muted">${escapeHtml(d.title || blockDef('assetList').label)}: ${
            d.entryIds?.length ?? 0
          } Einträge</p>`;
        case 'divider':
          return '<hr />';
        case 'spacer':
          return `<div style="height:${d.size === 'lg' ? 64 : d.size === 'sm' ? 16 : 32}px"></div>`;
        default:
          return '';
      }
    })
    .join('\n');

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(entry.title)} – Dragoncore Studio</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 40px 24px 64px;
    background: #F7F2E8; color: #3B2E23;
    font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .sheet { max-width: 780px; margin: 0 auto; }
  h1 { font-family: Georgia, "Times New Roman", serif; font-size: 2.2rem; margin: 0 0 4px; }
  h2, h3, h4 { font-family: Georgia, serif; margin: 32px 0 8px; }
  .sub { color: #7C6A57; margin: 0 0 4px; font-size: 1.05rem; }
  .meta { color: #A4907A; font-size: .85rem; margin-bottom: 28px; }
  .tags span { display:inline-block; border:1px solid #E5DCCA; border-radius:999px; padding:2px 10px; margin:0 6px 6px 0; font-size:.8rem; color:#7C6A57; }
  hr { border: 0; border-top: 1px solid #E5DCCA; margin: 28px 0; }
  figure { margin: 20px 0; }
  img { max-width: 100%; height: auto; border-radius: 10px; border: 1px solid #E5DCCA; display:block; }
  figcaption { color: #7C6A57; font-size: .85rem; margin-top: 6px; }
  .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
  .gallery figure { margin: 0; }
  blockquote { border-left: 3px solid #A8853F; margin: 20px 0; padding: 4px 0 4px 16px; font-family: Georgia, serif; font-style: italic; font-size: 1.15rem; }
  blockquote cite { display:block; font-size:.85rem; font-style: normal; color:#7C6A57; margin-top:6px; }
  aside.note { background: #fff; border: 1px solid #E5DCCA; border-left: 3px solid #A8853F; border-radius: 8px; padding: 12px 14px; margin: 18px 0; }
  .swatches { display:flex; flex-wrap: wrap; gap: 10px; margin: 12px 0; }
  .swatch { display:flex; align-items:center; gap:8px; border:1px solid #E5DCCA; border-radius:8px; padding:6px 10px; background:#fff; font-size:.85rem; }
  .swatch i { width:20px; height:20px; border-radius:5px; display:block; border:1px solid rgba(0,0,0,.1); }
  ul.materials, ul.refs, ul.checklist { list-style:none; padding:0; margin: 12px 0; }
  ul.materials li { display:flex; align-items:center; gap:10px; padding:6px 0; border-bottom:1px solid #E5DCCA; }
  ul.materials i { width:22px; height:22px; border-radius:6px; display:block; }
  ul.refs li { display:flex; gap:12px; padding:10px 0; border-bottom:1px solid #E5DCCA; }
  ul.refs img { width:120px; }
  ul.checklist li { padding: 3px 0; }
  ul.checklist li.done { color:#A4907A; text-decoration: line-through; }
  .prompt { background:#fff; border:1px solid #E5DCCA; border-radius:10px; padding:12px 14px; margin:18px 0; }
  .prompt pre { white-space: pre-wrap; font-size:.85rem; margin: 6px 0 12px; }
  dl.fields { display:grid; grid-template-columns: repeat(auto-fit, minmax(240px,1fr)); gap:0 24px; margin: 0 0 24px; }
  .field { padding: 10px 0; border-bottom: 1px solid #E5DCCA; }
  .field.wide { grid-column: 1 / -1; }
  .field dt { font-size:.75rem; text-transform: uppercase; letter-spacing:.04em; color:#A4907A; margin-bottom:2px; }
  .field dd { margin: 0; }
  .muted { color:#7C6A57; }
  @media print {
    body { background: #fff; padding: 0; }
    .sheet { max-width: none; }
    figure, .prompt, aside.note { break-inside: avoid; }
  }
</style>
</head>
<body>
  <main class="sheet">
    <h1>${escapeHtml(entry.title)}</h1>
    ${entry.subtitle ? `<p class="sub">${escapeHtml(entry.subtitle)}</p>` : ''}
    <p class="meta">${escapeHtml(tpl.label)}${
      entry.category ? ` · ${escapeHtml(entry.category)}` : ''
    } · ${escapeHtml(entry.status)}</p>
    ${entry.coverImage ? img(entry.coverImage) : ''}
    ${entry.description ? `<p>${escapeHtml(entry.description).replace(/\n/g, '<br />')}</p>` : ''}
    ${entry.tags.length ? `<p class="tags">${entry.tags.map((t) => `<span>${escapeHtml(t)}</span>`).join('')}</p>` : ''}
    ${fieldsHtml ? `<dl class="fields">${fieldsHtml}</dl>` : ''}
    ${blocksHtml}
    <hr />
    <p class="meta">Dragoncore Studio · Export vom ${new Date().toLocaleString('de-DE')}</p>
  </main>
</body>
</html>`;
}


/* ----------------------------------------------------- Art Bible als HTML */

/**
 * Die ganze Welt als eine Datei.
 *
 * Bewusst dieselbe Gliederung wie in der App: DNA, Farben, dann die Kapitel.
 * Bilder werden eingebettet, damit die Datei allein weitergegeben werden kann.
 */
export async function renderArtBibleHtml(
  entries: Entry[],
  index: RelationIndex,
  worldName: string,
  tagline?: string,
): Promise<string> {
  const byId = new Map(entries.map((e) => [e.id, e]));

  // Nur Titelbilder einbetten – sonst wird die Datei unhandlich groß.
  const srcById = new Map<string, string>();
  for (const entry of entries) {
    if (!entry.coverImage || srcById.has(entry.coverImage)) continue;
    const record = await db.imageBlobs.get(entry.coverImage);
    if (record) srcById.set(entry.coverImage, await blobToDataUrl(record.thumb));
  }

  const colors = new Map<string, { color: string; name: string; count: number }>();
  const addColor = (color: string, name: string) => {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return;
    const key = color.toLowerCase();
    const hit = colors.get(key);
    if (hit) hit.count += 1;
    else colors.set(key, { color, name, count: 1 });
  };
  for (const entry of entries) {
    asList(entry.fields.palette).forEach((raw) => {
      const [color, ...rest] = raw.split('|');
      addColor(color, rest.join('|'));
    });
    entry.blocks.forEach((b) => {
      b.data.swatches?.forEach((s) => addColor(s.color, s.name));
      b.data.materials?.forEach((m) => addColor(m.color, m.name));
    });
  }
  const palette = [...colors.values()].sort((a, b) => b.count - a.count).slice(0, 24);

  const entryHtml = (entry: Entry) => {
    const tpl = templateFor(entry.type);
    const cover = entry.coverImage ? srcById.get(entry.coverImage) : undefined;
    const rels = relationsOf(index, entry.id)
      .map((r) => {
        const other = byId.get(r.otherId);
        return other ? `<li><span class="rel">${escapeHtml(r.label)}</span> ${escapeHtml(other.title)}</li>` : '';
      })
      .join('');
    const facts = tpl.fields
      .filter((f) => f.kind === 'text' || f.kind === 'textarea')
      .map((f) => ({ label: f.label, value: asText(entry.fields[f.key]) }))
      .filter((f) => f.value)
      .map((f) => `<div class="fact"><dt>${escapeHtml(f.label)}</dt><dd>${escapeHtml(f.value)}</dd></div>`)
      .join('');
    const swatches = asList(entry.fields.palette)
      .map((raw) => {
        const [color, ...rest] = raw.split('|');
        return `<span class="swatch"><i style="background:${escapeHtml(color)}"></i>${escapeHtml(rest.join('|') || color)}</span>`;
      })
      .join('');

    return `<article class="entry" id="${escapeHtml(entry.id)}">
      ${cover ? `<img class="cover" src="${cover}" alt="" />` : ''}
      <div class="entry-body">
        <p class="kind" style="color:${escapeHtml(tpl.accent)}">${escapeHtml(tpl.label)}${
          entry.category ? ` · ${escapeHtml(entry.category)}` : ''
        }</p>
        <h3>${escapeHtml(entry.title)}</h3>
        ${entry.subtitle ? `<p class="sub">${escapeHtml(entry.subtitle)}</p>` : ''}
        ${entry.description ? `<p>${escapeHtml(entry.description)}</p>` : ''}
        ${swatches ? `<div class="swatches">${swatches}</div>` : ''}
        ${facts ? `<dl class="facts">${facts}</dl>` : ''}
        ${rels ? `<ul class="rels">${rels}</ul>` : ''}
      </div>
    </article>`;
  };

  const dna = entries.filter((e) => e.type === 'dna');
  const chapters = templatesByFamily()
    .filter((f) => f.family !== 'system')
    .map((family) => {
      const types = new Set(family.items.map((t) => t.type));
      const items = entries
        .filter((e) => types.has(e.type))
        .sort((a, b) => a.type.localeCompare(b.type) || a.title.localeCompare(b.title, 'de'));
      return { label: family.label, items };
    })
    .filter((c) => c.items.length > 0);

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(worldName)} – Art Bible</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin:0; padding:56px 24px 96px; background:#F7F2E8; color:#3B2E23;
    font:16px/1.7 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .sheet { max-width: 1000px; margin: 0 auto; }
  h1 { font-family: Georgia, serif; font-size: clamp(2.4rem, 7vw, 4rem); margin:0; line-height:1.05; }
  h2 { font-family: Georgia, serif; font-size: 1.8rem; margin: 56px 0 6px; }
  h3 { font-family: Georgia, serif; font-size: 1.2rem; margin: 0 0 2px; }
  .tagline { font-family: Georgia, serif; font-style: italic; font-size:1.3rem; color:#7C6A57; margin:8px 0 0; }
  .meta { color:#A4907A; font-size:.9rem; margin-top:16px; }
  .lead { color:#7C6A57; margin:0 0 20px; }
  hr { border:0; border-top:1px solid #E5DCCA; margin:36px 0; }
  .grid { display:grid; gap:14px; grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); }
  .entry { display:flex; gap:14px; background:#FCFAF5; border:1px solid #E5DCCA; border-radius:14px; padding:12px; break-inside: avoid; }
  .entry .cover { width:96px; height:96px; object-fit:cover; border-radius:10px; flex:0 0 auto; }
  .entry-body { min-width:0; }
  .kind { font-size:.72rem; text-transform:uppercase; letter-spacing:.06em; margin:0 0 2px; }
  .sub { color:#7C6A57; margin:0 0 6px; font-style:italic; }
  .entry p { margin:4px 0; font-size:.92rem; }
  .swatches { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0; }
  .swatch { display:flex; align-items:center; gap:5px; font-size:.72rem; color:#7C6A57; }
  .swatch i { width:15px; height:15px; border-radius:4px; display:block; border:1px solid rgba(0,0,0,.12); }
  .facts { margin:8px 0 0; display:grid; gap:4px; }
  .fact dt { font-size:.68rem; text-transform:uppercase; letter-spacing:.05em; color:#A4907A; }
  .fact dd { margin:0; font-size:.85rem; }
  .rels { list-style:none; padding:0; margin:8px 0 0; font-size:.8rem; color:#7C6A57; }
  .rels .rel { color:#A8853F; }
  .palette { display:grid; grid-template-columns: repeat(auto-fill, minmax(110px,1fr)); gap:10px; }
  .palette div { border:1px solid #E5DCCA; border-radius:10px; overflow:hidden; background:#FCFAF5; }
  .palette span { display:block; padding:6px 8px; font-size:.75rem; }
  .palette i { display:block; height:52px; }
  .rule { background:#FCFAF5; border:1px solid #E5DCCA; border-left:3px solid #A8853F; border-radius:12px; padding:12px 14px; }
  @media print {
    body { background:#fff; padding:0; }
    .entry, .rule { break-inside: avoid; }
    h2 { break-after: avoid; }
  }
</style>
</head>
<body>
<main class="sheet">
  <h1>${escapeHtml(worldName)}</h1>
  ${tagline ? `<p class="tagline">${escapeHtml(tagline)}</p>` : ''}
  <p class="meta">Art Bible · ${entries.length} Einträge · Stand ${new Date().toLocaleDateString('de-DE')}</p>

  ${
    dna.length
      ? `<h2>Die DNA</h2><p class="lead">Woran sich alles messen lässt.</p><div class="grid">${dna
          .map(
            (r) =>
              `<div class="rule"><p class="kind">${escapeHtml(r.category)}</p><h3>${escapeHtml(
                r.title,
              )}</h3><p>${escapeHtml(asText(r.fields.rule) || r.description)}</p></div>`,
          )
          .join('')}</div>`
      : ''
  }

  ${
    palette.length
      ? `<h2>Farben der Welt</h2><div class="palette">${palette
          .map(
            (c) =>
              `<div><i style="background:${escapeHtml(c.color)}"></i><span>${escapeHtml(
                c.name || c.color,
              )}<br /><small>${escapeHtml(c.color)}</small></span></div>`,
          )
          .join('')}</div>`
      : ''
  }

  ${chapters
    .map(
      (chapter) =>
        `<h2>${escapeHtml(chapter.label)}</h2><div class="grid">${chapter.items
          .map(entryHtml)
          .join('')}</div>`,
    )
    .join('')}

  <hr />
  <p class="meta">Erzeugt mit Dragoncore Studio.</p>
</main>
</body>
</html>`;
}
