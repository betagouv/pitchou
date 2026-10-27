<script lang="ts">
  import CommuneSelector from "#lib/components/CommuneSelector.svelte";
  import type { Commune } from "#lib/dossierLocation.ts";
  let { codes, onChange }: { codes: string[]; onChange: (codes: string[]) => void } = $props();
  const id = $props.id();
  let selected = $state<Record<string, Commune>>({});
  const communes = $derived(codes.map((code) => selected[code] ?? { code, name: code }));
</script>

<div>
  <CommuneSelector
    {id}
    label="ET communes du projet, au choix"
    value={communes}
    onChange={(value) => {
      selected = Object.fromEntries(value.filter((c) => c.code).map((c) => [c.code!, c]));
      onChange(Object.keys(selected));
    }}
  />
  <p class="hint m-0">
    Une commune correspondante suffit. Sans sélection : toutes les communes. Les codes INSEE sont
    conservés.
  </p>
</div>
