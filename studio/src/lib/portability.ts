/**
 * Import und Export.
 *
 * Formate:
 *  - Vollsicherung  → JSON mit allen Einträgen, Bild-Metadaten und (optional)
 *                     den Bilddaten als Data-URL
 *  - Einzeleintrag  → JSON mit einem Eintrag und seinen Bildern
 *  - Druckansicht   → in sich geschlossene HTML-Datei mit eingebetteten Bildern
 *
 * Der Import prüft die Datei gegen ein Zod-Schema und meldet klar, was fehlt.
 * ZIP- und PDF-Export lassen sich später ergänzen: `collectEntryImages` und
 * `renderEntryHtml` liefern bereits alle nötigen Bausteine.
 */

import { db } from '../db/db';
import { blobToDataUrl } from './images';
import { backupSchema, singleEntrySchema, type BackupFile } from './schemas';
import type { Entry, Settings, StoredImageMeta } from '../types';
import { escapeHtml, fileStamp } from './utils';
import { blockDef, blockImageIds } from './blocks';
import { asBool, asList, asText, templateFor } from './templates';

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

export async function buildFullBackup(withImages: boolean): Promise<string> {
  const [entries, images, settings] = await Promise.all([
    db.entries.toArray(),
    db.images.toArray(),
    db.settings.get('settings'),
  ]);
  const payload = {
    app: 'dragoncore-studio' as const,
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    entries,
    images: await packImages(images, withImages),
    settings: settings
      ? { nav: settings.nav, backupReminderDays: settings.backupReminderDays }
      : undefined,
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
  const payload = {
    app: 'dragoncore-studio' as const,
    kind: 'entry' as const,
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    entry,
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
}

/**
 * Sicherung einlesen.
 * `mode = 'replace'` löscht vorher alles, `mode = 'merge'` ergänzt bzw.
 * aktualisiert vorhandene Einträge anhand der ID.
 */
export async function importBackup(
  text: string,
  mode: 'replace' | 'merge',
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

  const entries = data.entries as unknown as Entry[];
  const images = data.images as unknown as (StoredImageMeta & { dataUrl?: string })[];

  try {
    await db.transaction('rw', db.entries, db.images, db.imageBlobs, db.settings, async () => {
      if (mode === 'replace') {
        await Promise.all([db.entries.clear(), db.images.clear(), db.imageBlobs.clear()]);
      }
      await db.entries.bulkPut(entries);

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

      if (mode === 'replace' && data.settings) {
        const current = await db.settings.get('settings');
        if (current) {
          await db.settings.put({
            ...current,
            backupReminderDays: data.settings.backupReminderDays ?? current.backupReminderDays,
          } as Settings);
        }
      }
    });
  } catch (err) {
    return {
      ok: false,
      message: `Import fehlgeschlagen: ${(err as Error).message}`,
      entries: 0,
      images: 0,
    };
  }

  const imagesWithData = images.filter((i) => i.dataUrl).length;
  return {
    ok: true,
    message:
      `${entries.length} Einträge und ${images.length} Bilder übernommen` +
      (images.length && !imagesWithData
        ? ' (die Datei enthielt keine Bilddaten – nur Angaben zu den Bildern).'
        : '.'),
    entries: entries.length,
    images: images.length,
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
