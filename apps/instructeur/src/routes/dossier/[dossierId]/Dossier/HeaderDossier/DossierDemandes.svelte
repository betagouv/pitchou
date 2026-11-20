<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import type { DossierWorkspace } from "@pitchou/types/dossierDemandes.ts";
  import { fetchVersionData } from "../DossierVersions/api.ts";
  import DemandeSwitcher from "./DemandeSwitcher.svelte";

  let { dossierId }: { dossierId: number } = $props();

  let demandes = $state<DossierWorkspace["demandes"]>([]);
  let errorMessage = $state("");

  $effect(() => {
    const controller = new AbortController();
    demandes = [];
    errorMessage = "";
    void fetchVersionData<DossierWorkspace>(`/dossier/${dossierId}/demandes`, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) demandes = result.demandes;
      })
      .catch((error) => {
        if (!controller.signal.aborted) errorMessage = error.message;
      });
    return () => controller.abort();
  });

  function select(id: number) {
    const url = new URL(page.url.href);
    url.pathname = `/dossier/${id}`;
    void goto(url);
  }
</script>

{#if errorMessage}
  <p role="alert" class="fr-error-text">{errorMessage}</p>
{/if}
{#if demandes.length > 1}
  <DemandeSwitcher {demandes} {dossierId} onSelect={select} />
{/if}
