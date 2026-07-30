<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";

  import Loader from "@pitchou/ui/Loader.svelte";

  import {
    loadDossierDetail,
    deleteDossier,
    AccessDeniedError,
    type AdminDossierDetail,
  } from "$lib/actions/adminDossiers.ts";
  import DossierAdminForm from "./DossierAdminForm.svelte";
  import DossierPhaseHistory from "./DossierPhaseHistory.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const dossierId = Number(page.params.dossierId);

  let detail = $state<AdminDossierDetail | null>(data.detail);
  let loadError = $state<string | null>(null);
  let accessDenied = $state(false);

  let confirmingDelete = $state(false);
  let deleting = $state(false);
  let deleteError = $state<string | null>(null);

  async function reload() {
    try {
      detail = await loadDossierDetail(dossierId);
    } catch (e) {
      if (e instanceof AccessDeniedError) {
        accessDenied = true;
      } else {
        loadError = e instanceof Error ? e.message : String(e);
      }
    }
  }

  async function confirmDelete() {
    deleting = true;
    deleteError = null;
    try {
      await deleteDossier(dossierId);
      await goto("/dossiers");
    } catch (e) {
      deleteError = e instanceof Error ? e.message : String(e);
    } finally {
      deleting = false;
    }
  }

</script>

<svelte:head>
  <title>Administration - dossier {detail?.dossier.name ?? dossierId} — Pitchou</title>
</svelte:head>

<a class="fr-link fr-icon-arrow-left-line fr-link--icon-left" href="/dossiers">
  Retour aux dossiers
</a>

{#if accessDenied}
  <div class="fr-alert fr-alert--error fr-my-3w" role="alert">
    <h3 class="fr-alert__title">Accès réservé aux administrateurs</h3>
    <p>Cette page est réservée aux administrateurs Pitchou.</p>
  </div>
{:else if loadError}
  <div class="fr-alert fr-alert--error fr-my-3w" role="alert">
    <h3 class="fr-alert__title">Erreur lors du chargement du dossier</h3>
    <p>{loadError}</p>
  </div>
{:else if !detail}
  <Loader />
{:else}
  <div class="flex flex-row items-center gap-4 flex-wrap fr-mt-2w">
    <h1 class="fr-mb-0">{detail.dossier.name || `Dossier ${detail.dossier.id}`}</h1>
    {#if detail.managedByDn}
      <span class="fr-badge fr-badge--info fr-badge--no-icon">
        DN nº{detail.dossier.demarche_numerique_number}
      </span>
    {:else}
      <span class="fr-badge fr-badge--green-emeraude">Créé dans Pitchou</span>
    {/if}
    <span class="fr-badge fr-badge--sm fr-badge--no-icon">{detail.phase}</span>
  </div>

  <p class="fr-text-mention--grey fr-mt-1w">
    {#if detail.groupe}
      Groupe instructeurs : {detail.groupe.name} ·
    {/if}
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
    {:else}
      (inconnu)
    {/if}
  </p>

  {#if detail.managedByDn}
    <div class="fr-alert fr-alert--info fr-my-2w">
      <p>
        Ce dossier est synchronisé depuis Démarches Numériques : les champs importés sont en lecture
        seule (la prochaine synchronisation les écraserait). Les champs propres à Pitchou restent
        modifiables.
      </p>
    </div>
  {/if}

  <DossierAdminForm {detail} onSaved={(updated) => (detail = updated)} onFilesChanged={reload} />

  <DossierPhaseHistory {detail} onChanged={(updated) => (detail = updated)} />

  {#if !detail.managedByDn}
    <section class="fr-mt-6w fr-pt-3w border-t border-[color:var(--border-default-grey)]">
      <h2 class="fr-h4">Supprimer le dossier</h2>
      {#if !confirmingDelete}
        <button
          type="button"
          class="fr-btn fr-btn--secondary fr-icon-delete-line fr-btn--icon-left"
          onclick={() => (confirmingDelete = true)}
        >
          Supprimer ce dossier
        </button>
      {:else}
        <div class="fr-alert fr-alert--warning fr-mb-2w">
          <p>
            La suppression est définitive : le dossier, ses évènements, avis, décisions et fichiers
            seront supprimés.
          </p>
        </div>
        {#if deleteError}
          <div class="fr-alert fr-alert--error fr-alert--sm fr-mb-2w" role="alert">
            <p>{deleteError}</p>
          </div>
        {/if}
        <div class="flex flex-row gap-4">
          <button type="button" class="fr-btn" disabled={deleting} onclick={confirmDelete}>
            {deleting ? "Suppression…" : "Confirmer la suppression"}
          </button>
          <button
            type="button"
            class="fr-btn fr-btn--secondary"
            onclick={() => (confirmingDelete = false)}
          >
            Annuler
          </button>
        </div>
      {/if}
    </section>
  {/if}
{/if}
