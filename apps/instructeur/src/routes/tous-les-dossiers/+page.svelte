<script lang="ts">
  import { onMount } from "svelte";
  import { store } from "$lib/state/store.svelte.ts";
  import TousLesDossiers from "./TousLesDossiers.svelte";
  import { loadDossiers } from "$lib/dossier/dossier.ts";
  import { loadNotificationByDossierForCurrentInstructeur } from "$lib/shared/main.ts";

  onMount(async () => {
    loadNotificationByDossierForCurrentInstructeur();
    try {
      await loadDossiers();
    } catch (error) {
      console.error("Erreur lors du chargement de la page Tous les dossiers :", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("403")) {
        store.errors.add({
          message: `Erreur de connexion - Votre lien de connexion n'est plus valide, vous pouvez en recevoir par email ci-dessous`,
        });
      } else {
        store.errors.add({
          message: `Erreur de chargement des dossiers - Il s'agit d'un problème technique. Vous pouvez en informer l'équipe Pitchou`,
        });
      }
    }
  });

  const email = $derived(store.identité?.email);
  const dossiers = $derived([...store.dossierSummaries.values()]);
  const followRelations = $derived(store.followRelations);
  const services = $derived(store.identité?.groupesInstructeurs ?? []);
  const recentSearches = $derived(store.recentSearches ?? []);
  const notificationByDossier = $derived(store.notificationByDossier);
</script>

<TousLesDossiers
  {email}
  {dossiers}
  {followRelations}
  {services}
  {recentSearches}
  {notificationByDossier}
/>
