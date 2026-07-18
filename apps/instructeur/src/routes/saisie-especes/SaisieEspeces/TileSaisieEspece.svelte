<script lang="ts">
  import { tick } from "svelte";

  import AutocompleteEspeces from "./AutocompleteEspeces.svelte";
  import ImpactEspece from "./ImpactEspece.svelte";
  import { especeLabel } from "@pitchou/common/especesUtils.ts";

  import type {
    ByClassification,
    EspeceProtegee,
    ActiviteMenancante,
    MethodeMenancante,
    MoyenDePoursuiteMenacant,
    DescriptionImpact,
    ClassificationEtreVivant,
  } from "@pitchou/types/especes.d.ts";

  type Props = {
    index?: number;
    idModaleEspèceNonTrouvée?: string;
    espèce?: EspeceProtegee | undefined;
    descriptionImpacts?: DescriptionImpact[] | undefined;
    onDupliquerEspèce?: (() => Promise<void>) | undefined;
    onOuvertureModale?: ((e: Event) => void) | undefined;
    onSuprimerEspèce?: (() => Promise<void>) | undefined;
    espècesProtégées?: EspeceProtegee[];
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
    index,
    idModaleEspèceNonTrouvée: idModaleEspeceNonTrouvee,
    espèce: espece = $bindable(undefined),
    descriptionImpacts = $bindable([{}]),
    onOuvertureModale = undefined,
    onDupliquerEspèce: onDupliquerEspece = undefined,
    onSuprimerEspèce: onSuprimerEspece = undefined,
    espècesProtégées: especesProtegees = [],
    activitesParClassificationEtreVivant,
    méthodesParClassificationEtreVivant: methodesParClassificationEtreVivant,
    transportsParClassificationEtreVivant,
  }: Props = $props();

  let especeClassification: ClassificationEtreVivant | undefined = $state(espece?.classification);

  async function addImpact() {
    descriptionImpacts.push({});

    await tick();

    referencesImpact = referencesImpact.filter((e) => e !== null);
    referencesImpact[referencesImpact.length - 1].focusImpactForm();
  }

  async function deleteImpact(indexImpactToDelete: number) {
    descriptionImpacts.splice(indexImpactToDelete, 1);
    descriptionImpacts = descriptionImpacts;

    await tick();

    referencesImpact = referencesImpact.filter((e) => e !== null);

    if (descriptionImpacts.length === 0) {
      await addImpact();
    } else {
      let indexImpactToFocus =
        indexImpactToDelete === descriptionImpacts.length
          ? descriptionImpacts.length - 1
          : indexImpactToDelete;

      referencesImpact[indexImpactToFocus].focusDeleteButton();
    }
  }

  export function focusDeleteButton() {
    deleteButton?.focus();
  }

  export function focusEspeceForm() {
    autocomplete?.focus();
  }

  export function resetEspece() {
    espece = undefined;
  }

  function onChangeEspece(newEspece: EspeceProtegee) {
    if (newEspece.classification !== especeClassification) {
      descriptionImpacts = [{}];
    }

    especeClassification = newEspece.classification;
  }

  let referencesImpact: ImpactEspece[] = $state([]);

  let deleteButton: HTMLElement;

  let autocomplete: AutocompleteEspeces;
</script>

<div class="tuile-espece">
  <fieldset class="fr-fieldset">
    <legend class="fr-sr-only"
      >Espèce impactée #{index} {espece ? especeLabel(espece) : "Non selectionnée"}</legend
    >

    <div class="fr-fieldset__element fr-input-group fr-grid-row fr-grid-row--gutters">
      <div class="fr-col-md-4 fr-col-12">
        <label class="fr-label" for="input-espece-{index}"> Espèce </label>
        <AutocompleteEspeces
          bind:this={autocomplete}
          onChange={onChangeEspece}
          bind:espèceSélectionnée={espece}
          espèces={especesProtegees}
          id={"input-espece-" + index}
        />
      </div>

      <div class="fr-col-md-4 fr-col input-info">
        <button
          aria-controls={idModaleEspeceNonTrouvee}
          data-fr-opened="false"
          type="button"
          class="fr-btn fr-btn--sm fr-btn--tertiary"
          onclick={onOuvertureModale}>Je ne trouve pas une espèce…</button
        >
      </div>

      <div class="fr-col-md-4 fr-col action-buttons">
        <button
          onclick={onDupliquerEspece}
          class="fr-btn fr-btn--secondary fr-icon-file-copy-2-line"
          type="button"
        >
          <span class="fr-sr-only"
            >Ajouter une espèce avec les mêmes impacts que l'espèce #{index}</span
          >
        </button>

        <button
          bind:this={deleteButton}
          onclick={onSuprimerEspece}
          class="fr-btn fr-btn--secondary fr-icon-delete-line"
          type="button"
        >
          <span class="fr-sr-only">Supprimer l'espèce #{index}</span>
        </button>
      </div>
    </div>

    {#if especeClassification}
      {#each descriptionImpacts as impact, indexImpact (impact)}
        <hr class="fr-hr" />

        <ImpactEspece
          bind:this={referencesImpact[indexImpact]}
          espèce={espece}
          espèceClassification={especeClassification}
          indexEspèce={index}
          indexImpact={indexImpact + 1}
          onSupprimerImpact={async () => {
            await deleteImpact(indexImpact);
          }}
          {activitesParClassificationEtreVivant}
          méthodesParClassificationEtreVivant={methodesParClassificationEtreVivant}
          {transportsParClassificationEtreVivant}
          bind:impact={descriptionImpacts[indexImpact]}
        />
      {/each}

      <hr class="fr-hr" />

      <div class="fr-fieldset__element fr-input-group container-ajouter-impact">
        <button class="fr-btn fr-btn--secondary" type="button" onclick={addImpact}>
          Ajouter un autre impact
        </button>
      </div>
    {/if}
  </fieldset>
</div>

<style>
  .input-info {
    display: flex;
    align-items: center;
    padding-top: 2.25rem;
  }

  .action-buttons {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: end;
    padding-top: 2.25rem;
  }

  .tuile-espece {
    text-align: inherit;
    padding: 1rem;
    border: 1px solid var(--border-default-grey);
    border-bottom: 0.25rem solid var(--border-active-blue-france);
    margin-bottom: 2rem;
  }

  .container-ajouter-impact {
    margin-bottom: 0;
  }

  hr {
    width: 80%;
    margin: auto;
  }
</style>
