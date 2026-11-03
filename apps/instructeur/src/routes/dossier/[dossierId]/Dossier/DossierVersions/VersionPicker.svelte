<script lang="ts">
  import { untrack } from "svelte";
  import type {
    DemandeRevision,
    DemandeVersion,
    DossierDemande,
  } from "@pitchou/types/dossierDemandes.ts";
  import { fetchVersionData, versionDate } from "./api.ts";

  let {
    id,
    label,
    demandes,
    initialDemandeId,
    onChange,
  }: {
    id: string;
    label: string;
    demandes: DossierDemande[];
    initialDemandeId: number;
    onChange: (version: DemandeVersion | undefined) => void;
  } = $props();
  let demandeId = $state(untrack(() => initialDemandeId));
  let revision = $state("current");
  let revisions = $state<DemandeRevision[]>([]);
  let errorMessage = $state("");
  let loading = $state(false);
  $effect(() => {
    const controller = new AbortController();
    revisions = [];
    void fetchVersionData<DemandeRevision[]>(`/dossier/${demandeId}/versions`, controller.signal)
      .then((result) => {
        revisions = result;
      })
      .catch((error) => {
        if (!controller.signal.aborted) errorMessage = error.message;
      });
    return () => controller.abort();
  });
  $effect(() => {
    const controller = new AbortController();
    loading = true;
    errorMessage = "";
    onChange(undefined);
    void fetchVersionData<DemandeVersion>(
      `/dossier/${demandeId}/versions?revision=${revision}`,
      controller.signal,
    )
      .then((result) => {
        onChange(result);
      })
      .catch((error) => {
        if (!controller.signal.aborted) errorMessage = error.message;
      })
      .finally(() => {
        if (!controller.signal.aborted) loading = false;
      });
    return () => controller.abort();
  });
</script>

<fieldset class="fr-fieldset block min-w-0 flex-1" aria-busy={loading}>
  <legend class="fr-fieldset__legend font-bold">{label}</legend>
  <label class="fr-label" for={`${id}-demande`}>Demande</label>
  <select
    class="fr-select fr-mb-2w"
    id={`${id}-demande`}
    bind:value={demandeId}
    onchange={() => {
      revision = "current";
    }}
  >
    {#each demandes as demande (demande.id)}<option value={demande.id}>{demande.label}</option
      >{/each}
  </select>
  <label class="fr-label" for={`${id}-state`}>État de la demande</label>
  <select class="fr-select" id={`${id}-state`} bind:value={revision}>
    <option value="current">État actuel</option>
    {#each revisions as item, index (item.id)}
      <option value={item.id}
        >État {revisions.length - index} — {versionDate(item.recorded_at)}{index ===
        revisions.length - 1
          ? " — premier état conservé"
          : ""}</option
      >
    {/each}
  </select>
  {#if loading}<p role="status">Chargement de l’état…</p>{/if}
  {#if errorMessage}<p role="alert" class="fr-error-text">{errorMessage}</p>{/if}
</fieldset>
