<script lang="ts">
  import RuleCommunes from "./RuleCommunes.svelte";
  import type { GroupRule } from "@pitchou/types/groupRouting.ts";
  import type { PageData } from "../$types";
  import MultiSelectFilter from "@pitchou/ui/MultiSelectFilter.svelte";
  import { departements } from "@pitchou/common/departements.ts";
  let {
    rules = $bindable<GroupRule[]>([]),
    activites,
  }: { rules: GroupRule[]; activites: PageData["activites"] } = $props();
  const id = $props.id();
  const departments = departements.map((d) => ({ value: d.code, label: `${d.code} - ${d.name}` }));
  const activities = $derived(activites.map((a) => ({ value: a.code, label: a.label })));
  function change(index: number, key: keyof GroupRule, value: string[]) {
    rules = rules.map((rule, i) => (i === index ? { ...rule, [key]: value } : rule));
  }
</script>

<div class="grid gap-4">
  <p class="hint m-0">
    Un dossier doit satisfaire tous les critères d'une règle. Une seule règle correspondante suffit.
    Sans règle, seules les affectations manuelles sont conservées.
  </p>
  {#each rules as rule, index}
    <fieldset class="grid gap-3 rounded-lg border border-[var(--border-default-grey)] p-4">
      <legend>Règle {index + 1}{index > 0 ? " · OU" : ""}</legend>
      <label for={`${id}-departments-${index}`}>Département principal, au choix</label>
      <MultiSelectFilter
        id={`${id}-departments-${index}`}
        label="Départements"
        allLabel="Tous les départements"
        options={departments}
        selected={rule.departments}
        onChange={(value) => change(index, "departments", value)}
      />
      <RuleCommunes codes={rule.communes} onChange={(value) => change(index, "communes", value)} />
      <label for={`${id}-activites-${index}`}>ET activité principale, au choix</label>
      <MultiSelectFilter
        id={`${id}-activites-${index}`}
        label="Activités"
        allLabel="Toutes les activités"
        options={activities}
        selected={rule.activites}
        onChange={(value) => change(index, "activites", value)}
      />
      <button
        type="button"
        class="fr-btn fr-btn--tertiary fr-btn--sm justify-self-start"
        onclick={() => (rules = rules.filter((_, i) => i !== index))}>Supprimer cette règle</button
      >
    </fieldset>
  {:else}
    <p class="fr-alert fr-alert--info fr-alert--sm">Aucune affectation automatique.</p>
  {/each}
  <button
    type="button"
    class="fr-btn fr-btn--secondary justify-self-start"
    disabled={rules.length >= 50}
    onclick={() => (rules = [...rules, { departments: [], communes: [], activites: [] }])}
    >Ajouter une règle</button
  >
</div>
