<script lang="ts">
  import type { ScientificIntervenant } from "./dossierAdminFormModel.ts";

  type Props = {
    value: ScientificIntervenant[];
    onChange: (value: ScientificIntervenant[]) => void;
  };
  let { value, onChange }: Props = $props();

  function update(index: number, field: keyof ScientificIntervenant, text: string) {
    onChange(
      value.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: text } : item)),
    );
  }
</script>

<div class="w-full">
  <p class="fr-label">Intervenants scientifiques</p>
  {#each value as intervenant, index (index)}
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-3 items-end fr-mb-2w">
      <div class="fr-input-group fr-mb-0">
        <label class="fr-label" for={`edit-intervenant-name-${index}`}>Nom complet</label>
        <input
          class="fr-input"
          id={`edit-intervenant-name-${index}`}
          type="text"
          value={intervenant.nom_complet ?? ""}
          oninput={(event) => update(index, "nom_complet", event.currentTarget.value)}
        />
      </div>
      <div class="fr-input-group fr-mb-0">
        <label class="fr-label" for={`edit-intervenant-qualification-${index}`}>Qualification</label
        >
        <input
          class="fr-input"
          id={`edit-intervenant-qualification-${index}`}
          type="text"
          value={intervenant.qualification ?? ""}
          oninput={(event) => update(index, "qualification", event.currentTarget.value)}
        />
      </div>
      <button
        type="button"
        class="fr-btn fr-btn--tertiary-no-outline fr-icon-delete-line fr-btn--icon-left"
        aria-label={`Retirer l'intervenant ${index + 1}`}
        onclick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
        >Retirer</button
      >
    </div>
  {/each}
  <button
    type="button"
    class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-add-line fr-btn--icon-left"
    onclick={() => onChange([...value, { nom_complet: null, qualification: null }])}
    >Ajouter un intervenant</button
  >
</div>
