<script lang="ts">
  import type { AdminDossierDetail } from "$lib/actions/adminDossiers.ts";
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
    {:else}
      <span class="fr-badge fr-badge--grey">Source inconnue</span>
    {/if}
    <span class="fr-badge fr-badge--sm fr-badge--no-icon">{detail.phase}</span>
  </div>
  <p class="text-xs text-[var(--text-mention-grey)] mt-2 mb-0">
    {#if detail.groupes.length}Groupes instructeurs : {detail.groupes.map((g) => g.name).join(", ")} ·{/if}
    Demandeur :
    {#if detail.demandeur_personne_morale}
      {detail.demandeur_personne_morale.legal_name ?? detail.demandeur_personne_morale.siret}
    {:else if detail.demandeur_personne_physique}
      {[
        detail.demandeur_personne_physique.last_name,
        detail.demandeur_personne_physique.first_names,
      ]
        .filter(Boolean)
        .join(" ")}
    {:else}(inconnu){/if}
  </p>
</header>
