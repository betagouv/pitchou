<script lang="ts">
  import type { TriState } from "./dossierAdminFormModel.ts";

  type Props = {
    id: string;
    label: string;
    value: TriState;
    onChange: (value: TriState) => void;
  };

  let { id, label, value, onChange }: Props = $props();
</script>

<div class="fr-select-group w-full">
  <label class="fr-label" for={id}>{label}</label>
  <select
    class="fr-select"
    {id}
    {value}
    onchange={(event) => onChange(event.currentTarget.value as TriState)}
  >
    <option value="">Non renseigné</option>
    <option value="oui">Oui</option>
    <option value="non">Non</option>
  </select>
</div>
