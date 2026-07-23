<script lang="ts">
  import { afterNavigate, goto } from "$app/navigation";
  import {
    formatLocalisation,
    formatPorteurDeProjet,
    hasMandataire,
    formatMandataire,
    formatDemandeurContact,
  } from "$lib/dossier/displayDossier.ts";
  import { displayString } from "./displayValues.ts";
  import TagPhase from "$lib/components/TagPhase.svelte";
  import ModalAddPieceJointe from "./ModalAddPieceJointe.svelte";
  import { sendEvenement } from "$lib/shared/aarri.ts";

  import {
    instructeurLeavesDossier,
    instructeurFollowsDossier,
  } from "$lib/dossier/suiviDossier.ts";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";

  type Props = {
    dossier: DossierFull;
    email: string;
    currentDossierFollowedByCurrentInstructeur: boolean | undefined;
  };

  let { dossier, email, currentDossierFollowedByCurrentInstructeur }: Props = $props();

  const idModalAddPieceJointe = "modale-ajouter-piece-jointe-entete";

  let phase = $derived(
    (dossier.evenementsPhase[0] && dossier.evenementsPhase[0].phase) || "Accompagnement amont",
  );

  // Email of the demandeur: the legal representative's email for a personne morale,
  // otherwise the personne physique's email.
  let demandeurEmail = $derived(
    dossier.demandeur_personne_morale_siret
      ? dossier.representative_email
      : dossier.demandeur_personne_physique_email,
  );

  // "Personne qui dépose le dossier (demandeur/mandataire)" line: shows the mandataire
  // when a third party filed the dossier, otherwise the demandeur's human contact.
  // Clicking mails the mandataire (with the demandeur in copy) when there is one,
  // otherwise the demandeur directly.
  let deposeurName = $derived(
    hasMandataire(dossier) ? formatMandataire(dossier) : formatDemandeurContact(dossier),
  );
  let deposeurTo = $derived(hasMandataire(dossier) ? dossier.mandataire_email : demandeurEmail);
  let deposeurCc = $derived(hasMandataire(dossier) ? demandeurEmail : null);
  let deposeurMailto = $derived(
    deposeurTo
      ? `mailto:${deposeurTo}${deposeurCc ? `?cc=${encodeURIComponent(deposeurCc)}` : ""}`
      : undefined,
  );

  // Hide this line when it would merely duplicate "Porteur de projet": that happens for
  // a personne physique with no mandataire (same person, same email). For a personne
  // morale it still adds the representative's human name, so we keep it.
  let showDeposeur = $derived(
    hasMandataire(dossier) || Boolean(dossier.demandeur_personne_morale_siret),
  );

  function currentInstructeurFollowsDossier(id: Dossier["id"]) {
    return instructeurFollowsDossier(email, id);
  }

  function currentInstructeurLeavesDossier(id: Dossier["id"]) {
    return instructeurLeavesDossier(email, id);
  }

  // Track whether we reached this dossier through in-app navigation (`from` is
  // non-null). If so, the back button returns to the browser's previous page.
  // Otherwise (direct access to the dossier), redirect to the relevant list.
  let navigatedFromApp = $state(false);

  afterNavigate(({ from }) => {
    if (from) navigatedFromApp = true;
  });

  function goBack() {
    if (navigatedFromApp) {
      history.back();
    } else {
      goto(currentDossierFollowedByCurrentInstructeur ? "/mes-dossiers" : "/tous-les-dossiers");
    }
  }
</script>

<header class="fr-mb-2w">
  <div class="header-title">
    <button
      type="button"
      class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-arrow-left-line fr-btn--icon-left"
      onclick={goBack}
    >
      Retour
    </button>
    <h1 class="title-dossier fr-mb-0">
      <span class="number"
        >Dossier n°{dossier.demarche_numerique_number ?? "non renseigné"}&nbsp;:</span
      >
      {dossier.name}
    </h1>
  </div>

  <div class="header-infos">
    <section>
      <div>
        <span class="fr-icon-map-pin-2-fill fr-icon--sm" aria-hidden="true"></span>
        {formatLocalisation(dossier)}
      </div>
      <div>
        <span class="fr-icon-user-fill fr-icon--sm" aria-hidden="true"></span>
        <span>
          Porteur de projet&nbsp;:&nbsp;
          {#if demandeurEmail}
            <a href={`mailto:${demandeurEmail}`} target="_blank" rel="noopener noreferrer"
              >{formatPorteurDeProjet(dossier)}</a
            >
          {:else}
            {formatPorteurDeProjet(dossier)}
          {/if}
        </span>
      </div>
      {#if showDeposeur}
        <div>
          <span class="fr-icon-user-fill fr-icon--sm" aria-hidden="true"></span>
          <span>
            Personne qui dépose le dossier (demandeur/mandataire)&nbsp;:&nbsp;
            {#if deposeurMailto}
              <a href={deposeurMailto} target="_blank" rel="noopener noreferrer">{deposeurName}</a>
            {:else}
              {deposeurName}
            {/if}
          </span>
        </div>
      {/if}
      <div>
        <span class="fr-icon-briefcase-fill fr-icon--sm" aria-hidden="true"></span>
        {dossier.main_activite}
      </div>
    </section>

    <section>
      <div>
        <strong>Phase&nbsp;:&nbsp;</strong><TagPhase {phase}></TagPhase>
      </div>

      <div>
        <strong>Prochaine action de&nbsp;:&nbsp;</strong>
        {displayString(dossier.next_action_expected_from)}
      </div>

      {#if dossier.enjeu}
        <div>
          <p class="fr-badge fr-badge--pink-macaron">Dossier à enjeu</p>
        </div>
      {/if}

      {#if dossier.linked_to_ae_regime}
        <div>
          <span class="fr-icon-pantone-fill fr-icon--sm" aria-hidden="true"></span>
          Autorisation environnementale
        </div>
      {/if}

      <div class="header-actions">
        {#if typeof currentDossierFollowedByCurrentInstructeur === "boolean"}
          {#if currentDossierFollowedByCurrentInstructeur}
            <button
              onclick={() => currentInstructeurLeavesDossier(dossier.id)}
              class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-star-fill fr-btn--icon-left"
              >Ne plus suivre</button
            >
          {:else}
            <button
              onclick={() => currentInstructeurFollowsDossier(dossier.id)}
              class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-star-line fr-btn--icon-left"
              >Suivre</button
            >
          {/if}
        {/if}

        <button
          type="button"
          class="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-attachment-line"
          aria-controls={idModalAddPieceJointe}
          data-fr-opened="false"
          onclick={() =>
            sendEvenement({
              type: "ouvrirModaleAjouterPieceJointe",
              détails: { dossierId: dossier.id, source: "enteteDossier" },
            })}
        >
          Ajouter une pièce jointe
        </button>
      </div>

      <!--
          <div>
              <span class="fr-icon-scales-3-fill" aria-hidden="true"></span>
              Contentieux
          </div>
          -->
    </section>
  </div>
</header>

<ModalAddPieceJointe
  id={idModalAddPieceJointe}
  {dossier}
  typesPiecesJointes={["Saisine expert", "Avis expert", "Décision administrative", "Autre"]}
  source="enteteDossier"
/>

<style lang="scss">
  header {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .header-title {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background-color: var(--background-alt-grey);
    border-bottom: 1px solid var(--border-default-grey);
  }

  .title-dossier {
    font-size: 1.5rem;
    line-height: 1.3;
    color: var(--text-title-grey);

    .number {
      color: var(--text-mention-grey);
      font-weight: 400;
    }
  }

  .header-infos {
    display: flex;
    flex-direction: row;
    gap: 2rem;
    padding: 1.5rem 1rem;

    & > :nth-child(1) {
      flex: 2;
    }
    & > :nth-child(2) {
      flex: 1;
      padding-left: 2rem;
      border-left: 1px solid var(--border-default-grey);
    }

    section > div {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    section > div:last-child {
      margin-bottom: 0;
    }

    .header-actions {
      flex-wrap: wrap;
      align-items: center;
      margin-top: 1rem;
    }

    // mute and shrink the leading icons of the info rows (not the buttons)
    section span[class*="fr-icon-"] {
      color: var(--text-mention-grey);
      flex: none;
    }
  }
</style>
