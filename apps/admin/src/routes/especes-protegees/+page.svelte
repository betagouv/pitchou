<script lang="ts">
  import { onMount } from "svelte";

  import Loader from "@pitchou/ui/Loader.svelte";
  import {
    loadModificationsEspecesAdmin,
    AccessDeniedError,
    type ModificationEspeceAdmin,
  } from "$lib/actions/adminEspeces.ts";

  import ListModifications from "./ListModifications.svelte";

  type Etat = "chargement" | "autorise" | "refuse";
  let etat = $state<Etat>("chargement");
  let modifications = $state<ModificationEspeceAdmin[]>([]);
  let loadError = $state<string | null>(null);

  async function load() {
    etat = "chargement";
    loadError = null;
    try {
      modifications = await loadModificationsEspecesAdmin();
      etat = "autorise";
    } catch (e) {
      if (e instanceof AccessDeniedError) {
        etat = "refuse";
      } else {
        // Real (network/server) error: keep the admin UI hidden, show a generic alert.
        loadError = e instanceof Error ? e.message : String(e);
        etat = "refuse";
      }
    }
  }

  async function refresh() {
    modifications = await loadModificationsEspecesAdmin();
  }

  onMount(load);
</script>

<svelte:head>
  <title>Administration - espèces protégées modifiées — Pitchou</title>
</svelte:head>

{#if loadError}
  <div class="fr-alert fr-alert--error fr-mb-3w" role="alert">
    <h3 class="fr-alert__title">Erreur lors du chargement des modifications</h3>
    <p>{loadError}</p>
  </div>
{:else if etat === "chargement"}
  <Loader />
{:else if etat === "refuse"}
  <div class="fr-alert fr-alert--error fr-mb-3w" role="alert">
    <h3 class="fr-alert__title">Accès réservé aux administrateurs</h3>
    <p>Cette page est réservée aux administrateurs Pitchou.</p>
  </div>
{:else}
  <ListModifications {modifications} onReload={refresh} />
{/if}
