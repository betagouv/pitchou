<script lang="ts">
  import { addAttachmentAutre } from "./attachmentAutre.ts";
  import { addOrUpdateAvisExpert } from "./avisExpert.ts";
  import { saveNewDecisionAdministrative } from "./Controles/decisionAdministrative.ts";
  import { refreshDossierFull } from "$lib/dossier/dossier.ts";
  import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import { uploadSizeHint, uploadSizeError } from "$lib/upload/uploadSizeHint.ts";
  import DateInput from "../DateInput.svelte";
  import FormDecisionAdministrative from "./Controles/FormDecisionAdministrative.svelte";

  import type {
    DossierFull,
    FrontEndAvisExpert,
    DecisionAdministrativeForTransfer,
  } from "@pitchou/types/API_Pitchou.ts";
  import type { EvenementPieceJointeSource } from "@pitchou/types/evenement.d.ts";

  type TypePieceJointe = "Décision administrative" | "Avis expert" | "Saisine expert" | "Autre";

  type Props = {
    id: string;
    dossier: Pick<DossierFull, "id" | "avisExpert">;
    typesPiecesJointes?: TypePieceJointe[];
    showTypeChoice?: boolean;
    typePieceJointeInitial?: TypePieceJointe;
    source: EvenementPieceJointeSource;
  };

  let {
    id,
    dossier,
    typesPiecesJointes = ["Saisine expert", "Avis expert"],
    showTypeChoice = true,
    typePieceJointeInitial,
    source,
  }: Props = $props();

  const idTitleH2 = $derived(`${id}-title`);

  const OPTIONS_SERVICE_EXPERT = ["CSRPN", "CNPN", "Ministre", "Autre expert"];

  let fileListPieceJointe: FileList | undefined = $state();

  function getDefaultTypePieceJointe() {
    return typePieceJointeInitial ?? (!showTypeChoice ? (typesPiecesJointes[0] ?? null) : null);
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

  let typePieceJointe: TypePieceJointe | null = $state(getDefaultTypePieceJointe());

  let serviceOuPersonneExperte: string | null = $state(null);

  let otherExpertText: string | null = $state(null);

  // expert's avis (favorable, unfavorable...)
  let avis: string | null = $state(null);

  let dateSaisine: FrontEndAvisExpert["date_saisine"] | undefined = $state();

  let dateAvis: FrontEndAvisExpert["date_avis"] | undefined = $state();

  let otherAttachmentType = $state("");

  let otherAttachmentDate: Date | undefined | null = $state();

  let selectedAvisExpert: FrontEndAvisExpert["id"] | "nouvel-avis-expert" | null = $state(null);

  let errorMessage: string | null = $state(null);

  let modal: HTMLElement | undefined;

  let fileInput: HTMLInputElement | undefined = $state();

  let saisinesWithoutAvis = $derived(
    dossier.avisExpert.filter(
      (ae) =>
        (ae.date_saisine !== null || ae.saisine_fichier_url !== null) &&
        ae.avis === null &&
        ae.date_avis === null,
    ),
  );

  let showTypePieceJointeField = $derived(showTypeChoice && typesPiecesJointes.length > 1);

  let addNewPieceJointeP: Promise<void> = $state(Promise.resolve());

  // Automatically pre-check the saisine if there is only one
  $effect(() => {
    if (
      typePieceJointe === "Avis expert" &&
      saisinesWithoutAvis.length === 1 &&
      selectedAvisExpert === null
    ) {
      selectedAvisExpert = saisinesWithoutAvis[0].id;
      serviceOuPersonneExperte = saisinesWithoutAvis[0].expert;
    }
  });

  let isFormValidForSaisineExpert = $derived(
    typePieceJointe === "Saisine expert" && serviceOuPersonneExperte !== null,
  );
  let isFormValidForAvisExpert = $derived(
    typePieceJointe === "Avis expert" &&
      selectedAvisExpert !== null &&
      (selectedAvisExpert === "nouvel-avis-expert" ? serviceOuPersonneExperte !== null : true) &&
      // The Ministre, CNPN and CSRPN experts are necessarily linked to an avis (compliant, non-compliant...)
      (serviceOuPersonneExperte === "Ministre" ||
      serviceOuPersonneExperte === "CNPN" ||
      serviceOuPersonneExperte === "CSRPN"
        ? avis !== null
        : true),
  );

  let isFormValid = $derived(
    fileListPieceJointe &&
      fileListPieceJointe.length > 0 &&
      typePieceJointe !== null &&
      typePieceJointe !== undefined &&
      (isFormValidForSaisineExpert ||
        isFormValidForAvisExpert ||
        (typePieceJointe === "Autre" && otherAttachmentType.trim() !== "")),
  );

  function sendEvenementAddPieceJointe(
    typePieceJointe: TypePieceJointe,
    nombreFichiers: number,
  ) {
    sendEvenement({
      type: "ajouterPieceJointe",
      détails: {
        dossierId: dossier.id,
        source,
        typePieceJointe,
        nombreFichiers,
      },
    });
  }

  async function addPieceJointe() {
    if (!fileListPieceJointe || fileListPieceJointe.length === 0) {
      return;
    }

    errorMessage = null;

    const sizeError = uploadSizeError(fileListPieceJointe);
    if (sizeError) {
      errorMessage = sizeError;
      return;
    }

    try {
      if (typePieceJointe === "Saisine expert") {
        // Create a new avis expert with the saisine
        const fichierSaisine = fileListPieceJointe[0];
        const expert =
          serviceOuPersonneExperte === "Autre expert" ? otherExpertText : serviceOuPersonneExperte;
        const avisExpertToCreate = {
          dossier: dossier.id,
          expert: expert,
          date_saisine: dateSaisine,
        };

        addNewPieceJointeP = addOrUpdateAvisExpert(
          avisExpertToCreate,
          fichierSaisine,
          undefined,
        )
          .then(() => {
            sendEvenementAddPieceJointe("Saisine expert", 1);
            return refreshDossierFull(dossier.id).then(() => closeModal());
          })
          .catch((e) => (errorMessage = e.message || "Une erreur est survenue"));
      } else if (typePieceJointe === "Avis expert") {
        // Either modify an existing saisine by adding the avis, or create a new one
        const fichierAvis = fileListPieceJointe[0];

        if (selectedAvisExpert === "nouvel-avis-expert") {
          // Create a new avis expert
          const expert =
            serviceOuPersonneExperte === "Autre expert"
              ? otherExpertText
              : serviceOuPersonneExperte;
          const avisExpertToCreate: Pick<FrontEndAvisExpert, "dossier"> &
            Partial<FrontEndAvisExpert> = {
            dossier: dossier.id,
            expert: expert,
            avis,
            date_saisine: dateSaisine,
            date_avis: dateAvis,
          };
          addNewPieceJointeP = addOrUpdateAvisExpert(
            avisExpertToCreate,
            undefined,
            fichierAvis,
          )
            .then(() => {
              sendEvenementAddPieceJointe("Avis expert", 1);
              return refreshDossierFull(dossier.id).then(() => closeModal());
            })
            .catch((e) => (errorMessage = e.message || "Une erreur est survenue"));
        } else if (selectedAvisExpert) {
          // Add the avis to an existing saisine
          const existingSaisine = dossier.avisExpert.find((ae) => ae.id === selectedAvisExpert);
          if (existingSaisine) {
            const avisExpertToUpdate = {
              id: existingSaisine.id,
              dossier: dossier.id,
              expert: existingSaisine.expert,
              date_avis: dateAvis,
              avis,
            };
            addNewPieceJointeP = addOrUpdateAvisExpert(
              avisExpertToUpdate,
              undefined,
              fichierAvis,
            )
              .then(() => {
                sendEvenementAddPieceJointe("Avis expert", 1);
                return refreshDossierFull(dossier.id).then(() => closeModal());
              })
              .catch((e) => (errorMessage = e.message || "Une erreur est survenue"));
          }
        }
      } else if (typePieceJointe === "Autre") {
        const nombreFichiers = fileListPieceJointe.length;
        addNewPieceJointeP = addAttachmentAutre(
          dossier.id,
          otherAttachmentType,
          otherAttachmentDate,
          fileListPieceJointe,
        )
          .then(() => {
            sendEvenementAddPieceJointe("Autre", nombreFichiers);
            return refreshDossierFull(dossier.id).then(() => closeModal());
          })
          .catch((e) => (errorMessage = e.message || "Une erreur est survenue"));
      }
    } catch (e) {
      // @ts-ignore
      errorMessage = e.message || "Une erreur est survenue";
    }
  }

  async function addDecisionAdministrative(decision: DecisionAdministrativeForTransfer) {
    await saveNewDecisionAdministrative(decision);
    if (decision.fichier_base64) {
      sendEvenementAddPieceJointe("Décision administrative", 1);
    }
    closeModal();
  }

  function resetFormExceptTypePieceJointe() {
    fileListPieceJointe = undefined;
    if (fileInput) {
      fileInput.value = "";
    }
    serviceOuPersonneExperte = null;
    otherExpertText = null;
    avis = null;
    dateSaisine = null;
    selectedAvisExpert = null;
    errorMessage = null;
    dateAvis = null;
    otherAttachmentType = "";
    otherAttachmentDate = null;
  }

  function closeModal() {
    // Reset the states
    resetFormExceptTypePieceJointe();
    typePieceJointe = getDefaultTypePieceJointe();

    if (modal) {
      //@ts-ignore
      window.dsfr(modal).modal.conceal();
    }
  }
</script>

<dialog bind:this={modal} {id} class="fr-modal" aria-labelledby={idTitleH2}>
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
              onclick={closeModal}>Fermer</button
            >
          </div>
          <div class="fr-modal__content">
            <h2 id={idTitleH2} class="fr-modal__title">Ajouter une pièce jointe</h2>
            <p class="fr-text--sm fr-mb-2w">
              <span class="required-asterisk">*</span>
              Champs obligatoires
            </p>
            {#if showTypePieceJointeField}
              <div class="fr-fieldset fr-mt-3w" id="champ-type-piece-jointe-group">
                <legend
                  class="fr-fieldset__legend--regular fr-fieldset__legend"
                  id="champ-type-piece-jointe-group"
                >
                  Type de pièce jointe
                  <span class="required-asterisk">*</span>
                </legend>
                <div class="radio-buttons-container">
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
                          onchange={() => resetFormExceptTypePieceJointe()}
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
                decisionAdministrative={{ dossier: dossier.id }}
                onValidate={addDecisionAdministrative}
                onCancel={closeModal}
              />
            {:else if typePieceJointe}
              <form
                onsubmit={(e) => {
                  e.preventDefault();
                  addPieceJointe();
                }}
              >
                <div class="fr-upload-group fr-mt-3w">
                  <label class="fr-label" for="upload-piece-jointe">
                    {#if typePieceJointe === "Avis expert" || typePieceJointe === "Saisine expert"}
                      Choisir un fichier
                    {:else}
                      Choisir un ou plusieurs fichiers
                    {/if}
                    <span class="required-asterisk">*</span>
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
                      <span class="required-asterisk">*</span>
                    </legend>
                    <div class="radio-buttons-container">
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
                                if (service !== "Autre expert") otherExpertText = null;
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
                        bind:value={otherExpertText}
                        placeholder="Nom de l'expert"
                      />
                    </div>
                  {/if}
                {/if}

                {#if typePieceJointe === "Avis expert"}
                  {@const idRadioNew = `avis-expert-selection-nouvel-${id}`}
                  <div class="fr-fieldset fr-mt-3w" id="champ-avis-expert-selection-group">
                    <legend
                      class="fr-fieldset__legend--regular fr-fieldset__legend"
                      id="champ-avis-expert-selection-group"
                    >
                      Sélectionner la saisine correspondante
                    </legend>
                    <div class="radio-buttons-container-vertical">
                      {#if saisinesWithoutAvis.length > 0}
                        {#each saisinesWithoutAvis as saisine}
                          {@const idRadio = `avis-expert-selection-${saisine.id}-${id}`}
                          <div class="fr-fieldset__element">
                            <div class="fr-radio-group">
                              <input
                                type="radio"
                                id={idRadio}
                                name="avis-expert-selection-{id}"
                                value={saisine.id}
                                bind:group={selectedAvisExpert}
                                onchange={() => (serviceOuPersonneExperte = saisine.expert)}
                              />
                              <label class="fr-label" for={idRadio}>
                                Saisine {saisine.expert || "Expert"}{saisine.date_saisine
                                  ? ` - ${formatDateAbsolute(saisine.date_saisine)}`
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
                            id={idRadioNew}
                            name="avis-expert-selection-{id}"
                            value="nouvel-avis-expert"
                            bind:group={selectedAvisExpert}
                            onchange={() => {
                              avis = null;
                              serviceOuPersonneExperte = null;
                            }}
                          />
                          <label class="fr-label" for={idRadioNew}> Nouvel avis expert </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {#if selectedAvisExpert === "nouvel-avis-expert"}
                    <div class="fr-fieldset fr-mt-3w" id="champ-service-expert-group">
                      <legend
                        class="fr-fieldset__legend--regular fr-fieldset__legend"
                        id="champ-service-expert-group"
                      >
                        Service ou personne experte
                        <span class="required-asterisk">*</span>
                      </legend>
                      <div class="radio-buttons-container">
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
                                  if (service !== "Autre expert") otherExpertText = null;
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
                          bind:value={otherExpertText}
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
                        <span class="required-asterisk">*</span>
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
                      <span class="required-asterisk">*</span>
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

                {#if isFormValid}
                  <div class="fr-messages-group" aria-live="polite">
                    {#if errorMessage}
                      <div class="fr-alert fr-alert--error fr-alert--sm fr-mt-3w fr-mb-2w">
                        <p>{errorMessage}</p>
                      </div>
                    {/if}
                  </div>
                  <ul class="fr-btns-group fr-btns-group--right fr-btns-group--inline fr-mt-2w">
                    <li>
                      {#await addNewPieceJointeP}
                        <button type="submit" class="fr-btn" disabled>Sauvegarde en cours...</button
                        >
                      {:then}
                        <button type="submit" class="fr-btn">Valider</button>
                      {/await}
                    </li>
                  </ul>
                {:else if errorMessage}
                  <div class="fr-messages-group" aria-live="polite">
                    <div class="fr-alert fr-alert--error fr-alert--sm fr-mt-3w fr-mb-2w">
                      <p>{errorMessage}</p>
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
  .radio-buttons-container {
    width: 100%;
    display: flex;
    flex-direction: row;
  }

  .fr-fieldset__element {
    flex: unset;
  }

  .radio-buttons-container-vertical {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .required-asterisk {
    color: var(--text-title-blue-france, #000091);
    margin-left: 0.25rem;
    font-weight: bold;
  }
</style>
