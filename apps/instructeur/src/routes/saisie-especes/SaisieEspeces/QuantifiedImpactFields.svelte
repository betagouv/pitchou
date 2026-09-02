<script lang="ts">
  import { individusRanges } from "./especeFieldset.ts";
  import Select from "@pitchou/ui/Select.svelte";
  import type { DescriptionImpact } from "@pitchou/types/especes.d.ts";
  type Props = { impact: DescriptionImpact; indexEspece?: number; indexImpact?: number };
  let { impact = $bindable(), indexEspece, indexImpact }: Props = $props();

  const individusOptions = [
    { value: undefined, label: "-" },
    ...individusRanges.map((range) => ({ value: range, label: range })),
  ];
</script>

{#if impact.activité}
  <div class="fr-fieldset__element fr-input-group fr-grid-row fr-grid-row--gutters">
    {#if impact.activité["Nombre d'individus"] === "Oui"}
      <div class="fr-col-md-3 fr-col-12 input-select">
        <label class="fr-label" for="input-espece-{indexEspece}-nombre-individus-{indexImpact}"
          >Nombre d’individus</label
        >
        <Select
          id="input-espece-{indexEspece}-nombre-individus-{indexImpact}"
          class="fr-mt-1w"
          options={individusOptions}
          bind:value={impact.nombreIndividus}
        />
      </div>
    {/if}
    {#if impact.activité["Nids"] === "Oui"}
      <div class="fr-col-md-3 fr-col-12 input-button">
        <label class="fr-label" for="input-espece-{indexEspece}-nids-{indexImpact}">Nids</label>
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
        <label class="fr-label" for="input-espece-{indexEspece}-oeufs-{indexImpact}">Œufs</label>
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
        <label class="fr-label" for="input-espece-{indexEspece}-surface-{indexImpact}"
          >Surface habitat détruit (m²)</label
        >
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
