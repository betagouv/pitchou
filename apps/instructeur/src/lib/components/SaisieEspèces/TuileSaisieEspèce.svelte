<script lang="ts">
  import { tick } from "svelte";

  import AutocompleteEspeces from "./AutocompleteEspèces.svelte";
  import ImpactEspèce from "./ImpactEspèce.svelte";
  import { espèceLabel } from "@pitchou/common/outils-espèces.ts";

  import type {
    ParClassification,
    EspèceProtégée,
    ActivitéMenançante,
    MéthodeMenançante,
    MoyenDePoursuiteMenaçant,
    DescriptionImpact,
    ClassificationEtreVivant,
  } from "@pitchou/types/especes.d.ts";

  type Props = {
    index?: number;
    idModaleEspèceNonTrouvée?: string;
    espèce?: EspèceProtégée | undefined;
    descriptionImpacts?: DescriptionImpact[] | undefined;
    onDupliquerEspèce?: (() => Promise<void>) | undefined;
    onOuvertureModale?: ((e: Event) => void) | undefined;
    onSuprimerEspèce?: (() => Promise<void>) | undefined;
    espècesProtégées?: EspèceProtégée[];
    activitesParClassificationEtreVivant?: ParClassification<
      Map<ActivitéMenançante["Identifiant Pitchou"], ActivitéMenançante>
    >;
    méthodesParClassificationEtreVivant: ParClassification<
      Map<MéthodeMenançante["Code"], MéthodeMenançante>
    >;
    transportsParClassificationEtreVivant: ParClassification<
      Map<MoyenDePoursuiteMenaçant["Code"], MoyenDePoursuiteMenaçant>
    >;
  };

  let {
    index,
    idModaleEspèceNonTrouvée,
    espèce = $bindable(undefined),
    descriptionImpacts = $bindable([{}]),
    onOuvertureModale = undefined,
    onDupliquerEspèce = undefined,
    onSuprimerEspèce = undefined,
    espècesProtégées = [],
    activitesParClassificationEtreVivant,
    méthodesParClassificationEtreVivant,
    transportsParClassificationEtreVivant,
  }: Props = $props();

  let espèceClassification: ClassificationEtreVivant | undefined = $state(espèce?.classification);

  async function ajouterImpact() {
    descriptionImpacts.push({});

    await tick();

    référencesImpact = référencesImpact.filter((e) => e !== null);
    référencesImpact[référencesImpact.length - 1].focusFormulaireImpact();
  }

  async function supprimerImpact(indexImpactÀSupprimer: number) {
    descriptionImpacts.splice(indexImpactÀSupprimer, 1);
    descriptionImpacts = descriptionImpacts;

    await tick();

    référencesImpact = référencesImpact.filter((e) => e !== null);

    if (descriptionImpacts.length === 0) {
      await ajouterImpact();
    } else {
      let indexImpactÀFocus =
        indexImpactÀSupprimer === descriptionImpacts.length
          ? descriptionImpacts.length - 1
          : indexImpactÀSupprimer;

      référencesImpact[indexImpactÀFocus].focusBoutonSupprimer();
    }
  }

  export function focusBoutonSupprimer() {
    boutonSupprimer?.focus();
  }

  export function focusFormulaireEspèce() {
    autocomplete?.focus();
  }

  export function réinitialiserEspèce() {
    espèce = undefined;
  }

  function onChangeEspèce(nouvelleEspèce: EspèceProtégée) {
    if (nouvelleEspèce.classification !== espèceClassification) {
      descriptionImpacts = [{}];
    }

    espèceClassification = nouvelleEspèce.classification;
  }

  let référencesImpact: ImpactEspèce[] = $state([]);

  let boutonSupprimer: HTMLElement;

  let autocomplete: AutocompleteEspeces;
</script>

<div class="tuile-espece">
  <fieldset class="fr-fieldset">
    <legend class="fr-sr-only"
      >Espèce impactée #{index} {espèce ? espèceLabel(espèce) : "Non selectionnée"}</legend
    >

    <div class="fr-fieldset__element fr-input-group fr-grid-row fr-grid-row--gutters">
      <div class="fr-col-md-4 fr-col-12">
        <label class="fr-label" for="input-espece-{index}"> Espèce </label>
        <AutocompleteEspeces
          bind:this={autocomplete}
          onChange={onChangeEspèce}
          bind:espèceSélectionnée={espèce}
          espèces={espècesProtégées}
          id={"input-espece-" + index}
        />
      </div>

      <div class="fr-col-md-4 fr-col input-info">
        <button
          aria-controls={idModaleEspèceNonTrouvée}
          data-fr-opened="false"
          type="button"
          class="fr-btn fr-btn--sm fr-btn--tertiary"
          onclick={onOuvertureModale}>Je ne trouve pas une espèce…</button
        >
      </div>

      <div class="fr-col-md-4 fr-col action-buttons">
        <button
          onclick={onDupliquerEspèce}
          class="fr-btn fr-btn--secondary fr-icon-file-copy-2-line"
          type="button"
        >
          <span class="fr-sr-only"
            >Ajouter une espèce avec les mêmes impacts que l'espèce #{index}</span
          >
        </button>

        <button
          bind:this={boutonSupprimer}
          onclick={onSuprimerEspèce}
          class="fr-btn fr-btn--secondary fr-icon-delete-line"
          type="button"
        >
          <span class="fr-sr-only">Supprimer l'espèce #{index}</span>
        </button>
      </div>
    </div>

    {#if espèceClassification}
      {#each descriptionImpacts as impact, indexImpact (impact)}
        <hr class="fr-hr" />

        <ImpactEspèce
          bind:this={référencesImpact[indexImpact]}
          {espèce}
          {espèceClassification}
          indexEspèce={index}
          indexImpact={indexImpact + 1}
          onSupprimerImpact={async () => {
            await supprimerImpact(indexImpact);
          }}
          {activitesParClassificationEtreVivant}
          {méthodesParClassificationEtreVivant}
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
