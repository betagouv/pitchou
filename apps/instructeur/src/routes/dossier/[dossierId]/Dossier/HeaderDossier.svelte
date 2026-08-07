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
  import DossierActionsMenu from "$lib/components/DossierFollowerAssignment/DossierActionsMenu.svelte";

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
      : (dossier.demandeur_personne_physique_email ?? dossier.deposant_email),
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

<header
  class="fr-mb-2w flex flex-col overflow-hidden rounded-[0.5rem] border border-[color:var(--border-default-grey)]"
>
  <div
    class="flex flex-row items-center gap-4 px-4 py-3 bg-[var(--background-alt-grey)] border-b border-[color:var(--border-default-grey)]"
  >
    <button
      type="button"
      class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-arrow-left-line fr-btn--icon-left"
      onclick={goBack}
    >
      Retour
    </button>
    <h1 class="fr-mb-0 text-[1.5rem] leading-[1.3] text-[color:var(--text-title-grey)]">
      <span class="font-normal text-[color:var(--text-mention-grey)]"
        >{dossier.source === "demarche_numerique"
          ? dossier.demarche_numerique_number
            ? `Dossier n°${dossier.demarche_numerique_number}`
            : `Dossier DN · identifiant Pitchou n°${dossier.id}`
          : dossier.source === "pitchou"
            ? `Dossier Pitchou n°${dossier.id}`
            : `Dossier n°${dossier.id} · source inconnue`}&nbsp;:</span
      >
      {dossier.name}
    </h1>
  </div>

  <div class="flex flex-row gap-8 px-4 py-6">
    <section class="flex-[2]">
      <div class="flex items-center gap-2 mb-2">
        <span
          class="fr-icon-map-pin-2-fill fr-icon--sm flex-none text-[color:var(--text-mention-grey)]"
          aria-hidden="true"
        ></span>
        {formatLocalisation(dossier)}
      </div>
      <div class="flex items-center gap-2 mb-2">
        <span
          class="fr-icon-user-fill fr-icon--sm flex-none text-[color:var(--text-mention-grey)]"
          aria-hidden="true"
        ></span>
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
        <div class="flex items-center gap-2 mb-2">
          <span
            class="fr-icon-user-fill fr-icon--sm flex-none text-[color:var(--text-mention-grey)]"
            aria-hidden="true"
          ></span>
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
      <div class="flex items-center gap-2 mb-0">
        <span
          class="fr-icon-briefcase-fill fr-icon--sm flex-none text-[color:var(--text-mention-grey)]"
          aria-hidden="true"
        ></span>
        {dossier.main_activite}
      </div>
    </section>

    <section class="flex-1 pl-8 border-l border-[color:var(--border-default-grey)]">
      <div class="flex items-center gap-2 mb-2">
        <strong>Phase&nbsp;:&nbsp;</strong><TagPhase {phase}></TagPhase>
      </div>

      <div class="flex items-center gap-2 mb-2">
        <strong>Prochaine action de&nbsp;:&nbsp;</strong>
        {displayString(dossier.next_action_expected_from)}
      </div>

      {#if dossier.enjeu}
        <div class="flex items-center gap-2 mb-2">
          <p class="fr-badge fr-badge--pink-macaron">Dossier à enjeu</p>
        </div>
      {/if}

      {#if dossier.linked_to_ae_regime}
        <div class="flex items-center gap-2 mb-2">
          <span
            class="fr-icon-pantone-fill fr-icon--sm flex-none text-[color:var(--text-mention-grey)]"
            aria-hidden="true"
          ></span>
          Autorisation environnementale
        </div>
      {/if}

      <div class="flex items-center gap-2 mb-0 flex-wrap mt-4">
        {#if typeof currentDossierFollowedByCurrentInstructeur === "boolean"}
          {#if currentDossierFollowedByCurrentInstructeur}
            <button
              onclick={() => currentInstructeurLeavesDossier(dossier.id)}
              class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-star-fill fr-btn--icon-left"
              >Ne plus suivre ce dossier</button
            >
          {:else}
            <button
              onclick={() => currentInstructeurFollowsDossier(dossier.id)}
              class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-star-line fr-btn--icon-left"
              >Suivre ce dossier</button
            >
          {/if}
        {/if}

        <DossierActionsMenu dossierId={dossier.id} dossierName={dossier.name} />

        <button
          type="button"
          class="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-attachment-line"
          aria-controls={idModalAddPieceJointe}
          data-fr-opened="false"
          onclick={() =>
            sendEvenement({
              type: "ouvrirModaleAjouterPieceJointe",
              details: { dossierId: dossier.id, source: "enteteDossier" },
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
