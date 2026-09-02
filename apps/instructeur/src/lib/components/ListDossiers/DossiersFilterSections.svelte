<script lang="ts" module>
  import type { ActiviteReferentielLite as ReferentielForCache } from "./listModel.ts";

  // The referentiel only feeds the filter's groups (colors, icons) and instructeurs cannot edit
  // it, so one fetch per full page load is enough — remounts reuse it.
  let referentielPromise: Promise<ReferentielForCache | null> | null = null;

  function loadActiviteReferentiel(): Promise<ReferentielForCache | null> {
    referentielPromise ??= (async () => {
      const response = await fetch("/api/activites");
      if (!response.ok) return null;
      const referentiel = await response.json();
      if (Array.isArray(referentiel?.groupes) && Array.isArray(referentiel?.activites)) {
        return referentiel;
      }
      return null;
    })().catch(() => {
      // Network failure: let a later mount retry instead of caching the failure.
      referentielPromise = null;
      return null;
    });
    return referentielPromise;
  }
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type { PitchouState } from "$lib/state/store.svelte.ts";
  import type { ActiviteReferentielLite, DossiersQuery } from "./listModel.ts";
  import {
    WITHOUT_INSTRUCTEUR,
    PROCHAINE_ACTION_OPTIONS,
    activiteFilterEntries,
    listAvailableDepartements,
    listAvailableInstructeurs,
  } from "./listModel.ts";
  import { phases as allPhases } from "$lib/dossier/displayDossier.ts";
  import MultiSelectFilter from "@pitchou/ui/MultiSelectFilter.svelte";
  import DossiersAdditionalFilters from "./DossiersAdditionalFilters.svelte";

  type Props = {
    draft: DossiersQuery;
    dossiers: DossierSummary[];
    followRelations?: PitchouState["followRelations"];
    showFilterInstructeurice: boolean;
  };

  let {
    draft = $bindable(),
    dossiers,
    followRelations,
    showFilterInstructeurice,
  }: Props = $props();

  // The referentiel brings the thematic groups (colors, icons) of the activity filter; the
  // filter works with a flat list until it loads (or when it fails).
  let activiteReferentiel = $state<ActiviteReferentielLite | null>(null);
  onMount(async () => {
    activiteReferentiel = await loadActiviteReferentiel();
  });

  const activiteOptions = $derived(activiteFilterEntries(dossiers, activiteReferentiel));
  const departementOptions = $derived(
    listAvailableDepartements(dossiers).map(({ code, name }) => ({
      value: code,
      label: `${code} — ${name}`,
    })),
  );
  const instructeurOptions = $derived(
    listAvailableInstructeurs(followRelations).map((email) => ({ value: email, label: email })),
  );

  // Named instructeurs and the « sans instructeur·ice » sentinel share the same array.
  const selectedInstructeurs = $derived(
    draft.instructeur.filter((value) => value !== WITHOUT_INSTRUCTEUR),
  );
  const withoutInstructeur = $derived(draft.instructeur.includes(WITHOUT_INSTRUCTEUR));

  function setInstructeurs(values: string[]) {
    draft.instructeur = [...values, ...(withoutInstructeur ? [WITHOUT_INSTRUCTEUR] : [])];
  }
  function toggleWithoutInstructeur(checked: boolean) {
    const named = selectedInstructeurs;
    draft.instructeur = checked ? [...named, WITHOUT_INSTRUCTEUR] : named;
  }
</script>

<!-- Phase -->
<fieldset class="border-0 fr-mt-0 fr-mx-0 fr-mb-3w fr-p-0">
  <legend
    class="flex items-center gap-2 text-[1rem] fr-text--bold fr-mb-1w [&_span[class*=fr-icon]]:text-[color:var(--text-action-high-blue-france,#000091)]"
  >
    <span class="fr-icon-time-line fr-icon--sm" aria-hidden="true"></span> Phase
  </legend>
  {#each allPhases as phase (phase)}
    <div class="fr-checkbox-group fr-checkbox-group--sm">
      <input type="checkbox" id="phase-{phase}" value={phase} bind:group={draft.phase} />
      <label class="fr-label" for="phase-{phase}">{phase}</label>
    </div>
  {/each}
</fieldset>

{#if showFilterInstructeurice}
  <!-- Instructeur·ice suivant le dossier -->
  <div class="border-0 fr-mt-0 fr-mx-0 fr-mb-3w fr-p-0">
    <h3
      class="flex items-center gap-2 text-[1rem] fr-text--bold fr-mb-1w [&_span[class*=fr-icon]]:text-[color:var(--text-action-high-blue-france,#000091)]"
    >
      <span class="fr-icon-account-circle-line fr-icon--sm" aria-hidden="true"></span>
      Instructeur·ice suivant le dossier
    </h3>
    <MultiSelectFilter
      id="filtre-instructeur"
      label="Instructeur·ice suivant le dossier"
      allLabel="Tous les instructeur·ices"
      options={instructeurOptions}
      selected={selectedInstructeurs}
      onChange={setInstructeurs}
    />
    <div class="fr-checkbox-group fr-checkbox-group--sm fr-mt-1w">
      <input
        type="checkbox"
        id="sans-instructeurice"
        checked={withoutInstructeur}
        onchange={(e) => toggleWithoutInstructeur(e.currentTarget.checked)}
      />
      <label class="fr-label" for="sans-instructeurice">Dossiers sans instructeur·ice</label>
    </div>
  </div>
{/if}

<!-- Activité -->
<div class="border-0 fr-mt-0 fr-mx-0 fr-mb-3w fr-p-0">
  <h3
    class="flex items-center gap-2 text-[1rem] fr-text--bold fr-mb-1w [&_span[class*=fr-icon]]:text-[color:var(--text-action-high-blue-france,#000091)]"
  >
    <span class="fr-icon-building-line fr-icon--sm" aria-hidden="true"></span> Activité
  </h3>
  <MultiSelectFilter
    id="filtre-activite"
    label="Activité"
    allLabel="Toutes les activités"
    options={activiteOptions}
    selected={draft.activite}
    onChange={(values) => (draft.activite = values as DossiersQuery["activite"])}
  />
</div>

<!-- Département -->
<div class="border-0 fr-mt-0 fr-mx-0 fr-mb-3w fr-p-0">
  <h3
    class="flex items-center gap-2 text-[1rem] fr-text--bold fr-mb-1w [&_span[class*=fr-icon]]:text-[color:var(--text-action-high-blue-france,#000091)]"
  >
    <span class="fr-icon-map-pin-2-line fr-icon--sm" aria-hidden="true"></span> Département
  </h3>
  <MultiSelectFilter
    id="filtre-departement"
    label="Département"
    allLabel="Tous les départements"
    options={departementOptions}
    selected={draft.departement}
    onChange={(values) => (draft.departement = values)}
  />
</div>

<!-- Entité en charge de la prochaine action -->
<fieldset class="border-0 fr-mt-0 fr-mx-0 fr-mb-3w fr-p-0">
  <legend
    class="flex items-center gap-2 text-[1rem] fr-text--bold fr-mb-1w [&_span[class*=fr-icon]]:text-[color:var(--text-action-high-blue-france,#000091)]"
  >
    <span class="fr-icon-bank-line fr-icon--sm" aria-hidden="true"></span>
    Entité en charge de la prochaine action
  </legend>
  {#each PROCHAINE_ACTION_OPTIONS as entite (entite.value)}
    <div class="fr-checkbox-group fr-checkbox-group--sm">
      <input
        type="checkbox"
        id="entite-{entite.value}"
        value={entite.value}
        bind:group={draft.prochaineAction}
      />
      <label class="fr-label" for="entite-{entite.value}">{entite.label}</label>
    </div>
  {/each}
</fieldset>

<DossiersAdditionalFilters bind:draft />
