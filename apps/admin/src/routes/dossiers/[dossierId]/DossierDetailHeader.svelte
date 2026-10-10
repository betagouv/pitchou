<script lang="ts">
  import { porteurDeProjetName } from "@pitchou/common/porteurDeProjet.ts";
  import type { AdminDossierDetail } from "$lib/actions/adminDossiers.ts";
  let { detail, formId, saving }: { detail: AdminDossierDetail; formId: string; saving: boolean } =
    $props();
</script>

<!-- Sticks right below the admin shell topbar (h-14). -->
<header
  class="sticky top-14 z-20 bg-[var(--background-default-grey)] fr-py-2w border-b border-[color:var(--border-default-grey)]"
>
  <!-- The dossier name lives in the shell header title; this bar keeps badges and actions. -->
  <div class="flex flex-row items-center gap-4 flex-wrap">
    {#if detail.source === "demarche_numerique"}
      <span class="fr-badge fr-badge--info fr-badge--no-icon"
        >{detail.dossier.demarche_numerique_number
          ? `DN nº${detail.dossier.demarche_numerique_number}`
          : "Démarches Numériques"}</span
      >
    {:else if detail.source === "pitchou"}
      <span class="fr-badge fr-badge--green-emeraude">Créé dans Pitchou</span>
    {:else}
      <span class="fr-badge fr-badge--grey">Source inconnue</span>
    {/if}
    <span class="fr-badge fr-badge--sm fr-badge--no-icon">{detail.phase}</span>
    {#if detail.source === "pitchou"}
      <button
        class="fr-btn fr-icon-save-line fr-btn--icon-left ml-auto"
        type="submit"
        form={formId}
        disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button
      >
    {/if}
  </div>
  <p class="fr-text-mention--grey fr-mt-1w fr-mb-0">
    {#if detail.groupe}Groupe instructeurs : {detail.groupe.name} ·{/if} Porteur de projet :
    {porteurDeProjetName(detail.porteur_de_projet) ??
      (detail.porteur_de_projet?.type === "personne_morale"
        ? `SIRET ${detail.porteur_de_projet.siret}`
        : "Non renseigné")}
  </p>
</header>
