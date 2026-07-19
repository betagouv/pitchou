<script lang="ts">
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";
  import {
    formatDateAbsolute,
    formatLocalisation,
    formatPorteurDeProjet,
  } from "$lib/dossier/displayDossier.ts";
  import ModalButton from "$lib/components/DSFR/ModalButton.svelte";
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

<div class="card fr-p-2w" data-testid="carte-dossier">
  <div class="header">
    <div class="tag-nouveaute-and-nom-projet">
      {#if notificationViewed === false}
        <p class="fr-badge fr-badge--new">Nouveauté</p>
      {/if}
      <h3>
        <a href={`/dossier/${dossier.id}`} class="fr-link">
          <span class="truncate">{dossier.name || "(nom non renseigné)"}</span>
          <span class="fr-icon-arrow-right-line" aria-hidden="true"></span>
        </a>
      </h3>
    </div>
    <div class="action-buttons">
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
            <header class="modal-title">
              <h1 class="fr-modal__title">
                Commentaire dossier {dossier.name}
              </h1>
              <h2 class="fr-modal__title">
                {formatPorteurDeProjet(dossier)}
                &nbsp;-&nbsp;
                {formatLocalisation(dossier)}
              </h2>
            </header>
            <div class="modal-content">
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
    </div>
  </div>

  <div class="content">
    <div class="first-line">
      <div>
        <BadgePhase phase={dossier.phase} />
        <div>
          <span class="fr-icon-user-shared-2-line fr-icon--sm" aria-hidden="true"></span>
          <span class="fr-sr-only">Prochaine action attendue par</span>
          {dossier.next_action_expected_from || "(non renseignée)"}
        </div>
      </div>
      <div>
        <p class="dossier-number fr-text--sm">
          Dossier n°{dossier.demarche_numerique_number}
        </p>
        {#if dossier.enjeu}
          <p class="fr-badge fr-badge--pink-macaron">Dossier à enjeu</p>
        {/if}
      </div>
    </div>
    <div class="second-line">
      <div class="date-depot">
        <span class="fr-icon-calendar-event-line fr-icon--sm" aria-hidden="true"></span>
        <span class="fr-sr-only">Date de dépôt</span>
        <time datetime={formatDateAbsolute(dossier.depot_date, "yyyy-MM-dd")}
          >{formatDateAbsolute(dossier.depot_date, "dd/MM/yyyy")}</time
        >
      </div>
      <div class="porteur-de-projet">
        <span class="fr-icon-group-line fr-icon--sm" aria-hidden="true"></span>
        <span class="fr-sr-only">Porteur de projet</span>
        {formatPorteurDeProjet(dossier) || "(non renseigné)"}
      </div>
      <div class="location">
        <span class="fr-icon-map-pin-2-line fr-icon--sm" aria-hidden="true"></span>
        <span class="fr-sr-only">Localisation</span>
        {formatLocalisation(dossier) || "(non renseignée)"}
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .card {
    background: var(--background-default-grey);
    border-radius: 0.25rem;
  }

  .header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.75rem;
    min-width: 0;
    align-items: center;

    .tag-nouveaute-and-nom-projet {
      min-width: 0;
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;
      @media (max-width: 768px) {
        flex-direction: column;
        align-items: unset;
      }
    }

    .action-buttons {
      display: flex;
      flex-wrap: nowrap;
    }

    h3 {
      margin: 0;
      /* Permet d'aligner verticalement le titre avec les boutons d'actions */
      line-height: 1.2rem;
      min-width: 0;

      a {
        color: var(--text-title-grey);
        font-size: 1.25rem;
        line-height: 1.25rem;
        min-width: 0;

        display: flex;
        flex-direction: row;
        gap: 0.5rem;

        .truncate {
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
      }
    }
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 1rem;

    .first-line {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      flex-wrap: wrap;
    }

    .first-line > div {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .second-line {
      display: flex;
      flex-direction: row;
      gap: 4rem;
      flex-wrap: wrap;
      @media (max-width: 768px) {
        gap: 0.5rem;
      }
      .date-depot {
        white-space: nowrap;
      }
      .location {
        display: flex;
        justify-content: end;
        gap: 0.25rem;
        align-items: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        @media (max-width: 768px) {
          flex-basis: 100%;
          display: unset;
        }
      }
      .porteur-de-projet {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
        @media (max-width: 768px) {
          flex-basis: 100%;
        }
      }
    }
  }

  .dossier-number {
    margin-bottom: 0;
    color: var(--text-mention-grey);
  }

  .modal-title {
    h1 {
      margin-bottom: 0.8rem;
    }
    h2 {
      margin-bottom: 0.6rem;
      font-size: 1.1rem;
    }
  }
  .modal-content {
    white-space: preserve;
  }
</style>
