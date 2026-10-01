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

<div
  class="min-w-0 bg-[var(--background-default-grey)] p-4 md:p-6 border border-[color:var(--border-default-grey)] border-t-4 border-t-[color:var(--border-active-blue-france)] fr-mb-3w"
>
  <fieldset class="min-w-0 m-0 block w-full p-0">
    <legend class="fr-text--lg fr-text--bold fr-mb-2w">
      Espèce #{index}
      <span class="fr-sr-only">{espece ? especeLabel(espece) : "Non sélectionnée"}</span>
    </legend>

    <div class="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:gap-6">
      <div class="min-w-0">
        <label class="fr-label" for="input-espece-{index}"> Espèce </label>
        <AutocompleteEspeces
          bind:this={autocomplete}
          onChange={onChangeEspece}
          bind:espèceSélectionnée={espece}
          espèces={especesProtegees}
          id={"input-espece-" + index}
        />
        <button
          aria-controls={idModaleEspeceNonTrouvee}
          data-fr-opened="false"
          type="button"
          class="fr-btn fr-btn--sm fr-btn--tertiary fr-mt-1w"
          onclick={onOuvertureModale}>Je ne trouve pas une espèce…</button
        >
      </div>

      <div class="flex items-start gap-2 md:pt-6">
        <button
          onclick={onDupliquerEspece}
          class="fr-btn fr-btn--secondary fr-icon-file-copy-2-line"
          title="Ajouter une espèce avec les mêmes impacts"
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
          title="Supprimer l'espèce"
          type="button"
        >
          <span class="fr-sr-only">Supprimer l'espèce #{index}</span>
        </button>
      </div>
    </div>

    {#if especeClassification}
      {#each descriptionImpacts as impact, indexImpact (impact)}
        <div class="min-w-0 border-t border-[color:var(--border-default-grey)] fr-mt-3w fr-pt-3w">
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
        </div>
      {/each}

      <div class="fr-mt-3w">
        <button
          class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-add-line"
          type="button"
          onclick={addImpact}
        >
          Ajouter un autre impact
        </button>
      </div>
    {/if}
  </fieldset>
</div>
