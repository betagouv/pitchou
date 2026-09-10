<script lang="ts">
  import ActiviteIcon from "$lib/components/ActiviteIcon.svelte";
  import { formatLocalisation } from "$lib/dossier/displayDossier.ts";
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

  let { dossier, updated }: { dossier: DossierFull; updated: boolean } = $props();
</script>

<div class="compact-header" data-testid="sticky-dossier-header">
  <div class="pitchou-container compact-contents">
    <ActiviteIcon mainActivite={dossier.activite_label} size="size-10" />
    <div class="compact-description">
      <p class="compact-title fr-mb-0" title={dossier.name ?? undefined}>{dossier.name}</p>
      <p class="compact-location fr-mb-0">
        <span class="fr-icon-map-pin-2-line fr-icon--sm" aria-hidden="true"></span>
        <span>{formatLocalisation(dossier)}</span>
      </p>
    </div>
    {#if updated}
      <p class="fr-badge fr-badge--success fr-badge--sm fr-mb-0 saved-tag">Dossier mis à jour</p>
    {/if}
  </div>
</div>

<style>
  .compact-header {
    position: fixed;
    inset: 0 0 auto;
    z-index: 500;
    background: var(--background-default-grey);
    box-shadow: 0 2px 8px #00000029;
  }

  .compact-contents {
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 72px;
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .compact-description {
    flex: 1;
    min-width: 0;
  }

  .compact-title,
  .compact-location span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .compact-title {
    font-weight: 700;
    color: var(--text-title-grey);
  }

  .compact-location {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.875rem;
  }

  .saved-tag {
    flex-shrink: 0;
  }

  @media (max-width: 575px) {
    .compact-contents {
      gap: 8px;
    }

    .saved-tag {
      max-width: 108px;
      white-space: normal;
    }
  }
</style>
