<script lang="ts">
  import { onMount } from "svelte";
  import { store } from "$lib/state/store.svelte.ts";
  import MesDossiers from "$lib/components/screens/MesDossiers.svelte";
  import { chargerDossiers } from "$lib/dossier/dossier.ts";
  import { envoyerÉvènement } from "$lib/shared/aarri.ts";
  import { chargerNotificationParDossierPourInstructeurActuel } from "$lib/shared/main.ts";

  onMount(async () => {
    chargerNotificationParDossierPourInstructeurActuel();
    try {
      await chargerDossiers();
      envoyerÉvènement({ type: "afficherLesDossiersSuivis" });
    } catch (error) {
      console.error("Erreur lors du chargement de la page Mes dossiers :", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("403")) {
        store.erreurs.add({
          message: `Erreur de connexion - Votre lien de connexion n'est plus valide, vous pouvez en recevoir par email ci-dessous`,
        });
      } else {
        store.erreurs.add({
          message: `Erreur de chargement de la page - Il s'agit d'un problème technique. Vous pouvez en informer l'équipe Pitchou`,
        });
      }
    }
  });

  const email = $derived(store.identité?.email);
  const erreurs = $derived(store.erreurs);
  const résultatsSynchronisationDS88444 = $derived(store.résultatsSynchronisationDS88444);
  const relationSuivis = $derived(store.relationSuivis);
  const notificationParDossier = $derived(store.notificationParDossier);

  const dossiers = $derived.by(() => {
    const tous = [...store.dossiersRésumés.values()];
    if (!email || !relationSuivis) return [];
    const suivis = relationSuivis.get(email);
    if (!suivis) return [];
    return tous.filter((d) => suivis.has(d.id));
  });
</script>

<MesDossiers
  {email}
  {erreurs}
  {résultatsSynchronisationDS88444}
  {dossiers}
  {relationSuivis}
  {notificationParDossier}
/>
