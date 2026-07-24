<script lang="ts">
  import { onMount } from "svelte";

  import Loader from "@pitchou/ui/Loader.svelte";
  import { loadEvenementTypes, AccessDeniedError } from "$lib/actions/adminEvenements.ts";

  import ListEvenements from "./ListEvenements.svelte";

  type Etat = "chargement" | "autorise" | "refuse";
  let etat = $state<Etat>("chargement");
  let types = $state<string[]>([]);
  let loadError = $state<string | null>(null);

  async function load() {
    etat = "chargement";
    loadError = null;
    try {
      types = await loadEvenementTypes();
      etat = "autorise";
    } catch (e) {
      if (e instanceof AccessDeniedError) {
        etat = "refuse";
      } else {
        loadError = e instanceof Error ? e.message : String(e);
        etat = "refuse";
      }
    }
  }

  onMount(load);
</script>

<svelte:head>
  <title>Administration - évènements suivis — Pitchou</title>
</svelte:head>

{#if loadError}
  <div class="fr-alert fr-alert--error fr-mb-3w" role="alert">
    <h3 class="fr-alert__title">Erreur lors du chargement des évènements</h3>
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
  <ListEvenements {types} />
{/if}
