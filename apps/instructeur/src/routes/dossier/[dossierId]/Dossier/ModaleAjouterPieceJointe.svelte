<script lang="ts">
  import { addAttachmentAutre } from "./attachmentAutre.ts";
  import { addOrUpdateAvisExpert } from "./avisExpert.ts";
  import { saveNewDecisionAdministrative } from "./Controles/decisionAdministrative.ts";
  import { refreshDossierComplet } from "$lib/dossier/dossier.ts";
  import { formatDateAbsolue } from "$lib/dossier/affichageDossier.ts";
  import { envoyerEvenement } from "$lib/shared/aarri.ts";
  import { uploadSizeHint, uploadSizeError } from "$lib/upload/uploadSizeHint.ts";
  import DateInput from "../DateInput.svelte";
  import FormDecisionAdministrative from "./Controles/FormDecisionAdministrative.svelte";

  import type {
    DossierComplet,
    FrontEndAvisExpert,
    DecisionAdministrativeForTransfer,
  } from "@pitchou/types/API_Pitchou.ts";
  import type { EvenementPieceJointeSource } from "@pitchou/types/evenement.d.ts";

  type TypePieceJointe = "Décision administrative" | "Avis expert" | "Saisine expert" | "Autre";

  type Props = {
    id: string;
    dossier: Pick<DossierComplet, "id" | "avisExpert">;
    typesPiècesJointes?: TypePieceJointe[];
    afficherChoixType?: boolean;
    typePièceJointeInitial?: TypePieceJointe;
    source: EvenementPieceJointeSource;
  };

  let {
    id,
    dossier,
    typesPiècesJointes: typesPiecesJointes = ["Saisine expert", "Avis expert"],
    afficherChoixType = true,
    typePièceJointeInitial: typePieceJointeInitial,
    source,
  }: Props = $props();

  const idTitreH2 = $derived(`${id}-title`);

  const OPTIONS_SERVICE_EXPERT = ["CSRPN", "CNPN", "Ministre", "Autre expert"];

  let fileListPieceJointe: FileList | undefined = $state();

  function typePieceJointeParDefaut() {
    return typePieceJointeInitial ?? (!afficherChoixType ? (typesPiecesJointes[0] ?? null) : null);
  }

  // User-facing radio labels; the TypePièceJointe values stay unchanged.
  function pieceJointeTypeLabel(type: TypePieceJointe): string {
    switch (type) {
      case "Saisine expert":
        return "Saisine CNPN / CSRPN";
      case "Avis expert":
        return "Avis (CNPN, CSRPN, CBN, PNA, etc.)";
      default:
        return type;
    }
  }

  let typePieceJointe: TypePieceJointe | null = $state(typePieceJointeParDefaut());

  let serviceOuPersonneExperte: string | null = $state(null);

  let autreExpertTexte: string | null = $state(null);

  // expert's avis (favorable, unfavorable...)
  let avis: string | null = $state(null);

  let dateSaisine: FrontEndAvisExpert["date_saisine"] | undefined = $state();

  let dateAvis: FrontEndAvisExpert["date_avis"] | undefined = $state();

  let otherAttachmentType = $state("");

  let otherAttachmentDate: Date | undefined | null = $state();

  let avisExpertSelectionne: FrontEndAvisExpert["id"] | "nouvel-avis-expert" | null = $state(null);

  let messageErreur: string | null = $state(null);

  let modale: HTMLElement | undefined;

  let fileInput: HTMLInputElement | undefined = $state();

  let saisinesSansAvis = $derived(
    dossier.avisExpert.filter(
      (ae) =>
        (ae.date_saisine !== null || ae.saisine_fichier_url !== null) &&
        ae.avis === null &&
        ae.date_avis === null,
    ),
  );

  let afficherChampTypePieceJointe = $derived(afficherChoixType && typesPiecesJointes.length > 1);

  let ajouterUneNouvellePieceJointeP: Promise<void> = $state(Promise.resolve());

  // Automatically pre-check the saisine if there is only one
  $effect(() => {
    if (
      typePieceJointe === "Avis expert" &&
      saisinesSansAvis.length === 1 &&
      avisExpertSelectionne === null
    ) {
      avisExpertSelectionne = saisinesSansAvis[0].id;
      serviceOuPersonneExperte = saisinesSansAvis[0].expert;
    }
  });

  let formulaireValidePourSaisineExpert = $derived(
    typePieceJointe === "Saisine expert" && serviceOuPersonneExperte !== null,
  );
  let formulaireValidePourAvisExpert = $derived(
    typePieceJointe === "Avis expert" &&
      avisExpertSelectionne !== null &&
      (avisExpertSelectionne === "nouvel-avis-expert" ? serviceOuPersonneExperte !== null : true) &&
      // The Ministre, CNPN and CSRPN experts are necessarily linked to an avis (compliant, non-compliant...)
      (serviceOuPersonneExperte === "Ministre" ||
      serviceOuPersonneExperte === "CNPN" ||
      serviceOuPersonneExperte === "CSRPN"
        ? avis !== null
        : true),
  );

  let formulaireValide = $derived(
    fileListPieceJointe &&
      fileListPieceJointe.length > 0 &&
      typePieceJointe !== null &&
      typePieceJointe !== undefined &&
      (formulaireValidePourSaisineExpert ||
        formulaireValidePourAvisExpert ||
        (typePieceJointe === "Autre" && otherAttachmentType.trim() !== "")),
  );

  function envoyerEvenementAjouterPieceJointe(
    typePieceJointe: TypePieceJointe,
    nombreFichiers: number,
  ) {
    envoyerEvenement({
      type: "ajouterPieceJointe",
      détails: {
        dossierId: dossier.id,
        source,
        typePieceJointe,
        nombreFichiers,
      },
    });
  }

  async function ajouterPieceJointe() {
    if (!fileListPieceJointe || fileListPieceJointe.length === 0) {
      return;
    }

    messageErreur = null;

    const erreurTaille = uploadSizeError(fileListPieceJointe);
    if (erreurTaille) {
      messageErreur = erreurTaille;
      return;
    }

    try {
      if (typePieceJointe === "Saisine expert") {
        // Create a new avis expert with the saisine
        const fichierSaisine = fileListPieceJointe[0];
        const expert =
          serviceOuPersonneExperte === "Autre expert" ? autreExpertTexte : serviceOuPersonneExperte;
        const avisExpertACreer = {
          dossier: dossier.id,
          expert: expert,
          date_saisine: dateSaisine,
        };

        ajouterUneNouvellePieceJointeP = addOrUpdateAvisExpert(
          avisExpertACreer,
          fichierSaisine,
          undefined,
        )
          .then(() => {
            envoyerEvenementAjouterPieceJointe("Saisine expert", 1);
            return refreshDossierComplet(dossier.id).then(() => fermerModale());
          })
          .catch((e) => (messageErreur = e.message || "Une erreur est survenue"));
      } else if (typePieceJointe === "Avis expert") {
        // Either modify an existing saisine by adding the avis, or create a new one
        const fichierAvis = fileListPieceJointe[0];

        if (avisExpertSelectionne === "nouvel-avis-expert") {
          // Create a new avis expert
          const expert =
            serviceOuPersonneExperte === "Autre expert"
              ? autreExpertTexte
              : serviceOuPersonneExperte;
          const avisExpertACreer: Pick<FrontEndAvisExpert, "dossier"> &
            Partial<FrontEndAvisExpert> = {
            dossier: dossier.id,
            expert: expert,
            avis,
            date_saisine: dateSaisine,
            date_avis: dateAvis,
          };
          ajouterUneNouvellePieceJointeP = addOrUpdateAvisExpert(
            avisExpertACreer,
            undefined,
            fichierAvis,
          )
            .then(() => {
              envoyerEvenementAjouterPieceJointe("Avis expert", 1);
              return refreshDossierComplet(dossier.id).then(() => fermerModale());
            })
            .catch((e) => (messageErreur = e.message || "Une erreur est survenue"));
        } else if (avisExpertSelectionne) {
          // Add the avis to an existing saisine
          const saisineExistant = dossier.avisExpert.find((ae) => ae.id === avisExpertSelectionne);
          if (saisineExistant) {
            const avisExpertAModifier = {
              id: saisineExistant.id,
              dossier: dossier.id,
              expert: saisineExistant.expert,
              date_avis: dateAvis,
              avis,
            };
            ajouterUneNouvellePieceJointeP = addOrUpdateAvisExpert(
              avisExpertAModifier,
              undefined,
              fichierAvis,
            )
              .then(() => {
                envoyerEvenementAjouterPieceJointe("Avis expert", 1);
                return refreshDossierComplet(dossier.id).then(() => fermerModale());
              })
              .catch((e) => (messageErreur = e.message || "Une erreur est survenue"));
          }
        }
      } else if (typePieceJointe === "Autre") {
        const nombreFichiers = fileListPieceJointe.length;
        ajouterUneNouvellePieceJointeP = addAttachmentAutre(
          dossier.id,
          otherAttachmentType,
          otherAttachmentDate,
          fileListPieceJointe,
        )
          .then(() => {
            envoyerEvenementAjouterPieceJointe("Autre", nombreFichiers);
            return refreshDossierComplet(dossier.id).then(() => fermerModale());
          })
          .catch((e) => (messageErreur = e.message || "Une erreur est survenue"));
      }
    } catch (e) {
      // @ts-ignore
      messageErreur = e.message || "Une erreur est survenue";
    }
  }

  async function ajouterDecisionAdministrative(decision: DecisionAdministrativeForTransfer) {
    await saveNewDecisionAdministrative(decision);
    if (decision.fichier_base64) {
      envoyerEvenementAjouterPieceJointe("Décision administrative", 1);
    }
    fermerModale();
  }

  function reinitialiserLeFormulaireSaufTypePieceJointe() {
    fileListPieceJointe = undefined;
    if (fileInput) {
      fileInput.value = "";
    }
    serviceOuPersonneExperte = null;
    autreExpertTexte = null;
    avis = null;
    dateSaisine = null;
    avisExpertSelectionne = null;
    messageErreur = null;
    dateAvis = null;
    otherAttachmentType = "";
    otherAttachmentDate = null;
  }

  function fermerModale() {
    // Reset the states
    reinitialiserLeFormulaireSaufTypePieceJointe();
    typePieceJointe = typePieceJointeParDefaut();

    if (modale) {
      //@ts-ignore
      window.dsfr(modale).modal.conceal();
    }
  }
</script>

<dialog bind:this={modale} {id} class="fr-modal" aria-labelledby={idTitreH2}>
  <div class="fr-container fr-container--fluid fr-container-md">
    <div class="fr-grid-row fr-grid-row--center">
      <div class="fr-col-12 fr-col-md-10 fr-col-lg-8">
        <div class="fr-modal__body">
          <div class="fr-modal__header">
            <button
              aria-controls={id}
              title="Fermer"
              type="button"
              class="fr-btn--close fr-btn"
              onclick={fermerModale}>Fermer</button
            >
          </div>
          <div class="fr-modal__content">
            <h2 id={idTitreH2} class="fr-modal__title">Ajouter une pièce jointe</h2>
            <p class="fr-text--sm fr-mb-2w">
              <span class="obligatoire-asterisque">*</span>
              Champs obligatoires
            </p>
            {#if afficherChampTypePieceJointe}
              <div class="fr-fieldset fr-mt-3w" id="champ-type-piece-jointe-group">
                <legend
                  class="fr-fieldset__legend--regular fr-fieldset__legend"
                  id="champ-type-piece-jointe-group"
                >
                  Type de pièce jointe
                  <span class="obligatoire-asterisque">*</span>
                </legend>
                <div class="conteneur-boutons-radios">
                  {#each typesPiecesJointes as type}
                    {@const idRadio = `type-piece-jointe-${type.replace(/\s+/g, "-").toLowerCase()}-${id}`}
                    <div class="fr-fieldset__element">
                      <div class="fr-radio-group">
                        <input
                          required
                          type="radio"
                          id={idRadio}
                          name="type-piece-jointe-{id}"
                          value={type}
                          onchange={() => reinitialiserLeFormulaireSaufTypePieceJointe()}
                          bind:group={typePieceJointe}
                        />
                        <label class="fr-label" for={idRadio}>
                          {pieceJointeTypeLabel(type)}
                        </label>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
            {#if typePieceJointe === "Décision administrative"}
              <FormDecisionAdministrative
                décisionAdministrative={{ dossier: dossier.id }}
                onValider={ajouterDecisionAdministrative}
                onAnnuler={fermerModale}
              />
            {:else if typePieceJointe}
              <form
                onsubmit={(e) => {
                  e.preventDefault();
                  ajouterPieceJointe();
                }}
              >
                <div class="fr-upload-group fr-mt-3w">
                  <label class="fr-label" for="upload-piece-jointe">
                    {#if typePieceJointe === "Avis expert" || typePieceJointe === "Saisine expert"}
                      Choisir un fichier
                    {:else}
                      Choisir un ou plusieurs fichiers
                    {/if}
                    <span class="obligatoire-asterisque">*</span>
                    <span class="fr-hint-text"
                      >{uploadSizeHint()} Formats supportés&nbsp;: xls, ods, pdf, odt.</span
                    >
                  </label>
                  <input
                    required
                    bind:this={fileInput}
                    accept=".xls,.ods,.pdf,.odt"
                    bind:files={fileListPieceJointe}
                    class="fr-upload"
                    aria-describedby="upload-piece-jointe-messages"
                    type="file"
                    id="upload-piece-jointe"
                    name="upload"
                    multiple={typePieceJointe !== "Avis expert" &&
                      typePieceJointe !== "Saisine expert"}
                  />
                  <div
                    class="fr-messages-group"
                    id="upload-piece-jointe-messages"
                    aria-live="polite"
                  ></div>
                </div>
                {#if typePieceJointe === "Saisine expert"}
                  <div class="fr-fieldset fr-mt-3w" id="champ-service-expert-group">
                    <legend
                      class="fr-fieldset__legend--regular fr-fieldset__legend"
                      id="champ-service-expert-group"
                    >
                      Service ou personne experte
                      <span class="obligatoire-asterisque">*</span>
                    </legend>
                    <div class="conteneur-boutons-radios">
                      {#each OPTIONS_SERVICE_EXPERT as service}
                        {@const idRadio = `service-expert-${service.replace(/\s+/g, "-").toLowerCase()}-${id}`}
                        <div class="fr-fieldset__element">
                          <div class="fr-radio-group">
                            <input
                              required
                              type="radio"
                              id={idRadio}
                              name="service-expert-{id}"
                              value={service}
                              bind:group={serviceOuPersonneExperte}
                              onchange={() => {
                                if (service !== "Autre expert") autreExpertTexte = null;
                              }}
                            />
                            <label class="fr-label" for={idRadio}>
                              {service}
                            </label>
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>
                  <div class="fr-mt-3w">
                    <label class="fr-input-group fr-label" for="modale-date-saisine-{id}"
                      >Date de la saisine</label
                    >
                    <DateInput id={`modale-date-saisine-${id}`} bind:date={dateSaisine} />
                  </div>
                  {#if serviceOuPersonneExperte === "Autre expert"}
                    <div class="fr-input-group fr-mt-3w">
                      <label class="fr-label" for="autre-expert-texte-{id}">Précisez l'expert</label
                      >
                      <input
                        class="fr-input"
                        type="text"
                        id="autre-expert-texte-{id}"
                        bind:value={autreExpertTexte}
                        placeholder="Nom de l'expert"
                      />
                    </div>
                  {/if}
                {/if}

                {#if typePieceJointe === "Avis expert"}
                  {@const idRadioNouvel = `avis-expert-selection-nouvel-${id}`}
                  <div class="fr-fieldset fr-mt-3w" id="champ-avis-expert-selection-group">
                    <legend
                      class="fr-fieldset__legend--regular fr-fieldset__legend"
                      id="champ-avis-expert-selection-group"
                    >
                      Sélectionner la saisine correspondante
                    </legend>
                    <div class="conteneur-boutons-radios-vertical">
                      {#if saisinesSansAvis.length > 0}
                        {#each saisinesSansAvis as saisine}
                          {@const idRadio = `avis-expert-selection-${saisine.id}-${id}`}
                          <div class="fr-fieldset__element">
                            <div class="fr-radio-group">
                              <input
                                type="radio"
                                id={idRadio}
                                name="avis-expert-selection-{id}"
                                value={saisine.id}
                                bind:group={avisExpertSelectionne}
                                onchange={() => (serviceOuPersonneExperte = saisine.expert)}
                              />
                              <label class="fr-label" for={idRadio}>
                                Saisine {saisine.expert || "Expert"}{saisine.date_saisine
                                  ? ` - ${formatDateAbsolue(saisine.date_saisine)}`
                                  : ""}
                              </label>
                            </div>
                          </div>
                        {/each}
                      {/if}
                      <div class="fr-fieldset__element">
                        <div class="fr-radio-group">
                          <input
                            type="radio"
                            id={idRadioNouvel}
                            name="avis-expert-selection-{id}"
                            value="nouvel-avis-expert"
                            bind:group={avisExpertSelectionne}
                            onchange={() => {
                              avis = null;
                              serviceOuPersonneExperte = null;
                            }}
                          />
                          <label class="fr-label" for={idRadioNouvel}> Nouvel avis expert </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {#if avisExpertSelectionne === "nouvel-avis-expert"}
                    <div class="fr-fieldset fr-mt-3w" id="champ-service-expert-group">
                      <legend
                        class="fr-fieldset__legend--regular fr-fieldset__legend"
                        id="champ-service-expert-group"
                      >
                        Service ou personne experte
                        <span class="obligatoire-asterisque">*</span>
                      </legend>
                      <div class="conteneur-boutons-radios">
                        {#each OPTIONS_SERVICE_EXPERT as service}
                          {@const idRadio = `service-expert-${service.replace(/\s+/g, "-").toLowerCase()}-${id}`}
                          <div class="fr-fieldset__element">
                            <div class="fr-radio-group">
                              <input
                                required
                                type="radio"
                                id={idRadio}
                                name="service-expert-{id}"
                                value={service}
                                bind:group={serviceOuPersonneExperte}
                                onchange={() => {
                                  if (service !== "Autre expert") autreExpertTexte = null;
                                }}
                              />
                              <label class="fr-label" for={idRadio}>
                                {service}
                              </label>
                            </div>
                          </div>
                        {/each}
                      </div>
                    </div>
                    {#if serviceOuPersonneExperte === "Autre expert"}
                      <div class="fr-input-group fr-mt-3w">
                        <label class="fr-label" for="autre-expert-texte-avis-{id}"
                          >Précisez l'expert</label
                        >
                        <input
                          class="fr-input"
                          type="text"
                          id="autre-expert-texte-avis-{id}"
                          bind:value={autreExpertTexte}
                          placeholder="Nom de l'expert"
                        />
                      </div>
                    {/if}
                  {/if}
                  {#if serviceOuPersonneExperte === "Ministre" || serviceOuPersonneExperte === "CNPN" || serviceOuPersonneExperte === "CSRPN"}
                    <div class="fr-fieldset fr-mt-3w" id="champ-avis-expert-group">
                      <legend
                        class="fr-fieldset__legend--regular fr-fieldset__legend"
                        id="champ-avis-expert-group"
                      >
                        Avis de l'expert
                        <span class="obligatoire-asterisque">*</span>
                      </legend>
                      <div class="">
                        {#each ["Avis favorable", "Avis favorable sous condition", "Avis défavorable"] as avisOption}
                          {@const idRadio = `avis-expert-${avisOption.replace(/\s+/g, "-").toLowerCase()}-${id}`}
                          <div class="fr-fieldset__element">
                            <div class="fr-radio-group">
                              <input
                                required
                                type="radio"
                                id={idRadio}
                                name="avis-expert-{id}"
                                value={avisOption}
                                bind:group={avis}
                              />
                              <label class="fr-label" for={idRadio}>
                                {avisOption}
                              </label>
                            </div>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}
                  <div class="fr-mt-3w">
                    <label class="fr-input-group fr-label" for="modale-date-avis-{id}"
                      >Date de l'avis</label
                    >
                    <DateInput id={`modale-date-avis-${id}`} bind:date={dateAvis} />
                  </div>
                {/if}

                {#if typePieceJointe === "Autre"}
                  <div class="fr-input-group fr-mt-3w">
                    <label class="fr-label" for="other-attachment-type-{id}">
                      Autre : Précisez le type de pièce jointe
                      <span class="obligatoire-asterisque">*</span>
                    </label>
                    <input
                      required
                      class="fr-input"
                      type="text"
                      id="other-attachment-type-{id}"
                      bind:value={otherAttachmentType}
                    />
                  </div>
                  <div class="fr-mt-3w">
                    <label class="fr-input-group fr-label" for="other-attachment-date-{id}"
                      >Date de la pièce jointe</label
                    >
                    <DateInput id={`other-attachment-date-${id}`} bind:date={otherAttachmentDate} />
                  </div>
                {/if}

                {#if formulaireValide}
                  <div class="fr-messages-group" aria-live="polite">
                    {#if messageErreur}
                      <div class="fr-alert fr-alert--error fr-alert--sm fr-mt-3w fr-mb-2w">
                        <p>{messageErreur}</p>
                      </div>
                    {/if}
                  </div>
                  <ul class="fr-btns-group fr-btns-group--right fr-btns-group--inline fr-mt-2w">
                    <li>
                      {#await ajouterUneNouvellePieceJointeP}
                        <button type="submit" class="fr-btn" disabled>Sauvegarde en cours...</button
                        >
                      {:then}
                        <button type="submit" class="fr-btn">Valider</button>
                      {/await}
                    </li>
                  </ul>
                {:else if messageErreur}
                  <div class="fr-messages-group" aria-live="polite">
                    <div class="fr-alert fr-alert--error fr-alert--sm fr-mt-3w fr-mb-2w">
                      <p>{messageErreur}</p>
                    </div>
                  </div>
                {/if}
              </form>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</dialog>

<style>
  .conteneur-boutons-radios {
    width: 100%;
    display: flex;
    flex-direction: row;
  }

  .fr-fieldset__element {
    flex: unset;
  }

  .conteneur-boutons-radios-vertical {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .obligatoire-asterisque {
    color: var(--text-title-blue-france, #000091);
    margin-left: 0.25rem;
    font-weight: bold;
  }
</style>
