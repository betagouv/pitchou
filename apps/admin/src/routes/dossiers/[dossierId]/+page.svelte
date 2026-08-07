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
  import DossierNativeIntakeForm from "./DossierNativeIntakeForm.svelte";
  import DossierPhaseHistory from "./DossierPhaseHistory.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const dossierId = Number(page.params.dossierId);
  const editFormId = "dossier-admin-edit-form";

  let detail = $derived<AdminDossierDetail | null>(data.detail);
  let loadError = $state<string | null>(null);
  let accessDenied = $state(false);
  let saving = $state(false);

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

{#if accessDenied}
  <a class="fr-link fr-icon-arrow-left-line fr-link--icon-left" href="/dossiers">
    Retour aux dossiers
  </a>
  <div class="fr-alert fr-alert--error fr-my-3w" role="alert">
    <h3 class="fr-alert__title">Accès réservé aux administrateurs</h3>
    <p>Cette page est réservée aux administrateurs Pitchou.</p>
  </div>
{:else if loadError}
  <a class="fr-link fr-icon-arrow-left-line fr-link--icon-left" href="/dossiers">
    Retour aux dossiers
  </a>
  <div class="fr-alert fr-alert--error fr-my-3w" role="alert">
    <h3 class="fr-alert__title">Erreur lors du chargement du dossier</h3>
    <p>{loadError}</p>
  </div>
{:else if !detail}
  <a class="fr-link fr-icon-arrow-left-line fr-link--icon-left" href="/dossiers">
    Retour aux dossiers
  </a>
  <Loader />
{:else}
  <header
    class="sticky top-0 z-40 bg-[var(--background-default-grey)] fr-py-2w border-b border-[color:var(--border-default-grey)]"
  >
    <a class="fr-link fr-icon-arrow-left-line fr-link--icon-left" href="/dossiers">
      Retour aux dossiers
    </a>
    <div class="flex flex-row items-center gap-4 flex-wrap fr-mt-2w">
      <h1 class="fr-mb-0">{detail.dossier.name || `Dossier ${detail.dossier.id}`}</h1>
      {#if detail.source === "demarche_numerique"}
        <span class="fr-badge fr-badge--info fr-badge--no-icon">
          {detail.dossier.demarche_numerique_number
            ? `DN nº${detail.dossier.demarche_numerique_number}`
            : "Démarches Numériques"}
        </span>
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
          form={editFormId}
          disabled={saving}
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      {/if}
    </div>

    <p class="fr-text-mention--grey fr-mt-1w fr-mb-0">
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
  </header>

  {#if detail.source === "demarche_numerique"}
    <div class="fr-alert fr-alert--info fr-my-2w">
      <p>
        Ce dossier est synchronisé depuis Démarches Numériques et affiché en lecture seule. Les
        champs propres à Pitchou restent modifiables depuis l'application instructeurs.
      </p>
    </div>
  {:else if detail.source === "unknown"}
    <div class="fr-alert fr-alert--warning fr-my-2w">
      <p>La source de ce dossier est inconnue. Il est affiché en lecture seule.</p>
    </div>
  {/if}

  {#if detail.source !== "pitchou"}
    <DossierAdminForm
      {detail}
      formId={editFormId}
      onSavingChange={(value) => (saving = value)}
      onSaved={(updated) => (detail = updated)}
      onFilesChanged={reload}
    />
  {:else}
    <DossierNativeIntakeForm
      {detail}
      formId={editFormId}
      onSavingChange={(value) => (saving = value)}
      onSaved={(updated) => (detail = updated)}
      onFilesChanged={reload}
    />
  {/if}

  <DossierPhaseHistory
    {detail}
    readOnly={detail.source === "unknown"}
    onChanged={(updated) => (detail = updated)}
  />

  {#if detail.source === "pitchou"}
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
