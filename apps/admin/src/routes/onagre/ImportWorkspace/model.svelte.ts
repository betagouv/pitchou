import type {
  OnagreImportPreview,
  OnagreImportRequest,
  OnagreImportRun,
} from "@pitchou/types/onagreImport.ts";
import { parseRecordIds } from "./selection.ts";

async function post<T>(request: OnagreImportRequest): Promise<T> {
  const response = await fetch("/onagre/imports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload)
    throw new Error(payload?.message ?? "Le serveur n'a pas pu traiter la demande.");
  return payload as T;
}

export class ImportModel {
  input = $state("");
  previewInput = $state("");
  preview = $state<OnagreImportPreview | null>(null);
  run = $state<OnagreImportRun | null>(null);
  selected = $state<string[]>([]);
  busy = $state(false);
  error = $state<string | null>(null);
  applyAttempted = $state(false);
  current = $derived(this.preview !== null && this.input === this.previewInput);

  toggle(recordId: string, checked: boolean) {
    if (!this.current || this.busy || this.applyAttempted) return;
    if (
      !this.preview?.records.some(
        (record) => record.recordId === recordId && record.status === "ready",
      )
    )
      return;
    this.selected = checked
      ? [...new Set([...this.selected, recordId])]
      : this.selected.filter((id) => id !== recordId);
  }

  async calculate(snapshotId: number) {
    if (this.busy) return;
    this.error = null;
    this.preview = null;
    this.selected = [];
    this.applyAttempted = false;
    const selection = parseRecordIds(this.input);
    if (selection.error) {
      this.error = selection.error;
      return;
    }
    this.previewInput = this.input;
    this.busy = true;
    try {
      this.preview = await post<OnagreImportPreview>({
        action: "preview",
        snapshotId,
        recordIds: selection.recordIds,
      });
    } catch (cause) {
      this.error = cause instanceof Error ? cause.message : "L'aperçu n'a pas pu être calculé.";
    } finally {
      this.busy = false;
    }
  }

  async apply(enabled: boolean) {
    const preview = this.preview;
    if (
      !enabled ||
      this.busy ||
      !this.current ||
      !preview?.availability.enabled ||
      this.applyAttempted ||
      this.selected.length === 0
    )
      return;
    if (Date.parse(preview.expiresAt) <= Date.now()) {
      this.error = "Cet aperçu a expiré. Recalculez-le avant d'importer.";
      return;
    }
    this.busy = true;
    this.error = null;
    this.applyAttempted = true;
    try {
      this.run = await post<OnagreImportRun>({
        action: "apply",
        previewId: preview.previewId,
        recordIds: [...this.selected],
      });
      this.selected = [];
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "La réponse de l'import n'a pas pu être reçue.";
      this.error = `${message} Recalculez un aperçu pour vérifier les dossiers avant toute nouvelle tentative.`;
    } finally {
      this.busy = false;
    }
  }
}
