<script lang="ts">
  import type { DescriptionImpact } from "@pitchou/types/especes.d.ts";
  import ImpactEspece from "./ImpactEspece.svelte";
  import { activites, initialImpact, methodes, transports } from "./impactEspece.fixture.ts";

  let impact = $state<DescriptionImpact>({ ...initialImpact });

  export function getImpact() {
    return impact;
  }
</script>

<ImpactEspece
  bind:impact
  indexEspèce={1}
  indexImpact={1}
  espèceClassification="oiseau"
  activitesParClassificationEtreVivant={activites}
  méthodesParClassificationEtreVivant={methodes}
  transportsParClassificationEtreVivant={transports}
/>
