<script lang="ts">
  import { run } from "svelte/legacy";
  import { untrack } from "svelte";

  import debounce from "just-debounce-it";
  import TagPhase from "$lib/components/TagPhase.svelte";
  import {
    formatDateRelative,
    formatDateAbsolue,
    phases,
    prochaineActionAttenduePar,
  } from "$lib/dossier/affichageDossier.ts";
  import { modifierDossier } from "$lib/dossier/dossier.ts";
  import { instructeurLaisseDossier, instructeurSuitDossier } from "$lib/dossier/suiviDossier.ts";
  import { byteFormat } from "@pitchou/common/typeFormat.ts";
  import ModaleAjouterPièceJointe from "./ModaleAjouterPièceJointe.svelte";

  import type Personne from "@pitchou/types/database/public/Personne.ts";
  import type { DossierComplet } from "@pitchou/types/API_Pitchou.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";

  type Props = {
    dossier: DossierComplet;
    personnesQuiSuiventDossier: NonNullable<Personne["email"]>[];
    email: string;
    dossierActuelSuiviParInstructeurActuel: boolean | undefined;
  };

  let {
    dossier,
    personnesQuiSuiventDossier,
    dossierActuelSuiviParInstructeurActuel,
    email,
  }: Props = $props();

  const idModaleAjouterPieceJointe = "modale-ajouter-piece-jointe";

  const otherAttachments = $derived(dossier.attachmentAutres);

  let phaseActuelle = $derived(
    (dossier.évènementsPhase[0] && dossier.évènementsPhase[0].phase) || "Accompagnement amont",
  );

  let phase = $derived(phaseActuelle);
  let ddep_nécessaire = $state(untrack(() => dossier.ddep_nécessaire));
  let mesures_er_suffisantes = $state(untrack(() => dossier.mesures_er_suffisantes));
  let enjeu = $state(untrack(() => dossier.enjeu));
  let commentaire_libre = $state(untrack(() => dossier.commentaire_libre));
  let prochaine_action_attendue_par = $state(untrack(() => dossier.prochaine_action_attendue_par));
  let historique_identifiant_demande_onagre = $state(
    untrack(() => dossier.historique_identifiant_demande_onagre),
  );

  function dateToInputValue(date: Date | null | undefined): string {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function attachmentDetails(attachment: DossierComplet["attachmentAutres"][number]) {
    const details = [];
    const fileDescription = attachment.fichier_description;

    if (fileDescription?.media_type) {
      details.push(fileDescription.media_type);
    }
    if (typeof fileDescription?.taille === "number") {
      details.push(byteFormat.format(fileDescription.taille));
    }
    if (attachment.attachment_date) {
      details.push(`Date de la pièce jointe : ${formatDateAbsolue(attachment.attachment_date)}`);
    }

    return details.join(" - ");
  }

  let date_debut_consultation_public_str = $state(
    untrack(() => dateToInputValue(dossier.date_debut_consultation_public)),
  );
  let date_fin_consultation_public_str = $state(
    untrack(() => dateToInputValue(dossier.date_fin_consultation_public)),
  );

  /**
   * Convertit les deux champs ddep_nécessaire et mesures_er_suffisantes en une valeur composite pour le select
   */
  function getDDEPValeurComposite():
    | "oui"
    | "non_sans_objet"
    | "non_mesures_er_suffisantes"
    | "a_determiner" {
    if (ddep_nécessaire === true) {
      return "oui";
    } else if (ddep_nécessaire === false) {
      if (mesures_er_suffisantes === false) {
        return "non_sans_objet";
      } else if (mesures_er_suffisantes === true) {
        return "non_mesures_er_suffisantes";
      } else {
        // Par défaut, si mesures_er_suffisantes est null et ddep_nécessaire est false, on considère que c'est "sans objet"
        return "non_sans_objet";
      }
    } else {
      // ddep_nécessaire est null ou undefined
      return "a_determiner";
    }
  }
  let ddepValeurComposite = $state(getDDEPValeurComposite());

  let messageErreur = $state("");
  let afficherMessageSucces = $state(false);

  const modifierChamp: (modifs: Partial<DossierComplet>) => void = (modifs) => {
    modifierDossier(dossier, modifs)
      .then(() => (afficherMessageSucces = true))
      .catch((error) => {
        console.info(error);
        messageErreur = "Quelque chose s'est mal passé du côté serveur.";
      });
  };

  const modifierChampAvecDebounce = debounce(modifierChamp, 1000);

  run(() => {
    const modifs: Partial<DossierComplet> = {};

    if (phaseActuelle !== phase) {
      modifs.évènementsPhase = [
        {
          dossier: dossier.id,
          horodatage: new Date(),
          phase: phase,
          cause_personne: null, // sera rempli côté serveur avec le bon PersonneId
          DS_emailAgentTraitant: null,
          DS_motivation: null,
        },
      ];
    }

    if (dossier.commentaire_libre !== commentaire_libre?.trim()) {
      modifs.commentaire_libre = commentaire_libre?.trim();
    }

    if (dossier.prochaine_action_attendue_par !== prochaine_action_attendue_par) {
      modifs.prochaine_action_attendue_par = prochaine_action_attendue_par;
    }

    if (
      dossier.historique_identifiant_demande_onagre !==
      historique_identifiant_demande_onagre?.trim()
    ) {
      modifs.historique_identifiant_demande_onagre = historique_identifiant_demande_onagre?.trim();
    }

    if (dossier.enjeu !== enjeu) {
      modifs.enjeu = enjeu;
    }

    if (dossier.ddep_nécessaire !== ddep_nécessaire) {
      modifs.ddep_nécessaire = ddep_nécessaire;
    }

    if (dossier.mesures_er_suffisantes !== mesures_er_suffisantes) {
      modifs.mesures_er_suffisantes = mesures_er_suffisantes;
    }

    if (
      dateToInputValue(dossier.date_debut_consultation_public) !==
      date_debut_consultation_public_str
    ) {
      modifs.date_debut_consultation_public = date_debut_consultation_public_str
        ? new Date(date_debut_consultation_public_str)
        : null;
    }

    if (
      dateToInputValue(dossier.date_fin_consultation_public) !== date_fin_consultation_public_str
    ) {
      modifs.date_fin_consultation_public = date_fin_consultation_public_str
        ? new Date(date_fin_consultation_public_str)
        : null;
    }

    // Règle métier : mesures_er_suffisantes est toujours NULL si ddep_nécessaire est NULL
    if (ddep_nécessaire === null) {
      if (dossier.mesures_er_suffisantes !== null) {
        modifs.mesures_er_suffisantes = null;
      }
    }

    if (Object.keys(modifs).length >= 1) {
      // On applique un debounce pour les champs saisis au clavier (commentaire libre, N° Demande ONAGRE)
      if (modifs.commentaire_libre || modifs.historique_identifiant_demande_onagre) {
        modifierChampAvecDebounce(modifs);
      } else {
        modifierChamp(modifs);
      }
    }
  });

  const retirerAlert = () => {
    messageErreur = "";
    afficherMessageSucces = false;
  };

  function instructeurActuelSuitDossier(id: Dossier["id"]) {
    return instructeurSuitDossier(email, id);
  }

  function instructeurActuelLaisseDossier(id: Dossier["id"]) {
    return instructeurLaisseDossier(email, id);
  }

  /**
   * Met à jour les deux champs ddep_nécessaire et mesures_er_suffisantes à partir de la valeur composite
   */
  function setDDEPValeurComposite(
    e: Event & { currentTarget: EventTarget & HTMLSelectElement },
  ): void {
    const valeur = e.currentTarget.value;
    if (valeur === "oui") {
      ddep_nécessaire = true;
      mesures_er_suffisantes = false;
    } else if (valeur === "non_sans_objet") {
      ddep_nécessaire = false;
      mesures_er_suffisantes = false;
    } else if (valeur === "non_mesures_er_suffisantes") {
      ddep_nécessaire = false;
      mesures_er_suffisantes = true;
    } else if (valeur === "a_determiner") {
      ddep_nécessaire = null;
      mesures_er_suffisantes = null;
    }
  }
</script>

<section class="row">
  <section>
    {#if messageErreur}
      <div class="fr-alert fr-alert--error fr-mb-3w">
        <h3 class="fr-alert__title">Erreur lors de la mise à jour :</h3>
        <p>{messageErreur}</p>
      </div>
    {/if}
    {#if afficherMessageSucces}
      <div class="fr-alert fr-alert--success fr-mb-3w">
        <p>Le dossier a bien été mis à jour.</p>
      </div>
    {/if}
    <h2>Historique</h2>
    <ol>
      {#each dossier.évènementsPhase as { phase, horodatage }}
        <li>
          <TagPhase {phase}></TagPhase>
          -
          <span title={formatDateAbsolue(horodatage)}>{formatDateRelative(horodatage)}</span>
        </li>
      {/each}
      <li>
        <TagPhase phase="Accompagnement amont"></TagPhase>
        -
        <strong>Dépôt dossier</strong>
        -
        <span title={formatDateAbsolue(dossier.date_dépôt)}
          >{formatDateRelative(dossier.date_dépôt)}</span
        >
      </li>
    </ol>

    <h2 class="fr-mt-3w">Personnes qui suivent ce dossier</h2>
    {#if personnesQuiSuiventDossier.length >= 1}
      <ul>
        {#each personnesQuiSuiventDossier as personneQuiSuitDossier}
          <li id={personneQuiSuitDossier}>{personneQuiSuitDossier}</li>
        {/each}
      </ul>
    {:else}
      <div class="col">
        <span>Personne ne suit ce dossier pour l'instant.</span>
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
      </div>
    {/if}

    <h2 class="fr-mt-3w">Dates de consultation du public ou enquête publique</h2>
    <div class="fr-input-group">
      <label class="fr-label" for="date_debut_consultation_public">
        <strong>Date de début</strong>
      </label>
      <input
        onfocus={retirerAlert}
        class="fr-input"
        id="date_debut_consultation_public"
        type="date"
        bind:value={date_debut_consultation_public_str}
      />
    </div>
    <div class="fr-input-group">
      <label class="fr-label" for="date_fin_consultation_public">
        <strong>Date de fin</strong>
      </label>
      <input
        onfocus={retirerAlert}
        class="fr-input"
        id="date_fin_consultation_public"
        type="date"
        bind:value={date_fin_consultation_public_str}
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
              title={attachment.fichier_description?.nom ?? attachment.type}
              data-sveltekit-reload
            >
              {attachment.fichier_description?.nom ?? attachment.type}
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
        onfocus={retirerAlert}
      />
      <label class="fr-toggle__label" for="toggle-enjeu"> Dossier à enjeu </label>
    </div>

    <div class="fr-input-group" id="input-group-commentaitre-libre">
      <strong
        ><label class="fr-label" for="input-commentaire-libre"> Commentaire libre </label></strong
      >
      <textarea
        onfocus={retirerAlert}
        class="fr-input resize-vertical"
        aria-describedby="input-commentaire-libre-messages"
        id="input-commentaire-libre"
        bind:value={commentaire_libre}
        rows={8}
      ></textarea>
      <div class="fr-messages-group" id="input-commentaire-libre-messages" aria-live="polite"></div>
    </div>

    <div class="fr-input-group">
      <label class="fr-label" for="ddep-nécessaire">
        <strong>Une DDEP est-elle nécessaire ?</strong>
      </label>
      <select
        onfocus={retirerAlert}
        bind:value={ddepValeurComposite}
        onchange={setDDEPValeurComposite}
        class="fr-select"
        id="ddep-nécessaire"
      >
        <option value="oui">Oui</option>
        <option value="non_mesures_er_suffisantes"
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
      <select onfocus={retirerAlert} bind:value={phase} class="fr-select" id="phase">
        {#each [...phases] as phase}
          <option value={phase}>{phase}</option>
        {/each}
      </select>
    </div>
    <div class="fr-input-group">
      <label class="fr-label" for="prochaine_action_attendue_par">
        <strong>Prochaine action attendue de</strong>
      </label>

      <select
        onfocus={retirerAlert}
        bind:value={prochaine_action_attendue_par}
        class="fr-select"
        id="prochaine_action_attendue_par"
      >
        {#each [...prochaineActionAttenduePar] as acteur}
          <option value={acteur}>{acteur}</option>
        {/each}
      </select>
    </div>

    <div class="fr-input-group">
      <label class="fr-label" for="historique_identifiant_demande_onagre">
        <strong>N° Demande ONAGRE</strong>
      </label>
      <input
        onfocus={retirerAlert}
        class="fr-input"
        id="historique_identifiant_demande_onagre"
        type="text"
        bind:value={historique_identifiant_demande_onagre}
      />
    </div>
  </section>
</section>

<ModaleAjouterPièceJointe
  id={idModaleAjouterPieceJointe}
  {dossier}
  typesPiècesJointes={["Saisine expert", "Avis expert", "Décision administrative", "Autre"]}
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
