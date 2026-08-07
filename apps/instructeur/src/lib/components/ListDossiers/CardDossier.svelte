<script lang="ts">
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";
  import {
    formatDateAbsolute,
    formatLocalisation,
    formatPorteurDeProjet,
  } from "$lib/dossier/displayDossier.ts";
  import ModalButton from "$lib/components/DSFR/ModalButton.svelte";
  import DossierActionsMenu from "$lib/components/DossierFollowerAssignment/DossierActionsMenu.svelte";
  import BadgePhase from "./BadgePhase.svelte";

  type Props = {
    dossier: DossierSummary;
    currentInstructeurFollowsDossier: (id: Dossier["id"]) => Promise<void>;
    currentInstructeurLeavesDossier: (id: Dossier["id"]) => Promise<void>;
    notificationViewed: boolean;
    dossierFollowedByCurrentInstructeur: boolean;
  };

  let {
    dossier,
    dossierFollowedByCurrentInstructeur,
    currentInstructeurFollowsDossier,
    currentInstructeurLeavesDossier,
    notificationViewed,
  }: Props = $props();
</script>

<div
  class="fr-p-2w bg-[var(--background-default-grey)] rounded-[0.25rem]"
  data-testid="card-dossier"
>
  <div class="flex flex-row items-center justify-between gap-4 mb-3 min-w-0">
    <div
      class="flex flex-row items-center gap-2 min-w-0 max-[768px]:flex-col max-[768px]:items-stretch"
    >
      {#if notificationViewed === false}
        <p class="fr-badge fr-badge--new">Nouveauté</p>
      {/if}
      <h3 class="m-0 leading-[1.2rem] min-w-0">
        <a
          href={`/dossier/${dossier.id}`}
          class="fr-link flex flex-row gap-2 min-w-0 text-[1.25rem] leading-[1.25rem] text-[color:var(--text-title-grey)]"
        >
          <span class="truncate">{dossier.name || "(nom non renseigné)"}</span>
          <span class="fr-icon-arrow-right-line" aria-hidden="true"></span>
        </a>
      </h3>
    </div>
    <div class="flex flex-nowrap">
      {#if dossier.free_comment && dossier.free_comment !== ""}
        {@const dsfrModaleId = `dsfr-modale-commentaire-${dossier.id}`}
        <ModalButton id={dsfrModaleId}>
          {#snippet openButton()}
            <button
              type="button"
              class="fr-btn fr-icon-chat-3-line fr-btn--secondary fr-btn--sm"
              aria-controls={dsfrModaleId}
              data-fr-opened="false"
            >
              Commentaire
            </button>
          {/snippet}
          {#snippet content()}
            <header>
              <h1 class="fr-modal__title mb-[0.8rem]">
                Commentaire dossier {dossier.name}
              </h1>
              <h2 class="fr-modal__title mb-[0.6rem] text-[1.1rem]">
                {formatPorteurDeProjet(dossier)}
                &nbsp;-&nbsp;
                {formatLocalisation(dossier)}
              </h2>
            </header>
            <div class="[white-space:preserve]">
              {dossier.free_comment}
            </div>
          {/snippet}
        </ModalButton>
      {/if}
      {#if dossierFollowedByCurrentInstructeur}
        <button
          type="button"
          class="fr-btn fr-icon-star-fill fr-btn--tertiary-no-outline fr-btn--sm"
          onclick={() => currentInstructeurLeavesDossier(dossier.id)}>Ne plus suivre</button
        >
      {:else}
        <button
          type="button"
          class="fr-btn fr-icon-star-line fr-btn--tertiary-no-outline fr-btn--sm"
          onclick={() => currentInstructeurFollowsDossier(dossier.id)}>Suivre</button
        >
      {/if}
      <DossierActionsMenu dossierId={dossier.id} dossierName={dossier.name} />
    </div>
  </div>

  <div class="flex flex-col gap-4">
    <div class="flex flex-row justify-between flex-wrap">
      <div class="flex flex-row items-center gap-4 flex-wrap">
        <BadgePhase phase={dossier.phase} />
        <div>
          <span class="fr-icon-user-shared-2-line fr-icon--sm" aria-hidden="true"></span>
          <span class="fr-sr-only">Prochaine action attendue par</span>
          {dossier.next_action_expected_from || "(non renseignée)"}
        </div>
      </div>
      <div class="flex flex-row items-center gap-4 flex-wrap">
        <p class="fr-text--sm mb-0 text-[color:var(--text-mention-grey)]">
          {#if dossier.source === "demarche_numerique"}
            {dossier.demarche_numerique_number
              ? `Dossier n°${dossier.demarche_numerique_number}`
              : `Dossier DN · identifiant Pitchou n°${dossier.id}`}
          {:else if dossier.source === "pitchou"}
            Dossier Pitchou n°{dossier.id}
          {:else}
            Dossier n°{dossier.id} · source inconnue
          {/if}
        </p>
        {#if dossier.enjeu}
          <p class="fr-badge fr-badge--pink-macaron">Dossier à enjeu</p>
        {/if}
      </div>
    </div>
    <div class="flex flex-row gap-16 flex-wrap max-[768px]:gap-2">
      <div class="whitespace-nowrap">
        <span class="fr-icon-calendar-event-line fr-icon--sm" aria-hidden="true"></span>
        <span class="fr-sr-only">Date de dépôt</span>
        <time datetime={formatDateAbsolute(dossier.depot_date, "yyyy-MM-dd")}
          >{formatDateAbsolute(dossier.depot_date, "dd/MM/yyyy")}</time
        >
      </div>
      <div class="flex-1 whitespace-nowrap overflow-hidden text-ellipsis max-[768px]:basis-full">
        <span class="fr-icon-group-line fr-icon--sm" aria-hidden="true"></span>
        <span class="fr-sr-only">Porteur de projet</span>
        {formatPorteurDeProjet(dossier) || "(non renseigné)"}
      </div>
      <div
        class="flex justify-end items-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis max-[768px]:basis-full max-[768px]:inline"
      >
        <span class="fr-icon-map-pin-2-line fr-icon--sm" aria-hidden="true"></span>
        <span class="fr-sr-only">Localisation</span>
        {formatLocalisation(dossier) || "(non renseignée)"}
      </div>
    </div>
  </div>
</div>
