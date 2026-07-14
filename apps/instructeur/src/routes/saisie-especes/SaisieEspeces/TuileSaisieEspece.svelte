<script lang="ts">
  import { tick } from "svelte";

  import AutocompleteEspeces from "./AutocompleteEspeces.svelte";
  import ImpactEspece from "./ImpactEspece.svelte";
  import { especeLabel } from "@pitchou/common/outils-especes.ts";

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

  async function ajouterImpact() {
    descriptionImpacts.push({});

    await tick();

    referencesImpact = referencesImpact.filter((e) => e !== null);
    referencesImpact[referencesImpact.length - 1].focusFormulaireImpact();
  }

  async function supprimerImpact(indexImpactASupprimer: number) {
    descriptionImpacts.splice(indexImpactASupprimer, 1);
    descriptionImpacts = descriptionImpacts;

    await tick();

    referencesImpact = referencesImpact.filter((e) => e !== null);

    if (descriptionImpacts.length === 0) {
      await ajouterImpact();
    } else {
      let indexImpactAFocus =
        indexImpactASupprimer === descriptionImpacts.length
          ? descriptionImpacts.length - 1
          : indexImpactASupprimer;

      referencesImpact[indexImpactAFocus].focusBoutonSupprimer();
    }
  }

  export function focusBoutonSupprimer() {
    boutonSupprimer?.focus();
  }

  export function focusFormulaireEspece() {
    autocomplete?.focus();
  }

  export function reinitialiserEspece() {
    espece = undefined;
  }

  function onChangeEspece(nouvelleEspece: EspeceProtegee) {
    if (nouvelleEspece.classification !== especeClassification) {
      descriptionImpacts = [{}];
    }

    especeClassification = nouvelleEspece.classification;
  }

  let referencesImpact: ImpactEspece[] = $state([]);

  let boutonSupprimer: HTMLElement;

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
          bind:this={boutonSupprimer}
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
            await supprimerImpact(indexImpact);
          }}
          {activitesParClassificationEtreVivant}
          méthodesParClassificationEtreVivant={methodesParClassificationEtreVivant}
          {transportsParClassificationEtreVivant}
          bind:impact={descriptionImpacts[indexImpact]}
        />
      {/each}

      <hr class="fr-hr" />

      <div class="fr-fieldset__element fr-input-group container-ajouter-impact">
        <button class="fr-btn fr-btn--secondary" type="button" onclick={ajouterImpact}>
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
