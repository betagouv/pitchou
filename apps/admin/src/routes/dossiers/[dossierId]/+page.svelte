<script lang="ts">
  import { can } from "$lib/access.svelte.ts";
  import { page } from "$app/state";

  import Loader from "@pitchou/ui/Loader.svelte";

  import { onMount } from "svelte";

  import { pageHeader } from "$lib/pageHeader.svelte.ts";
  import {
    loadActiviteReferentiel,
    type ActiviteReferentielAdmin,
  } from "$lib/actions/adminActivites.ts";
  import {
    loadDossierDetail,
    AccessDeniedError,
    type AdminDossierDetail,
  } from "$lib/actions/adminDossiers.ts";
  import { activiteFormContext } from "$lib/activiteReferentiel.ts";
  import DossierAdminForm from "./DossierAdminForm.svelte";
  import DossierNativeIntakeForm from "./DossierNativeIntakeForm.svelte";
  import DossierPhaseHistory from "./DossierPhaseHistory.svelte";
  import DossierSyncSimulation from "./DossierSyncSimulation.svelte";
  import DossierDetailHeader from "./DossierDetailHeader.svelte";
  import DossierDeleteSection from "./DossierDeleteSection.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const dossierId = Number(page.params.dossierId);
  const editFormId = "dossier-admin-edit-form";

  let detail = $derived<AdminDossierDetail | null>(data.detail);
  // The edit forms resolve the activity through the referentiel, so they render once it loads.
  let activiteReferentiel = $state<ActiviteReferentielAdmin | null>(null);
  // The forms stay usable (with an empty activity select) when only the referentiel fails.
  let activiteReferentielError = $state<string | null>(null);
  const { activites, activiteEntries, codeByLabel } = $derived(
    activiteFormContext(activiteReferentiel),
  );
  let loadError = $state<string | null>(null);
  let accessDenied = $state(false);
  let saving = $state(false);

  onMount(async () => {
    try {
      activiteReferentiel = await loadActiviteReferentiel();
    } catch (e) {
      if (e instanceof AccessDeniedError) accessDenied = true;
      else activiteReferentielError = e instanceof Error ? e.message : String(e);
    }
  });

  // The shell header shows the dossier name instead of the generic "Dossier".
  $effect(() => {
    if (detail) pageHeader.setTitle(detail.dossier.name || `Dossier ${detail.dossier.id}`);
    return () => pageHeader.clearTitle();
  });

  $effect(() => {
    if (
      detail?.source !== "pitchou" ||
      !can("admin:dossiers:update") ||
      accessDenied ||
      loadError ||
      (!activiteReferentiel && !activiteReferentielError)
    )
      return;
    pageHeader.setAction({
      label: saving ? "Enregistrement…" : "Enregistrer",
      icon: "fr-icon-save-line",
      disabled: saving,
      onClick: () => {
        const form = document.getElementById(editFormId);
        if (!saving && form instanceof HTMLFormElement) form.requestSubmit();
      },
    });
    return () => pageHeader.clearAction();
  });

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
  <div class="admin-stack">
    <DossierDetailHeader {detail} />

    {#if detail.source === "demarche_numerique"}
      <div class="fr-alert fr-alert--info my-0">
        <p>
          Ce dossier est synchronisé depuis Démarches Numériques et affiché en lecture seule. Les
          champs propres à Pitchou restent modifiables depuis l'application instructeurs.
        </p>
      </div>
    {:else if detail.source === "unknown"}
      <div class="fr-alert fr-alert--warning my-0">
        <p>La source de ce dossier est inconnue. Il est affiché en lecture seule.</p>
      </div>
    {/if}

    {#if activiteReferentielError}
      <div class="fr-alert fr-alert--warning my-0" role="alert">
        <p>
          Le référentiel des activités n'a pas pu être chargé : {activiteReferentielError}
          Le champ « Activité principale » peut être incomplet.
        </p>
      </div>
    {/if}

    {#if !activiteReferentiel && !activiteReferentielError}
      <Loader />
    {:else if detail.source !== "pitchou" || !can("admin:dossiers:update")}
      <DossierAdminForm
        {detail}
        {activites}
        {activiteEntries}
        activiteCodeByLabel={codeByLabel}
        formId={editFormId}
        onSavingChange={(value) => (saving = value)}
        onSaved={(updated) => (detail = updated)}
        onFilesChanged={reload}
      />
    {:else}
      <DossierNativeIntakeForm
        {detail}
        {activites}
        {activiteEntries}
        activiteCodeByLabel={codeByLabel}
        formId={editFormId}
        onSavingChange={(value) => (saving = value)}
        onSaved={(updated) => (detail = updated)}
        onFilesChanged={reload}
      />
    {/if}

    <DossierPhaseHistory
      {detail}
      readOnly={detail.source === "unknown" || !can("admin:dossiers:update")}
      onChanged={(updated) => (detail = updated)}
    />

    {#if data.simulation && can("admin:sync:simulate")}
      <DossierSyncSimulation
        dossierId={detail.dossier.id}
        champs={data.simulation.champs}
        speciesGroups={data.simulation.speciesGroups}
        simulable={detail.source === "demarche_numerique"}
      />
    {/if}

    {#if detail.source === "pitchou" && can("admin:dossiers:delete")}
      <DossierDeleteSection {dossierId} />
    {/if}
  </div>
{/if}
