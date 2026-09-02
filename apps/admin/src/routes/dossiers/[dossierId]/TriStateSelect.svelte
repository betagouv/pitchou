<script lang="ts">
  import Select from "@pitchou/ui/Select.svelte";

  import type { TriState } from "./dossierAdminFormModel.ts";

  type Props = {
    id: string;
    label: string;
    value: TriState;
    onChange: (value: TriState) => void;
  };

  let { id, label, value, onChange }: Props = $props();

  const options: { value: TriState; label: string }[] = [
    { value: "", label: "Non renseigné" },
    { value: "oui", label: "Oui" },
    { value: "non", label: "Non" },
  ];
</script>

<div class="fr-select-group w-full">
  <label class="fr-label" for={id}>{label}</label>
  <Select {id} class="fr-mt-1w" {options} {value} {onChange} />
</div>
