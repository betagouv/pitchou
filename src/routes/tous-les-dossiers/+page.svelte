<script>
  import { onMount } from "svelte";
  import { store } from "$front/store.svelte.ts";
  import TousLesDossiers from "$front/components/screens/TousLesDossiers.svelte";
  import { chargerDossiers } from "$front/actions/dossier.js";
  import { chargerNotificationParDossierPourInstructeurActuel } from "$front/actions/main.js";

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
  const erreurs = $derived(store.erreurs);
  const résultatsSynchronisationDS88444 = $derived(store.résultatsSynchronisationDS88444);
  const dossiers = $derived([...store.dossiersRésumés.values()]);
  const relationSuivis = $derived(store.relationSuivis);
  const notificationParDossier = $derived(store.notificationParDossier);
</script>

<TousLesDossiers
  {email}
  {erreurs}
  {résultatsSynchronisationDS88444}
  {dossiers}
  {relationSuivis}
  {notificationParDossier}
/>
