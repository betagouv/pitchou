<script lang="ts">
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
    <label
      >Avancement<select class="fr-select" name="status" value={mapping.status}
        ><option value="todo">À traiter</option><option value="discuss">À discuter</option><option
          value="validated">Validée</option
        ><option value="excluded">Exclue de la reprise</option></select
      ></label
    >
    <label
      >Destination dans Pitchou<input
        class="fr-input"
        name="target"
        value={mapping.target}
        list="pitchou-targets"
        maxlength="20000"
        placeholder="Ex. dossier.name, commentaire, donnée source conservée"
      /></label
    >
    <datalist id="pitchou-targets"
      >{#each targets as target}<option value={`${target.table_name}.${target.column_name}`}
          >{target.data_type}</option
        >{/each}</datalist
    >
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
