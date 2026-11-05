<script lang="ts">
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import {
    organisationStatusLabel,
    organisationUncertaintyLabel,
  } from "@pitchou/common/porteurDeProjet.ts";
  import { applicantName } from "./presentation.ts";
  let { dossier, unread }: { dossier: DossierSummary; unread: boolean } = $props();
  const porteurDeProjet = $derived(applicantName(dossier));
</script>

<p
  class="dossier-text fr-mb-0 truncate {unread ? 'font-bold' : 'font-normal'}"
  title={porteurDeProjet}
>
  <span class="fr-sr-only">Porteur de projet&nbsp;:</span>
  {porteurDeProjet}
</p>
{#if dossier.porteur_de_projet?.type === "organisation"}
  <p
    class="fr-text--xs fr-mb-0 text-[color:var(--text-default-warning)]"
    title={organisationStatusLabel(dossier.porteur_de_projet)}
  >
    {organisationUncertaintyLabel(dossier.porteur_de_projet)}
  </p>
{/if}

<style>
  .dossier-text {
    font-size: 0.875rem;
    line-height: 1.5rem;
  }
</style>
