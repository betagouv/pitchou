<script lang="ts">
  import { untrack } from "svelte";
  import Select from "@pitchou/ui/Select.svelte";
  import MultiSelectFilter from "@pitchou/ui/MultiSelectFilter.svelte";
  import { departements } from "@pitchou/common/departements.ts";
  import type { AccessLevel, GroupRule } from "@pitchou/types/groupRouting.ts";
  import type { PageData } from "../$types";
  import RuleCommunes from "./RuleCommunes.svelte";

  let {
    rule,
    index,
    activites,
    onChange,
    onRemove,
    onValidityChange,
  }: {
    rule: GroupRule;
    index: number;
    activites: PageData["activites"];
    onChange: (rule: GroupRule) => void;
    onRemove: () => void;
    onValidityChange: (valid: boolean) => void;
  } = $props();
  type Criterion = "departments" | "communes" | "activites";
  const criteria: { value: Criterion; label: string }[] = [
    { value: "departments", label: "Département principal" },
    { value: "communes", label: "Communes du projet" },
    { value: "activites", label: "Activité principale" },
  ];
  const id = $props.id();
  let criterionToAdd = $state<Criterion | null>(null);
  let enabled = $state(
    untrack(() => criteria.filter(({ value }) => rule[value].length > 0).map(({ value }) => value)),
  );
  const available = $derived(criteria.filter(({ value }) => !enabled.includes(value)));
  const departments = departements.map((d) => ({ value: d.code, label: `${d.code} - ${d.name}` }));
  const activities = $derived(activites.map((a) => ({ value: a.code, label: a.label })));
  $effect(() => {
    onValidityChange(enabled.length > 0 && enabled.every((key) => rule[key].length > 0));
  });
  function selectionMode(selected: string[], options: { value: string }[]) {
    if (selected.length === 0) return "none";
    return options.length > 0 && options.every(({ value }) => selected.includes(value))
      ? "all"
      : "custom";
  }
  const accessOptions: { value: AccessLevel; label: string }[] = [
    { value: "instruct", label: "Instruction" },
    { value: "read", label: "Lecture complète" },
  ];
  function removeCriterion(key: Criterion) {
    enabled = enabled.filter((value) => value !== key);
    onChange({ ...rule, [key]: [] });
  }
</script>

<fieldset class="grid min-w-0 gap-4 rounded-lg border border-[var(--border-default-grey)] p-4">
  <legend class="px-2 font-semibold">Règle {index + 1}{index > 0 ? " · OU" : ""}</legend>
  <div class="grid gap-2">
    <label for={`${id}-access`}>Niveau d'accès de la règle {index + 1}</label>
    <Select
      id={`${id}-access`}
      options={accessOptions}
      value={rule.accessLevel ?? "instruct"}
      onChange={(accessLevel) => onChange({ ...rule, accessLevel })}
    />
  </div>
  {#each enabled as key, position (key)}
    {@const label = criteria.find((criterion) => criterion.value === key)!.label}
    {#if position > 0}<span class="text-xs font-semibold text-[var(--text-mention-grey)]">ET</span
      >{/if}
    <div class="grid min-w-0 gap-2 border-l-2 border-[var(--border-default-grey)] pl-3">
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-semibold">{label}</span>
        <button
          type="button"
          class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-close-line"
          aria-label={`Retirer le critère ${label}`}
          title={`Retirer le critère ${label}`}
          onclick={() => removeCriterion(key)}
        ></button>
      </div>
      {#if key === "departments"}
        <MultiSelectFilter
          id={`${id}-departments`}
          label="Départements"
          allLabel="Tous les départements"
          noneLabel="Sélectionner des départements"
          selectionMode={selectionMode(rule.departments, departments)}
          options={departments}
          selected={rule.departments}
          onChange={(departments) => onChange({ ...rule, departments })}
        />
      {:else if key === "communes"}
        <RuleCommunes
          codes={rule.communes}
          onChange={(communes) => onChange({ ...rule, communes })}
        />
      {:else}
        <MultiSelectFilter
          id={`${id}-activites`}
          label="Activités"
          allLabel="Toutes les activités"
          noneLabel="Sélectionner des activités"
          selectionMode={selectionMode(rule.activites, activities)}
          options={activities}
          selected={rule.activites}
          onChange={(activites) => onChange({ ...rule, activites })}
        />
      {/if}
      {#if rule[key].length === 0}<p class="hint m-0">
          Sélectionnez au moins {key === "departments"
            ? "un département"
            : key === "communes"
              ? "une commune"
              : "une activité"}, ou retirez ce critère.
        </p>{/if}
    </div>
  {:else}
    <p class="hint m-0">Ajoutez un critère pour définir les dossiers concernés.</p>
  {/each}
  <div class="flex flex-wrap items-center justify-between gap-3">
    {#if available.length > 0}
      <Select
        id={`${id}-add`}
        class="w-full sm:w-64"
        options={available}
        bind:value={criterionToAdd}
        ariaLabel={`Ajouter un critère à la règle ${index + 1}`}
        placeholder="+ Ajouter un critère"
        onChange={(key) => {
          if (key && !enabled.includes(key)) enabled = [...enabled, key];
          criterionToAdd = null;
        }}
      />
    {/if}
    <button type="button" class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm" onclick={onRemove}
      >Supprimer cette règle</button
    >
  </div>
</fieldset>
