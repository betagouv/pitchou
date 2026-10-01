<script lang="ts">
  import QuantifiedImpactFields from "./QuantifiedImpactFields.svelte";
  import Select from "@pitchou/ui/Select.svelte";

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

  const activiteOptions = $derived([
    { value: undefined, label: "-" },
    ...activitesMenacantes.map((activite) => ({
      value: activite["Identifiant Pitchou"],
      label: activite["Libellé Pitchou"],
    })),
  ]);

  const methodeOptions = $derived([
    { value: undefined, label: "-" },
    ...methodeMenacantes.map((methode) => ({
      value: methode.Code,
      label: methode["Libellé Pitchou"],
    })),
  ]);

  const moyenDePoursuiteOptions = $derived([
    { value: undefined, label: "-" },
    ...transportMenacants.map((transport) => ({
      value: transport.Code,
      label: transport["Libellé Pitchou"],
    })),
  ]);

  export function focusDeleteButton() {
    deleteButton?.focus();
  }

  export function focusImpactForm() {
    selectImpact?.focus();
  }

  function setActivite(identifiant: ActiviteMenancante["Identifiant Pitchou"] | undefined) {
    if (identifiant === impact.activité?.["Identifiant Pitchou"]) return;
    impact.activité = activitesMenacantes.find(
      (activite) => activite["Identifiant Pitchou"] === identifiant,
    );
    impact.méthode = undefined;
    impact.moyenDePoursuite = undefined;
    impact.nombreIndividus = undefined;
    impact.surfaceHabitatDétruit = undefined;
    impact.nombreNids = undefined;
    impact.nombreOeufs = undefined;
  }

  let deleteButton: HTMLElement | undefined = $state();

  let selectImpact: { focus: () => void } | undefined = $state();
</script>

<fieldset class="block min-w-0 w-full fr-m-0 fr-p-0">
  {#if indexImpact && indexEspece}
    <legend class="fr-text--bold fr-mb-2w"
      >Impact #{indexImpact}<span class="fr-sr-only"> sur l'espèce #{indexEspece}</span></legend
    >
  {:else}
    <legend class="fr-sr-only">Impact sur les espèces de type {especeClassification}</legend>
  {/if}
  <div class="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
    <div class="min-w-0">
      <label class="fr-label" for="input-espece-{indexEspece}-impact-{indexImpact}">
        Type d’impact
      </label>
      <Select
        bind:this={selectImpact}
        id="input-espece-{indexEspece}-impact-{indexImpact}"
        class="min-w-0"
        options={activiteOptions}
        bind:value={() => impact.activité?.["Identifiant Pitchou"], setActivite}
      />
    </div>
    {#if onSupprimerImpact}
      <button
        class="fr-btn fr-btn--tertiary fr-icon-delete-line shrink-0"
        type="button"
        title="Supprimer l'impact"
        bind:this={deleteButton}
        onclick={onSupprimerImpact}
      >
        <span class="fr-sr-only">Supprimer l'impact #{indexImpact} sur l'espèce #{indexEspece}</span
        >
      </button>
    {/if}
  </div>

  <div class="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
    {#if impact.activité && impact.activité["Méthode"] === "Oui"}
      <div class="min-w-0 fr-mt-2w">
        <label class="fr-label" for="input-espece-{indexEspece}-methode-{indexImpact}">
          Méthode
        </label>
        <Select
          id="input-espece-{indexEspece}-methode-{indexImpact}"
          class="fr-mt-1w"
          listPlacement={{ minWidth: 480 }}
          options={methodeOptions}
          bind:value={
            () => impact.méthode?.Code,
            (code) => (impact.méthode = methodeMenacantes.find((methode) => methode.Code === code))
          }
        />
        {#if impact.méthode && impact.méthode["Libellé Pitchou"].length > 80}
          <details class="fr-mt-1w fr-mb-0 fr-text--sm">
            <summary
              class="fr-link fr-link--sm fr-link--icon-right fr-icon-arrow-down-s-line cursor-pointer"
              >Voir le détail de la méthode</summary
            >
            <p class="fr-mt-1w fr-mb-0 break-words">{impact.méthode["Libellé Pitchou"]}</p>
          </details>
        {/if}
      </div>
    {/if}

    {#if impact.activité && impact.activité["Moyen de poursuite"] === "Oui"}
      <div class="min-w-0 fr-mt-2w">
        <label class="fr-label" for="input-espece-{indexEspece}-moyen-de-poursuite-{indexImpact}">
          Moyen de poursuite
        </label>
        <Select
          id="input-espece-{indexEspece}-moyen-de-poursuite-{indexImpact}"
          class="fr-mt-1w"
          options={moyenDePoursuiteOptions}
          bind:value={
            () => impact.moyenDePoursuite?.Code,
            (code) =>
              (impact.moyenDePoursuite = transportMenacants.find(
                (transport) => transport.Code === code,
              ))
          }
        />
      </div>
    {/if}
  </div>

  <QuantifiedImpactFields bind:impact {indexEspece} {indexImpact} />
</fieldset>
