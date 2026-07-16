<script lang="ts">
  import { afterNavigate, goto } from "$app/navigation";
  import {
    formatLocalisation,
    formatPorteurDeProjet,
    formatDeposant,
  } from "$lib/dossier/affichageDossier.ts";
  import { afficherString } from "./affichageValeurs.ts";
  import TagPhase from "$lib/components/TagPhase.svelte";
  import ModaleAjouterPieceJointe from "./ModaleAjouterPieceJointe.svelte";
  import { sendEvenement } from "$lib/shared/aarri.ts";

  import { instructeurLeavesDossier, instructeurFollowsDossier } from "$lib/dossier/suiviDossier.ts";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";

  type Props = {
    dossier: DossierFull;
    email: string;
    dossierActuelSuiviParInstructeurActuel: boolean | undefined;
  };

  let { dossier, email, dossierActuelSuiviParInstructeurActuel }: Props = $props();

  const idModaleAjouterPieceJointe = "modale-ajouter-piece-jointe-entete";

  let phase = $derived(
    (dossier.évènementsPhase[0] && dossier.évènementsPhase[0].phase) || "Accompagnement amont",
  );

  // Email of the project holder (demandeur): the legal representative's email for a
  // personne morale, otherwise the personne physique's email. We intentionally do not
  // fall back to the deposant's email: the deposant is a distinct person who now has
  // their own line in the header.
  let porteurEmail = $derived(
    dossier.demandeur_personne_morale_siret
      ? dossier.representative_email
      : dossier.demandeur_personne_physique_email,
  );

  // Only show the deposant line when the deposant is a different person from the
  // project holder (e.g. a mandataire such as an engineering firm).
  let showDeposant = $derived(
    Boolean(dossier.déposant_nom || dossier.déposant_prénoms || dossier.déposant_email) &&
      (dossier.déposant_email !== porteurEmail ||
        formatDeposant(dossier) !== formatPorteurDeProjet(dossier)),
  );

  function instructeurActuelSuitDossier(id: Dossier["id"]) {
    return instructeurFollowsDossier(email, id);
  }

  function instructeurActuelLaisseDossier(id: Dossier["id"]) {
    return instructeurLeavesDossier(email, id);
  }

  // Track whether we reached this dossier through in-app navigation (`from` is
  // non-null). If so, the back button returns to the browser's previous page.
  // Otherwise (direct access to the dossier), redirect to the relevant list.
  let navigatedFromApp = $state(false);

  afterNavigate(({ from }) => {
    if (from) navigatedFromApp = true;
  });

  function retour() {
    if (navigatedFromApp) {
      history.back();
    } else {
      goto(dossierActuelSuiviParInstructeurActuel ? "/mes-dossiers" : "/tous-les-dossiers");
    }
  }
</script>

<header class="fr-mb-2w">
  <div class="entete-titre">
    <button
      type="button"
      class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-arrow-left-line fr-btn--icon-left"
      onclick={retour}
    >
      Retour
    </button>
    <h1 class="titre-dossier fr-mb-0">
      <span class="numero"
        >Dossier n°{dossier.number_demarches_simplifiées ?? "non renseigné"}&nbsp;:</span
      >
      {dossier.nom}
    </h1>
  </div>

  <div class="entete-infos">
    <section>
      <div>
        <span class="fr-icon-map-pin-2-fill fr-icon--sm" aria-hidden="true"></span>
        {formatLocalisation(dossier)}
      </div>
      <div>
        <span class="fr-icon-user-fill fr-icon--sm" aria-hidden="true"></span>
        <span>
          Porteur de projet&nbsp;:&nbsp;
          {#if porteurEmail}
            <a href={`mailto:${porteurEmail}`} target="_blank" rel="noopener noreferrer"
              >{formatPorteurDeProjet(dossier)}</a
            >
          {:else}
            {formatPorteurDeProjet(dossier)}
          {/if}
        </span>
      </div>
      {#if showDeposant}
        <div>
          <span class="fr-icon-user-fill fr-icon--sm" aria-hidden="true"></span>
          <span>
            Personne qui dépose le dossier&nbsp;:&nbsp;
            {#if dossier.déposant_email}
              <a href={`mailto:${dossier.déposant_email}`} target="_blank" rel="noopener noreferrer"
                >{formatDeposant(dossier)}</a
              >
            {:else}
              {formatDeposant(dossier)}
            {/if}
          </span>
        </div>
      {/if}
      <div>
        <span class="fr-icon-briefcase-fill fr-icon--sm" aria-hidden="true"></span>
        {dossier.activité_principale}
      </div>
    </section>

    <section>
      <div>
        <strong>Phase&nbsp;:&nbsp;</strong><TagPhase {phase}></TagPhase>
      </div>

      <div>
        <strong>Prochaine action de&nbsp;:&nbsp;</strong>
        {afficherString(dossier.prochaine_action_attendue_par)}
      </div>

      {#if dossier.enjeu}
        <div>
          <p class="fr-badge fr-badge--pink-macaron">Dossier à enjeu</p>
        </div>
      {/if}

      {#if dossier.rattaché_au_régime_ae}
        <div>
          <span class="fr-icon-pantone-fill fr-icon--sm" aria-hidden="true"></span>
          Autorisation environnementale
        </div>
      {/if}

      <div class="entete-actions">
        {#if typeof dossierActuelSuiviParInstructeurActuel === "boolean"}
          {#if dossierActuelSuiviParInstructeurActuel}
            <button
              onclick={() => instructeurActuelLaisseDossier(dossier.id)}
              class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-star-fill fr-btn--icon-left"
              >Ne plus suivre</button
            >
          {:else}
            <button
              onclick={() => instructeurActuelSuitDossier(dossier.id)}
              class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-star-line fr-btn--icon-left"
              >Suivre</button
            >
          {/if}
        {/if}

        <button
          type="button"
          class="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-attachment-line"
          aria-controls={idModaleAjouterPieceJointe}
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

<ModaleAjouterPieceJointe
  id={idModaleAjouterPieceJointe}
  {dossier}
  typesPiècesJointes={["Saisine expert", "Avis expert", "Décision administrative", "Autre"]}
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

  .entete-titre {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background-color: var(--background-alt-grey);
    border-bottom: 1px solid var(--border-default-grey);
  }

  .titre-dossier {
    font-size: 1.5rem;
    line-height: 1.3;
    color: var(--text-title-grey);

    .numero {
      color: var(--text-mention-grey);
      font-weight: 400;
    }
  }

  .entete-infos {
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

    .entete-actions {
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
