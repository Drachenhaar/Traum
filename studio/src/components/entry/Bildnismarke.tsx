/**
 * Die Bildnismarke – die Tür zur Charakterseite, neben dem Namen.
 *
 * ---
 *
 * **Gewünscht als: „einen eigenen schönen Knopf neben Dennisse ihrem Namen".**
 *
 * Es gab schon eine Tür dorthin: ein kleines Gesicht-Zeichen in der Reihe
 * neben Stern und Stift, in `text-ink-faint/35`. Das ist ein Handgriff unter
 * Handgriffen – dieselbe Lautstärke wie „bearbeiten" und „merken", und in
 * derselben Reihe. Wer nicht wusste, dass es diese Seite gibt, hat es nie
 * angesehen.
 *
 * Die Charakterseite ist aber kein Handgriff. Sie ist die zweite Art, dieselbe
 * Figur anzusehen: hier der Eintrag im Band, dort das Gesicht mit seiner
 * Umgebung. Etwas, das einer Seite ebenbürtig ist, gehört nicht in die
 * Werkzeugreihe.
 *
 * ---
 *
 * **Warum eine Raute und kein neues Zeichen.**
 *
 * Die Charakterseite trägt in ihrer Mitte eine grosse goldene Raute mit der
 * Initiale – das ist ihr Gesicht, solange das Bildnis fehlt. Diese Raute klein
 * neben den Namen zu setzen, erfindet nichts: Es ist dasselbe Bild, und wer es
 * einmal angetippt hat, erkennt es auf der Zielseite gross wieder.
 *
 * Ein neu erfundenes Symbol hätte diese Verbindung nicht. Es müsste erklärt
 * werden – und ein Zeichen, das erklärt werden muss, ist keins.
 *
 * ---
 *
 * **Die Trefferfläche wächst nach aussen.**
 *
 * Dieselbe Lehre wie bei den Ansatzmarken am Blattrand: Wer nach innen
 * polstert, macht das Bild so gross wie das Ziel. Vierundvierzig Punkte zum
 * Treffen, dreissig zum Ansehen.
 */

import { Link } from 'react-router-dom';
import type { Entry } from '../../types';

/** Ein Buchstabe, mehr trägt die Raute nicht. */
function initialeVon(titel: string): string {
  const erstes = titel.trim()[0];
  return erstes ? erstes.toUpperCase() : '·';
}

export function Bildnismarke({ entry }: { entry: Entry }) {
  const initiale = initialeVon(entry.title);

  return (
    <Link
      to={`/figur/${entry.id}`}
      aria-label={`${entry.title} als Bildnis ansehen`}
      title="Das Bildnis ansehen"
      data-bildnismarke
      className="dc-bildnismarke relative ml-3 inline-block h-[30px] w-[30px] shrink-0 align-middle no-tap-highlight"
    >
      <svg viewBox="0 0 32 32" className="block h-full w-full" aria-hidden>
        {/*
          Zwei Rauten, wie auf der Charakterseite: die äussere trägt die Form,
          die innere den Buchstaben. Eine allein sähe aus wie eine Marke auf
          einer Landkarte.
        */}
        <path
          d="M16 2 L30 16 L16 30 L2 16 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeOpacity="0.55"
        />
        <path
          d="M16 6.5 L25.5 16 L16 25.5 L6.5 16 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeOpacity="0.35"
        />
        <text
          x="16"
          y="16"
          textAnchor="middle"
          dominantBaseline="central"
          fill="currentColor"
          /*
           * Die Schrift des Buches, nicht die des Symbols. Der Buchstabe hier
           * und die grosse Initiale dort müssen dieselbe Familie sein, sonst
           * ist es nicht dasselbe Zeichen in klein, sondern ein ähnliches.
           */
          className="font-serif"
          fontSize="13"
          letterSpacing="0.5"
        >
          {initiale}
        </text>
      </svg>
    </Link>
  );
}
