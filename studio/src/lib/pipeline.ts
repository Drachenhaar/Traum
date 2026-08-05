/**
 * Die Asset-Pipeline.
 *
 * Ein Asset ist selten fertig oder unfertig – es ist unterwegs. Diese Stufen
 * machen sichtbar, wo es gerade steht, ohne daraus eine Bürokratie zu machen.
 */

import type { Entry } from '../types';
import { asList } from './templates';

export interface PipelineStage {
  id: string;
  label: string;
  /** Was muss vorliegen, damit diese Stufe erreicht ist? */
  requirement: string;
  color: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { id: 'idea', label: 'Idee', requirement: 'Der Gedanke steht.', color: '#A4907A' },
  { id: 'reference', label: 'Referenz', requirement: 'Referenzbilder gesammelt.', color: '#8C7A62' },
  { id: 'concept', label: 'Konzept', requirement: 'Erste Entwürfe liegen vor.', color: '#9A7C4E' },
  { id: 'prompt', label: 'Prompt', requirement: 'Ein Prompt ist verknüpft.', color: '#C0A468' },
  { id: 'approved', label: 'Freigegeben', requirement: 'Eine Fassung ist entschieden.', color: '#A8853F' },
  { id: 'game', label: 'Spielfassung', requirement: 'Für die Verwendung aufbereitet.', color: '#7A8467' },
  { id: 'animated', label: 'Animiert', requirement: 'Bewegung ist angelegt.', color: '#55604A' },
  { id: 'exported', label: 'Exportiert', requirement: 'Ausgeliefert.', color: '#3A422F' },
];

export const DEFAULT_STAGE = 'idea';

export function stageById(id: string | undefined): PipelineStage {
  return PIPELINE_STAGES.find((s) => s.id === id) ?? PIPELINE_STAGES[0];
}

export function stageIndex(id: string | undefined): number {
  const i = PIPELINE_STAGES.findIndex((s) => s.id === id);
  return i < 0 ? 0 : i;
}

/**
 * Vorschlag, welche Stufe zu den vorhandenen Daten passt.
 *
 * Die App überschreibt damit nie die Entscheidung des Nutzers – sie bietet sie
 * nur an, wenn die Daten offensichtlich weiter sind als die gesetzte Stufe.
 */
export function suggestStage(entry: Entry, hasPromptRelation: boolean): string {
  const f = entry.fields;
  if (asList(f.gameImages).length && entry.status === 'Freigegeben') return 'game';
  if (asList(f.approvedImages).length) return 'approved';
  if (hasPromptRelation || String(f.prompt ?? '').trim()) return 'prompt';
  if (asList(f.conceptImages).length) return 'concept';
  if (asList(f.referenceImages).length) return 'reference';
  return 'idea';
}

/** Fortschritt eines Assets als Anteil zwischen 0 und 1. */
export function stageProgress(id: string | undefined): number {
  return stageIndex(id) / (PIPELINE_STAGES.length - 1);
}
