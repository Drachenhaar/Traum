/**
 * Einstellungen: Navigation anpassen, Sicherung, Import und Zurücksetzen.
 */

import { useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Database,
  Download,
  Eye,
  EyeOff,
  Upload,
} from 'lucide-react';
import { useStudio } from '../store/useStudio';
import { Modal } from '../components/ui/Modal';
import { confirm } from '../components/ui/Confirm';
import { Field, SelectInput, TextInput } from '../components/ui/Fields';
import { CustomTypes } from '../components/settings/CustomTypes';
import { iconByName } from '../lib/icons';
import { DEFAULT_NAV } from '../lib/nav';
import { backupFileName, buildFullBackup, importBackup } from '../lib/portability';
import { downloadFile, formatDateTime, moveItem } from '../lib/utils';

export function SettingsPage() {
  const settings = useStudio((s) => s.settings);
  const entries = useStudio((s) => s.entries);
  const images = useStudio((s) => s.images);
  const relations = useStudio((s) => s.relations);
  const updateNav = useStudio((s) => s.updateNav);
  const updateSettings = useStudio((s) => s.updateSettings);
  const reloadFromDb = useStudio((s) => s.reloadFromDb);
  const wipeAll = useStudio((s) => s.wipeAll);
  const notify = useStudio((s) => s.notify);

  const [busy, setBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState<string | null>(null);
  const [importName, setImportName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const backupOverdue =
    settings.lastBackupAt !== undefined &&
    Date.now() - settings.lastBackupAt > settings.backupReminderDays * 86_400_000;

  /* ------------------------------------------------------------- Sicherung */

  const exportAll = async (withImages: boolean) => {
    setBusy(true);
    try {
      const json = await buildFullBackup(withImages);
      downloadFile(backupFileName(), json, 'application/json');
      updateSettings({ lastBackupAt: Date.now() });
      notify(
        withImages ? 'Vollsicherung gespeichert (mit Bildern).' : 'Sicherung gespeichert (ohne Bilddaten).',
        'success',
      );
    } catch (err) {
      notify(`Sicherung fehlgeschlagen: ${(err as Error).message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const readFile = async (file: File) => {
    try {
      const text = await file.text();
      setImportText(text);
      setImportName(file.name);
      setImportOpen(true);
    } catch (err) {
      notify(`Datei konnte nicht gelesen werden: ${(err as Error).message}`, 'error');
    }
  };

  const runImport = async (mode: 'merge' | 'replace') => {
    if (!importText) return;
    if (mode === 'replace') {
      const ok = await confirm({
        title: 'Alles ersetzen?',
        message:
          'Der vorhandene Inhalt wird gelöscht und durch die Datei ersetzt. Sichere vorher am besten deinen aktuellen Stand.',
        confirmLabel: 'Alles ersetzen',
        danger: true,
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      const result = await importBackup(importText, mode);
      if (!result.ok) {
        notify(result.message, 'error');
        return;
      }
      await reloadFromDb();
      notify(result.message, 'success');
      setImportOpen(false);
      setImportText(null);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  /* ------------------------------------------------------------ Navigation */

  const moveNav = (index: number, delta: number) => {
    updateNav(moveItem(settings.nav, index, index + delta));
  };

  const toggleNav = (id: string) => {
    updateNav(settings.nav.map((n) => (n.id === id ? { ...n, hidden: !n.hidden } : n)));
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-[30px] leading-tight text-ink sm:text-[34px]">Einstellungen</h1>
        <p className="mt-1 max-w-2xl text-[15px] text-ink-muted">
          Alles liegt lokal in diesem Browser. Es gibt keinen Server – Sicherungen sind daher wichtig.
        </p>
      </header>

      {/* ------------------------------------------------------------- Welt */}
      <section className="card p-4 sm:p-5">
        <h2 className="mb-1 font-serif text-xl text-ink">Deine Welt</h2>
        <p className="mb-4 text-[15px] text-ink-muted">
          Name und Leitsatz erscheinen in der Seitenleiste, in der Art Bible und im Story-Modus.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name der Welt">
            <TextInput
              value={settings.worldName ?? ''}
              onChange={(e) => updateSettings({ worldName: e.target.value })}
              placeholder="Dragoncore"
            />
          </Field>
          <Field label="Leitsatz">
            <TextInput
              value={settings.worldTagline ?? ''}
              onChange={(e) => updateSettings({ worldTagline: e.target.value })}
              placeholder="Eine Welt, die sich erinnert"
            />
          </Field>
        </div>
      </section>

      {/* --------------------------------------------------------- Bestand */}
      <section className="card p-4 sm:p-5">
        <h2 className="mb-3 flex items-center gap-2 font-serif text-xl text-ink">
          <Database size={19} className="text-brass-600" /> Bestand
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Einträge" value={entries.filter((e) => !e.deletedAt).length} />
          <Stat label="Verbindungen" value={relations.length} />
          <Stat label="Bilder" value={images.length} />
          <Stat label="Im Papierkorb" value={entries.filter((e) => e.deletedAt).length} />
        </div>
        <p className="mt-3 text-[13px] text-ink-faint">
          {settings.lastBackupAt
            ? `Letzte Sicherung: ${formatDateTime(settings.lastBackupAt)}`
            : 'Noch keine Sicherung erstellt.'}
        </p>
      </section>

      {backupOverdue && (
        <div className="flex items-start gap-3 rounded-2xl border border-brass-500/40 bg-brass-500/10 p-4">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-brass-600" />
          <div>
            <p className="text-[15px] text-ink">
              Die letzte Sicherung ist länger als {settings.backupReminderDays} Tage her.
            </p>
            <button type="button" className="btn-accent mt-2" onClick={() => void exportAll(true)} disabled={busy}>
              Jetzt sichern
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- Export / Import */}
      <section className="card p-4 sm:p-5">
        <h2 className="mb-1 font-serif text-xl text-ink">Sicherung & Übertragung</h2>
        <p className="mb-4 text-[15px] text-ink-muted">
          Die Vollsicherung enthält auch die Bilddaten und ist dadurch deutlich größer, dafür aber
          vollständig wiederherstellbar.
        </p>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-accent" onClick={() => void exportAll(true)} disabled={busy}>
            <Download size={18} /> Vollsicherung (mit Bildern)
          </button>
          <button type="button" className="btn-ghost" onClick={() => void exportAll(false)} disabled={busy}>
            <Download size={18} /> Nur Daten (ohne Bilder)
          </button>
          <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload size={18} /> Sicherung einlesen
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void readFile(file);
            }}
          />
        </div>

        <Field label="Erinnerung an Sicherung" className="mt-5 max-w-xs">
          <SelectInput
            value={String(settings.backupReminderDays)}
            onChange={(e) => updateSettings({ backupReminderDays: Number(e.target.value) })}
          >
            <option value="7">nach 7 Tagen</option>
            <option value="14">nach 14 Tagen</option>
            <option value="30">nach 30 Tagen</option>
            <option value="3650">nie</option>
          </SelectInput>
        </Field>
      </section>

      <CustomTypes />

      {/* --------------------------------------------------------- Navigation */}
      <section className="card p-4 sm:p-5">
        <h2 className="mb-1 font-serif text-xl text-ink">Navigation</h2>
        <p className="mb-4 text-[15px] text-ink-muted">
          Reihenfolge ändern und Bereiche ein- oder ausblenden.
        </p>

        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {settings.nav.map((item, index) => {
            const Icon = iconByName(item.icon);
            return (
              <li key={item.id} className="flex items-center gap-2 bg-cream-50 px-2 py-1.5">
                <Icon size={17} className="ml-1 shrink-0 text-brass-600" />
                <span className={item.hidden ? 'flex-1 text-ink-faint line-through' : 'flex-1 text-ink'}>
                  {item.label}
                </span>
                <button
                  type="button"
                  onClick={() => toggleNav(item.id)}
                  className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-cream-200 hover:text-ink"
                  aria-label={item.hidden ? 'Einblenden' : 'Ausblenden'}
                >
                  {item.hidden ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
                <button
                  type="button"
                  onClick={() => moveNav(index, -1)}
                  disabled={index === 0}
                  className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-cream-200 hover:text-ink disabled:opacity-30"
                  aria-label="Nach oben"
                >
                  <ChevronUp size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => moveNav(index, 1)}
                  disabled={index === settings.nav.length - 1}
                  className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-cream-200 hover:text-ink disabled:opacity-30"
                  aria-label="Nach unten"
                >
                  <ChevronDown size={17} />
                </button>
              </li>
            );
          })}
        </ul>

        <button type="button" className="btn-quiet mt-3 px-3" onClick={() => updateNav(DEFAULT_NAV)}>
          Standardreihenfolge wiederherstellen
        </button>
      </section>

      {/* ------------------------------------------------------ Zurücksetzen */}
      <section className="rounded-2xl border border-red-800/20 bg-red-50/60 p-4 sm:p-5">
        <h2 className="mb-1 font-serif text-xl text-ink">Von vorn beginnen</h2>
        <p className="mb-4 text-[15px] text-ink-muted">
          Nimmt dieses Buch aus dem Regal – Seiten, Tafeln, Einband, Titel und Zeichen. Danach
          steht wieder ein leerer Tisch da, und die Erschaffung beginnt von Neuem. Erstelle vorher
          unbedingt eine Sicherung: Ohne sie ist der Band nicht zurückzuholen.
        </p>
        <button
          type="button"
          className="btn-danger"
          disabled={busy}
          onClick={async () => {
            const ok = await confirm({
              title: 'Dieses Buch aus dem Regal nehmen?',
              /*
               * Die Nachfrage stand noch aus der Zeit vor der Buchidentitaet
               * und sprach nur von „Eintraegen und Bildern". Es geht aber um
               * das ganze Buch: Titel, Einband und Zeichen gehen mit. Wer das
               * nicht weiss, klickt es weg und wundert sich.
               */
              message:
                'Alle Seiten, Tafeln und Verbindungen werden entfernt – und mit ihnen der Einband, der Titel und das Zeichen. Danach beginnt die Erschaffung von vorn. Das lässt sich nur über eine vorher erstellte Sicherung rückgängig machen.',
              confirmLabel: 'Von vorn beginnen',
              danger: true,
            });
            if (!ok) return;
            await wipeAll();

            /*
             * Neu laden, nicht nur neu zeichnen.
             *
             * Ob die Erschaffung laeuft, entscheidet das Buch genau einmal –
             * beim Start. Das ist dort Absicht: Sonst tauschte der Router die
             * Ansicht mitten in der Zeremonie, in dem Augenblick, in dem der
             * Titel entsteht. Hier ist es die Kehrseite davon: Nach dem
             * Loeschen sass man in einem leeren Kolophon und sah nichts,
             * obwohl alles weg war. Ein Neustart ist die ehrliche Antwort –
             * es gibt ja nichts mehr, das man behalten koennte.
             */
            window.location.hash = '#/';
            window.location.reload();
          }}
        >
          Von vorn beginnen
        </button>
      </section>

      {/* ---------------------------------------------------- Import-Dialog */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Sicherung einlesen"
        description={importName}
        size="sm"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setImportOpen(false)}>
              Abbrechen
            </button>
            <button type="button" className="btn-ghost" onClick={() => void runImport('merge')} disabled={busy}>
              Ergänzen
            </button>
            <button type="button" className="btn-danger" onClick={() => void runImport('replace')} disabled={busy}>
              Ersetzen
            </button>
          </>
        }
      >
        <p className="text-[15px] leading-relaxed text-ink-muted">
          <strong className="text-ink">Ergänzen</strong> fügt die Inhalte zum aktuellen Bestand hinzu und
          aktualisiert gleiche Einträge.
          <br />
          <strong className="text-ink">Ersetzen</strong> löscht zuerst alles Vorhandene.
        </p>
      </Modal>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-cream-100 px-3 py-2.5">
      <p className="font-serif text-[24px] leading-none text-ink">{value}</p>
      <p className="mt-1 text-[13px] text-ink-muted">{label}</p>
    </div>
  );
}
