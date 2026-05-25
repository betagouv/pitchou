<script>
  //@ts-check
  import { onMount } from "svelte";
  import remember from "remember";

  import { store } from "$front/store.svelte.ts";
  import SuiviInstruction from "$front/components/screens/SuiviInstruction.svelte";
  import LoginViaEmail from "$front/components/screens/LoginViaEmail.svelte";
  import SqueletteContenuVide from "$front/components/SqueletteContenuVide.svelte";

  import { logout } from "$front/actions/main.js";
  import { chargerDossiers } from "$front/actions/dossier.js";
  import { envoiEmailConnexion } from "$front/serveur.ts";
  import { authorizedEmailDomains } from "$commun/constantes.ts";

  /** @import {ChampDescriptor} from '../../scripts/types/démarche-numérique/schema.ts' */
  /** @import {TriFiltreLocalStorage, FiltresLocalStorage, TriTableau} from '../../scripts/types/interfaceUtilisateur.ts' */

  const TRI_FILTRE_CLEF_LOCALSTORAGE = "tri-filtres-tableau-suivi";

  /** @type {TriFiltreLocalStorage | undefined} */
  let trisFiltresSélectionnés = $state();

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

  /**
   * @param {{message: string}} [erreur]
   */
  async function logoutEtAfficherLoginParEmail(erreur) {
    if (erreur) {
      store.erreurs.add(erreur);
    }
    await logout();
  }

  /**
   * @param {TriTableau} tri
   * @param {Partial<FiltresLocalStorage>} filtres
   */
  function rememberTriFiltres(tri, filtres) {
    /** @type {TriFiltreLocalStorage} */
    const nouveaux = {
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
  const erreurs = $derived(store.erreurs);
  const résultatsSynchronisationDS88444 = $derived(store.résultatsSynchronisationDS88444);
  const peutListerDossiers = $derived(!!store.capabilities.listerDossiers);
  const dossiers = $derived([...store.dossiersRésumés.values()]);
  const relationSuivis = $derived(store.relationSuivis);

  /** @type {ChampDescriptor[] | undefined} */
  const schemaChamps = $derived(store.schemaDS88444?.revision.champDescriptors);

  const activitésPrincipales = $derived(
    schemaChamps?.find((c) => c.label === "Activité principale")?.options,
  );
</script>

{#if !chargementDossiersTerminé && peutListerDossiers}
  <SqueletteContenuVide />
{:else if peutListerDossiers && email}
  <SuiviInstruction
    {email}
    {erreurs}
    {résultatsSynchronisationDS88444}
    {dossiers}
    {relationSuivis}
    activitésPrincipales={activitésPrincipales ?? []}
    triIdSélectionné={trisFiltresSélectionnés?.tri}
    filtresSélectionnés={trisFiltresSélectionnés?.filtres}
    {rememberTriFiltres}
  />
{:else}
  <LoginViaEmail {erreurs} {authorizedEmailDomains} {envoiEmailConnexion} />
{/if}
