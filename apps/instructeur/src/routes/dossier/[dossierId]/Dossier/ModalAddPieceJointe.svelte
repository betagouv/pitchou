<script lang="ts">
  import { uploadSizeError } from "$lib/upload/uploadSizeHint.ts";
  import { saveNewDecisionAdministrative } from "./Controles/decisionAdministrative.ts";
  import FormDecisionAdministrative from "./Controles/FormDecisionAdministrative.svelte";
  import PieceJointeForm from "./ModalAddPieceJointe/PieceJointeForm.svelte";
  import { savePieceJointe, type TypePieceJointe } from "./ModalAddPieceJointe/savePieceJointe.ts";
  import {
    currentAttachmentDate,
    defaultPieceJointeType,
    pieceJointeLabel,
    saisinesWithoutAvis,
    trackPieceJointe,
  } from "./ModalAddPieceJointe/pieceJointeTypes.ts";
  import type {
    DecisionAdministrativeForTransfer,
    DossierFull,
    FrontEndAvisExpert,
  } from "@pitchou/types/API_Pitchou.ts";
  import type { EvenementPieceJointeSource } from "@pitchou/types/evenement.d.ts";

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
  const titleId = $derived(`${id}-title`);
  const currentDate = currentAttachmentDate;
  const defaultType = () =>
    defaultPieceJointeType(typePieceJointeInitial, showTypeChoice, typesPiecesJointes);
  let files: FileList | undefined = $state();
  let type: TypePieceJointe | null = $state(defaultType());
  let expert: string | null = $state(null);
  let otherExpert: string | null = $state(null);
  let avis: string | null = $state(null);
  let saisineDate: Date | null | undefined = $state(currentDate());
  let avisDate: Date | null | undefined = $state(currentDate());
  let otherType = $state("");
  let otherDate: Date | null | undefined = $state(currentDate());
  let selectedAvis: FrontEndAvisExpert["id"] | "nouvel-avis-expert" | null = $state(null);
  let error: string | null = $state(null);
  let modal: HTMLElement | undefined;
  let fileInput: HTMLInputElement | undefined = $state();
  const saisines = $derived(saisinesWithoutAvis(dossier.avisExpert));
  let saving: Promise<void> = $state(Promise.resolve());
  $effect(() => {
    if (type === "Avis expert" && saisines.length === 1 && selectedAvis === null) {
      selectedAvis = saisines[0].id;
      expert = saisines[0].expert;
    }
  });
  const validSaisine = $derived(type === "Saisine expert" && expert !== null);
  const validAvis = $derived(
    type === "Avis expert" &&
      selectedAvis !== null &&
      (selectedAvis !== "nouvel-avis-expert" || expert !== null) &&
      (!["Ministre", "CNPN", "CSRPN"].includes(expert ?? "") || avis !== null),
  );
  const valid = $derived(
    Boolean(
      files?.length &&
      type &&
      (validSaisine || validAvis || (type === "Autre" && otherType.trim())),
    ),
  );

  function track(pieceType: TypePieceJointe, count: number) {
    trackPieceJointe(dossier.id, source, pieceType, count);
  }
  function reset() {
    files = undefined;
    if (fileInput) fileInput.value = "";
    expert = null;
    otherExpert = null;
    avis = null;
    saisineDate = currentDate();
    avisDate = currentDate();
    selectedAvis = null;
    error = null;
    otherType = "";
    otherDate = currentDate();
  }
  function close() {
    reset();
    type = defaultType();
    // @ts-ignore DSFR installs this browser global.
    if (modal) window.dsfr(modal).modal.conceal();
  }
  function submit() {
    if (!files?.length || !type) return;
    error = uploadSizeError(files);
    if (error) return;
    saving = savePieceJointe({
      dossier,
      files,
      type,
      expert,
      otherExpert,
      avis,
      saisineDate,
      avisDate,
      selectedAvis,
      otherType,
      otherDate,
      track,
      close,
    }).catch((cause) => {
      error = cause instanceof Error ? cause.message : "Une erreur est survenue";
    });
  }
  async function addDecision(decision: DecisionAdministrativeForTransfer) {
    await saveNewDecisionAdministrative(decision);
    if (decision.fichier_base64) track("Décision administrative", 1);
    close();
  }
</script>

<dialog bind:this={modal} {id} class="fr-modal" aria-labelledby={titleId}>
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
              onclick={close}>Fermer</button
            >
          </div>
          <div class="fr-modal__content">
            <h2 id={titleId} class="fr-modal__title">Ajouter une pièce jointe</h2>
            <p class="fr-text--sm fr-mb-2w"><span class="font-bold">*</span> Champs obligatoires</p>
            {#if showTypeChoice && typesPiecesJointes.length > 1}<fieldset
                class="fr-fieldset fr-mt-3w"
              >
                <legend class="fr-fieldset__legend--regular fr-fieldset__legend"
                  >Type de pièce jointe <span class="font-bold">*</span></legend
                >
                <div class="flex">
                  {#each typesPiecesJointes as option}{@const radioId = `type-piece-jointe-${option.replace(/\s+/g, "-").toLowerCase()}-${id}`}
                    <div class="fr-radio-group fr-mr-2w">
                      <input
                        required
                        type="radio"
                        id={radioId}
                        name="type-piece-jointe-{id}"
                        value={option}
                        onchange={reset}
                        bind:group={type}
                      /><label class="fr-label" for={radioId}>{pieceJointeLabel(option)}</label>
                    </div>{/each}
                </div>
              </fieldset>{/if}
            {#if type === "Décision administrative"}<FormDecisionAdministrative
                decisionAdministrative={{ dossier: dossier.id, signature_date: currentDate() }}
                onValidate={addDecision}
                onCancel={close}
              />{:else if type}<PieceJointeForm
                {id}
                {type}
                bind:files
                bind:fileInput
                bind:expert
                bind:otherExpert
                bind:avis
                bind:saisineDate
                bind:avisDate
                bind:selectedAvis
                {saisines}
                bind:otherType
                bind:otherDate
                {valid}
                {error}
                {saving}
                resetNewAvis={() => {
                  avis = null;
                  expert = null;
                }}
                {submit}
              />{/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</dialog>
