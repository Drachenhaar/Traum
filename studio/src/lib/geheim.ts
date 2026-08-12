/**
 * Der Tischmodus.
 *
 * Am Spieltisch wird ein Bildschirm herumgedreht. In dem Augenblick liest
 * jemand mit, der nicht alles lesen soll – und die Frage ist nicht, ob das
 * Programm ein Rechtesystem hat, sondern ob der Spielleiter *sicher weiß*,
 * was gerade zu sehen ist.
 *
 * Daraus folgen drei Regeln, und alle drei sind Sicherheitsregeln im
 * wörtlichen Sinn: Wenn eine davon fällt, wird eine Kampagne verdorben.
 *
 * **Erstens: Der Zustand muss unübersehbar sein.**
 * Ein dezenter Punkt in der Ecke reicht nicht. Wer glaubt, der Tischmodus sei
 * an, und er ist es nicht, dreht den Bildschirm um und zeigt alles. Deshalb
 * trägt das Buch im Tischmodus eine sichtbare Zeile, und zwar dauerhaft.
 *
 * **Zweitens: Verborgenes muss sichtbar verborgen sein.**
 * Außerhalb des Tischmodus wird jedes Geheimnis deutlich gekennzeichnet
 * angezeigt. Wer nicht sieht, was er versteckt hat, versteckt nichts – er
 * verliert es.
 *
 * **Drittens: Im Zweifel zeigen wir weniger.**
 * Ein kaputtes oder halb geschriebenes Geheimnis gilt als Geheimnis. Ein
 * Absatz, der versehentlich verborgen bleibt, ist ein Ärgernis; einer, der
 * versehentlich erscheint, ist nicht mehr einzufangen.
 *
 * Was das hier ausdrücklich **nicht** ist: ein Schutz vor jemandem, der die
 * Datei hat. Nichts ist verschlüsselt, alles steht in derselben Datenbank wie
 * jede andere Seite. Das gegenteilige Versprechen wäre gefährlicher als gar
 * keines.
 */

import type { Entry, Settings } from '../types';

/** Trägt diese Seite überhaupt etwas Verborgenes? */
export function hatGeheimnis(entry: Entry): boolean {
  return !!entry.geheim && (!!entry.geheim.text?.trim() || entry.geheim.ganzeSeite === true);
}

/** Ist die ganze Seite am Tisch zu? */
export function ganzVerborgen(entry: Entry): boolean {
  return entry.geheim?.ganzeSeite === true;
}

/**
 * Zeigt dieses Gerät gerade auch Verborgenes?
 *
 * Die Verneinung steht bewusst hier und nicht an dreißig Stellen in der
 * Oberfläche: Wer den Tischmodus abfragt, soll nie selbst entscheiden
 * müssen, was „an" bedeutet.
 */
export function zeigtGeheimes(settings: Pick<Settings, 'tischmodus'>): boolean {
  return settings.tischmodus !== true;
}

/**
 * Die Seiten, die gezeigt werden dürfen.
 *
 * Im Tischmodus fallen ganz verborgene Seiten aus jeder Liste – Register,
 * Inhalt, Suche, Karte. Eine Seite, die im Register steht und beim Antippen
 * „nicht für den Tisch" sagt, hat ihr Geheimnis schon verraten: Der Name
 * allein ist oft das Geheimnis.
 */
export function zeigbare(entries: Entry[], settings: Pick<Settings, 'tischmodus'>): Entry[] {
  if (zeigtGeheimes(settings)) return entries;
  return entries.filter((e) => !ganzVerborgen(e));
}

/** Wie viel dieses Buch verbirgt – für die Zeile, die es anbietet. */
export function zaehleGeheimnisse(entries: Entry[]): { seiten: number; stellen: number } {
  let seiten = 0;
  let stellen = 0;
  for (const e of entries) {
    if (e.deletedAt) continue;
    if (ganzVerborgen(e)) seiten += 1;
    if (e.geheim?.text?.trim()) stellen += 1;
  }
  return { seiten, stellen };
}

/**
 * In Buchsprache, was verborgen ist.
 *
 * „3 Seiten und 7 Stellen" statt „10 hidden items" – und wenn nichts verborgen
 * ist, gibt es auch nichts zu sagen.
 */
export function geheimZeile(entries: Entry[]): string | undefined {
  const { seiten, stellen } = zaehleGeheimnisse(entries);
  if (!seiten && !stellen) return undefined;
  const teile: string[] = [];
  if (seiten) teile.push(`${seiten} ${seiten === 1 ? 'Seite bleibt' : 'Seiten bleiben'} zu`);
  if (stellen)
    teile.push(`${stellen} ${stellen === 1 ? 'Stelle ist' : 'Stellen sind'} nur für dich`);
  return teile.join(', ');
}
