/**
 * Regeln des Satzes – ohne DOM, ohne React, ohne Zeit.
 *
 * Was ein Setzer entscheidet, bevor er etwas setzt: ob eine Initiale hierher
 * gehört, ob ein Absatz lang genug ist, ob eine Zeile allein stehen darf.
 * Solche Entscheidungen sind Aussagen über Text und über nichts sonst –
 * deshalb stehen sie hier und nicht in einer Komponente, und deshalb lassen
 * sie sich prüfen, ohne etwas zu zeichnen.
 */

/**
 * Wie viele Zeichen der erste Absatz mindestens braucht, damit eine Initiale
 * richtig aussieht.
 *
 * ---
 *
 * **Eine Initiale braucht Zeilen neben sich.**
 *
 * Gemeldet als: „Können wir das mit den grossen Buchstaben am Anfang des
 * Satzes weglassen? Oder die kleine Schrift unten hin, nicht oben am
 * Buchstaben? Es sieht irgendwie nicht passend aus."
 *
 * Und so war es. Die Initiale steht auf `3.4em` bei `line-height: 0.82`, ist
 * also rund 2,8 em hoch; eine Zeile misst 1,78 em. Der Buchstabe reicht damit
 * über gut anderthalb Zeilen. Steht daneben nur **eine** Zeile, hängt er
 * darunter ins Leere – bei Dennisse war es genau das: ein riesiges „S", eine
 * einzige Zeile an seiner Schulter, darunter nichts.
 *
 * Auf einer langen Seite ist derselbe Buchstabe richtig; die Kreaturseite trug
 * ihr „D" ohne Makel. Der Fehler war nicht die Initiale, sondern dass sie
 * **immer** kam.
 *
 * Die Zahl kommt aus der Breite des Satzspiegels: Der Lesetext läuft nie über
 * zweiundsechzig Zeichen je Zeile. Achtzig Zeichen ergeben dort zwei Zeilen,
 * auf einem Telefon drei – und die *breiteste* Darstellung ist die knappste,
 * also entscheidet sie.
 *
 * Gemessen am Gerät auf 390 Punkten: 41 Zeichen ergaben eine Zeile (keine
 * Initiale), 96 Zeichen drei Zeilen (Initiale), 246 Zeichen sechs.
 *
 * Ein Setzer würde es kürzer sagen: **Eine Initiale ohne Zeilen daneben ist
 * kein Schmuck, sondern ein Versehen.**
 */
export const INITIALE_AB_ZEICHEN = 80;

/**
 * Trägt dieser Text eine Initiale – oder wäre sie ein Versehen?
 *
 * Gemessen wird der **erste Absatz**, nicht der ganze Text: Die Initiale sitzt
 * in ihm, und was danach kommt, läuft ohnehin unter dem Buchstaben durch.
 */
export function traegtInitiale(text: string | undefined): boolean {
  const ersterAbsatz = (text ?? '').split(/\n{2,}/)[0] ?? '';
  return ersterAbsatz.trim().length >= INITIALE_AB_ZEICHEN;
}
