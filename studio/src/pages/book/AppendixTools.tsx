/**
 * Die Werkzeuge im Anhang.
 *
 * Bewusst unverändert übernommen: Chronik, Werkbank, lose Blätter und
 * Kolophon sind dieselben Bausteine wie zuvor – sie liegen nur nicht mehr
 * vorne im Buch, sondern hinten, auf einem eigenen Blatt.
 *
 * „Die Maschine bleibt, die Hülle wechselt.“
 */

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
      <SettingsPage />
    </AppendixSheet>
  );
}
