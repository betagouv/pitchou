<script lang="ts">
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type { PitchouState } from "$lib/state/store.svelte.ts";
  import type { DossiersQuery } from "./dossiersList.ts";
  import {
    WITHOUT_INSTRUCTEUR,
    PROCHAINE_ACTION_OPTIONS,
    listAvailableActivites,
    listAvailableDepartements,
    listAvailableInstructeurs,
  } from "./dossiersList.ts";
  import { phases as allPhases } from "$lib/dossier/displayDossier.ts";
  import MultiSelectFilter from "./MultiSelectFilter.svelte";
  import DatePicker from "./DatePicker.svelte";

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

  const activiteOptions = $derived(
    listAvailableActivites(dossiers).map((activite) => ({ value: activite, label: activite })),
  );
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

  const newModifications = $derived(draft.nouveaute === "oui");
  function toggleNewModifications(checked: boolean) {
    draft.nouveaute = checked ? "oui" : "";
  }
</script>

<!-- Phase -->
<fieldset class="section">
  <legend class="section-title">
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
  <div class="section">
    <h3 class="section-title">
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
<div class="section">
  <h3 class="section-title">
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
<div class="section">
  <h3 class="section-title">
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
<fieldset class="section">
  <legend class="section-title">
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

<!-- Pièces jointes -->
<div class="section">
  <h3 class="section-title">
    <span class="fr-icon-file-text-line fr-icon--sm" aria-hidden="true"></span>
    Pièces jointes
  </h3>
  <div class="fr-checkbox-group fr-checkbox-group--sm">
    <input type="checkbox" id="avis-manquant" bind:checked={draft.avisExpertManquant} />
    <label class="fr-label" for="avis-manquant">Avis CNPN/CSRPN non renseigné</label>
  </div>
  <div class="fr-input-group fr-mt-1w fr-mb-0">
    <label class="fr-sr-only fr-label" for="decision-numero">Numéro d'arrêté préfectoral</label>
    <input
      class="fr-input"
      id="decision-numero"
      type="text"
      placeholder="Saisissez votre numéro d'arrêté préfectoral, de courrier…"
      bind:value={draft.decisionText}
    />
  </div>
  <div class="fr-checkbox-group fr-checkbox-group--sm fr-mt-1w">
    <input type="checkbox" id="decision-absente" bind:checked={draft.decisionAbsente} />
    <label class="fr-label" for="decision-absente">Décision administrative non renseignée</label>
  </div>
</div>

<!-- Date -->
<fieldset class="section">
  <legend class="section-title">
    <span class="fr-icon-calendar-line fr-icon--sm" aria-hidden="true"></span> Date
  </legend>
  <div class="fr-radio-group fr-radio-group--sm">
    <input type="radio" id="date-deposit" value="deposit" bind:group={draft.dateField} />
    <label class="fr-label" for="date-deposit">de dépôt</label>
  </div>
  <div class="fr-radio-group fr-radio-group--sm">
    <input type="radio" id="date-phase" value="phaseStart" bind:group={draft.dateField} />
    <label class="fr-label" for="date-phase">de début de phase</label>
  </div>
  <div class="fr-radio-group fr-radio-group--sm">
    <input type="radio" id="date-modif" value="lastModified" bind:group={draft.dateField} />
    <label class="fr-label" for="date-modif">de dernière modification</label>
  </div>
  <div class="date-range fr-mt-1w">
    <span>Du</span>
    <DatePicker
      id="date-du"
      label="Du"
      value={draft.dateStart}
      max={draft.dateEnd || undefined}
      onChange={(value) => (draft.dateStart = value ?? "")}
    />
    <span>au</span>
    <DatePicker
      id="date-au"
      label="au"
      value={draft.dateEnd}
      min={draft.dateStart || undefined}
      align="right"
      onChange={(value) => (draft.dateEnd = value ?? "")}
    />
  </div>
</fieldset>

<!-- Nouveaux événements -->
<div class="section">
  <h3 class="section-title">
    <span class="fr-icon-notification-3-line fr-icon--sm" aria-hidden="true"></span>
    Nouveaux événements
  </h3>
  <div class="fr-checkbox-group fr-checkbox-group--sm">
    <input
      type="checkbox"
      id="nouvelles-modifications"
      checked={newModifications}
      onchange={(e) => toggleNewModifications(e.currentTarget.checked)}
    />
    <label class="fr-label" for="nouvelles-modifications"
      >Dossiers avec nouvelles modifications</label
    >
  </div>
</div>

<!-- Dossiers à enjeu -->
<div class="section">
  <h3 class="section-title">
    <span class="fr-icon-alarm-warning-line fr-icon--sm" aria-hidden="true"></span>
    Dossiers à enjeu
  </h3>
  <div class="fr-checkbox-group fr-checkbox-group--sm">
    <input type="checkbox" id="enjeu-uniquement" bind:checked={draft.enjeu} />
    <label class="fr-label" for="enjeu-uniquement">Dossiers à enjeux uniquement</label>
  </div>
</div>

<!-- Espèce impactée -->
<div class="section">
  <h3 class="section-title">
    <span class="fr-icon-leaf-line fr-icon--sm" aria-hidden="true"></span> Espèce impactée
  </h3>
  <div class="fr-checkbox-group fr-checkbox-group--sm">
    <input type="checkbox" id="especes-absente" bind:checked={draft.especesImpacteesAbsente} />
    <label class="fr-label" for="especes-absente">Liste des espèces impactées non-renseignée</label>
  </div>
</div>

<style lang="scss">
  .section {
    border: 0;
    margin: 0 0 1.5rem;
    padding: 0;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 700;
    margin-bottom: 0.5rem;

    // Section icons in DSFR blue, matching the design.
    span[class*="fr-icon"] {
      color: var(--text-action-high-blue-france, #000091);
    }
  }

  .date-range {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
</style>
