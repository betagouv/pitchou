<script lang="ts">
  import DatePicker from "@pitchou/ui/DatePicker.svelte";
  import { prochaineActionAttenduePar } from "@pitchou/common/phases.ts";

  import { updateDossier, type AdminDossierDetail } from "$lib/actions/adminDossiers.ts";

  type Props = {
    detail: AdminDossierDetail;
    onSaved: (detail: AdminDossierDetail) => void;
  };

  let { detail, onSaved }: Props = $props();

  // Initial values only: the form owns its state after mount, and onSaved gives
  // the parent the fresh detail. The dossier id and DN status never change.
  // svelte-ignore state_referenced_locally
  const dossier = detail.dossier;
  // svelte-ignore state_referenced_locally
  const managedByDn = detail.managedByDn;

  function toText(value: unknown): string {
    return typeof value === "string" ? value : "";
  }
  function toDateInput(value: unknown): string {
    return typeof value === "string" && value ? value.slice(0, 10) : "";
  }
  function toTriState(value: unknown): string {
    return value === true ? "oui" : value === false ? "non" : "";
  }
  function communesToText(value: unknown): string {
    if (!Array.isArray(value)) return "";
    return value
      .map((commune) => (commune && typeof commune === "object" ? (commune as any).name : ""))
      .filter(Boolean)
      .join("\n");
  }
  function listToText(value: unknown): string {
    return Array.isArray(value) ? value.filter((item) => typeof item === "string").join(", ") : "";
  }

  // Champs projet (imported from DN on synced dossiers, hence read-only there)
  let name = $state(toText(dossier.name));
  let description = $state(toText(dossier.description));
  let mainActivite = $state(toText(dossier.main_activite));
  let depotDate = $state(toDateInput(dossier.depot_date));
  let interventionStart = $state(toDateInput(dossier.intervention_start_date));
  let interventionEnd = $state(toDateInput(dossier.intervention_end_date));
  let motifDerogation = $state(toText(dossier.motif_derogation));
  let motifJustification = $state(toText(dossier.motif_derogation_justification));
  let noOtherSolution = $state(toText(dossier.no_other_satisfactory_solution_justification));
  let communesText = $state(communesToText(dossier.communes));
  let departmentsText = $state(listToText(dossier.departments));
  let regionsText = $state(listToText(dossier.regions));

  // Champs instruction (owned by Pitchou, always editable)
  let freeComment = $state(toText(dossier.free_comment));
  let onagreIdentifier = $state(toText(dossier.onagre_demande_identifier));
  let nextAction = $state(toText(dossier.next_action_expected_from));
  let enjeu = $state(dossier.enjeu === true);
  let ddepRequired = $state(toTriState(dossier.ddep_required));
  let erMesures = $state(toTriState(dossier.er_mesures_sufficient));
  let consultationStart = $state(toDateInput(dossier.public_consultation_start_date));
  let consultationEnd = $state(toDateInput(dossier.public_consultation_end_date));

  let saving = $state(false);
  let saveError = $state<string | null>(null);
  let saved = $state(false);

  function textOrNull(value: string): string | null {
    return value.trim() || null;
  }
  function triStateToBool(value: string): boolean | null {
    return value === "oui" ? true : value === "non" ? false : null;
  }
  function textToList(value: string): string[] {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  function textToCommunes(value: string): { name: string }[] {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({ name: line }));
  }

  function buildColumns(): Record<string, unknown> {
    const appNative: Record<string, unknown> = {
      free_comment: freeComment,
      onagre_demande_identifier: onagreIdentifier,
      next_action_expected_from: nextAction || null,
      enjeu,
      ddep_required: triStateToBool(ddepRequired),
      er_mesures_sufficient: triStateToBool(erMesures),
      public_consultation_start_date: consultationStart || null,
      public_consultation_end_date: consultationEnd || null,
    };
    if (managedByDn) return appNative;

    return {
      ...appNative,
      name: textOrNull(name),
      description: textOrNull(description),
      main_activite: textOrNull(mainActivite),
      depot_date: depotDate,
      intervention_start_date: interventionStart || null,
      intervention_end_date: interventionEnd || null,
      motif_derogation: textOrNull(motifDerogation),
      motif_derogation_justification: textOrNull(motifJustification),
      no_other_satisfactory_solution_justification: textOrNull(noOtherSolution),
      communes: textToCommunes(communesText),
      departments: textToList(departmentsText),
      regions: textToList(regionsText),
    };
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!managedByDn && !depotDate) {
      saveError = "La date de dépôt est requise.";
      return;
    }
    saving = true;
    saveError = null;
    saved = false;
    try {
      const updated = await updateDossier(dossier.id, { columns: buildColumns() });
      onSaved(updated);
      saved = true;
    } catch (e) {
      saveError = e instanceof Error ? e.message : String(e);
    } finally {
      saving = false;
    }
  }
</script>

<form class="w-full flex flex-col gap-6 fr-mt-3w" onsubmit={save}>
  <fieldset class="fr-fieldset" aria-label="Projet" disabled={managedByDn}>
    <legend class="fr-fieldset__legend fr-text--bold">
      Projet
      {#if managedByDn}
        <span class="fr-hint-text">Champs importés de Démarches Numériques — lecture seule</span>
      {/if}
    </legend>

    <div class="fr-fieldset__element">
      <div class="fr-input-group">
        <label class="fr-label" for="edit-name">Nom du dossier</label>
        <input
          class="fr-input"
          id="edit-name"
          type="text"
          autocomplete="off"
          data-form-type="other"
          data-1p-ignore
          bind:value={name}
        />
      </div>
    </div>

    <div class="fr-fieldset__element">
      <div class="fr-input-group">
        <label class="fr-label" for="edit-description">Description</label>
        <textarea class="fr-input" id="edit-description" rows="3" bind:value={description}
        ></textarea>
      </div>
    </div>

    <div class="fr-fieldset__element fr-fieldset__element--inline">
      <div class="fr-input-group">
        <label class="fr-label" for="edit-main-activite">Activité principale</label>
        <input class="fr-input" id="edit-main-activite" type="text" bind:value={mainActivite} />
      </div>
    </div>

    <div class="fr-fieldset__element fr-fieldset__element--inline">
      <div class="fr-input-group min-w-[14rem]">
        <label class="fr-label" for="edit-depot-date">Date de dépôt</label>
        <DatePicker
          id="edit-depot-date"
          label="Date de dépôt"
          value={depotDate}
          onChange={(value) => (depotDate = value ?? "")}
        />
      </div>
    </div>

    <div class="fr-fieldset__element fr-fieldset__element--inline">
      <div class="fr-input-group min-w-[14rem]">
        <label class="fr-label" for="edit-intervention-start">Début d'intervention</label>
        <DatePicker
          id="edit-intervention-start"
          label="Début d'intervention"
          value={interventionStart}
          max={interventionEnd || undefined}
          onChange={(value) => (interventionStart = value ?? "")}
        />
      </div>
    </div>

    <div class="fr-fieldset__element fr-fieldset__element--inline">
      <div class="fr-input-group min-w-[14rem]">
        <label class="fr-label" for="edit-intervention-end">Fin d'intervention</label>
        <DatePicker
          id="edit-intervention-end"
          label="Fin d'intervention"
          value={interventionEnd}
          min={interventionStart || undefined}
          onChange={(value) => (interventionEnd = value ?? "")}
        />
      </div>
    </div>

    <div class="fr-fieldset__element">
      <div class="fr-input-group">
        <label class="fr-label" for="edit-motif">Motif de dérogation</label>
        <input class="fr-input" id="edit-motif" type="text" bind:value={motifDerogation} />
      </div>
    </div>

    <div class="fr-fieldset__element">
      <div class="fr-input-group">
        <label class="fr-label" for="edit-motif-justification">
          Justification du motif de dérogation
        </label>
        <textarea
          class="fr-input"
          id="edit-motif-justification"
          rows="3"
          bind:value={motifJustification}></textarea>
      </div>
    </div>

    <div class="fr-fieldset__element">
      <div class="fr-input-group">
        <label class="fr-label" for="edit-no-other-solution">
          Justification de l'absence d'autre solution satisfaisante
        </label>
        <textarea class="fr-input" id="edit-no-other-solution" rows="3" bind:value={noOtherSolution}
        ></textarea>
      </div>
    </div>
  </fieldset>

  <fieldset class="fr-fieldset" aria-label="Localisation" disabled={managedByDn}>
    <legend class="fr-fieldset__legend fr-text--bold">Localisation</legend>

    <div class="fr-fieldset__element">
      <div class="fr-input-group">
        <label class="fr-label" for="edit-communes">
          Communes <span class="fr-hint-text">Une commune par ligne</span>
        </label>
        <textarea class="fr-input" id="edit-communes" rows="3" bind:value={communesText}></textarea>
      </div>
    </div>

    <div class="fr-fieldset__element fr-fieldset__element--inline">
      <div class="fr-input-group">
        <label class="fr-label" for="edit-departments">
          Départements <span class="fr-hint-text">Codes séparés par des virgules</span>
        </label>
        <input class="fr-input" id="edit-departments" type="text" bind:value={departmentsText} />
      </div>
    </div>

    <div class="fr-fieldset__element fr-fieldset__element--inline">
      <div class="fr-input-group">
        <label class="fr-label" for="edit-regions">
          Régions <span class="fr-hint-text">Séparées par des virgules</span>
        </label>
        <input class="fr-input" id="edit-regions" type="text" bind:value={regionsText} />
      </div>
    </div>
  </fieldset>

  <fieldset class="fr-fieldset" aria-label="Instruction">
    <legend class="fr-fieldset__legend fr-text--bold">Instruction</legend>

    <div class="fr-fieldset__element">
      <div class="fr-input-group">
        <label class="fr-label" for="edit-free-comment">Commentaire d'instruction</label>
        <textarea class="fr-input" id="edit-free-comment" rows="3" bind:value={freeComment}
        ></textarea>
      </div>
    </div>

    <div class="fr-fieldset__element fr-fieldset__element--inline">
      <div class="fr-input-group">
        <label class="fr-label" for="edit-onagre">Identifiant ONAGRE</label>
        <input class="fr-input" id="edit-onagre" type="text" bind:value={onagreIdentifier} />
      </div>
    </div>

    <div class="fr-fieldset__element fr-fieldset__element--inline">
      <div class="fr-select-group">
        <label class="fr-label" for="edit-next-action">Prochaine action attendue de</label>
        <select class="fr-select" id="edit-next-action" bind:value={nextAction}>
          <option value="">—</option>
          {#each [...prochaineActionAttenduePar] as action (action)}
            <option value={action}>{action}</option>
          {/each}
        </select>
      </div>
    </div>

    <div class="fr-fieldset__element fr-fieldset__element--inline">
      <div class="fr-select-group">
        <label class="fr-label" for="edit-ddep-required">DDEP nécessaire</label>
        <select class="fr-select" id="edit-ddep-required" bind:value={ddepRequired}>
          <option value="">—</option>
          <option value="oui">Oui</option>
          <option value="non">Non</option>
        </select>
      </div>
    </div>

    <div class="fr-fieldset__element fr-fieldset__element--inline">
      <div class="fr-select-group">
        <label class="fr-label" for="edit-er-mesures">Mesures ER suffisantes</label>
        <select class="fr-select" id="edit-er-mesures" bind:value={erMesures}>
          <option value="">—</option>
          <option value="oui">Oui</option>
          <option value="non">Non</option>
        </select>
      </div>
    </div>

    <div class="fr-fieldset__element">
      <div class="fr-checkbox-group">
        <input type="checkbox" id="edit-enjeu" bind:checked={enjeu} />
        <label class="fr-label" for="edit-enjeu">Dossier à enjeu</label>
      </div>
    </div>

    <div class="fr-fieldset__element fr-fieldset__element--inline">
      <div class="fr-input-group min-w-[14rem]">
        <label class="fr-label" for="edit-consultation-start">Début consultation du public</label>
        <DatePicker
          id="edit-consultation-start"
          label="Début consultation du public"
          value={consultationStart}
          max={consultationEnd || undefined}
          onChange={(value) => (consultationStart = value ?? "")}
        />
      </div>
    </div>

    <div class="fr-fieldset__element fr-fieldset__element--inline">
      <div class="fr-input-group min-w-[14rem]">
        <label class="fr-label" for="edit-consultation-end">Fin consultation du public</label>
        <DatePicker
          id="edit-consultation-end"
          label="Fin consultation du public"
          value={consultationEnd}
          min={consultationStart || undefined}
          onChange={(value) => (consultationEnd = value ?? "")}
        />
      </div>
    </div>
  </fieldset>

  {#if saveError}
    <div class="fr-alert fr-alert--error fr-alert--sm" role="alert">
      <p>{saveError}</p>
    </div>
  {/if}
  {#if saved}
    <div class="fr-alert fr-alert--success fr-alert--sm" role="status">
      <p>Dossier enregistré.</p>
    </div>
  {/if}

  <div>
    <button class="fr-btn" type="submit" disabled={saving}>
      {saving ? "Enregistrement…" : "Enregistrer"}
    </button>
  </div>
</form>
