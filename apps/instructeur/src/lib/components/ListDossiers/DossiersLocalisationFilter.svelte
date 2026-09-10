<script lang="ts">
  import { store } from "$lib/state/store.svelte.ts";
  import MultiSelectFilter from "@pitchou/ui/MultiSelectFilter.svelte";
  import {
    assignedDepartments,
    listAssignedDepartements,
    listAvailableDepartements,
  } from "./filterOptions.ts";
  import { changeLocalisation, LOCALISATION_LABEL, type Localisation } from "./localisation.ts";
  import type { DossiersQuery } from "./query.ts";

  let { draft = $bindable(), showScope = true }: { draft: DossiersQuery; showScope?: boolean } =
    $props();
  const scopes: Localisation[] = $derived(showScope ? ["assigned", "france"] : ["assigned"]);
  const departementOptions = $derived(
    (!showScope || draft.localisation === "assigned"
      ? listAssignedDepartements(assignedDepartments(store.dossierSummaries.values()))
      : listAvailableDepartements([...store.dossierSummaries.values()])
    ).map(({ code, name }) => ({ value: code, label: `${code} — ${name}` })),
  );
</script>

<fieldset class="border-0 fr-mt-0 fr-mx-0 fr-mb-3w fr-p-0">
  <legend
    class="flex items-center gap-2 text-[1rem] fr-text--bold fr-mb-1w [&_span[class*=fr-icon]]:text-[color:var(--text-action-high-blue-france,#000091)]"
  >
    <span class="fr-icon-map-pin-2-line fr-icon--sm" aria-hidden="true"></span> Localisation
  </legend>
  {#each scopes as localisation}
    {#if showScope}
      <div class="fr-radio-group fr-radio-group--sm">
        <input
          type="radio"
          id="localisation-{localisation}"
          name="localisation"
          checked={draft.localisation === localisation}
          onchange={() => (draft = changeLocalisation(draft, localisation))}
        />
        <label class="fr-label" for="localisation-{localisation}">
          {LOCALISATION_LABEL[localisation]}
        </label>
      </div>
    {/if}
    {#if !showScope || draft.localisation === localisation}
      <div class={showScope ? "fr-ml-4w fr-mt-1w fr-mb-2w" : ""}>
        <MultiSelectFilter
          id="filtre-departement"
          label="Département"
          allLabel="Tous les départements"
          noneLabel="Aucun département"
          options={departementOptions}
          selected={draft.departement}
          selectionMode={draft.departementSelection}
          onChange={(values, mode) => {
            draft.departementSelection = mode;
            draft.departement = mode === "custom" ? values : [];
          }}
        />
      </div>
    {/if}
  {/each}
</fieldset>
