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
      >Modifié le
      {formatDateAbsolute(new Date(change.modified_at ?? change.detected_at), "dd/MM/yyyy")}</span
    >
    <button
      type="button"
      class="review-check"
      disabled={saving || !displayedDossier}
      aria-busy={saving}
      onclick={acknowledge}
      aria-label={`Valider la modification : ${change.label}`}
      title="J'ai pris connaissance de cette modification"
    >
      <span class="fr-icon-check-line fr-icon--sm" aria-hidden="true"></span>
      Vu
    </button>
    {#if failed}<span role="alert">Échec de la validation. Réessayez.</span>{/if}
  </span>
{/if}

<style>
  .field-change {
    position: relative;
    white-space: normal;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.5rem 1rem;
    align-items: center;
    justify-self: end;
    margin-left: auto;
    width: fit-content;
    padding: 1rem;
    border-radius: 0.25rem;
    filter: drop-shadow(0 2px 4px #00000026);
    background: #fff;
    font-size: 1rem;
    line-height: 1.5rem;
    color: #666;
    max-width: min(100%, 18.75rem);
    min-width: 0;
    box-sizing: border-box;
  }
  .field-change::before {
    content: "";
    position: absolute;
    right: 100%;
    top: 50%;
    transform: translateY(-50%);
    border: 0.5rem solid transparent;
    border-left: 0;
    border-right-color: #fff;
  }
  .change-date {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .review-check {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 0 0.5rem;
    height: 2rem;
    border: 0;
    border-radius: 0.25rem;
    background: var(--background-action-high-blue-france, #000091);
    color: #fff;
    font: inherit;
  }
  .review-check:hover:not(:disabled) {
    background: var(--background-action-high-blue-france-hover, #1212ff);
  }
  .review-check:focus-visible {
    outline: 2px solid #0a76f6;
    outline-offset: 2px;
  }
  .review-check:disabled {
    opacity: 0.5;
  }
  [role="alert"] {
    grid-column: 1 / -1;
  }
  @media (max-width: 48rem) {
    .field-change::before {
      display: none;
    }
  }
</style>
