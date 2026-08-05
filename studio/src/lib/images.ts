/**
 * Bildverwaltung.
 *
 * - Originaldateien und ein verkleinertes Vorschaubild landen als Blob in IndexedDB.
 * - Für die Anzeige werden Object-URLs erzeugt und in einem Cache gehalten,
 *   damit dieselbe Datei nicht mehrfach in den Speicher geladen wird.
 * - Kein Base64, kein localStorage.
 */

import { db } from '../db/db';
import type { StoredImageMeta } from '../types';
import { newId } from './utils';

const THUMB_MAX = 640; // längste Kante des Vorschaubildes

/** id → ObjectURL (getrennt für Vorschau und Original) */
const urlCache = new Map<string, string>();

function cacheKey(id: string, variant: 'thumb' | 'full') {
  return `${variant}:${id}`;
}

/** Liefert eine anzeigbare URL für ein gespeichertes Bild (oder null, wenn es fehlt). */
export async function getImageUrl(
  id: string,
  variant: 'thumb' | 'full' = 'thumb',
): Promise<string | null> {
  const key = cacheKey(id, variant);
  const cached = urlCache.get(key);
  if (cached) return cached;

  const record = await db.imageBlobs.get(id);
  if (!record) return null;

  const blob = variant === 'full' ? record.full : record.thumb;
  const url = URL.createObjectURL(blob);
  urlCache.set(key, url);
  return url;
}

/** Cache-Einträge eines Bildes freigeben (nach dem Löschen). */
export function releaseImageUrls(id: string): void {
  for (const variant of ['thumb', 'full'] as const) {
    const key = cacheKey(id, variant);
    const url = urlCache.get(key);
    if (url) {
      URL.revokeObjectURL(url);
      urlCache.delete(key);
    }
  }
}

/** Bild aus einer Datei laden – liefert Maße und ein Vorschaubild. */
async function processFile(file: File): Promise<{ full: Blob; thumb: Blob; width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(objectUrl);
    const { width, height } = img;

    // Vorschaubild per Canvas erzeugen. Schlägt das fehl (z. B. sehr exotisches
    // Format), nutzen wir das Original auch als Vorschau.
    let thumb: Blob = file;
    const scale = Math.min(1, THUMB_MAX / Math.max(width, height));
    if (scale < 1) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const blob = await canvasToBlob(canvas);
        if (blob) thumb = blob;
      }
    }
    return { full: file, thumb, width, height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.86);
  });
}

export interface ImportImageOptions {
  category?: string;
  tags?: string[];
  linkedEntryIds?: string[];
}

/**
 * Mehrere Dateien importieren. Fehlerhafte Dateien werden übersprungen und
 * als Meldung zurückgegeben, damit der Nutzer weiß, was nicht geklappt hat.
 */
export async function importImageFiles(
  files: File[],
  options: ImportImageOptions = {},
): Promise<{ metas: StoredImageMeta[]; errors: string[] }> {
  const metas: StoredImageMeta[] = [];
  const errors: string[] = [];

  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      errors.push(`„${file.name}“ ist kein Bild.`);
      continue;
    }
    try {
      const { full, thumb, width, height } = await processFile(file);
      const now = Date.now();
      const id = newId('img');
      const meta: StoredImageMeta = {
        id,
        title: file.name.replace(/\.[^.]+$/, ''),
        description: '',
        tags: options.tags ?? [],
        category: options.category ?? '',
        prompt: '',
        negativePrompt: '',
        source: '',
        status: 'Idee',
        favorite: false,
        linkedEntryIds: options.linkedEntryIds ?? [],
        fileName: file.name,
        mime: file.type,
        size: file.size,
        width,
        height,
        createdAt: now,
        updatedAt: now,
      };
      await db.transaction('rw', db.images, db.imageBlobs, async () => {
        await db.images.put(meta);
        await db.imageBlobs.put({ id, full, thumb });
      });
      metas.push(meta);
    } catch (err) {
      errors.push(`„${file.name}“ konnte nicht importiert werden: ${(err as Error).message}`);
    }
  }

  return { metas, errors };
}

/** Bild endgültig entfernen (Metadaten + Blobs + Cache). */
export async function deleteImage(id: string): Promise<void> {
  await db.transaction('rw', db.images, db.imageBlobs, async () => {
    await db.images.delete(id);
    await db.imageBlobs.delete(id);
  });
  releaseImageUrls(id);
}

/** Orientierung aus den Maßen ableiten – für den Asset-Filter. */
export function orientationOf(meta: Pick<StoredImageMeta, 'width' | 'height'>): 'hoch' | 'quer' | 'quadratisch' {
  const ratio = meta.width / (meta.height || 1);
  if (ratio > 1.08) return 'quer';
  if (ratio < 0.92) return 'hoch';
  return 'quadratisch';
}

/** Blob → Data-URL. Wird nur für den HTML-Export gebraucht (eingebettete Bilder). */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
    reader.readAsDataURL(blob);
  });
}
