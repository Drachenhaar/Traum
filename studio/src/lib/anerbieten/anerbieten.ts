/**
 * Ob jetzt gesprochen wird – und worüber.
 *
 * Der letzte der vier Schritte, und der kürzeste. Das ist kein Zufall: Wenn
 * die drei davor ihre Arbeit tun, bleibt hier fast nichts zu entscheiden.
 *
 * Genau **eines** oder keines. Nicht die drei besten, nicht eine Liste, nicht
 * ein Bereich mit Vorschlägen. Ein Buch, das drei Dinge gleichzeitig anbietet,
 * hat aufgehört, ein Buch zu sein – und die Frage „welches davon soll ich
 * ansehen?" ist eine Arbeit, die vorher niemand hatte.
 */

import type { Beobachtung, Stufe } from './beobachtung';
import { stufeVon, tragfaehig } from './beobachtung';
import { relevanz, type Lage } from './relevanz';
import { darfSprechen, zuvielGesagt, type Gedaechtnis } from './gedaechtnis';

export interface Anerbieten {
  beobachtung: Beobachtung;
  stufe: Exclude<Stufe, 'still'>;
  relevanz: number;
}

/**
 * Was jetzt gezeigt werden darf.
 *
 * Gibt höchstens ein Anerbieten und höchstens ein leises Zeichen zurück – und
 * beide dürfen `undefined` sein. Das ist der häufigste Rückgabewert dieser
 * Funktion und der beabsichtigte.
 *
 * Das leise Zeichen darf auch dann erscheinen, wenn das Tagespensum erschöpft
 * ist: Es ist ein Punkt am Rand, keine Ansprache. Wer es nicht sehen will,
 * sieht es nicht.
 */
export function waehle(
  beobachtungen: Beobachtung[],
  g: Gedaechtnis,
  lage: Lage,
  jetzt = Date.now(),
): { anerbieten?: Anerbieten; leise: Beobachtung[] } {
  const bewertet = beobachtungen
    .filter(tragfaehig)
    .filter((b) => darfSprechen(g, b, jetzt))
    .map((b) => ({ b, r: relevanz(b, g, lage) }))
    .map((x) => ({ ...x, stufe: stufeVon(x.b, x.r) }))
    .filter((x) => x.stufe !== 'still')
    .sort((a, x) => x.r - a.r);

  const leise = bewertet.filter((x) => x.stufe === 'leise').map((x) => x.b);

  /*
   * Das Tagespensum gilt nur fuer das Ansprechen.
   *
   * Waere es auch fuer das leise Zeichen gesperrt, verschwaende ein Buch nach
   * zwei Anerbieten alle Randzeichen bis zum naechsten Tag – und der
   * Verfasser haette den Eindruck, es sei ihm etwas kaputtgegangen.
   */
  if (zuvielGesagt(g, jetzt)) return { leise };

  const laut = bewertet.find((x) => x.stufe === 'anerbieten' || x.stufe === 'warnung');
  if (!laut) return { leise };

  return {
    anerbieten: {
      beobachtung: laut.b,
      stufe: laut.stufe as Exclude<Stufe, 'still'>,
      relevanz: laut.r,
    },
    leise: leise.filter((b) => b.id !== laut.b.id),
  };
}
