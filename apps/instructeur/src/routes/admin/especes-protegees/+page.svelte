<script lang="ts">
  import { onMount } from "svelte";

  import { store } from "$front/store.svelte.ts";
  import Squelette from "$front/components/Squelette.svelte";
  import Loader from "$front/components/Loader.svelte";
  import {
    loadModificationsEspecesAdmin,
    AccessDeniedError,
    type ModificationEspeceAdmin,
  } from "$front/actions/adminEspeces.ts";

  import ListeModifications from "./ListeModifications.svelte";

  const email = $derived(store.identité?.email);
  const erreurs = $derived(store.erreurs);
  const résultatsSynchronisationDS88444 = $derived(store.résultatsSynchronisationDS88444);

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

<Squelette
  {email}
  nav={Boolean(email)}
  title="Administration - espèces protégées modifiées"
  {erreurs}
  {résultatsSynchronisationDS88444}
>
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
    <ListeModifications {modifications} onReload={refresh} />
  {/if}
</Squelette>
