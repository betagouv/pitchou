<script lang="ts">
  import { run } from "svelte/legacy";
  import { untrack } from "svelte";

  import debounce from "just-debounce-it";
  import TagPhase from "$lib/components/TagPhase.svelte";
  import {
    formatDateRelative,
    formatDateAbsolute,
    phases,
    prochaineActionAttenduePar,
  } from "$lib/dossier/displayDossier.ts";
  import { updateDossier } from "$lib/dossier/dossier.ts";
  import {
    instructeurLeavesDossier,
    instructeurFollowsDossier,
  } from "$lib/dossier/suiviDossier.ts";
  import { byteFormat } from "@pitchou/common/typeFormat.ts";
  import ModalAddPieceJointe from "./ModalAddPieceJointe.svelte";
  import DateInput from "../DateInput.svelte";

  import type Personne from "@pitchou/types/database/public/Personne.ts";
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";

  type Props = {
    dossier: DossierFull;
    dossierFollowers: NonNullable<Personne["email"]>[];
    email: string;
    currentDossierFollowedByCurrentInstructeur: boolean | undefined;
  };

  let { dossier, dossierFollowers, currentDossierFollowedByCurrentInstructeur, email }: Props =
    $props();

  const idModalAddPieceJointe = "modale-ajouter-piece-jointe";

  const otherAttachments = $derived(dossier.otherAttachments);

  let currentPhase = $derived(
    (dossier.evenementsPhase[0] && dossier.evenementsPhase[0].phase) || "Accompagnement amont",
  );

  let phase = $derived(currentPhase);
  let ddepRequired = $state(untrack(() => dossier.ddep_required));
  let erMesuresSufficient = $state(untrack(() => dossier.er_mesures_sufficient));
  let enjeu = $state(untrack(() => dossier.enjeu));
  let freeComment = $state(untrack(() => dossier.free_comment));
  let nextActionExpectedFrom = $state(untrack(() => dossier.next_action_expected_from));
  let onagreDemandeIdentifier = $state(untrack(() => dossier.onagre_demande_identifier));

  function dateToInputValue(date: Date | null | undefined): string {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function attachmentDetails(attachment: DossierFull["otherAttachments"][number]) {
    const details = [];
    const fileDescription = attachment.fichier_description;

    if (fileDescription?.media_type) {
      details.push(fileDescription.media_type);
    }
    if (typeof fileDescription?.size === "number") {
      details.push(byteFormat.format(fileDescription.size));
    }
    if (attachment.attachment_date) {
      details.push(`Date de la pièce jointe : ${formatDateAbsolute(attachment.attachment_date)}`);
    }

    return details.join(" - ");
  }

  let publicConsultationStartDate = $state<Date | null | undefined>(
    untrack(() => dossier.public_consultation_start_date),
  );
  let publicConsultationEndDate = $state<Date | null | undefined>(
    untrack(() => dossier.public_consultation_end_date),
  );

  /**
   * Converts the two fields ddep_required and er_mesures_sufficient into a composite value for the select
   */
  function getDDEPCompositeValue():
    | "oui"
    | "non_sans_objet"
    | "non_er_mesures_sufficient"
    | "a_determiner" {
    if (ddepRequired === true) {
      return "oui";
    } else if (ddepRequired === false) {
      if (erMesuresSufficient === false) {
        return "non_sans_objet";
      } else if (erMesuresSufficient === true) {
        return "non_er_mesures_sufficient";
      } else {
        // By default, if er_mesures_sufficient is null and ddep_required is false, we consider it "sans objet"
        return "non_sans_objet";
      }
    } else {
      // ddep_required is null or undefined
      return "a_determiner";
    }
  }
  let ddepCompositeValue = $state(getDDEPCompositeValue());

  let errorMessage = $state("");
  let showSuccessMessage = $state(false);

  const updateField: (updates: Partial<DossierFull>) => void = (updates) => {
    updateDossier(dossier, updates)
      .then(() => (showSuccessMessage = true))
      .catch((error) => {
        console.info(error);
        errorMessage = "Quelque chose s'est mal passé du côté serveur.";
      });
  };

  const updateFieldWithDebounce = debounce(updateField, 1000);

  run(() => {
    const updates: Partial<DossierFull> = {};

    if (currentPhase !== phase) {
      updates.evenementsPhase = [
        {
          dossier: dossier.id,
          timestamp: new Date(),
          phase: phase,
          caused_by_personne: null, // will be filled server-side with the right PersonneId
          demarche_numerique_agent_email: null,
          demarche_numerique_motivation: null,
        },
      ];
    }

    if (dossier.free_comment !== freeComment?.trim()) {
      updates.free_comment = freeComment?.trim();
    }

    if (dossier.next_action_expected_from !== nextActionExpectedFrom) {
      updates.next_action_expected_from = nextActionExpectedFrom;
    }

    if (dossier.onagre_demande_identifier !== onagreDemandeIdentifier?.trim()) {
      updates.onagre_demande_identifier = onagreDemandeIdentifier?.trim();
    }

    if (dossier.enjeu !== enjeu) {
      updates.enjeu = enjeu;
    }

    if (dossier.ddep_required !== ddepRequired) {
      updates.ddep_required = ddepRequired;
    }

    if (dossier.er_mesures_sufficient !== erMesuresSufficient) {
      updates.er_mesures_sufficient = erMesuresSufficient;
    }

    if (
      dateToInputValue(dossier.public_consultation_start_date) !==
      dateToInputValue(publicConsultationStartDate)
    ) {
      updates.public_consultation_start_date = publicConsultationStartDate ?? null;
    }

    if (
      dateToInputValue(dossier.public_consultation_end_date) !==
      dateToInputValue(publicConsultationEndDate)
    ) {
      updates.public_consultation_end_date = publicConsultationEndDate ?? null;
    }

    // Business rule: er_mesures_sufficient is always NULL if ddep_required is NULL
    if (ddepRequired === null) {
      if (dossier.er_mesures_sufficient !== null) {
        updates.er_mesures_sufficient = null;
      }
    }

    if (Object.keys(updates).length >= 1) {
      // We apply a debounce for fields typed on the keyboard (commentaire libre, N° Demande ONAGRE)
      if (updates.free_comment || updates.onagre_demande_identifier) {
        updateFieldWithDebounce(updates);
      } else {
        updateField(updates);
      }
    }
  });

  const dismissAlert = () => {
    errorMessage = "";
    showSuccessMessage = false;
  };

  function currentInstructeurFollowsDossier(id: Dossier["id"]) {
    return instructeurFollowsDossier(email, id);
  }

  function currentInstructeurLeavesDossier(id: Dossier["id"]) {
    return instructeurLeavesDossier(email, id);
  }

  /**
   * Updates the two fields ddep_required and er_mesures_sufficient from the composite value
   */
  function setDDEPCompositeValue(
    e: Event & { currentTarget: EventTarget & HTMLSelectElement },
  ): void {
    const value = e.currentTarget.value;
    if (value === "oui") {
      ddepRequired = true;
      erMesuresSufficient = false;
    } else if (value === "non_sans_objet") {
      ddepRequired = false;
      erMesuresSufficient = false;
    } else if (value === "non_er_mesures_sufficient") {
      ddepRequired = false;
      erMesuresSufficient = true;
    } else if (value === "a_determiner") {
      ddepRequired = null;
      erMesuresSufficient = null;
    }
  }
</script>

<section class="row">
  <section>
    {#if errorMessage}
      <div class="fr-alert fr-alert--error fr-mb-3w">
        <h3 class="fr-alert__title">Erreur lors de la mise à jour :</h3>
        <p>{errorMessage}</p>
      </div>
    {/if}
    {#if showSuccessMessage}
      <div class="fr-alert fr-alert--success fr-mb-3w">
        <p>Le dossier a bien été mis à jour.</p>
      </div>
    {/if}
    <h2>Historique</h2>
    <ol>
      {#each dossier.evenementsPhase as { phase, timestamp }}
        <li>
          <TagPhase {phase}></TagPhase>
          -
          <span title={formatDateAbsolute(timestamp)}>{formatDateRelative(timestamp)}</span>
        </li>
      {/each}
      <li>
        <TagPhase phase="Accompagnement amont"></TagPhase>
        -
        <strong>Dépôt dossier</strong>
        -
        <span title={formatDateAbsolute(dossier.depot_date)}
          >{formatDateRelative(dossier.depot_date)}</span
        >
      </li>
    </ol>

    <h2 class="fr-mt-3w">Personnes qui suivent ce dossier</h2>
    {#if dossierFollowers.length >= 1}
      <ul>
        {#each dossierFollowers as follower}
          <li id={follower}>{follower}</li>
        {/each}
      </ul>
    {:else}
      <div class="col">
        <span>Personne ne suit ce dossier pour l'instant.</span>
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
      </div>
    {/if}

    <h2 class="fr-mt-3w">Dates de consultation du public ou enquête publique</h2>
    <div class="fr-input-group" onfocusin={dismissAlert}>
      <label class="fr-label" for="public_consultation_start_date">
        <strong>Date de début</strong>
      </label>
      <DateInput
        id="public_consultation_start_date"
        label="Date de début"
        bind:date={publicConsultationStartDate}
      />
    </div>
    <div class="fr-input-group" onfocusin={dismissAlert}>
      <label class="fr-label" for="public_consultation_end_date">
        <strong>Date de fin</strong>
      </label>
      <DateInput
        id="public_consultation_end_date"
        label="Date de fin"
        bind:date={publicConsultationEndDate}
      />
    </div>

    <h2 class="fr-mt-3w">Autres pièces jointes</h2>
    {#if otherAttachments.length === 0}
      <p>Aucune autre pièce jointe n'est associée à ce dossier.</p>
    {:else}
      <ul class="other-attachments">
        {#each otherAttachments as attachment}
          {@const details = attachmentDetails(attachment)}
          <li>
            <a
              class="fr-link fr-link--download"
              href={attachment.fichier_url}
              title={attachment.fichier_description?.name ?? attachment.type}
              data-sveltekit-reload
            >
              {attachment.fichier_description?.name ?? attachment.type}
              {#if details}
                <span class="fr-link__detail">{attachment.type} - {details}</span>
              {/if}
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section>
    <div class="fr-toggle">
      <input
        type="checkbox"
        class="fr-toggle__input"
        id="toggle-enjeu"
        bind:checked={enjeu}
        onfocus={dismissAlert}
      />
      <label class="fr-toggle__label" for="toggle-enjeu"> Dossier à enjeu </label>
    </div>

    <div class="fr-input-group" id="input-group-commentaitre-libre">
      <strong
        ><label class="fr-label" for="input-commentaire-libre"> Commentaire libre </label></strong
      >
      <textarea
        onfocus={dismissAlert}
        class="fr-input resize-vertical"
        aria-describedby="input-commentaire-libre-messages"
        id="input-commentaire-libre"
        bind:value={freeComment}
        rows={8}
      ></textarea>
      <div class="fr-messages-group" id="input-commentaire-libre-messages" aria-live="polite"></div>
    </div>

    <div class="fr-input-group">
      <label class="fr-label" for="ddep-nécessaire">
        <strong>Une DDEP est-elle nécessaire ?</strong>
      </label>
      <select
        onfocus={dismissAlert}
        bind:value={ddepCompositeValue}
        onchange={setDDEPCompositeValue}
        class="fr-select"
        id="ddep-nécessaire"
      >
        <option value="oui">Oui</option>
        <option value="non_er_mesures_sufficient"
          >Non, mesures Éviter, Réduire (ER) suffisantes</option
        >
        <option value="non_sans_objet">Non, sans objet</option>
        <option value="a_determiner">À déterminer</option>
      </select>
    </div>

    <div class="fr-input-group">
      <label class="fr-label" for="phase">
        <strong>Phase du dossier</strong>
      </label>
      <select onfocus={dismissAlert} bind:value={phase} class="fr-select" id="phase">
        {#each [...phases] as phase}
          <option value={phase}>{phase}</option>
        {/each}
      </select>
    </div>
    <div class="fr-input-group">
      <label class="fr-label" for="next_action_expected_from">
        <strong>Prochaine action attendue de</strong>
      </label>

      <select
        onfocus={dismissAlert}
        bind:value={nextActionExpectedFrom}
        class="fr-select"
        id="next_action_expected_from"
      >
        {#each [...prochaineActionAttenduePar] as actor}
          <option value={actor}>{actor}</option>
        {/each}
      </select>
    </div>

    <div class="fr-input-group">
      <label class="fr-label" for="onagre_demande_identifier">
        <strong>N° Demande ONAGRE</strong>
      </label>
      <input
        onfocus={dismissAlert}
        class="fr-input"
        id="onagre_demande_identifier"
        type="text"
        bind:value={onagreDemandeIdentifier}
      />
    </div>
  </section>
</section>

<ModalAddPieceJointe
  id={idModalAddPieceJointe}
  {dossier}
  typesPiecesJointes={["Saisine expert", "Avis expert", "Décision administrative", "Autre"]}
  source="ongletInstruction"
/>

<style lang="scss">
  .row {
    display: flex;
    flex-direction: row;
    gap: 1rem;

    & > :nth-child(1) {
      flex: 3;
    }

    & > :nth-child(2) {
      flex: 2;
    }
  }

  section {
    margin-bottom: 2rem;
  }

  ol,
  ul {
    list-style: none;
    margin-top: 0;
    padding-left: 0;

    li {
      &::marker {
        content: none;
      }
    }
  }

  .resize-vertical {
    resize: vertical;
  }

  .col {
    display: flex;
    flex-direction: column;
  }

  .other-attachments {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
</style>
