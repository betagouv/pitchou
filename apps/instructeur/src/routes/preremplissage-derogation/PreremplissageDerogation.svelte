<script lang="ts">
  import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
  import type {
    SchemaDemarcheSimplifiee,
    Dossier88444ChampDescriptor,
  } from "@pitchou/types/demarche-numerique/schema.ts";
  import { createGETPrefillingLinkDemarche } from "@pitchou/common/preremplissageDemarcheNumerique.ts";
  import CopyButton from "./CopyButton.svelte";

  function labelToId(label: string): string {
    return label.replace(/[^a-zA-Z0-9]+/g, "-");
  }

  type Props = {
    schemaDS88444: SchemaDemarcheSimplifiee;
  };

  let { schemaDS88444 }: Props = $props();

  let newPartialDossier: Partial<DossierDemarcheNumerique88444> = $state({});
  let prefillingLink = $state("");

  //@ts-expect-error svelte cannot understand that the schema labels are the keys of DossierDemarcheNumerique88444
  let prefilledFields: (keyof DossierDemarcheNumerique88444)[] = $derived(
    Object.keys(newPartialDossier).filter((field) => {
      //@ts-expect-error same here
      return newPartialDossier[field] !== "";
    }),
  );

  let onSelectChanged = () => {
    prefillingLink = createGETPrefillingLinkDemarche(newPartialDossier, schemaDS88444);
  };

  const possibleFieldTypes = [
    "DropDownListChampDescriptor",
    "MultipleDropDownListChampDescriptor",
    "YesNoChampDescriptor",
    "CheckboxChampDescriptor",
    "HeaderSectionChampDescriptor",
  ];

  //@ts-expect-error svelte cannot understand that the schema labels are the keys of DossierDemarcheNumerique88444
  let fillableFields: Dossier88444ChampDescriptor[] = $derived(
    schemaDS88444["revision"]["champDescriptors"]
      .filter((field) => {
        return possibleFieldTypes.includes(field["__typename"]);
      })
      .filter((field, i, currentArray) => {
        if (field["__typename"] === "HeaderSectionChampDescriptor") {
          const nextField = currentArray[i + 1];

          if (!nextField) return field["__typename"] !== "HeaderSectionChampDescriptor";

          if (nextField["__typename"] !== "HeaderSectionChampDescriptor") {
            return true;
          } else {
            return false;
          }
        } else {
          return true;
        }
      }),
  );

  let groupedFillableFields = $derived.by(() => {
    const result: { nom: string; fields: Dossier88444ChampDescriptor[] }[] = [];

    let group: { nom: string; fields: Dossier88444ChampDescriptor[] } = {
      nom: "Questions préliminaires",
      fields: [],
    };

    for (const field of fillableFields) {
      if (field["__typename"] === "HeaderSectionChampDescriptor") {
        if (group.fields.length) {
          result.push(group);
        }
        group = {
          nom: field["label"],
          fields: [],
        };
      } else {
        group.fields.push(field);
      }
    }

    return result;
  });
</script>

<svelte:head>
  <title>Pré-remplissage dérogation — Pitchou</title>
</svelte:head>

<div class="fr-grid-row fr-grid-row--center">
  <div class="fr-col-8">
    <h1>Pré-remplissage dérogation espèces protégées</h1>

    <form onchange={onSelectChanged}>
      {#each groupedFillableFields as group}
        <fieldset class="fr-fieldset">
          <legend class="fr-fieldset__legend--regular fr-fieldset__legend">
            <h2>{group.nom}</h2>
          </legend>
          {#each group.fields as field}
            <div class="fr-fieldset__element">
              <div class="fr-select-group">
                <label class="fr-label" for={labelToId(field["label"])}>
                  {field["label"]}
                </label>

                <select
                  bind:value={newPartialDossier[field["label"]]}
                  id={labelToId(field["label"])}
                  class="fr-select"
                >
                  <option value="" selected></option>
                  {#if field["options"]}
                    {#each field["options"] as option}
                      <option value={option}>{option}</option>
                    {/each}
                  {:else}
                    <option value={true}>Oui</option>
                    <option value={false}>Non</option>
                  {/if}
                </select>
              </div>
            </div>
          {/each}
        </fieldset>
      {/each}
    </form>

    <div class="fr-callout fr-callout--brown-caramel">
      <div class="fr-callout__text">
        {#if prefilledFields.length > 0}
          <p class="fr-mt-2w">La liste des éléments que vous avez pré-remplis avec ce lien :</p>
          <ul>
            {#each prefilledFields as prefilledField}
              <li>
                {prefilledField} :
                <em>
                  {#if typeof newPartialDossier[prefilledField] === "boolean"}
                    {newPartialDossier[prefilledField] ? "Oui" : "Non"}
                  {:else}
                    {newPartialDossier[prefilledField]}
                  {/if}
                </em>
              </li>
            {/each}
          </ul>

          <CopyButton
            classname="fr-btn fr-btn--lg copy-link"
            textToCopy={() => prefillingLink}
            initialLabel="Copier le lien de pré-remplissage"
          />

          <a href={prefillingLink} target="_blank"> Tester le lien de pré-remplissage </a>
        {:else}
          <p class="fr-mt-2w">
            Vous n'avez encore pré-rempli aucun champ de la dérogation. Vous pouvez sélectionner des
            options ci-dessus afin d'obtenir votre lien de pré-remplissage.
          </p>
        {/if}
      </div>
    </div>
  </div>
</div>
