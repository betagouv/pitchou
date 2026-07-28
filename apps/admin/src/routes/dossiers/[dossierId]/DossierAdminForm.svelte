<script lang="ts">
  import { onMount } from "svelte";

  import {
    loadGroupesInstructeurs,
    updateDossier,
    type AdminDossierDetail,
    type AdminDossierUpdatePayload,
    type AdminGroupeInstructeurs,
  } from "$lib/actions/adminDossiers.ts";

  import {
    buildDossierRelations,
    buildDossierUpdateColumns,
    createDossierAdminFormModel,
  } from "./dossierAdminFormModel.ts";
  import DossierGeneralFields from "./DossierGeneralFields.svelte";
  import DossierEligibilityFields from "./DossierEligibilityFields.svelte";
  import DossierDerogationFields from "./DossierDerogationFields.svelte";
  import DossierLocationFields from "./DossierLocationFields.svelte";
  import DossierScientificFields from "./DossierScientificFields.svelte";
  import DossierInstructionFields from "./DossierInstructionFields.svelte";
  import DossierRelationsFields from "./DossierRelationsFields.svelte";

  type Props = {
    detail: AdminDossierDetail;
    onSaved: (detail: AdminDossierDetail) => void;
  };

  let { detail, onSaved }: Props = $props();

  // The parent replaces detail after saving, but this mounted form keeps its local edits.
  // svelte-ignore state_referenced_locally
  const dossier = detail.dossier;
  // svelte-ignore state_referenced_locally
  const managedByDn = detail.managedByDn;
  // svelte-ignore state_referenced_locally
  const currentGroupe = detail.groupe;
  // svelte-ignore state_referenced_locally
  let model = $state(createDossierAdminFormModel(detail));
  let saving = $state(false);
  let saveError = $state<string | null>(null);
  let saved = $state(false);
  let groupes = $state<AdminGroupeInstructeurs[]>(
    currentGroupe ? [{ ...currentGroupe, demarche_number: null }] : [],
  );
  let groupesLoadError = $state<string | null>(null);

  onMount(async () => {
    if (managedByDn) return;
    try {
      const loadedGroupes = await loadGroupesInstructeurs();
      groupes = currentGroupe
        ? [
            ...loadedGroupes,
            ...(!loadedGroupes.some(({ id }) => id === currentGroupe.id)
              ? [{ ...currentGroupe, demarche_number: null }]
              : []),
          ]
        : loadedGroupes;
    } catch {
      groupesLoadError =
        "Impossible de charger les groupes instructeurs. Le groupe actuel reste disponible.";
    }
  });

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!managedByDn && !model.depotDate) {
      saveError = "La date de dépôt est requise.";
      return;
    }
    saving = true;
    saveError = null;
    saved = false;
    try {
      const payload: AdminDossierUpdatePayload = {
        columns: buildDossierUpdateColumns(model, managedByDn),
      };
      if (!managedByDn) payload.relations = buildDossierRelations(model);
      const updated = await updateDossier(dossier.id, payload);
      onSaved(updated);
      saved = true;
    } catch (error) {
      saveError = error instanceof Error ? error.message : String(error);
    } finally {
      saving = false;
    }
  }
</script>

<form class="w-full flex flex-col gap-6 fr-mt-3w" onsubmit={save}>
  {#if managedByDn}
    <p class="fr-hint-text fr-mb-0">
      Les sections importées de Démarches Numériques sont affichées en lecture seule.
    </p>
  {/if}

  {#if !managedByDn}
    <DossierRelationsFields {model} {groupes} {groupesLoadError} />
  {/if}
  <DossierGeneralFields {model} disabled={managedByDn} />
  <DossierEligibilityFields {model} disabled={managedByDn} />
  <DossierDerogationFields {model} disabled={managedByDn} />
  <DossierLocationFields {model} disabled={managedByDn} />
  <DossierScientificFields {model} disabled={managedByDn} />
  <DossierInstructionFields {model} />

  {#if saveError}
    <div class="fr-alert fr-alert--error fr-alert--sm" role="alert"><p>{saveError}</p></div>
  {/if}
  {#if saved}
    <div class="fr-alert fr-alert--success fr-alert--sm" role="status">
      <p>Dossier enregistré.</p>
    </div>
  {/if}

  <div>
    <button class="fr-btn" type="submit" disabled={saving}
      >{saving ? "Enregistrement…" : "Enregistrer"}</button
    >
  </div>
</form>
