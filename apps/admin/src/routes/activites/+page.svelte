<script lang="ts">
  import PageHelp from "$lib/components/PageHelp.svelte";
  import { can } from "$lib/access.svelte.ts";
  import { onMount } from "svelte";
  import Loader from "@pitchou/ui/Loader.svelte";
  import { AccessDeniedError } from "$lib/actions/errors.ts";
  import {
    createActivite,
    loadActiviteReferentiel,
    reloadActiviteReferentiel,
    moveActiviteToGroupe,
    reassignActiviteLabel,
    renameActivite,
    updateActiviteGroupe,
    type ActiviteReferentielAdmin,
  } from "$lib/actions/adminActivites.ts";
  import { pageHeader } from "$lib/pageHeader.svelte.ts";
  import {
    activiteSelectEntries,
    groupeSections,
    groupeSelectOptions,
    labelsToReview,
  } from "./activitesModel.ts";
  import GroupeSection from "./GroupeSection.svelte";
  import ModalAddActivite from "./ModalAddActivite.svelte";
  import ModalEditActivite from "./ModalEditActivite.svelte";
  import ReviewAlert from "./ReviewAlert.svelte";

  type Etat = "chargement" | "autorise" | "refuse";
  let etat = $state<Etat>("chargement");
  let referentiel = $state<ActiviteReferentielAdmin>({ groupes: [], activites: [], labels: [] });
  let loadError = $state<string | null>(null);
  let actionError = $state<string | null>(null);
  let modalOpen = $state(false);
  // Code of the activity whose edit modal is open, if any.
  let selectedCode = $state<string | null>(null);

  const sections = $derived(groupeSections(referentiel));
  const activiteEntries = $derived(activiteSelectEntries(referentiel));
  const groupeOptions = $derived(groupeSelectOptions(referentiel.groupes));
  const toReview = $derived(labelsToReview(referentiel));
  // Re-derived from the reloaded referentiel, so the open modal reflects every mutation.
  const selectedItem = $derived(
    sections
      .flatMap(({ activites: items }) => items)
      .find(({ activite }) => activite.code === selectedCode) ?? null,
  );
  const selectedColor = $derived(
    referentiel.groupes.find(({ code }) => code === selectedItem?.activite.groupe_code)?.color ??
      "#eeeeee",
  );

  async function load() {
    etat = "chargement";
    loadError = null;
    try {
      // Always fresh: this page is where labels registered by a DN sync get reviewed.
      referentiel = await reloadActiviteReferentiel();
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
    const confirmSaved = pageHeader.beginSave();
    try {
      await mutation();
      confirmSaved();
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
  const onMoveActivite = (code: string, groupeCode: string) =>
    apply(() => moveActiviteToGroupe(code, groupeCode));
  const onUpdateGroupe = (code: string, label: string, color: string) =>
    apply(() => updateActiviteGroupe(code, label, color));

  $effect(() => {
    if (etat !== "autorise" || !can("admin:activites:manage")) return;
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
  <!-- Single column with the same gap as the view padding (p-2 on <main>). -->
  <div class="admin-stack">
    <PageHelp title="Activités et libellés">
      <ul class="!m-0 list-disc !pl-5 text-sm">
        <li>
          Chaque dossier porte un libellé « Activité principale » saisi dans Démarches Numériques.
        </li>
        <li>
          Ces libellés sont rattachés à une <strong>activité Pitchou</strong> : quand un libellé est renommé
          côté Démarches Numériques, rattachez le nouveau libellé à l'activité existante pour que les
          dossiers restent regroupés.
        </li>
        <li>
          Les activités sont classées dans des <strong>groupes thématiques</strong> colorés. Cliquez sur
          une activité pour la renommer, gérer ses libellés ou changer son groupe.
        </li>
      </ul>

      <p class="fr-mt-2w">
        Le bouton + ajoute une activité. Les libellés à vérifier correspondent aux rattachements à
        contrôler après une synchronisation. Les modifications du référentiel s'appliquent au
        regroupement des dossiers existants.
      </p>
    </PageHelp>

    {#if actionError}
      <div
        class="fr-alert fr-alert--error fr-alert--sm rounded-xl border border-solid border-[color:var(--border-plain-error)] !bg-no-repeat ![background-image:linear-gradient(0deg,var(--border-plain-error),var(--border-plain-error))] ![background-position:0_0] ![background-size:2.5rem_100%]"
        role="alert"
      >
        <p>{actionError}</p>
      </div>
    {/if}

    {#if toReview.length > 0}
      <ReviewAlert labels={toReview} onReview={(activiteCode) => (selectedCode = activiteCode)} />
    {/if}

    {#each sections as section (section.groupe.code)}
      <GroupeSection
        {section}
        onSelect={({ activite }) => (selectedCode = activite.code)}
        {onUpdateGroupe}
      />
    {/each}
  </div>

  {#if selectedItem && can("admin:activites:manage")}
    <ModalEditActivite
      item={selectedItem}
      color={selectedColor}
      {activiteEntries}
      {groupeOptions}
      {onRename}
      {onReassign}
      {onMoveActivite}
      onClose={() => (selectedCode = null)}
    />
  {/if}

  {#if modalOpen && can("admin:activites:manage")}
    <ModalAddActivite
      {groupeOptions}
      onClose={() => (modalOpen = false)}
      onCreate={(label, groupeCode) => apply(() => createActivite(label, groupeCode))}
    />
  {/if}
{/if}
