<script lang="ts">
  import type { FeatureCollection } from "../dossierAdminFormModel.ts";
  import { featureLabel } from "./projectMapGeometry.ts";

  type Props = {
    value: FeatureCollection;
    disabled: boolean;
    onChange: (value: FeatureCollection | null) => void;
  };
  let { value, disabled, onChange }: Props = $props();

  function updateDescription(index: number, description: string) {
    const features = value.features.map((feature, featureIndex) =>
      featureIndex === index
        ? { ...feature, properties: { ...(feature.properties ?? {}), description } }
        : feature,
    );
    onChange({ ...value, features });
  }

  function remove(index: number) {
    const features = value.features.filter((_, featureIndex) => featureIndex !== index);
    onChange(features.length >= 1 ? { ...value, features } : null);
  }
</script>

{#if value.features.length >= 1}
  <div class="fr-mt-3w">
    <h4 class="fr-h6">Sélections utilisateur</h4>
    <ul class="flex flex-col gap-4">
      {#each value.features as feature, index (index)}
        <li>
          <div class="flex items-center justify-between gap-4 flex-wrap">
            <strong>{featureLabel(feature)}</strong>
            <button
              type="button"
              class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-delete-line fr-btn--icon-left"
              {disabled}
              onclick={() => remove(index)}>Supprimer</button
            >
          </div>
          <input
            class="fr-input fr-mt-1w"
            aria-label={`Description de ${featureLabel(feature)}`}
            placeholder="Description"
            value={String(feature.properties?.description ?? "")}
            {disabled}
            oninput={(event) => updateDescription(index, event.currentTarget.value)}
          />
        </li>
      {/each}
    </ul>
  </div>
{/if}
