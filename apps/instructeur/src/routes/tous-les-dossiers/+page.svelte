<script lang="ts">
  import { onMount } from "svelte";
  import { store } from "$lib/state/store.svelte.ts";
  import TousLesDossiers from "./TousLesDossiers.svelte";
  import { chargerDossiers } from "$lib/dossier/dossier.ts";
  import { chargerNotificationParDossierPourInstructeurActuel } from "$lib/shared/main.ts";

  onMount(async () => {
    chargerNotificationParDossierPourInstructeurActuel();
    try {
      await chargerDossiers();
    } catch (error) {
      console.error("Erreur lors du chargement de la page Tous les dossiers :", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("403")) {
        store.erreurs.add({
          message: `Erreur de connexion - Votre lien de connexion n'est plus valide, vous pouvez en recevoir par email ci-dessous`,
        });
      } else {
        store.erreurs.add({
          message: `Erreur de chargement des dossiers - Il s'agit d'un problème technique. Vous pouvez en informer l'équipe Pitchou`,
        });
      }
    }
  });

  const email = $derived(store.identité?.email);
  const dossiers = $derived([...store.dossiersRésumés.values()]);
  const relationSuivis = $derived(store.relationSuivis);
  const services = $derived(store.identité?.groupesInstructeurs ?? []);
  const recentSearches = $derived(store.recentSearches ?? []);
  const notificationParDossier = $derived(store.notificationParDossier);
</script>

<TousLesDossiers
  {email}
  {dossiers}
  {relationSuivis}
  {services}
  {recentSearches}
  {notificationParDossier}
/>
