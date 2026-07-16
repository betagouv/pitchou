<script lang="ts">
  import type { DossierSummary, DossierPhase } from "@pitchou/types/API_Pitchou.ts";
  import type { ChangeEventHandler, EventHandler } from "svelte/elements";
  import type { PitchouState } from "$lib/state/store.svelte.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";
  import type { EvenementRechercheDossiersDetails } from "@pitchou/types/evenement.d.ts";
  import { instructeurFollowsDossier, instructeurLeavesDossier } from "$lib/dossier/suiviDossier.ts";
  import CarteDossier from "./CarteDossier.svelte";
  import Pagination from "$lib/components/DSFR/Pagination.svelte";
  import { createTextFilter } from "$lib/dossier/filtresTexte.ts";
  import { SvelteMap } from "svelte/reactivity";
  import { tick } from "svelte";
  import { sendEvenementRechercherUnDossier as _sendEvenementRechercherUnDossier } from "$lib/shared/aarri.ts";
  import { phases as allPhases } from "$lib/dossier/affichageDossier.ts";

  type Props = {
    titre: string;
    email?: string;
    dossiers: DossierSummary[];
    relationSuivis?: PitchouState["relationSuivis"];
    afficherFiltreSansInstructeurice?: boolean;
    afficherFiltreActionInstructeur?: boolean;
    notificationParDossier: PitchouState["notificationParDossier"];
  };

  let {
    titre,
    email = "",
    dossiers,
    relationSuivis,
    afficherFiltreSansInstructeurice = false,
    afficherFiltreActionInstructeur = false,
    notificationParDossier,
  }: Props = $props();

  const DOSSIERS_PER_PAGE = 10;

  type FilterKey = "texte" | "sansInstructeurice" | "phase" | "actionInstructeur" | "nouveauté";
  const allFilters = new SvelteMap<FilterKey, (d: DossierSummary) => boolean>();

  const filteredDossiers = $derived.by(() => {
    let result = [...dossiers];

    for (const filter of allFilters.values()) {
      result = result.filter(filter);
    }

    return result;
  });

  function sendEvenementRechercherUnDossier() {
    const filtres: EvenementRechercheDossiersDetails["filtres"] = {
      sansInstructeurice: allFilters.has("sansInstructeurice"),
      nouveauté: allFilters.has("nouveauté"),
    };

    if (textToSearch) {
      filtres.texte = textToSearch;
    }

    if (allFilters.has("phase") && selectedPhase) {
      filtres.phases = [selectedPhase];
    }

    if (allFilters.has("actionInstructeur")) {
      filtres.prochaineActionAttenduePar = ["Instructeur"];
    }

    _sendEvenementRechercherUnDossier({ filtres, nombreRésultats: filteredDossiers.length });
  }

  let selectedPageNumber = $state(1);

  let statusMessage = $state("");

  let pageTitleElement: HTMLHeadingElement | undefined = $state();

  /** Total number of pages */
  const pageCount = $derived.by(() => {
    if (filteredDossiers.length === 0) return 1;
    return Math.ceil(filteredDossiers.length / DOSSIERS_PER_PAGE);
  });

  /** Text to display for the page */
  const pageText = $derived.by(() => {
    if (allFilters.has("texte") && textToSearch && textToSearch.trim() !== "") {
      return `Résultats de recherche pour «${textToSearch}» : Page ${selectedPageNumber} sur ${pageCount}`;
    }
    return `Page ${selectedPageNumber} sur ${pageCount}`;
  });

  /**
   * Updates the aria-live message with the number of filtered dossiers
   */
  function updateFilterMessage() {
    const filteredCount = filteredDossiers.length;
    const totalCount = dossiers.length;

    statusMessage = `${filteredCount} dossiers affichés sur ${totalCount}`;
    setTimeout(() => {
      statusMessage = "";
    }, 400);
  }

  let textToSearch: string | undefined = $state();

  let selectedPhase: DossierPhase | undefined = $state();

  const dossierIdsSuivisParInstructeurActuel = $derived(relationSuivis?.get(email) ?? new Set());

  type PageSelector = () => void;
  let pageSelectors: undefined | [undefined, ...rest: PageSelector[]] = $derived.by(
    () => {
      if (filteredDossiers.length >= DOSSIERS_PER_PAGE + 1) {
        const selectors: PageSelector[] = [
          ...Array.from({ length: pageCount }, (_v, i) => () => {
            selectedPageNumber = i + 1;
            tick().then(() => pageTitleElement?.focus());
          }),
        ];

        return [undefined, ...selectors];
      } else {
        return undefined;
      }
    },
  );

  let displayedDossiers: typeof dossiers = $derived.by(() => {
    // We display the dossiers sorted first by the most recent last-modification date (nouveauté)
    // then by submission date
    const sortedDossiers = [...filteredDossiers].sort((a, b) => {
      const notificationA = notificationParDossier.get(a.id);
      const notificationB = notificationParDossier.get(b.id);

      const dateNotificationNonVueA =
        notificationA?.vue === false ? notificationA.date_dernière_mise_à_jour : undefined;
      const dateNotificationNonVueB =
        notificationB?.vue === false ? notificationB.date_dernière_mise_à_jour : undefined;

      if (dateNotificationNonVueA && dateNotificationNonVueB) {
        return dateNotificationNonVueA > dateNotificationNonVueB ? -1 : 1;
      } else if (dateNotificationNonVueA && dateNotificationNonVueB === undefined) {
        return -1;
      } else if (dateNotificationNonVueA === undefined && dateNotificationNonVueB) {
        return 1;
      }

      return a.date_dépôt > b.date_dépôt ? -1 : 1;
    });

    if (!pageSelectors) return sortedDossiers;
    else {
      return sortedDossiers.slice(
        DOSSIERS_PER_PAGE * (selectedPageNumber - 1),
        DOSSIERS_PER_PAGE * selectedPageNumber,
      );
    }
  });

  const submitTextSearch: EventHandler<SubmitEvent, HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!textToSearch || textToSearch.trim() === "") {
      allFilters.delete("texte");
    } else {
      allFilters.set("texte", createTextFilter(textToSearch, dossiers));
    }
    sendEvenementRechercherUnDossier();
  };

  /**
   * Checks whether a dossier is followed by at least one person
   */
  function dossierEstSuivi(dossierId: Dossier["id"]): boolean {
    if (!relationSuivis) return false;
    for (const dossiersSuivis of relationSuivis.values()) {
      if (dossiersSuivis.has(dossierId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Resets the page to 1 when a filter is changed
   */
  function resetPage() {
    selectedPageNumber = 1;
    updateFilterMessage();
  }

  function toggleFilterSansInstructeurice() {
    if (!allFilters.has("sansInstructeurice")) {
      allFilters.set("sansInstructeurice", (dossier) => !dossierEstSuivi(dossier.id));
    } else {
      allFilters.delete("sansInstructeurice");
    }
    sendEvenementRechercherUnDossier();
    resetPage();
  }

  function toggleFilterActionInstructeur() {
    if (!allFilters.has("actionInstructeur")) {
      allFilters.set(
        "actionInstructeur",
        (dossier) => dossier.prochaine_action_attendue_par === "Instructeur",
      );
    } else {
      allFilters.delete("actionInstructeur");
    }
    sendEvenementRechercherUnDossier();
    resetPage();
  }

  function toggleFilterNouveaute() {
    if (!allFilters.has("nouveauté")) {
      allFilters.set(
        "nouveauté",
        (dossier) => notificationParDossier.get(dossier.id)?.vue === false,
      );
    } else {
      allFilters.delete("nouveauté");
    }
    sendEvenementRechercherUnDossier();
    resetPage();
  }

  const selectPhase: ChangeEventHandler<HTMLSelectElement> = (e) => {
    e.preventDefault();
    const phase = e.currentTarget.value;
    if (phase === "") {
      allFilters.delete("phase");
    } else {
      // Select the phase
      allFilters.set("phase", (dossier) => dossier.phase === phase);
    }
    sendEvenementRechercherUnDossier();
    resetPage();
  };

  function instructeurActuelSuitDossier(id: Dossier["id"]) {
    return instructeurFollowsDossier(email, id);
  }

  function instructeurActuelLaisseDossier(id: Dossier["id"]) {
    return instructeurLeavesDossier(email, id);
  }
</script>

<div class="en-tête">
  <div class="titre-et-barre-de-recherche">
    <h1>{titre}</h1>
    <form onsubmit={submitTextSearch}>
      <div class="fr-search-bar barre-de-recherche" role="search">
        <label class="fr-label" for="search-input">Rechercher un dossier</label>
        <input
          bind:value={textToSearch}
          name="texte-de-recherche"
          class="fr-input"
          aria-describedby="search-input-messages"
          placeholder="Rechercher"
          id="search-input"
          type="search"
        />
        <button title="Rechercher un dossier" type="submit" class="fr-btn"
          >Rechercher un dossier</button
        >
      </div>
    </form>
  </div>
  <div aria-live="polite" aria-atomic="true" class="fr-sr-only">
    {#if statusMessage}
      {statusMessage}
    {/if}
  </div>
  <fieldset>
    <legend class="fr-sr-only">Filtrer…</legend>
    <div class="filtres-et-compteur-dossiers">
      <div class="filtres">
        <div class="fr-select-group filtre-par-phase">
          <label class="fr-label" for="select-phase"> Filtrer par phase </label>
          <select
            bind:value={selectedPhase}
            onchange={selectPhase}
            aria-label="Phase choisie"
            class="fr-select select-phase"
            id="select-phase"
            name="select-phase"
          >
            <option value="" selected>Toutes les phases</option>
            {#each allPhases as phase}
              <option value={phase}>{phase}</option>
            {/each}
          </select>
        </div>
        {#if afficherFiltreSansInstructeurice}
          <button
            type="button"
            class="fr-tag"
            onclick={toggleFilterSansInstructeurice}
            aria-pressed={allFilters.has("sansInstructeurice")}
          >
            Dossier sans instructeur·ice
          </button>
        {/if}
        {#if afficherFiltreActionInstructeur}
          <button
            type="button"
            class="fr-tag"
            onclick={toggleFilterActionInstructeur}
            aria-pressed={allFilters.has("actionInstructeur")}
          >
            Action : Instructeur·ice
          </button>
        {/if}
        <button
          type="button"
          class="fr-tag"
          onclick={toggleFilterNouveaute}
          aria-pressed={allFilters.has("nouveauté")}
        >
          Nouveauté
        </button>
      </div>
      <p class="compteur" data-testid={"compteur-dossier"}>
        <span class="fr-text--lead">{filteredDossiers.length}</span><span class="fr-text--lg"
          >/{dossiers.length} dossiers</span
        >
      </p>
    </div>
  </fieldset>
  <h2 bind:this={pageTitleElement} tabindex="-1" class="titre-page">{pageText}</h2>
</div>
{#if displayedDossiers.length >= 1}
  <div class="liste-des-dossiers fr-mb-2w fr-py-4w fr-px-4w fr-px-md-15w">
    <ul>
      {#each displayedDossiers as dossier (dossier.id)}
        <li>
          <CarteDossier
            {dossier}
            {instructeurActuelSuitDossier}
            {instructeurActuelLaisseDossier}
            dossierSuiviParInstructeurActuel={dossierIdsSuivisParInstructeurActuel.has(dossier.id)}
            nouveautéVueParInstructeur={notificationParDossier.get(dossier.id)?.vue ?? true}
          />
        </li>
      {/each}
    </ul>
  </div>
{:else}
  <p>Aucun dossier n'a été trouvé.</p>
{/if}
{#if pageSelectors}
  <Pagination pageSelectors={pageSelectors} currentPage={pageSelectors[selectedPageNumber]}
  ></Pagination>
{/if}

<style>
  .liste-des-dossiers {
    background: var(--background-contrast-grey);
  }

  fieldset {
    border: 0;
    margin: 0;
    padding: 0;
  }

  h2 {
    margin-left: auto;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li:not(:last-child) {
    margin-bottom: 1rem;
  }
  .en-tête {
    display: flex;
    flex-direction: column;
    margin-top: 1rem;

    .titre-et-barre-de-recherche {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      @media (max-width: 768px) {
        flex-direction: column;
        justify-content: stretch;
        align-items: start;
        form {
          width: 100%;
          margin-bottom: 2rem;
        }
      }
    }

    .compteur {
      margin-bottom: 0.25rem;
    }

    .filtre-par-phase {
      margin-bottom: 0;
      @media (max-width: 768px) {
        margin-bottom: 1rem;
      }
    }

    .filtres-et-compteur-dossiers {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: end;

      @media (max-width: 768px) {
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }

      .filtres {
        display: flex;
        flex-direction: row;
        gap: 1rem;
        align-items: end;

        @media (max-width: 768px) {
          flex-direction: column;
          gap: 0.5rem;
          align-items: start;
        }
      }
    }
  }

  .barre-de-recherche {
    min-width: 28rem;
    @media (max-width: 768px) {
      min-width: unset;
    }
  }

  .titre-page {
    font-size: 1rem;
    font-weight: normal;
    margin-bottom: 0;
  }

  .titre-page:focus {
    outline: 2px solid var(--bf500);
    outline-offset: 2px;
  }
</style>
