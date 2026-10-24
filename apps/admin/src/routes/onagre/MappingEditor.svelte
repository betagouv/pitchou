<script lang="ts">
  import { untrack } from "svelte";
  import Select from "@pitchou/ui/Select.svelte";
  import TargetPicker from "./TargetPicker.svelte";
  import { enhance } from "$app/forms";
  import { page } from "$app/state";
  import type { OnagreMapping } from "@pitchou/types/onagre.ts";
  let {
    mapping,
    targets,
    writable,
  }: {
    mapping: OnagreMapping;
    targets: { table_name: string; column_name: string; data_type: string }[];
    writable: boolean;
  } = $props();
  let busy = $state(false);
  let status = $state(untrack(() => mapping.status));
  let target = $state(untrack(() => mapping.target));
</script>

<h2>{mapping.section} · {mapping.label}</h2>
<p class="onagre-context">{mapping.context}</p>
<div class="onagre-original">
  <h3>Proposition du classeur</h3>
  <p>{mapping.proposal || "Aucune proposition"}</p>
  {#if mapping.confidence}<p>Confiance indiquée par l'équipe · {mapping.confidence}</p>{/if}
</div>
<form
  method="POST"
  action={`?/save&tab=correspondances&snapshot=${page.url.searchParams.get("snapshot") ?? ""}`}
  use:enhance={() => {
    busy = true;
    return async ({ update }) => {
      try {
        await update({ reset: false });
      } finally {
        busy = false;
      }
    };
  }}
  class="admin-stack"
>
  <input type="hidden" name="key" value={mapping.key} /><input
    type="hidden"
    name="version"
    value={mapping.version}
  />
  <fieldset disabled={!writable || busy} class="admin-stack">
    <legend>Décision de l'équipe</legend>
    <input type="hidden" name="status" value={status} />
    <div class="onagre-field">
      <label for="mapping-status">Avancement</label>
      <Select
        id="mapping-status"
        bind:value={status}
        disabled={!writable || busy}
        options={[
          { value: "todo", label: "À traiter" },
          { value: "discuss", label: "À discuter" },
          { value: "validated", label: "Validée" },
          { value: "excluded", label: "Exclue de la reprise" },
        ]}
      />
    </div>
    <TargetPicker {targets} bind:value={target} disabled={!writable || busy} />
    <label
      >Règle de reprise<textarea
        class="fr-input"
        name="rule"
        rows="5"
        maxlength="20000"
        placeholder="Comment transformer l'information ? Que faire si elle manque ou si plusieurs choix sont possibles ?"
        >{mapping.rule}</textarea
      ></label
    >
    <label
      >Notes et questions pour l'équipe<textarea
        class="fr-input"
        name="notes"
        rows="4"
        maxlength="20000">{mapping.notes}</textarea
      ></label
    >
    <button class="fr-btn" type="submit"
      >{busy ? "Enregistrement…" : "Enregistrer la décision"}</button
    >
  </fieldset>
  <p class="onagre-context">
    Version {mapping.version}. La destination et la règle sont requises pour valider. Une exclusion
    doit être expliquée.
  </p>
</form>
