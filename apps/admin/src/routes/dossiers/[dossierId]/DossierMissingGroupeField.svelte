<script lang="ts">
  import { onMount } from "svelte";

  import Select from "@pitchou/ui/Select.svelte";

  import {
    loadGroupesInstructeurs,
    type AdminGroupeInstructeurs,
  } from "$lib/actions/adminDossiers.ts";

  let { value = $bindable() }: { value: string } = $props();

  let groupes = $state<AdminGroupeInstructeurs[]>([]);
  let groupesLoadError = $state<string | null>(null);

  onMount(async () => {
    try {
      groupes = await loadGroupesInstructeurs();
    } catch {
      groupesLoadError = "Impossible de charger les groupes instructeurs.";
    }
  });
</script>

<div class="fr-alert fr-alert--warning" role="alert">
  <h2 class="fr-alert__title">Groupe instructeurs à réattribuer</h2>
  <p>
    Le groupe précédemment associé à ce dossier n'existe plus. Sélectionnez un nouveau groupe pour
    rendre le dossier de nouveau accessible aux instructeurs.
  </p>
</div>
<div class="fr-select-group">
  <label class="fr-label" for="native-dossier-groupe">
    Nouveau groupe instructeurs
    <span class="fr-hint-text">Le dossier ne sera visible que par ce groupe.</span>
  </label>
  <Select
    id="native-dossier-groupe"
    class="fr-mt-1w"
    placeholder="Sélectionner un groupe"
    required
    options={groupes.map((groupe) => ({
      value: groupe.id,
      label: `${groupe.name} (DN ${groupe.demarche_number})`,
    }))}
    bind:value
  />
  {#if groupesLoadError}<p class="fr-error-text">{groupesLoadError}</p>{/if}
</div>
