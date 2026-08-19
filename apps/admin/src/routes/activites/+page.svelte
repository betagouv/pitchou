<script lang="ts">
  import { onMount } from "svelte";
  import Loader from "@pitchou/ui/Loader.svelte";
  import { AccessDeniedError } from "$lib/actions/errors.ts";
  import {
    createActivite,
    loadActiviteReferentiel,
    reassignActiviteLabel,
    renameActivite,
    type ActiviteReferentielAdmin,
  } from "$lib/actions/adminActivites.ts";
  import { pageHeader } from "$lib/pageHeader.svelte.ts";
  import { groupLabelsByActivite, labelsToReview } from "./activitesModel.ts";
  import ActivitesTable from "./ActivitesTable.svelte";
  import ModalAddActivite from "./ModalAddActivite.svelte";
  import ReviewAlert from "./ReviewAlert.svelte";

  type Etat = "chargement" | "autorise" | "refuse";
  let etat = $state<Etat>("chargement");
  let referentiel = $state<ActiviteReferentielAdmin>({ activites: [], labels: [] });
  let loadError = $state<string | null>(null);
  let actionError = $state<string | null>(null);
  let modalOpen = $state(false);

  const groups = $derived(groupLabelsByActivite(referentiel));
  const toReview = $derived(labelsToReview(referentiel));

  async function load() {
    etat = "chargement";
    loadError = null;
    try {
      referentiel = await loadActiviteReferentiel();
      etat = "autorise";
    } catch (e) {
      if (!(e instanceof AccessDeniedError)) loadError = e instanceof Error ? e.message : String(e);
      etat = "refuse";
    }
  }

  onMount(load);

  /**
   * Runs a mutation then reloads the referentiel so every component reflects the change —
   * including after a failure, so the controls fall back to the real state.
   */
  async function apply(mutation: () => Promise<void>) {
    actionError = null;
    try {
      await mutation();
    } catch (e) {
      if (e instanceof AccessDeniedError) {
        etat = "refuse";
        return;
      }
      actionError = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      if (etat === "autorise") {
        try {
          referentiel = await loadActiviteReferentiel();
        } catch {
          // Keep the data already displayed when the reload itself fails.
        }
      }
    }
  }

  const onRename = (code: string, label: string) => apply(() => renameActivite(code, label));
  const onReassign = (label: string, activiteCode: string) =>
    apply(() => reassignActiviteLabel(label, activiteCode));

  $effect(() => {
    if (etat !== "autorise") return;
    pageHeader.setAction({ label: "Ajouter une activité", onClick: () => (modalOpen = true) });
    return () => pageHeader.clearAction();
  });
</script>

<svelte:head>
  <title>Administration - activités — Pitchou</title>
</svelte:head>

{#if loadError}
  <div class="fr-alert fr-alert--error fr-mb-3w" role="alert">
    <h3 class="fr-alert__title">Erreur lors du chargement des activités</h3>
    <p>{loadError}</p>
  </div>
{:else if etat === "chargement"}
  <Loader />
{:else if etat === "refuse"}
  <div class="fr-alert fr-alert--error fr-mb-3w" role="alert">
    <h3 class="fr-alert__title">Accès réservé aux administrateurs</h3>
    <p>Cette page est réservée aux administrateurs Pitchou.</p>
  </div>
{:else}
  <p class="fr-mb-3w text-sm text-gray-600">
    Les activités listées ici sont celles de Pitchou : leur nom est affiché dans l'application et
    chacune regroupe un ou plusieurs libellés « Activité principale » venant de Démarches
    Numériques. Quand un libellé est renommé côté Démarches Numériques, rattachez le nouveau libellé
    à l'activité existante pour que les dossiers restent regroupés.
  </p>

  {#if actionError}
    <div class="fr-alert fr-alert--error fr-alert--sm fr-mb-2w" role="alert">
      <p>{actionError}</p>
    </div>
  {/if}

  {#if toReview.length > 0}
    <ReviewAlert labels={toReview} activites={referentiel.activites} {onReassign} />
  {/if}

  <ActivitesTable {groups} activites={referentiel.activites} {onRename} {onReassign} />

  {#if modalOpen}
    <ModalAddActivite
      onClose={() => (modalOpen = false)}
      onCreate={(label) => apply(() => createActivite(label))}
    />
  {/if}
{/if}
