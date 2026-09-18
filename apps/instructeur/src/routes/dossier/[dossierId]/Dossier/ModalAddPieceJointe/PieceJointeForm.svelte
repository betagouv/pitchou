<script lang="ts">
  import DateInput from "$lib/components/DateInput.svelte";
  import ExpertServiceFields from "./ExpertServiceFields.svelte";
  import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
  import { uploadSizeHint } from "$lib/upload/uploadSizeHint.ts";
  import type { FrontEndAvisExpert } from "@pitchou/types/API_Pitchou.ts";
  import type { TypePieceJointe } from "./submission.ts";
  type Props = {
    id: string;
    type: TypePieceJointe;
    files?: FileList;
    fileInput?: HTMLInputElement;
    expert: string | null;
    otherExpert: string | null;
    avis: string | null;
    saisineDate?: Date | null;
    avisDate?: Date | null;
    selectedAvis: FrontEndAvisExpert["id"] | "nouvel-avis-expert" | null;
    saisines: FrontEndAvisExpert[];
    otherType: string;
    otherDate?: Date | null;
    valid: boolean;
    error: string | null;
    saving: Promise<void>;
    resetNewAvis: () => void;
    submit: () => void;
  };
  let {
    id,
    type,
    files = $bindable(),
    fileInput = $bindable(),
    expert = $bindable(),
    otherExpert = $bindable(),
    avis = $bindable(),
    saisineDate = $bindable(),
    avisDate = $bindable(),
    selectedAvis = $bindable(),
    saisines,
    otherType = $bindable(),
    otherDate = $bindable(),
    valid,
    error,
    saving,
    resetNewAvis,
    submit,
  }: Props = $props();
</script>

<form
  onsubmit={(event) => {
    event.preventDefault();
    submit();
  }}
>
  <div class="fr-upload-group fr-mt-3w">
    <label class="fr-label" for="upload-piece-jointe"
      >{type === "Avis expert" || type === "Saisine expert"
        ? "Choisir un fichier"
        : "Choisir un ou plusieurs fichiers"}<span class="fr-ml-1v font-bold">*</span><span
        class="fr-hint-text">{uploadSizeHint()} Formats supportés&nbsp;: xls, ods, pdf, odt.</span
      ></label
    ><input
      required
      bind:this={fileInput}
      accept=".xls,.ods,.pdf,.odt"
      bind:files
      class="fr-upload"
      type="file"
      id="upload-piece-jointe"
      name="upload"
      multiple={type !== "Avis expert" && type !== "Saisine expert"}
    />
  </div>
  {#if type === "Saisine expert"}<ExpertServiceFields
      {id}
      bind:service={expert}
      bind:other={otherExpert}
    />
    <div class="fr-mt-3w">
      <label class="fr-label" for="modale-date-saisine-{id}">Date de la saisine</label><DateInput
        id={`modale-date-saisine-${id}`}
        bind:date={saisineDate}
      />
    </div>{/if}
  {#if type === "Avis expert"}
    <fieldset class="fr-fieldset fr-mt-3w">
      <legend class="fr-fieldset__legend--regular fr-fieldset__legend"
        >Sélectionner la saisine correspondante</legend
      >
      {#each saisines as saisine}{@const radioId = `avis-expert-selection-${saisine.id}-${id}`}
        <div class="fr-radio-group">
          <input
            type="radio"
            id={radioId}
            name="avis-expert-selection-{id}"
            value={saisine.id}
            bind:group={selectedAvis}
            onchange={() => (expert = saisine.expert)}
          /><label class="fr-label" for={radioId}
            >Saisine {saisine.expert || "Expert"}{saisine.saisine_date
              ? ` - ${formatDateAbsolute(saisine.saisine_date)}`
              : ""}</label
          >
        </div>{/each}
      <div class="fr-radio-group">
        <input
          type="radio"
          id="avis-expert-selection-nouvel-{id}"
          name="avis-expert-selection-{id}"
          value="nouvel-avis-expert"
          bind:group={selectedAvis}
          onchange={resetNewAvis}
        /><label class="fr-label" for="avis-expert-selection-nouvel-{id}">Nouvel avis expert</label>
      </div>
    </fieldset>
    {#if selectedAvis === "nouvel-avis-expert"}<ExpertServiceFields
        id={`avis-${id}`}
        bind:service={expert}
        bind:other={otherExpert}
      />{/if}
    {#if ["Ministre", "CNPN", "CSRPN"].includes(expert ?? "")}<fieldset
        class="fr-fieldset fr-mt-3w"
      >
        <legend class="fr-fieldset__legend--regular fr-fieldset__legend"
          >Avis de l'expert <span class="font-bold">*</span></legend
        >{#each ["Avis favorable", "Avis favorable sous condition", "Avis défavorable"] as option}<div
            class="fr-radio-group"
          >
            <input
              required
              type="radio"
              id={`avis-expert-${option}-${id}`}
              name="avis-expert-{id}"
              value={option}
              bind:group={avis}
            /><label class="fr-label" for={`avis-expert-${option}-${id}`}>{option}</label>
          </div>{/each}
      </fieldset>{/if}
    <div class="fr-mt-3w">
      <label class="fr-label" for="modale-date-avis-{id}">Date de l'avis</label><DateInput
        id={`modale-date-avis-${id}`}
        bind:date={avisDate}
      />
    </div>
  {/if}
  {#if type === "Autre"}<div class="fr-input-group fr-mt-3w">
      <label class="fr-label" for="other-attachment-type-{id}"
        >Autre : Précisez le type de pièce jointe <span class="font-bold">*</span></label
      ><input
        required
        class="fr-input"
        type="text"
        id="other-attachment-type-{id}"
        bind:value={otherType}
      />
    </div>
    <div class="fr-mt-3w">
      <label class="fr-label" for="other-attachment-date-{id}">Date de la pièce jointe</label
      ><DateInput id={`other-attachment-date-${id}`} bind:date={otherDate} />
    </div>{/if}
  {#if error}<div class="fr-alert fr-alert--error fr-alert--sm fr-mt-3w fr-mb-2w">
      <p>{error}</p>
    </div>{/if}
  {#if valid}<ul class="fr-btns-group fr-btns-group--right fr-btns-group--inline fr-mt-2w">
      <li>
        {#await saving}<button type="submit" class="fr-btn" disabled>Sauvegarde en cours...</button
          >{:then}<button type="submit" class="fr-btn">Valider</button>{/await}
      </li>
    </ul>{/if}
</form>
