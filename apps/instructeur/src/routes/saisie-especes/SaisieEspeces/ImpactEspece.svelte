<script lang="ts">
  import { individusRanges } from "./especeFieldset.ts";

  import type {
    ByClassification,
    DescriptionImpact,
    EspeceProtegee,
    ActiviteMenancante,
    MethodeMenancante,
    MoyenDePoursuiteMenacant,
    ClassificationEtreVivant,
  } from "@pitchou/types/especes.d.ts";

  type Props = {
    indexEspèce?: number;
    indexImpact?: number;
    impact?: DescriptionImpact;
    onSupprimerImpact?: () => Promise<void>;
    espèce?: EspeceProtegee;
    espèceClassification?: ClassificationEtreVivant;
    activitesParClassificationEtreVivant?: ByClassification<
      Map<ActiviteMenancante["Identifiant Pitchou"], ActiviteMenancante>
    >;
    méthodesParClassificationEtreVivant: ByClassification<
      Map<MethodeMenancante["Code"], MethodeMenancante>
    >;
    transportsParClassificationEtreVivant: ByClassification<
      Map<MoyenDePoursuiteMenacant["Code"], MoyenDePoursuiteMenacant>
    >;
  };

  let {
    indexEspèce: indexEspece,
    indexImpact,
    impact = $bindable({}),
    onSupprimerImpact,
    espèce: espece,
    espèceClassification: especeClassification = espece?.classification,
    activitesParClassificationEtreVivant,
    méthodesParClassificationEtreVivant: methodesParClassificationEtreVivant,
    transportsParClassificationEtreVivant,
  }: Props = $props();

  let activitesMenacantes = $derived(
    especeClassification && activitesParClassificationEtreVivant
      ? [...activitesParClassificationEtreVivant[especeClassification].values()]
      : [],
  );

  let methodeMenacantes = $derived(
    especeClassification && methodesParClassificationEtreVivant
      ? [...methodesParClassificationEtreVivant[especeClassification].values()]
      : [],
  );

  let transportMenacants = $derived(
    especeClassification && transportsParClassificationEtreVivant
      ? [...transportsParClassificationEtreVivant[especeClassification].values()]
      : [],
  );

  export function focusDeleteButton() {
    deleteButton?.focus();
  }

  export function focusImpactForm() {
    selectImpact?.focus();
  }

  function resetDetailsImpact() {
    impact.méthode = undefined;
    impact.moyenDePoursuite = undefined;
    impact.nombreIndividus = undefined;
    impact.surfaceHabitatDétruit = undefined;
    impact.nombreNids = undefined;
    impact.nombreOeufs = undefined;
  }

  let deleteButton: HTMLElement | undefined = $state();

  let selectImpact: HTMLElement;
</script>

<fieldset class="fr-fieldset fr-input-group fr-fieldset__element">
  {#if indexImpact && indexEspece}
    <legend class="fr-sr-only">Impact #{indexImpact} sur l'espèce #{indexEspece}</legend>
  {:else}
    <legend class="fr-sr-only">Impact sur les espèces de type {especeClassification}</legend>
  {/if}
  <div class="fr-fieldset__element fr-input-group fr-grid-row fr-grid-row--gutters">
    <div class="fr-col-md-5 fr-col-12 input-select">
      <label class="fr-label" for="input-espece-{indexEspece}-impact-{indexImpact}">
        Type d’impact
      </label>
      <div class="input-button-avec-bouton-supprimer">
        <select
          bind:this={selectImpact}
          bind:value={impact.activité}
          onchange={resetDetailsImpact}
          class="fr-select"
          id="input-espece-{indexEspece}-impact-{indexImpact}"
        >
          <option value={undefined}>-</option>
          {#each activitesMenacantes as act}
            <option value={act}>
              {act["Libellé Pitchou"]}
            </option>
          {/each}
        </select>
        {#if onSupprimerImpact}
          <button
            class="fr-btn fr-btn--secondary fr-icon-delete-line"
            type="button"
            bind:this={deleteButton}
            onclick={onSupprimerImpact}
          >
            <span class="fr-sr-only"
              >Supprimer l'impact #{indexImpact} sur l'espèce #{indexEspece}</span
            >
          </button>
        {/if}
      </div>
    </div>

    {#if impact.activité && impact.activité["Méthode"] === "Oui"}
      <div class="fr-col-md-4 fr-col-12 input-select">
        <label class="fr-label" for="input-espece-{indexEspece}-methode-{indexImpact}">
          Méthode
        </label>
        <select
          bind:value={impact.méthode}
          class="fr-select"
          id="input-espece-{indexEspece}-methode-{indexImpact}"
        >
          <option value={undefined}>-</option>
          {#each methodeMenacantes as met}
            <option value={met}>
              {met["Libellé Pitchou"]}
            </option>
          {/each}
        </select>
      </div>
    {/if}

    {#if impact.activité && impact.activité["Moyen de poursuite"] === "Oui"}
      <div class="fr-col-md-3 fr-col-12 input-select">
        <label class="fr-label" for="input-espece-{indexEspece}-moyen-de-poursuite-{indexImpact}">
          Moyen de poursuite
        </label>
        <select
          bind:value={impact.moyenDePoursuite}
          class="fr-select"
          id="input-espece-{indexEspece}-moyen-de-poursuite-{indexImpact}"
        >
          <option value={undefined}>-</option>
          {#each transportMenacants as trans}
            <option value={trans}>
              {trans["Libellé Pitchou"]}
            </option>
          {/each}
        </select>
      </div>
    {/if}
  </div>

  {#if impact.activité}
    <div class="fr-fieldset__element fr-input-group fr-grid-row fr-grid-row--gutters">
      {#if impact.activité["Nombre d'individus"] === "Oui"}
        <div class="fr-col-md-3 fr-col-12 input-select">
          <label class="fr-label" for="input-espece-{indexEspece}-nombre-individus-{indexImpact}">
            Nombre d’individus
          </label>
          <select
            bind:value={impact.nombreIndividus}
            class="fr-select"
            id="input-espece-{indexEspece}-nombre-individus-{indexImpact}"
          >
            <option value={undefined}>-</option>
            {#each individusRanges as range}
              <option value={range}>{range}</option>
            {/each}
          </select>
        </div>
      {/if}

      {#if impact.activité["Nids"] === "Oui"}
        <div class="fr-col-md-3 fr-col-12 input-button">
          <label class="fr-label" for="input-espece-{indexEspece}-nids-{indexImpact}"> Nids </label>
          <input
            type="number"
            bind:value={impact.nombreNids}
            min="0"
            step="1"
            class="fr-input"
            id="input-espece-{indexEspece}-nids-{indexImpact}"
          />
        </div>
      {/if}

      {#if impact.activité["Œufs"] === "Oui"}
        <div class="fr-col-md-3 fr-col-12 input-button">
          <label class="fr-label" for="input-espece-{indexEspece}-oeufs-{indexImpact}">
            Œufs
          </label>
          <input
            type="number"
            bind:value={impact.nombreOeufs}
            min="0"
            step="1"
            class="fr-input"
            id="input-espece-{indexEspece}-oeufs-{indexImpact}"
          />
        </div>
      {/if}

      {#if impact.activité["Surface habitat détruit (m²)"] === "Oui"}
        <div class="fr-col-md-3 fr-col-12 input-button">
          <label class="fr-label" for="input-espece-{indexEspece}-surface-{indexImpact}">
            Surface habitat détruit (m²)
          </label>
          <input
            type="number"
            bind:value={impact.surfaceHabitatDétruit}
            min="0"
            step="1"
            class="fr-input"
            id="input-espece-{indexEspece}-surface-{indexImpact}"
          />
        </div>
      {/if}
    </div>
  {/if}
</fieldset>

<style>
  fieldset {
    margin: 0;
    padding: 0;
  }

  .input-button-avec-bouton-supprimer {
    display: flex;
    margin-top: 0.5rem;
    gap: 0.5rem;
  }

  /* .input-button, .input-select {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        } */

  @media (min-width: 62em) {
    .input-button-avec-bouton-supprimer {
      gap: 1.5rem;
    }
  }
</style>
