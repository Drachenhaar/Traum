/**
 * Das Bildnis – und was dasteht, wenn keines da ist.
 *
 * ---
 *
 * **Die wichtigste Entscheidung dieser Datei betrifft den Fall ohne Bild.**
 *
 * Der Auftrag sagt: „Keine grauen Placeholder-Flächen." Er sagt gleichzeitig,
 * dass die endgültigen Bildnisse später entstehen. Beides zusammen heißt
 * nicht, dass hier ein Bild erfunden werden müsste – es heißt, dass die
 * *Leerstelle* Teil des Buches sein muss statt ein Loch darin.
 *
 * Ein leerer Rahmen in einem alten Band ist kein Fehler. Er ist ein Rahmen,
 * in dem noch kein Bildnis hängt: geprägtes Namenszeichen, Rahmenecken,
 * darunter eine Zeile, die sagt, was fehlt. Wer das sieht, denkt „hier kommt
 * ein Bild hin" und nicht „hier ist etwas kaputt". Und in dem Moment, in dem
 * ein Bild eingelegt wird, verschwindet die Platte ohne eine Zeile Layout.
 *
 * Genau darum geht es bei einem Schacht: Der Unterschied zwischen „mit Bild"
 * und „ohne Bild" darf keine zwei Layouts sein.
 */

import { useEffect, useState } from 'react';
import { getImageUrl } from '../../lib/images';
import {
  bildlage,
  fassungFuer,
  namenszeichen,
  zuschnittVon,
  type Schacht,
  type Zuschnitt,
} from '../../lib/bildnis';
import { Rahmenecke } from '../../lib/zeichen/zeichen';
import { cx } from '../../lib/utils';
import type { Entry } from '../../types';

/**
 * Das Bild zu einer Kennung, in der Fassung, die dieser Schacht braucht.
 *
 * Eigener Haken statt `useImageUrl`, weil dort die Fassung von Hand übergeben
 * wird und hier aus dem Schacht folgt. Eine Stelle weniger, an der jemand
 * „thumb" schreibt, wo „full" hingehört – und genau so entstehen die Seiten,
 * die ein Porträt in Vorschauauflösung groß ziehen.
 */
function useSchachtbild(id: string | undefined, schacht: Schacht) {
  const [url, setUrl] = useState<string | null>(null);
  const fassung = fassungFuer(schacht);

  useEffect(() => {
    let lebt = true;
    if (!id) {
      setUrl(null);
      return;
    }
    void getImageUrl(id, fassung).then((u) => {
      if (lebt) setUrl(u);
    });
    return () => {
      lebt = false;
    };
  }, [id, fassung]);

  return url;
}

/* ------------------------------------------------------------- Rückfall --- */

/**
 * Die Bildnisplatte – der Rahmen ohne Bildnis.
 *
 * Sie ist bewusst *ruhig*: kein Fragezeichen, kein durchgestrichenes
 * Bildsymbol, keine gestrichelte Linie. Alles davon sagt „Fehler". Ein
 * Namenszeichen in einer Raute sagt „noch nicht".
 */
function Bildnisplatte({ titel, gross }: { titel: string; gross: boolean }) {
  const zeichen = namenszeichen(titel);
  return (
    <div
      className="absolute inset-0 grid place-items-center overflow-hidden"
      /*
       * Der Verlauf macht aus einer Fläche einen Raum. Ohne ihn wäre es
       * genau das, was nicht sein soll: ein grauer Kasten in Braun.
       */
      style={{
        /*
         * Auch die Platte hinter einem fehlenden Bildnis folgt dem Band.
         *
         * Drei feste Braunwerte standen hier – und im Band Tinte blieb genau
         * an dieser Stelle ein warmer Fleck mitten auf einer kuehlen Seite.
         * Die Stufen des Grundes tun dasselbe, nur je Band: 300 ist immer der
         * Ton, der einen Schritt vom Blatt weg liegt.
         */
        background:
          'radial-gradient(120% 90% at 50% 22%, rgb(var(--dc-grund-300)) 0%,' +
          ' rgb(var(--dc-grund-200)) 48%, rgb(var(--dc-grund-50)) 100%)',
      }}
      data-bildnis="platte"
    >
      {/* Ein sehr schwacher Lichtkegel von oben – dasselbe Licht wie im Referenzbild. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-2/3"
        style={{
          background:
            'radial-gradient(70% 100% at 50% 0%, rgb(var(--dc-metall-400) / 0.10) 0%, transparent 70%)',
        }}
        aria-hidden
      />
      <div className="relative flex flex-col items-center">
        <div className="relative grid place-items-center">
          {/* Die Raute, in der das Namenszeichen sitzt. */}
          <svg
            width={gross ? 148 : 68}
            height={gross ? 148 : 68}
            viewBox="0 0 100 100"
            fill="none"
            className="text-gild-500/35"
            aria-hidden
          >
            <path d="M50 4l46 46-46 46L4 50z" stroke="currentColor" strokeWidth="1" />
            <path d="M50 13l37 37-37 37-37-37z" stroke="currentColor" strokeWidth="0.5" />
          </svg>
          <span
            className={cx(
              'absolute font-serif text-gild-400/55',
              gross ? 'text-[52px]' : 'text-[24px]',
            )}
            style={{ letterSpacing: '0.02em' }}
          >
            {zeichen}
          </span>
        </div>
        {gross && (
          <p className="mt-5 font-serif text-[10.5px] uppercase tracking-[0.34em] text-gild-500/40">
            Bildnis folgt
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Das Bild --- */

export function Bildnis({
  entry,
  schacht = 'hauptbildnis',
  className,
  zuschnitt,
  ecken = false,
  titel,
  bildId,
}: {
  /** Wessen Bildnis. Ohne Eintrag zählen `bildId` und `titel`. */
  entry?: Entry;
  schacht?: Schacht;
  className?: string;
  /** Überschreibt den Zuschnitt des Eintrags – für das Stimmzimmer. */
  zuschnitt?: Zuschnitt;
  /** Vier goldene Rahmenecken, wie im Referenzbild. */
  ecken?: boolean;
  titel?: string;
  bildId?: string;
}) {
  const id = bildId ?? entry?.coverImage ?? undefined;
  const url = useSchachtbild(id, schacht);
  const z = zuschnitt ?? zuschnittVon(entry);
  const lage = bildlage(z);
  const name = titel ?? entry?.title ?? '';
  const gross = schacht === 'hauptbildnis';

  return (
    <div className={cx('relative overflow-hidden', className)} data-bildnis={schacht}>
      {url ? (
        <>
          <img
            src={url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: lage.objectPosition, transform: lage.transform }}
            /*
             * Das Hauptbildnis ist das, worauf der Blick zuerst fällt – es
             * wird geladen, bevor irgendetwas anderes geladen wird. Alles
             * andere darf warten, bis es an der Reihe ist.
             */
            loading={gross ? 'eager' : 'lazy'}
            decoding={gross ? 'sync' : 'async'}
            draggable={false}
          />
          {/*
           * Der Schleier.
           *
           * Er ist nicht Geschmack, sondern Lesbarkeit: Auf dem Bildnis steht
           * im Referenzbild Text, und ein Porträt mit hellen Stellen macht
           * Text darauf unlesbar. Von unten stark, nach oben aus – dort ist
           * das Gesicht.
           */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(to top, rgb(var(--dc-grund-50) / ${z.schleier * 1.5}) 0%, rgb(var(--dc-grund-50) / ${
                z.schleier * 0.55
              }) 34%, rgba(10,8,7,0) 62%)`,
            }}
            aria-hidden
          />
        </>
      ) : (
        <Bildnisplatte titel={name} gross={gross} />
      )}

      {ecken && (
        <div className="pointer-events-none absolute inset-0 text-gild-500/40" aria-hidden>
          <Rahmenecke className="absolute left-1.5 top-1.5" groesse={gross ? 22 : 14} />
          <Rahmenecke
            className="absolute right-1.5 top-1.5 -scale-x-100"
            groesse={gross ? 22 : 14}
          />
          <Rahmenecke
            className="absolute bottom-1.5 left-1.5 -scale-y-100"
            groesse={gross ? 22 : 14}
          />
          <Rahmenecke
            className="absolute bottom-1.5 right-1.5 -scale-100"
            groesse={gross ? 22 : 14}
          />
        </div>
      )}
    </div>
  );
}
