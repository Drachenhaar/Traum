/**
 * Die Werkzeuge im Anhang.
 *
 * Bewusst unverändert übernommen: Chronik, Werkbank, lose Blätter und
 * Kolophon sind dieselben Bausteine wie zuvor – sie liegen nur nicht mehr
 * vorne im Buch, sondern hinten, auf einem eigenen Blatt.
 *
 * „Die Maschine bleibt, die Hülle wechselt.“
 */

import { Link } from 'react-router-dom';
import { BookMarked } from 'lucide-react';
import { TimelinePage } from '../TimelinePage';
import { PipelinePage } from '../PipelinePage';
import { CanvasListPage } from '../CanvasListPage';
import { SettingsPage } from '../SettingsPage';
import { AppendixSheet } from './Appendix';

export function ChronicleSheet() {
  return (
    <AppendixSheet title="Chronik" rubric="Anhang · Gedächtnis">
      <TimelinePage />
    </AppendixSheet>
  );
}

export function WorkbenchSheet() {
  return (
    <AppendixSheet title="Werkbank" rubric="Anhang · Produktion">
      <PipelinePage />
    </AppendixSheet>
  );
}

export function LooseLeavesSheet() {
  return (
    <AppendixSheet title="Lose Blätter" rubric="Anhang · Freiraum">
      <CanvasListPage />
    </AppendixSheet>
  );
}

export function ColophonSheet() {
  return (
    <AppendixSheet title="Kolophon" rubric="Anhang · Über dieses Buch">
      {/*
       * Einband und Zeichen liegen bewusst nicht mitten in den Einstellungen:
       * Sie sind kein Schalter, sondern das Gesicht des Buches. Von hier führt
       * nur ein Verweis dorthin.
       */}
      <Link
        to="/mein-buch"
        className="mb-8 inline-flex min-h-[44px] items-center gap-2 font-serif text-[15px] text-gold transition-colors hover:text-gold-hell no-tap-highlight"
      >
        <BookMarked size={16} strokeWidth={1.6} /> Einband &amp; Zeichen
      </Link>
      <SettingsPage />
    </AppendixSheet>
  );
}
