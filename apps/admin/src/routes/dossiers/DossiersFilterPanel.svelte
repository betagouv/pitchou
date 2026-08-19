<script lang="ts">
  import Select from "@pitchou/ui/Select.svelte";
  import { phases } from "@pitchou/common/phases.ts";

  import type { DossiersQuery } from "$lib/actions/adminDossiers.ts";

  type Props = {
    selectedPhase: string;
    selectedSource: DossiersQuery["source"];
    onChange: (updates: { phase?: string; source?: DossiersQuery["source"] }) => void;
  };

  let { selectedPhase, selectedSource, onChange }: Props = $props();

  const rowClass =
    "flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:mb-0 [&_.fr-label]:flex-[0_0_18rem] [&_.fr-label]:max-[768px]:flex-none";
</script>

<fieldset
  id="filter-panel"
  class="border border-[color:var(--border-default-grey)] rounded-[0.25rem] fr-p-2w"
>
  <legend class="text-[1.25rem] fr-text--bold fr-mb-2w fr-p-0">Filtrer les dossiers</legend>
  <div class="flex flex-col gap-3 max-w-[48rem]">
    <div class={rowClass}>
      <label class="fr-label" for="select-phase">Phase</label>
      <Select
        id="select-phase"
        class="flex-auto"
        ariaLabel="Phase choisie"
        options={[
          { value: "", label: "Toutes les phases" },
          ...[...phases].map((phase) => ({ value: phase, label: phase })),
        ]}
        value={selectedPhase}
        onChange={(phase) => onChange({ phase })}
      />
    </div>
    <div class={rowClass}>
      <label class="fr-label" for="select-source">Source</label>
      <Select
        id="select-source"
        class="flex-auto"
        ariaLabel="Source choisie"
        options={[
          { value: "", label: "Toutes les sources" },
          { value: "pitchou", label: "Créé dans Pitchou" },
          { value: "dn", label: "Importé de Démarches Numériques" },
          { value: "unknown", label: "Source inconnue" },
        ]}
        value={selectedSource}
        onChange={(source) => onChange({ source: source as DossiersQuery["source"] })}
      />
    </div>
  </div>
</fieldset>
