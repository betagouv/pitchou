<script lang="ts">
  import type { DossierRésumé } from "@pitchou/types/API_Pitchou.ts";
  import type { PitchouState } from "$lib/state/store.svelte.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";
  import type { DossiersQuery, SortKey, SortOrder } from "./dossiersList.ts";
  import {
    WITHOUT_INSTRUCTEUR,
    buildActiveFilterChips,
    buildDossiersSearchParams,
    buildSearchEvent,
    compareDossiers,
    countActiveFilters,
    filterDossiers,
    listAvailableInstructeurs,
    readDossiersQuery,
  } from "./dossiersList.ts";
  import { instructeurSuitDossier, instructeurLaisseDossier } from "$lib/dossier/suiviDossier.ts";
  import { envoyerÉvènementRechercherUnDossier as _envoyerÉvènementRechercherUnDossier } from "$lib/shared/aarri.ts";
  import CarteDossier from "./CarteDossier.svelte";
  import Pagination from "$lib/components/DSFR/Pagination.svelte";
  import DossiersToolbar from "./DossiersToolbar.svelte";
  import DossiersFilterModal from "./DossiersFilterModal.svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { tick, untrack } from "svelte";

  type Props = {
    titre: string;
    email?: string;
    dossiers: DossierRésumé[];
    relationSuivis?: PitchouState["relationSuivis"];
    /** Show the instructeur·ice filter (quick button + modal section) — irrelevant on « mes dossiers » */
    afficherFiltreInstructeurice?: boolean;
    notificationParDossier: PitchouState["notificationParDossier"];
  };

  let {
    titre,
    email = "",
    dossiers,
    relationSuivis,
    afficherFiltreInstructeurice = false,
    notificationParDossier,
  }: Props = $props();

  const NOMBRE_DOSSIERS_PAR_PAGE = 10;

  // The applied query lives entirely in the URL: search, filters, sort and page are all
  // reflected as query params, so the view is shareable and survives a reload.
  const query = $derived(readDossiersQuery(page.url.searchParams));

  // The draft edited inside the filters modal. It is mirrored to the URL live (see the
  // effect below), so the background list re-filters as each filter is toggled.
  let brouillon = $state<DossiersQuery>(readDossiersQuery(new URLSearchParams()));
  let modalOuverte = $state(false);
  // Applied filters (page excluded) captured when the modal opens, to tell an untouched
  // draft (keep the current page) apart from an edited one (reset to the first page).
  let paramsFiltresÀLOuverture = "";

  let statusMessage = $state("");
  let titrePageElement: HTMLHeadingElement | undefined = $state();

  const ctx = $derived({ notificationParDossier, relationSuivis });
  const dossiersFiltrés = $derived(filterDossiers(dossiers, query, ctx));
  const dossiersTriés = $derived(
    [...dossiersFiltrés].sort((a, b) =>
      compareDossiers(a, b, query.sort, query.order, notificationParDossier),
    ),
  );

  const nombreDePages = $derived(
    Math.max(1, Math.ceil(dossiersTriés.length / NOMBRE_DOSSIERS_PAR_PAGE)),
  );
  const pageActuelle = $derived(Math.min(Math.max(1, query.page), nombreDePages));
  const dossiersAffichés = $derived(
    dossiersTriés.slice(
      NOMBRE_DOSSIERS_PAR_PAGE * (pageActuelle - 1),
      NOMBRE_DOSSIERS_PAR_PAGE * pageActuelle,
    ),
  );

  type SelectionneurPage = () => void;
  const selectionneursPage: undefined | [undefined, ...rest: SelectionneurPage[]] = $derived.by(
    () => {
      if (dossiersTriés.length <= NOMBRE_DOSSIERS_PAR_PAGE) return undefined;
      const sélectionneurs = Array.from(
        { length: nombreDePages },
        (_v, i) => () => allerÀLaPage(i + 1),
      );
      return [undefined, ...sélectionneurs];
    },
  );

  const textePage = $derived(
    query.text.trim()
      ? `Résultats de recherche pour «${query.text}» : Page ${pageActuelle} sur ${nombreDePages}`
      : `Page ${pageActuelle} sur ${nombreDePages}`,
  );

  const activeFilterCount = $derived(countActiveFilters(query));
  const chipsFiltres = $derived(buildActiveFilterChips(query));
  const instructeurCount = $derived(listAvailableInstructeurs(relationSuivis).length);

  const dossierIdsSuivisParInstructeurActuel = $derived(
    relationSuivis?.get(email) ?? new Set<Dossier["id"]>(),
  );

  /** Copies a query, cloning its arrays so the modal draft never mutates the applied query */
  function copierQuery(q: DossiersQuery): DossiersQuery {
    return {
      ...q,
      phase: [...q.phase],
      activite: [...q.activite],
      prochaineAction: [...q.prochaineAction],
      departement: [...q.departement],
      instructeur: [...q.instructeur],
    };
  }

  /** Reflects the given query into the URL, which is the single source of truth */
  function naviguer(next: DossiersQuery) {
    const search = buildDossiersSearchParams(next).toString();
    goto(search ? `?${search}` : page.url.pathname, {
      replaceState: true,
      keepFocus: true,
      noScroll: true,
    });
  }

  /** Applies a filter/search change: updates the URL, sends analytics and announces the count */
  function appliquerRecherche(next: DossiersQuery) {
    naviguer(next);
    const count = filterDossiers(dossiers, next, ctx).length;
    _envoyerÉvènementRechercherUnDossier(
      buildSearchEvent(next, count, { instructeurCount, email }),
    );
    statusMessage = `${count} dossiers affichés sur ${dossiers.length}`;
    setTimeout(() => (statusMessage = ""), 400);
  }

  function onSearch(text: string) {
    appliquerRecherche({ ...copierQuery(query), text, page: 1 });
  }

  function onToggleSansInstructeurice() {
    const instructeur = query.instructeur.includes(WITHOUT_INSTRUCTEUR)
      ? query.instructeur.filter((value) => value !== WITHOUT_INSTRUCTEUR)
      : [...query.instructeur, WITHOUT_INSTRUCTEUR];
    appliquerRecherche({ ...copierQuery(query), instructeur, page: 1 });
  }

  function onToggleEnjeu() {
    appliquerRecherche({ ...copierQuery(query), enjeu: !query.enjeu, page: 1 });
  }

  function onSort(key: SortKey, order: SortOrder) {
    naviguer({ ...copierQuery(query), sort: key, order });
  }

  function allerÀLaPage(numéro: number) {
    naviguer({ ...copierQuery(query), page: numéro });
    tick().then(() => titrePageElement?.focus());
  }

  function ouvrirFiltres() {
    brouillon = copierQuery(query);
    paramsFiltresÀLOuverture = buildDossiersSearchParams({ ...query, page: 1 }).toString();
    modalOuverte = true;
  }

  // While the modal is open, reflect its draft into the URL on every change so the list
  // updates live. The page is reset to the first one only once the filters actually differ
  // from those applied when the modal opened (so merely opening it does not jump the page).
  $effect(() => {
    if (!modalOuverte) return;
    const filtresInchangés =
      buildDossiersSearchParams({ ...brouillon, page: 1 }).toString() === paramsFiltresÀLOuverture;
    const cible = filtresInchangés ? { ...brouillon } : { ...brouillon, page: 1 };
    // `naviguer` reads `page.url`; untrack it so the effect depends only on the draft and the
    // open state, and writing the URL does not re-trigger the effect.
    untrack(() => naviguer(cible));
  });

  function appliquerFiltres() {
    modalOuverte = false;
    // The URL already reflects the draft (applied live); this records the search analytics
    // and announces the final count once.
    appliquerRecherche({ ...copierQuery(brouillon), page: 1 });
  }

  function instructeurActuelSuitDossier(id: Dossier["id"]) {
    return instructeurSuitDossier(email, id);
  }
  function instructeurActuelLaisseDossier(id: Dossier["id"]) {
    return instructeurLaisseDossier(email, id);
  }
</script>

<div class="en-tête">
  <DossiersToolbar
    {titre}
    searchText={query.text}
    {afficherFiltreInstructeurice}
    sansInstructeuriceActif={query.instructeur.includes(WITHOUT_INSTRUCTEUR)}
    enjeuActif={query.enjeu}
    {activeFilterCount}
    nombreFiltrés={dossiersFiltrés.length}
    chips={chipsFiltres}
    sortKey={query.sort}
    sortOrder={query.order}
    {onSearch}
    {onToggleSansInstructeurice}
    {onToggleEnjeu}
    onOpenFiltres={ouvrirFiltres}
    onRemoveFiltre={appliquerRecherche}
    {onSort}
  />

  <div aria-live="polite" aria-atomic="true" class="fr-sr-only">
    {#if statusMessage}{statusMessage}{/if}
  </div>

  <h2 bind:this={titrePageElement} tabindex="-1" class="titre-page">{textePage}</h2>
</div>

<DossiersFilterModal
  open={modalOuverte}
  bind:draft={brouillon}
  {dossiers}
  {relationSuivis}
  {afficherFiltreInstructeurice}
  nombreResultats={dossiersFiltrés.length}
  onApply={appliquerFiltres}
  onClose={() => (modalOuverte = false)}
/>

{#if dossiersAffichés.length >= 1}
  <div class="liste-des-dossiers fr-mb-2w fr-py-4w fr-px-4w fr-px-md-15w">
    <ul>
      {#each dossiersAffichés as dossier (dossier.id)}
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

{#if selectionneursPage}
  <Pagination {selectionneursPage} pageActuelle={selectionneursPage[pageActuelle]} />
{/if}

<style>
  .liste-des-dossiers {
    background: var(--background-contrast-grey);
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
  }

  .titre-page {
    font-size: 1rem;
    font-weight: normal;
    margin-bottom: 0;
    margin-left: auto;
  }

  .titre-page:focus {
    outline: 2px solid var(--bf500);
    outline-offset: 2px;
  }
</style>
