<script lang="ts">
  import {
    phases as toutesLesPhases,
    prochaineActionAttenduePar as toutesLesProchainesActions,
  } from "$lib/dossier/affichageDossier.ts";
  import {
    WITHOUT_INSTRUCTEUR,
    countActiveFilters,
    buildClearFiltersUpdates,
    type DossiersQuery,
    type ActivitePrincipale,
  } from "./dossiersList.ts";
  import MultiSelectFilter, { type FilterOption } from "./MultiSelectFilter.svelte";
  import DatePicker from "./DatePicker.svelte";

  type Departement = { code: string; nom: string };

  type Props = {
    query: DossiersQuery;
    activitesDisponibles: ActivitePrincipale[];
    departementsDisponibles: Departement[];
    instructeursDisponibles: string[];
    showInstructeurFilter: boolean;
    showActionInstructeurFilter: boolean;
    onChange: (updates: Record<string, string | string[] | null>) => void;
  };

  let {
    query,
    activitesDisponibles,
    departementsDisponibles,
    instructeursDisponibles,
    showInstructeurFilter,
    showActionInstructeurFilter,
    onChange,
  }: Props = $props();

  const activeFilterCount = $derived(countActiveFilters(query));

  const toOptions = (values: readonly string[]): FilterOption[] =>
    values.map((value) => ({ value, label: value }));

  const phaseOptions = $derived(toOptions([...toutesLesPhases]));
  const actionOptions = $derived(toOptions([...toutesLesProchainesActions]));
  const activiteOptions = $derived(toOptions(activitesDisponibles));
  const departementOptions = $derived<FilterOption[]>(
    departementsDisponibles.map(({ code, nom }) => ({
      value: code,
      label: nom === code ? code : `${code} - ${nom}`,
    })),
  );
  const instructeurOptions = $derived<FilterOption[]>([
    { value: WITHOUT_INSTRUCTEUR, label: "Sans instructeur·ice" },
    ...instructeursDisponibles.map((email) => ({ value: email, label: email })),
  ]);
</script>

<fieldset id="panneau-filtres" class="panel">
  <legend class="panel-title">Filtrer les dossiers</legend>
  <div class="filters">
    <div class="filter-row">
      <span class="fr-label filter-label" id="label-phase">Phase</span>
      <MultiSelectFilter
        id="filtre-phase"
        label="Phase"
        allLabel="Toutes les phases"
        options={phaseOptions}
        selected={query.phase}
        onChange={(values) => onChange({ phase: values })}
      />
    </div>
    <div class="filter-row">
      <span class="fr-label filter-label" id="label-activite">Activité principale</span>
      <MultiSelectFilter
        id="filtre-activite"
        label="Activité principale"
        allLabel="Toutes les activités"
        options={activiteOptions}
        selected={query.activite}
        onChange={(values) => onChange({ activite: values })}
      />
    </div>
    <div class="filter-row">
      <span class="fr-label filter-label" id="label-prochaine-action">
        Prochaine action attendue par
      </span>
      <MultiSelectFilter
        id="filtre-prochaine-action"
        label="Prochaine action attendue par"
        allLabel="Toutes les actions"
        options={actionOptions}
        selected={query.prochaineAction}
        onChange={(values) => onChange({ action: values })}
      />
    </div>
    <div class="filter-row">
      <span class="fr-label filter-label" id="label-departement">Département</span>
      <MultiSelectFilter
        id="filtre-departement"
        label="Département"
        allLabel="Tous les départements"
        options={departementOptions}
        selected={query.departement}
        onChange={(values) => onChange({ departement: values })}
      />
    </div>
    {#if showInstructeurFilter}
      <div class="filter-row">
        <span class="fr-label filter-label" id="label-instructeur">
          Instructeur·ice suivant le dossier
        </span>
        <MultiSelectFilter
          id="filtre-instructeur"
          label="Instructeur·ice suivant le dossier"
          allLabel="Tous les instructeur·ices"
          options={instructeurOptions}
          selected={query.instructeur}
          onChange={(values) => onChange({ instructeur: values })}
        />
      </div>
    {/if}
    <div class="filter-row">
      <label class="fr-label filter-label" for="select-nouveaute">Nouveauté</label>
      <select
        value={query.nouveaute}
        onchange={(e) => onChange({ nouveaute: e.currentTarget.value || null })}
        aria-label="Nouveauté"
        class="fr-select"
        id="select-nouveaute"
        name="select-nouveaute"
      >
        <option value="">Toutes</option>
        <option value="oui">Avec nouveauté</option>
        <option value="non">Sans nouveauté</option>
      </select>
    </div>
    <div class="filter-row filter-dates">
      <label class="fr-label filter-label" for="select-date-field">Dates</label>
      <div class="dates-controls">
        <select
          value={query.dateField}
          onchange={(e) => onChange({ dateField: e.currentTarget.value })}
          aria-label="Type de date"
          class="fr-select"
          id="select-date-field"
          name="select-date-field"
        >
          <option value="deposit">Date de dépôt</option>
          <option value="phaseStart">Date de début de phase</option>
          <option value="lastModified">Dernière modification</option>
        </select>
        <div class="dates-bounds">
          <div class="date-bound">
            <span class="fr-label date-bound-label" id="label-date-from">Du</span>
            <DatePicker
              id="date-from"
              label="Du"
              value={query.dateStart}
              max={query.dateEnd || undefined}
              onChange={(value) => onChange({ from: value })}
            />
          </div>
          <div class="date-bound">
            <span class="fr-label date-bound-label" id="label-date-to">Au</span>
            <DatePicker
              id="date-to"
              label="Au"
              value={query.dateEnd}
              min={query.dateStart || undefined}
              onChange={(value) => onChange({ to: value })}
            />
          </div>
        </div>
      </div>
    </div>
    {#if showActionInstructeurFilter}
      <div class="fr-toggle fr-toggle--label-left filter-toggle">
        <input
          type="checkbox"
          class="fr-toggle__input"
          id="toggle-action-instructeur"
          checked={query.actionInstructeur}
          onchange={(e) => onChange({ actionInstructeur: e.currentTarget.checked ? "1" : null })}
        />
        <label class="fr-toggle__label" for="toggle-action-instructeur">
          Action : Instructeur·ice
        </label>
      </div>
    {/if}
  </div>
  {#if activeFilterCount > 0}
    <div class="panel-actions">
      <button
        type="button"
        class="fr-btn fr-btn--tertiary-no-outline fr-icon-close-circle-line fr-btn--icon-left"
        onclick={() => onChange(buildClearFiltersUpdates())}
      >
        Effacer les filtres
      </button>
    </div>
  {/if}
</fieldset>

<style lang="scss">
  fieldset {
    border: 0;
    margin: 0;
    padding: 0;
  }

  .panel {
    border: 1px solid var(--border-default-grey);
    border-radius: 0.25rem;
    padding: 1rem;
  }

  .panel-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 1rem;
    padding: 0;
  }

  .filters {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 48rem;
  }

  .panel-actions {
    display: flex;
    justify-content: flex-end;
    max-width: 48rem;
    margin-top: 1rem;
  }

  /* One option per row: label on the left, control on the right */
  .filter-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1rem;

    .filter-label {
      flex: 0 0 18rem;
      margin-bottom: 0;
    }

    .fr-select {
      flex: 1 1 auto;
    }

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: stretch;
      gap: 0.25rem;

      .filter-label {
        flex: none;
      }
    }
  }

  /* Toggles span the full width, label on the left / control on the right */
  .filter-toggle {
    max-width: 48rem;
  }

  .filter-dates {
    align-items: start;

    .dates-controls {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      flex: 1 1 auto;
      min-width: 0;
    }

    .dates-bounds {
      display: flex;
      flex-direction: row;
      gap: 1rem;
    }

    .date-bound {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;
      flex: 1 1 0;
      min-width: 0;
    }

    .date-bound-label {
      flex: 0 0 auto;
      margin-bottom: 0;
    }
  }
</style>
