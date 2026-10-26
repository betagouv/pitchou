<script lang="ts">
  import { porteurDeProjetName } from "@pitchou/common/porteurDeProjet.ts";
  import type { AdminDossierDetail } from "#lib/actions/adminDossiers.ts";
  let { detail }: { detail: AdminDossierDetail } = $props();
</script>

<header
  class="rounded-xl border border-[var(--border-default-grey)] bg-[var(--background-lifted-grey)] p-3"
>
  <!-- The dossier name and save action live in the shell header. -->
  <div class="flex flex-row items-center gap-2 flex-wrap">
    {#if detail.source === "demarche_numerique"}
      <span class="fr-badge fr-badge--info fr-badge--no-icon"
        >{detail.dossier.demarche_numerique_number
          ? `DN nº${detail.dossier.demarche_numerique_number}`
          : "Démarches Numériques"}</span
      >
    {:else if detail.source === "pitchou"}
      <span class="fr-badge fr-badge--green-emeraude">Créé dans Pitchou</span>
    {:else if detail.source === "onagre"}
      <span class="fr-badge fr-badge--info fr-badge--no-icon">Importé d’Onagre</span>
    {:else}
      <span class="fr-badge fr-badge--grey">Source inconnue</span>
    {/if}
    <span class="fr-badge fr-badge--sm fr-badge--no-icon">{detail.phase}</span>
  </div>
  <p class="text-xs text-[var(--text-mention-grey)] mt-2 mb-0">
    {#if detail.groupes.length}Groupes instructeurs : {detail.groupes.map((g) => g.name).join(", ")} ·{/if}
    Porteur de projet :
    {porteurDeProjetName(detail.porteur_de_projet) ??
      (detail.porteur_de_projet?.type === "personne_morale"
        ? `SIRET ${detail.porteur_de_projet.siret}`
        : "Non renseigné")}
  </p>
</header>
