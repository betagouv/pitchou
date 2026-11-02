<script lang="ts">
  import { untrack } from "svelte";
  import type { GroupRule } from "@pitchou/types/groupRouting.ts";
  import type { PageData } from "../$types";
  import RuleEditor from "./RuleEditor.svelte";
  let {
    rules = $bindable<GroupRule[]>([]),
    activites,
  }: { rules: GroupRule[]; activites: PageData["activites"] } = $props();
  let keys = $state(untrack(() => rules.map((_, index) => index)));
  let nextKey = untrack(() => keys.length);
  function addRule() {
    keys = [...keys, nextKey++];
    rules = [...rules, { departments: [], communes: [], activites: [], accessLevel: "instruct" }];
  }
  function removeRule(index: number) {
    keys = keys.filter((_, i) => i !== index);
    rules = rules.filter((_, i) => i !== index);
  }
</script>

<div class="grid gap-4">
  <p class="hint m-0">
    Tous les critères d'une règle doivent correspondre. Une seule règle suffit pour affecter un
    dossier. Sans règle, seules les affectations manuelles sont conservées.
  </p>
  {#each keys as key, index (key)}
    <RuleEditor
      rule={rules[index]}
      {index}
      {activites}
      onChange={(updated) => (rules = rules.map((rule, i) => (i === index ? updated : rule)))}
      onRemove={() => removeRule(index)}
    />
  {:else}
    <p class="fr-alert fr-alert--info fr-alert--sm">Aucune affectation automatique.</p>
  {/each}
  <button
    type="button"
    class="fr-btn fr-btn--secondary fr-icon-add-line fr-btn--icon-left justify-self-start"
    disabled={rules.length >= 50}
    onclick={addRule}>Ajouter une règle</button
  >
</div>
