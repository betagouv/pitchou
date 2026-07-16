<script lang="ts">
  import { onMount } from "svelte";
  import remember from "remember";

  import { store } from "$lib/state/store.svelte.ts";
  import SuiviInstruction from "./SuiviInstruction/SuiviInstruction.svelte";
  import LoginViaEmail from "./LoginViaEmail/LoginViaEmail.svelte";
  import Loader from "$lib/components/Loader.svelte";

  import { logout } from "$lib/shared/main.ts";
  import { loadDossiers } from "$lib/dossier/dossier.ts";
  import { envoiEmailConnexion } from "./LoginViaEmail/serveur.ts";
  import { authorizedEmailDomains } from "@pitchou/common/constants.ts";

  import type { ChampDescriptor } from "@pitchou/types/demarche-numerique/schema.ts";
  import type {
    SortFilterLocalStorage,
    FiltersLocalStorage,
    TableSort,
  } from "@pitchou/types/interfaceUtilisateur.ts";

  const SORT_FILTER_LOCALSTORAGE_KEY = "tri-filtres-tableau-suivi";

  let selectedSortFilters = $state<SortFilterLocalStorage | undefined>();

  let dossiersLoadingFinished = $state(false);

  onMount(async () => {
    const stored = await remember(SORT_FILTER_LOCALSTORAGE_KEY);
    if (stored && typeof stored !== "string") {
      selectedSortFilters = stored;
    } else if (typeof stored === "string") {
      console.warn(`string du localStorage non comprise en tant que filtre/tri`, stored);
    }

    if (store.capabilities.listerDossiers) {
      try {
        await loadDossiers();
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
      store.errors.add({
        message: `Il semblerait que vous ne fassiez partie d'aucun groupe instructeurs sur la procédure Démarche Numérique de Pitchou. Vous pouvez prendre contact avec vos collègues ou l'équipe Pitchou pour être ajouté.e à un groupe d'instructeurs`,
      });
    }
    dossiersLoadingFinished = true;
  });

  async function logoutEtAfficherLoginParEmail(erreur?: { message: string }) {
    if (erreur) {
      store.errors.add(erreur);
    }
    await logout();
  }

  function rememberSortFilters(sort: TableSort, filters: Partial<FiltersLocalStorage>) {
    const newSortFilters: SortFilterLocalStorage = {
      tri: sort.id,
      filtres: {
        phases: filters.phases ? [...filters.phases] : undefined,
        "prochaine action attendue de": filters["prochaine action attendue de"]
          ? [...filters["prochaine action attendue de"]]
          : undefined,
        instructeurs: filters.instructeurs ? [...filters.instructeurs] : undefined,
        activitésPrincipales: filters.activitésPrincipales
          ? [...filters.activitésPrincipales]
          : undefined,
        texte: filters.texte ?? undefined,
      },
    };
    remember(SORT_FILTER_LOCALSTORAGE_KEY, newSortFilters);
    selectedSortFilters = newSortFilters;
  }

  const email = $derived(store.identité?.email);
  const peutListerDossiers = $derived(!!store.capabilities.listerDossiers);
  const dossiers = $derived([...store.dossierSummaries.values()]);
  const relationSuivis = $derived(store.relationSuivis);

  const schemaChamps = $derived<ChampDescriptor[] | undefined>(
    store.schemaDS88444?.revision.champDescriptors,
  );

  const activitesPrincipales = $derived(
    schemaChamps?.find((c) => c.label === "Activité principale")?.options,
  );
</script>

{#if !dossiersLoadingFinished && peutListerDossiers}
  <div class="fr-p-2w fr-pb-10w">
    <Loader />
  </div>
{:else if peutListerDossiers && email}
  <SuiviInstruction
    {email}
    {dossiers}
    {relationSuivis}
    activitésPrincipales={activitesPrincipales ?? []}
    selectedSortId={selectedSortFilters?.tri}
    selectedFilters={selectedSortFilters?.filtres}
    {rememberSortFilters}
  />
{:else}
  <LoginViaEmail {authorizedEmailDomains} {envoiEmailConnexion} />
{/if}
