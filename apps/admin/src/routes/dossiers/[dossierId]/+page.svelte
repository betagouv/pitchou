<script lang="ts">
  import { can } from "#lib/access.svelte.ts";
  import { invalidateAll } from "$app/navigation";
  import { page } from "$app/state";

  import Loader from "@pitchou/ui/Loader.svelte";
  import { onMount } from "svelte";

  import { pageHeader } from "#lib/pageHeader.svelte.ts";
  import {
    loadActiviteReferentiel,
    type ActiviteReferentielAdmin,
  } from "#lib/actions/adminActivites.ts";
  import {
    loadDossierDetail,
    AccessDeniedError,
    type AdminDossierDetail,
  } from "#lib/actions/adminDossiers.ts";
  import DossierFieldsPanel from "./DossierFieldsPanel.svelte";
  import DossierAdminTabs from "./DossierAdminTabs.svelte";
  import DossierSyncSimulation from "./DossierSyncSimulation.svelte";
  import DossierDetailHeader from "./DossierDetailHeader.svelte";
  import DossierAccess from "./DossierAccess.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const dossierId = Number(page.params.dossierId);
  const editFormId = "dossier-admin-edit-form";

  let detail = $derived<AdminDossierDetail | null>(data.detail);
  // The edit forms resolve the activity through the referentiel, so they render once it loads.
  let activiteReferentiel = $state<ActiviteReferentielAdmin | null>(null);
  // The forms stay usable (with an empty activity select) when only the referentiel fails.
  let activiteReferentielError = $state<string | null>(null);
  let loadError = $state<string | null>(null);
  let accessDenied = $state(false);
  let saving = $state(false);
  let selectedTab = $state("dossier");
  const simulationAvailable = $derived(!!data.simulation && can("admin:sync:simulate"));
  const activeTab = $derived(
    selectedTab === "simulation" && !simulationAvailable ? "dossier" : selectedTab,
  );

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
      activeTab !== "dossier" ||
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
        const form = document.querySelector(`#${editFormId}`);
        if (!saving && form instanceof HTMLFormElement) form.requestSubmit();
      },
    });
    return () => pageHeader.clearAction();
  });

  async function reload(updated?: AdminDossierDetail) {
    try {
      detail = updated ?? (await loadDossierDetail(dossierId));
      // Routing changes also affect the server-loaded assignments and effective user access.
      await invalidateAll();
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
    <DossierAdminTabs
      current={activeTab}
      simulation={simulationAvailable}
      onChange={(tab) => (selectedTab = tab)}
    />
    <div
      id="dossier-panel-dossier"
      role="tabpanel"
      aria-labelledby="dossier-tab-dossier"
      tabindex="0"
      hidden={activeTab !== "dossier"}
    >
      <DossierFieldsPanel
        {detail}
        referentiel={activiteReferentiel}
        referentielError={activiteReferentielError}
        formId={editFormId}
        bind:saving
        onChanged={reload}
      />
    </div>
    <div
      id="dossier-panel-access"
      role="tabpanel"
      aria-labelledby="dossier-tab-access"
      tabindex="0"
      hidden={activeTab !== "access"}
    >
      <DossierAccess
        {dossierId}
        assignments={data.assignments}
        userAccess={data.userAccess}
        onChanged={reload}
        activityLabels={Object.fromEntries(
          (activiteReferentiel?.activites ?? []).map((activity) => [activity.code, activity.label]),
        )}
      />
    </div>
    {#if simulationAvailable && data.simulation}
      <div
        id="dossier-panel-simulation"
        role="tabpanel"
        aria-labelledby="dossier-tab-simulation"
        tabindex="0"
        hidden={activeTab !== "simulation"}
      >
        <DossierSyncSimulation
          dossierId={detail.dossier.id}
          champs={data.simulation.champs}
          speciesGroups={data.simulation.speciesGroups}
          simulable={detail.source === "demarche_numerique"}
        />
      </div>
    {/if}
  </div>
{/if}
