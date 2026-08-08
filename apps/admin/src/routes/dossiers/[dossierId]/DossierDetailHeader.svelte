<script lang="ts">
  import type { AdminDossierDetail } from "$lib/actions/adminDossiers.ts";
  let { detail, formId, saving }: { detail: AdminDossierDetail; formId: string; saving: boolean } =
    $props();
</script>

<header
  class="sticky top-0 z-40 bg-[var(--background-default-grey)] fr-py-2w border-b border-[color:var(--border-default-grey)]"
>
  <a class="fr-link fr-icon-arrow-left-line fr-link--icon-left" href="/dossiers"
    >Retour aux dossiers</a
  >
  <div class="flex flex-row items-center gap-4 flex-wrap fr-mt-2w">
    <h1 class="fr-mb-0">{detail.dossier.name || `Dossier ${detail.dossier.id}`}</h1>
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
    {#if detail.groupe}Groupe instructeurs : {detail.groupe.name} ·{/if} Demandeur :
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
