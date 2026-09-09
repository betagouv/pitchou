<script lang="ts">
  import { updateNotificationForDossier } from "$lib/dossier/notification.ts";
  import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
  import { readOnlyMode } from "../readOnly.ts";
  import { getContext } from "svelte";
  import { store } from "$lib/state/store.svelte.ts";
  import { boundReviewChanges, dossierReviewContext } from "$lib/dossier/notification/snapshot.ts";
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type { FieldChange } from "@pitchou/types/notification.ts";
  import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

  let { dossierId, change }: { dossierId: DossierId; change?: FieldChange } = $props();
  const readOnly = readOnlyMode();
  const displayedDossier = getContext<(() => DossierFull) | undefined>(dossierReviewContext);
  let saving = $state(false);
  let failed = $state(false);
  async function acknowledge() {
    if (!change || readOnly.current || saving) return;
    const bound =
      displayedDossier &&
      boundReviewChanges(displayedDossier(), store.notificationByDossier.get(dossierId));
    if (
      !bound?.some(
        (item) =>
          item.field === change!.field &&
          change!.revisions.every((id) => item.revisions.includes(id)),
      )
    ) {
      failed = true;
      return;
    }
    saving = true;
    failed = false;
    try {
      await updateNotificationForDossier({ dossier: dossierId, revisions: [...change.revisions] });
    } catch {
      failed = true;
    } finally {
      saving = false;
    }
  }
</script>

{#if !readOnly.current && change}
  <span class="field-change">
    <span class="change-date"
      >{change.modified_at ? "Modifié le" : "Modification détectée le"}
      {formatDateAbsolute(new Date(change.modified_at ?? change.detected_at), "dd/MM/yyyy")}</span
    >
    <button
      type="button"
      class="review-check"
      disabled={saving || !displayedDossier}
      onclick={acknowledge}
      aria-label={`Valider la modification : ${change.label}`}
      title="J'ai pris connaissance de cette modification"
    >
      <span class="fr-icon-check-line fr-icon--sm" aria-hidden="true"></span>
    </button>
    {#if failed}<span role="alert">Échec de la validation. Réessayez.</span>{/if}
  </span>
{/if}

<style>
  .field-change {
    white-space: normal;
    display: flex;
    gap: 0.75rem;
    align-items: center;
    padding: 0.6875rem 0.75rem;
    border: 1px solid #ddd;
    border-radius: 0.25rem;
    background: #fff;
    font-size: 1rem;
    line-height: 1.5rem;
    color: #666;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
  .change-date {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .review-check {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 0;
    border-radius: 50%;
    background: #ddd;
    color: #666;
    flex-shrink: 0;
  }
  .review-check:hover {
    background: #ccc;
  }
  .review-check:disabled {
    opacity: 0.5;
  }
</style>
