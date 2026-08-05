<script lang="ts">
  import {
    dossierMainActiviteOptions,
    dossierRequestContextOptions,
    restaurationDemandeOptions,
    transportDemandeOptions,
  } from "@pitchou/common/dossierFormOptions.ts";

  import {
    ACCOMPANIMENT_CONTEXT,
    activiteDetailKind,
    showsRequestContext,
    type DossierCreationModel,
    type MainActivite,
  } from "./dossierCreationModel.ts";
  import SearchableSelect from "./SearchableSelect.svelte";

  let { model }: { model: DossierCreationModel } = $props();

  const detailKind = $derived(activiteDetailKind(model.mainActivite));
  const displayRequestContext = $derived(showsRequestContext(model.mainActivite));

  const mainActiviteOptions = dossierMainActiviteOptions.map((option) => ({
    value: option,
    label: option,
  }));

  function changeMainActivite(value: string) {
    model.mainActivite = value as MainActivite;
    model.activiteDetail = "";
    if (!showsRequestContext(model.mainActivite)) {
      model.requestContext = "";
      model.accompanimentNeed = "";
    }
  }

  function changeRequestContext(value: string) {
    model.requestContext = value;
    if (model.requestContext !== ACCOMPANIMENT_CONTEXT) model.accompanimentNeed = "";
  }
</script>

<section
  class="border-t border-[color:var(--border-default-grey)] fr-pt-4w"
  aria-labelledby="project-title"
>
  <h2 class="fr-h2" id="project-title">2. Votre projet</h2>

  <div class="flex flex-col gap-6">
    <div class="fr-input-group">
      <label class="fr-label" for="project-name">
        Nom du projet
        <span class="fr-hint-text">Indiquer le nom <strong>précis</strong> de votre projet</span>
      </label>
      <input
        class="fr-input"
        id="project-name"
        type="text"
        required
        autocomplete="off"
        data-form-type="other"
        data-1p-ignore
        bind:value={model.name}
      />
    </div>

    <div class="fr-select-group">
      <label class="fr-label" id="main-activite-label" for="main-activite">
        Quel est l'objectif principal du projet ? <span aria-hidden="true">*</span>
        <span class="fr-sr-only">Champ obligatoire</span>
      </label>
      <SearchableSelect
        id="main-activite"
        labelledBy="main-activite-label"
        options={mainActiviteOptions}
        value={model.mainActivite}
        placeholder="Sélectionnez ou commencez à saisir"
        required={true}
        onChange={changeMainActivite}
      />
    </div>

    {#if displayRequestContext}
      <fieldset class="fr-fieldset" aria-labelledby="request-context-legend">
        <legend class="fr-fieldset__legend font-normal" id="request-context-legend">
          Dans quel cas êtes-vous ? <span aria-hidden="true">*</span>
          <span class="fr-sr-only">Champ obligatoire</span>
        </legend>
        {#each dossierRequestContextOptions as option, index (option)}
          <div class="fr-fieldset__element">
            <div class="fr-radio-group">
              <input
                id={`request-context-${index + 1}`}
                name="request-context"
                type="radio"
                value={option}
                checked={model.requestContext === option}
                required
                onchange={() => changeRequestContext(option)}
              />
              <label class="fr-label" for={`request-context-${index + 1}`}>
                {index + 1}. {option}
              </label>
            </div>
          </div>
        {/each}
      </fieldset>
    {/if}

    {#if detailKind === "restauration"}
      <fieldset class="fr-fieldset" aria-labelledby="restauration-demande-legend">
        <legend class="fr-fieldset__legend font-normal" id="restauration-demande-legend">
          Restauration, démolition de bâtiments, ouvrages d'art - Votre demande concerne :
          <span aria-hidden="true">*</span>
          <span class="fr-sr-only">Champ obligatoire</span>
        </legend>
        {#each restaurationDemandeOptions as option, index (option)}
          <div class="fr-fieldset__element">
            <div class="fr-radio-group">
              <input
                id={`restauration-demande-${index + 1}`}
                name="restauration-demande"
                type="radio"
                value={option}
                required
                bind:group={model.activiteDetail}
              />
              <label class="fr-label" for={`restauration-demande-${index + 1}`}>{option}</label>
            </div>
          </div>
        {/each}
      </fieldset>
    {:else if detailKind === "transport"}
      <fieldset class="fr-fieldset" aria-labelledby="transport-demande-legend">
        <legend class="fr-fieldset__legend font-normal" id="transport-demande-legend">
          Transport ferroviaire ou électrique - Votre demande concerne :
          <span aria-hidden="true">*</span>
          <span class="fr-sr-only">Champ obligatoire</span>
        </legend>
        {#each transportDemandeOptions as option, index (option)}
          <div class="fr-fieldset__element">
            <div class="fr-radio-group">
              <input
                id={`transport-demande-${index + 1}`}
                name="transport-demande"
                type="radio"
                value={option}
                required
                bind:group={model.activiteDetail}
              />
              <label class="fr-label" for={`transport-demande-${index + 1}`}>{option}</label>
            </div>
          </div>
        {/each}
      </fieldset>
    {/if}

    {#if displayRequestContext && model.requestContext === ACCOMPANIMENT_CONTEXT}
      <div class="fr-input-group">
        <label class="fr-label" for="accompaniment-need"
          >Merci de préciser votre besoin ci-dessous : <span aria-hidden="true">*</span>
          <span class="fr-sr-only">Champ obligatoire</span></label
        >
        <textarea
          class="fr-input"
          id="accompaniment-need"
          rows="5"
          required
          bind:value={model.accompanimentNeed}></textarea>
      </div>
    {/if}
  </div>
</section>
