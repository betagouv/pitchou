<script lang="ts">
  import EspeceSelectionList from "./EspeceSelectionList.svelte";
  import ImpactEspece from "../ImpactEspece.svelte";
  import type {
    ActiviteMenancante,
    ByClassification,
    ClassificationEtreVivant,
    DescriptionImpact,
    EspeceProtegee,
    MethodeMenancante,
    MoyenDePoursuiteMenacant,
  } from "@pitchou/types/especes.d.ts";
  type Props = {
    especes: Set<EspeceProtegee>;
    all: Array<{ espèce?: EspeceProtegee; impacts: DescriptionImpact[] }>;
    label: string;
    classification: ClassificationEtreVivant;
    impact: DescriptionImpact;
    index: number;
    deleteButtonRefs: HTMLElement[];
    onRemove: (espece: EspeceProtegee) => void;
    activites?: ByClassification<
      Map<ActiviteMenancante["Identifiant Pitchou"], ActiviteMenancante>
    >;
    methodes: ByClassification<Map<MethodeMenancante["Code"], MethodeMenancante>>;
    transports: ByClassification<Map<MoyenDePoursuiteMenacant["Code"], MoyenDePoursuiteMenacant>>;
  };
  let {
    especes,
    all,
    label,
    classification,
    impact = $bindable(),
    index,
    deleteButtonRefs = $bindable(),
    onRemove,
    activites,
    methodes,
    transports,
  }: Props = $props();
</script>

<EspeceSelectionList {especes} {all} {label} bind:deleteButtonRefs {onRemove} />
<ImpactEspece
  bind:impact
  indexEspèce={index}
  espèceClassification={classification}
  activitesParClassificationEtreVivant={activites}
  méthodesParClassificationEtreVivant={methodes}
  transportsParClassificationEtreVivant={transports}
/>
