<script lang="ts">
  import { onMount } from "svelte";
  import { formatLocalisation } from "$lib/dossier/displayDossier.ts";
  import ActiviteIcon from "$lib/components/ActiviteIcon.svelte";
  import { activiteIconUrl } from "$lib/dossier/activiteIcon.ts";
  import DossierNotificationBadges from "$lib/components/DossierNotificationBadges.svelte";
  import TagEcheance from "$lib/components/TagEcheance.svelte";
  import ModalAddPieceJointe from "./ModalAddPieceJointe.svelte";
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import AssignDossierFollowersModal from "$lib/components/DossierFollowerAssignment/AssignDossierFollowersModal.svelte";
  import { readOnlyMode } from "./readOnly.ts";
  import HeaderActions from "./HeaderDossier/HeaderActions.svelte";
  import CompactDossierHeader from "./HeaderDossier/CompactDossierHeader.svelte";
  import { followersLabel } from "./HeaderDossier/labels.ts";
  import { activityBackground } from "./HeaderDossier/activityBackground.ts";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type Personne from "@pitchou/types/database/public/Personne.ts";

  type Props = {
    dossier: DossierFull;
    email: string;
    currentDossierFollowedByCurrentInstructeur: boolean | undefined;
    dossierFollowers: NonNullable<Personne["email"]>[];
    updated: boolean;
    onClose: () => void;
    /** Switches the dossier to read-only mode. */
    onEnterReadOnly: () => void;
  };

  let {
    dossier,
    email,
    currentDossierFollowedByCurrentInstructeur,
    dossierFollowers,
    updated,
    onClose,
    onEnterReadOnly,
  }: Props = $props();

  const readOnly = readOnlyMode();

  const idModalAddPieceJointe = "modale-ajouter-piece-jointe-entete";

  let followersModalOpen = $state(false);

  const background = $derived(activityBackground(activiteIconUrl(dossier.activite_label)));

  const followers = $derived(followersLabel(dossierFollowers));

  function openPieceJointeModal() {
    sendEvenement({
      type: "ouvrirModaleAjouterPieceJointe",
      details: { dossierId: dossier.id, source: "enteteDossier" },
    });
    const modalElement = document.getElementById(idModalAddPieceJointe);
    // @ts-ignore DSFR installs this browser global.
    if (modalElement) window.dsfr(modalElement).modal.disclose();
  }

  let header: HTMLElement;
  let headerOutOfView = $state(false);

  onMount(() => {
    const observer = new IntersectionObserver(([entry]) => {
      headerOutOfView = !entry.isIntersecting && entry.boundingClientRect.bottom <= 0;
    });
    observer.observe(header);
    return () => observer.disconnect();
  });
</script>

{#if headerOutOfView}
  <CompactDossierHeader {dossier} {updated} />
{/if}

<header bind:this={header} class="fr-mb-4w fr-mt-1w">
  <div class="flex flex-wrap items-center justify-end gap-2">
    <button
      type="button"
      class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-close-line fr-btn--icon-right"
      onclick={onClose}
    >
      Fermer le dossier
    </button>
  </div>

  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
    <div class="activity-illustration" style:background-color={background}>
      <ActiviteIcon mainActivite={dossier.activite_label} size="size-24 lg:size-28" />
    </div>

    <div class="flex min-w-0 grow flex-col gap-2">
      <div class="flex flex-wrap items-center gap-2">
        {#if dossier.enjeu}
          <p class="fr-badge fr-badge--sm fr-badge--no-icon fr-mb-0 enjeu-tag">Dossier à enjeu</p>
        {/if}
        {#if dossierFollowers.length === 0}
          <p class="fr-badge fr-badge--sm fr-badge--no-icon fr-badge--purple-glycine fr-mb-0">
            Sans instructeur-ice
          </p>
        {/if}
        <DossierNotificationBadges dossierId={dossier.id} />
        <TagEcheance dueDate={dossier.next_due_date} />
        <div class="ms-auto" role="status" aria-live="polite">
          {#if updated}
            <p class="fr-badge fr-badge--success fr-badge--sm fr-mb-0">Dossier mis à jour</p>
          {/if}
        </div>
      </div>

      <h2 class="fr-mb-0 dossier-title">
        {dossier.name}
      </h2>

      <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p class="fr-mb-0 flex items-center gap-2 main-location">
          <span
            class="fr-icon-map-pin-2-line fr-icon--sm flex-none text-[color:var(--text-mention-grey)]"
            aria-hidden="true"
          ></span>
          {formatLocalisation(dossier)}
        </p>

        <HeaderActions
          {dossier}
          {email}
          followersLabel={followers}
          followedByCurrentInstructeur={currentDossierFollowedByCurrentInstructeur}
          onOpenFollowers={() => (followersModalOpen = true)}
          onAddPieceJointe={openPieceJointeModal}
          {onEnterReadOnly}
        />
      </div>
    </div>
  </div>
</header>

{#if followersModalOpen}
  <AssignDossierFollowersModal
    dossierId={dossier.id}
    dossierName={dossier.name}
    onClose={() => (followersModalOpen = false)}
  />
{/if}

{#if !readOnly.current}
  <ModalAddPieceJointe
    id={idModalAddPieceJointe}
    {dossier}
    typesPiecesJointes={["Saisine expert", "Avis expert", "Décision administrative", "Autre"]}
    source="enteteDossier"
  />
{/if}

<style>
  .activity-illustration {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 112px;
    min-height: 160px;
    border-radius: 16px;
    overflow: hidden;
  }

  .dossier-title {
    overflow-wrap: anywhere;
  }

  .main-location {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .enjeu-tag {
    color: var(--blue-france-main-525, #6a6af4);
    background-color: var(--background-contrast-blue-france, #ececfe);
  }

  @media (max-width: 575px) {
    .activity-illustration {
      width: 96px;
      min-height: 128px;
    }
  }
</style>
