<script lang="ts">
  import type {
    DossierRésumé,
    DossierProchaineActionAttenduePar,
  } from "@pitchou/types/API_Pitchou.ts";
  import type { PitchouState } from "$lib/state/store.svelte.ts";
  import type { DossiersQuery } from "./dossiersList.ts";
  import {
    WITHOUT_INSTRUCTEUR,
    clearFilters,
    listAvailableActivites,
    listAvailableDepartements,
    listAvailableInstructeurs,
  } from "./dossiersList.ts";
  import { phases as toutesLesPhases } from "$lib/dossier/affichageDossier.ts";
  import MultiSelectFilter from "./MultiSelectFilter.svelte";
  import DatePicker from "./DatePicker.svelte";

  type Props = {
    open: boolean;
    draft: DossiersQuery;
    dossiers: DossierRésumé[];
    relationSuivis?: PitchouState["relationSuivis"];
    afficherFiltreInstructeurice: boolean;
    /** Live count of dossiers matching the current draft, shown on the footer button */
    nombreResultats: number;
    onApply: () => void;
    onClose: () => void;
  };

  let {
    open,
    draft = $bindable(),
    dossiers,
    relationSuivis,
    afficherFiltreInstructeurice,
    nombreResultats,
    onApply,
    onClose,
  }: Props = $props();

  const libelléResultats = $derived(
    `Voir ${nombreResultats} résultat${nombreResultats > 1 ? "s" : ""}`,
  );

  let dialogElement: HTMLDialogElement | undefined = $state();

  // Sync the native <dialog> with the controlled `open` prop.
  $effect(() => {
    if (!dialogElement) return;
    if (open && !dialogElement.open) dialogElement.showModal();
    if (!open && dialogElement.open) dialogElement.close();
  });

  /** Entités matching the « prochaine action attendue » values, in the wireframe order */
  const ENTITE_OPTIONS: { value: DossierProchaineActionAttenduePar; label: string }[] = [
    { value: "Instructeur", label: "Instructeur·ice" },
    { value: "CNPN/CSRPN", label: "CNPN/CSRPN" },
    { value: "Pétitionnaire", label: "Pétitionnaire" },
    { value: "Consultation du public", label: "Public consulté" },
    { value: "Autre administration", label: "Autre administration" },
    { value: "Autre", label: "Autre entité" },
  ];

  const activiteOptions = $derived(
    listAvailableActivites(dossiers).map((activite) => ({ value: activite, label: activite })),
  );
  const departementOptions = $derived(
    listAvailableDepartements(dossiers).map(({ code, nom }) => ({
      value: code,
      label: `${code} — ${nom}`,
    })),
  );
  const instructeurOptions = $derived(
    listAvailableInstructeurs(relationSuivis).map((email) => ({ value: email, label: email })),
  );

  // Named instructeurs and the « sans instructeur·ice » sentinel share the same array.
  const instructeurSélectionnés = $derived(
    draft.instructeur.filter((value) => value !== WITHOUT_INSTRUCTEUR),
  );
  const sansInstructeurice = $derived(draft.instructeur.includes(WITHOUT_INSTRUCTEUR));

  function setInstructeurs(values: string[]) {
    draft.instructeur = [...values, ...(sansInstructeurice ? [WITHOUT_INSTRUCTEUR] : [])];
  }
  function toggleSansInstructeurice(checked: boolean) {
    const named = instructeurSélectionnés;
    draft.instructeur = checked ? [...named, WITHOUT_INSTRUCTEUR] : named;
  }

  const nouvellesModifications = $derived(draft.nouveaute === "oui");
  function toggleNouvellesModifications(checked: boolean) {
    draft.nouveaute = checked ? "oui" : "";
  }

  function toutEffacer() {
    draft = clearFilters(draft);
  }
</script>

<!-- Clicking the backdrop (the dialog element itself, outside its content) closes the modal. -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<dialog
  bind:this={dialogElement}
  class="filtres-modal"
  aria-labelledby="filtres-modal-titre"
  onclose={onClose}
  onclick={(event) => {
    if (event.target === dialogElement) onClose();
  }}
>
  <div class="filtres-modal__contenu">
    <header class="filtres-modal__entete">
      <h2 id="filtres-modal-titre">Tous les filtres</h2>
      <button
        type="button"
        class="fr-btn fr-btn--tertiary-no-outline fr-icon-close-line"
        title="Fermer les filtres"
        onclick={onClose}>Fermer</button
      >
    </header>

    <div class="filtres-modal__sections">
      <!-- Phase -->
      <fieldset class="section">
        <legend class="section-titre">
          <span class="fr-icon-time-line fr-icon--sm" aria-hidden="true"></span> Phase
        </legend>
        {#each toutesLesPhases as phase (phase)}
          <div class="fr-checkbox-group fr-checkbox-group--sm">
            <input type="checkbox" id="phase-{phase}" value={phase} bind:group={draft.phase} />
            <label class="fr-label" for="phase-{phase}">{phase}</label>
          </div>
        {/each}
      </fieldset>

      {#if afficherFiltreInstructeurice}
        <!-- Instructeur·ice suivant le dossier -->
        <div class="section">
          <h3 class="section-titre">
            <span class="fr-icon-account-circle-line fr-icon--sm" aria-hidden="true"></span>
            Instructeur·ice suivant le dossier
          </h3>
          <MultiSelectFilter
            id="filtre-instructeur"
            label="Instructeur·ice suivant le dossier"
            allLabel="Tous les instructeur·ices"
            options={instructeurOptions}
            selected={instructeurSélectionnés}
            onChange={setInstructeurs}
          />
          <div class="fr-checkbox-group fr-checkbox-group--sm fr-mt-1w">
            <input
              type="checkbox"
              id="sans-instructeurice"
              checked={sansInstructeurice}
              onchange={(e) => toggleSansInstructeurice(e.currentTarget.checked)}
            />
            <label class="fr-label" for="sans-instructeurice">Dossiers sans instructeur·ice</label>
          </div>
        </div>
      {/if}

      <!-- Entité en charge de la prochaine action -->
      <fieldset class="section">
        <legend class="section-titre">
          <span class="fr-icon-bank-line fr-icon--sm" aria-hidden="true"></span>
          Entité en charge de la prochaine action
        </legend>
        {#each ENTITE_OPTIONS as entite (entite.value)}
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

      <!-- Avis d'expert -->
      <div class="section">
        <h3 class="section-titre">
          <span class="fr-icon-question-answer-line fr-icon--sm" aria-hidden="true"></span>
          Avis d'expert
        </h3>
        <div class="fr-checkbox-group fr-checkbox-group--sm">
          <input type="checkbox" id="avis-manquant" bind:checked={draft.avisExpertManquant} />
          <label class="fr-label" for="avis-manquant">Saisine ou avis d'expert manquant</label>
        </div>
      </div>

      <!-- Décision administrative -->
      <div class="section">
        <h3 class="section-titre">
          <span class="fr-icon-file-text-line fr-icon--sm" aria-hidden="true"></span>
          Décision administrative
        </h3>
        <div class="fr-input-group">
          <label class="fr-sr-only fr-label" for="decision-numero">Numéro de décision</label>
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
          <label class="fr-label" for="decision-absente"
            >Décision administrative non-renseignée</label
          >
        </div>
      </div>

      <!-- Date -->
      <fieldset class="section">
        <legend class="section-titre">
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
        <div class="plage-dates fr-mt-1w">
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
        <h3 class="section-titre">
          <span class="fr-icon-notification-3-line fr-icon--sm" aria-hidden="true"></span>
          Nouveaux événements
        </h3>
        <div class="fr-checkbox-group fr-checkbox-group--sm">
          <input
            type="checkbox"
            id="nouvelles-modifications"
            checked={nouvellesModifications}
            onchange={(e) => toggleNouvellesModifications(e.currentTarget.checked)}
          />
          <label class="fr-label" for="nouvelles-modifications"
            >Dossiers avec nouvelles modifications</label
          >
        </div>
      </div>

      <!-- Dossiers à enjeu -->
      <div class="section">
        <h3 class="section-titre">
          <span class="fr-icon-alarm-warning-line fr-icon--sm" aria-hidden="true"></span>
          Dossiers à enjeu
        </h3>
        <div class="fr-checkbox-group fr-checkbox-group--sm">
          <input type="checkbox" id="enjeu-uniquement" bind:checked={draft.enjeu} />
          <label class="fr-label" for="enjeu-uniquement">Dossiers à enjeux uniquement</label>
        </div>
      </div>

      <!-- Activité -->
      <div class="section">
        <h3 class="section-titre">
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
        <h3 class="section-titre">
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
    </div>

    <footer class="filtres-modal__pied">
      <button type="button" class="fr-btn fr-btn--secondary" onclick={toutEffacer}>
        Tout effacer
      </button>
      <button type="button" class="fr-btn" onclick={onApply}>{libelléResultats}</button>
    </footer>
  </div>
</dialog>

<style lang="scss">
  // Right-anchored full-height drawer.
  .filtres-modal {
    margin: 0 0 0 auto;
    height: 100vh;
    max-height: 100vh;
    width: min(28rem, 100vw);
    max-width: 100vw;
    border: 0;
    padding: 0;
    box-shadow: var(--overlap-shadow, 0 2px 12px rgba(0, 0, 0, 0.2));

    &::backdrop {
      background: rgba(22, 22, 22, 0.64);
    }
  }

  .filtres-modal__contenu {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--background-default-grey);
  }

  .filtres-modal__entete {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-default-grey);

    h2 {
      margin: 0;
    }
  }

  .filtres-modal__sections {
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 1rem 1.5rem;
  }

  .filtres-modal__pied {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border-default-grey);
  }

  .section {
    border: 0;
    margin: 0 0 1.5rem;
    padding: 0;
  }

  .section-titre {
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

  .plage-dates {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
</style>
