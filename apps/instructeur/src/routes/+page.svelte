<script lang="ts">
  import { onMount } from "svelte";
  import remember from "remember";

  import { store } from "$lib/state/store.svelte.ts";
  import SuiviInstruction from "./SuiviInstruction/SuiviInstruction.svelte";
  import LoginViaEmail from "./LoginViaEmail/LoginViaEmail.svelte";
  import Loader from "@pitchou/ui/Loader.svelte";

  import { logout } from "$lib/shared/main.ts";
  import { chargerDossiers } from "$lib/dossier/dossier.ts";
  import { envoiEmailConnexion } from "./LoginViaEmail/serveur.ts";
  import { authorizedEmailDomains } from "@pitchou/common/constantes.ts";

  import type { ChampDescriptor } from "@pitchou/types/démarche-numérique/schema.ts";
  import type {
    TriFiltreLocalStorage,
    FiltresLocalStorage,
    TriTableau,
  } from "@pitchou/types/interfaceUtilisateur.ts";

  const TRI_FILTRE_CLEF_LOCALSTORAGE = "tri-filtres-tableau-suivi";

  let trisFiltresSélectionnés = $state<TriFiltreLocalStorage | undefined>();

  let chargementDossiersTerminé = $state(false);

  onMount(async () => {
    const stored = await remember(TRI_FILTRE_CLEF_LOCALSTORAGE);
    if (stored && typeof stored !== "string") {
      trisFiltresSélectionnés = stored;
    } else if (typeof stored === "string") {
      console.warn(`string du localStorage non comprise en tant que filtre/tri`, stored);
    }

    if (store.capabilities.listerDossiers) {
      try {
        await chargerDossiers();
      } catch (err) {
        console.error("Problème de chargement des dossiers", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage.includes("403")) {
          await logoutEtAfficherLoginParEmail({
            message: `Erreur de connexion - Votre lien de connexion n'est plus valide, vous pouvez en recevoir par email ci-dessous`,
          });
        } else {
          await logoutEtAfficherLoginParEmail({
            message: `Erreur de chargement des dossiers - Il s'agit d'un problème technique. Vous pouvez en informer l'équipe Pitchou`,
          });
        }
      }
    } else if (store.identité) {
      store.erreurs.add({
        message: `Il semblerait que vous ne fassiez partie d'aucun groupe instructeurs sur la procédure Démarche Numérique de Pitchou. Vous pouvez prendre contact avec vos collègues ou l'équipe Pitchou pour être ajouté.e à un groupe d'instructeurs`,
      });
    }
    chargementDossiersTerminé = true;
  });

  async function logoutEtAfficherLoginParEmail(erreur?: { message: string }) {
    if (erreur) {
      store.erreurs.add(erreur);
    }
    await logout();
  }

  function rememberTriFiltres(tri: TriTableau, filtres: Partial<FiltresLocalStorage>) {
    const nouveaux: TriFiltreLocalStorage = {
      tri: tri.id,
      filtres: {
        phases: filtres.phases ? [...filtres.phases] : undefined,
        "prochaine action attendue de": filtres["prochaine action attendue de"]
          ? [...filtres["prochaine action attendue de"]]
          : undefined,
        instructeurs: filtres.instructeurs ? [...filtres.instructeurs] : undefined,
        activitésPrincipales: filtres.activitésPrincipales
          ? [...filtres.activitésPrincipales]
          : undefined,
        texte: filtres.texte ?? undefined,
      },
    };
    remember(TRI_FILTRE_CLEF_LOCALSTORAGE, nouveaux);
    trisFiltresSélectionnés = nouveaux;
  }

  const email = $derived(store.identité?.email);
  const peutListerDossiers = $derived(!!store.capabilities.listerDossiers);
  const dossiers = $derived([...store.dossiersRésumés.values()]);
  const relationSuivis = $derived(store.relationSuivis);

  const schemaChamps = $derived<ChampDescriptor[] | undefined>(
    store.schemaDS88444?.revision.champDescriptors,
  );

  const activitésPrincipales = $derived(
    schemaChamps?.find((c) => c.label === "Activité principale")?.options,
  );
</script>

{#if !chargementDossiersTerminé && peutListerDossiers}
  <div class="fr-p-2w fr-pb-10w">
    <Loader />
  </div>
{:else if peutListerDossiers && email}
  <SuiviInstruction
    {email}
    {dossiers}
    {relationSuivis}
    activitésPrincipales={activitésPrincipales ?? []}
    triIdSélectionné={trisFiltresSélectionnés?.tri}
    filtresSélectionnés={trisFiltresSélectionnés?.filtres}
    {rememberTriFiltres}
  />
{:else}
  <LoginViaEmail {authorizedEmailDomains} {envoiEmailConnexion} />
{/if}
