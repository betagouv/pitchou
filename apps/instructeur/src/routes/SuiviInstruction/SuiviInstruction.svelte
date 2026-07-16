<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { SvelteSet, SvelteMap } from "svelte/reactivity";

  import FiltreParmiOptions from "./FiltreParmiOptions.svelte";
  import BarreRecherche from "./BarreRecherche.svelte";
  import TrisDeTh from "./TrisDeTh.svelte";
  import TagPhase from "$lib/components/TagPhase.svelte";
  import ModalButton from "$lib/components/DSFR/ModalButton.svelte";
  import Pagination from "$lib/components/DSFR/Pagination.svelte";
  import IndicateurDelaiPhase from "./IndicateurDelaiPhase.svelte";
  import {
    formatLocalisation,
    formatPorteurDeProjet,
    phases,
    prochaineActionAttenduePar,
  } from "$lib/dossier/displayDossier.ts";
  import { createTextFilter } from "$lib/dossier/textFilters.ts";
  import {
    sortDossiersByColumnAlphabetically,
    sortDossiersByPhaseProchaineAction,
  } from "./sortDossiers.ts";
  import { instructeurLeavesDossier, instructeurFollowsDossier } from "$lib/dossier/suiviDossier.ts";
  import { originDemarcheNumerique } from "@pitchou/common/constants.ts";
  import {
    sendEvenement,
    sendEvenementRechercherUnDossier as _sendEvenementRechercherUnDossier,
  } from "$lib/shared/aarri.ts";

  import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
  import type {
    DossierSummary,
    DossierPhase,
    DossierProchaineActionAttenduePar,
  } from "@pitchou/types/API_Pitchou.ts";
  import type { PitchouState } from "$lib/state/store.svelte.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";
  import type Personne from "@pitchou/types/database/public/Personne.ts";
  import type { FiltersLocalStorage, TableSort } from "@pitchou/types/interfaceUtilisateur.ts";
  import type { EvenementRechercheDossiersDetails } from "@pitchou/types/evenement.d.ts";

  type Props = {
    email: string;
    dossiers?: DossierSummary[];
    relationSuivis: PitchouState["relationSuivis"];
    activitésPrincipales?: string[] | undefined;
    selectedSortId?: TableSort["id"] | undefined;
    selectedFilters?: Partial<FiltersLocalStorage>;
    rememberSortFilters: any;
  };

  let {
    email,
    dossiers = [],
    relationSuivis,
    activitésPrincipales: activitesPrincipales = [],
    selectedSortId = undefined,
    selectedFilters = {},
    rememberSortFilters,
  }: Props = $props();

  //$inspect('dossiers', dossiers)
  //$inspect('selectedFilters', selectedFilters)
  $inspect("relationSuivis", relationSuivis);

  let dossierIdsFollowedByNoInstructeur = $derived.by(() => {
    if (!relationSuivis) {
      return new SvelteSet();
    }

    // start with all the ids
    let dossierIdsWithoutFollow = new Set(dossiers.map((d) => d.id));

    // remove the ids followed by at least one instructeur.rice
    for (const dossierIds of relationSuivis.values()) {
      dossierIdsWithoutFollow = dossierIdsWithoutFollow.difference(dossierIds);
    }

    return new SvelteSet(dossierIdsWithoutFollow);
  });

  let selectedDossiers: DossierSummary[] = $state([]);

  //$inspect('selectedDossiers', selectedDossiers)

  $effect(() => {
    console.log("relationSuivis effect", relationSuivis);
  });

  let dossierIdsFollowedByCurrentInstructeur: Set<Dossier["id"]> = $derived(
    relationSuivis?.get(email) || new SvelteSet(),
  );

  $inspect("dossierIdsFollowedByCurrentInstructeur", dossierIdsFollowedByCurrentInstructeur);

  const activitePrincipaleSorts = [
    {
      nom: "Trier de A à Z",
      sort() {
        selectedDossiers = sortDossiersByColumnAlphabetically(
          selectedDossiers,
          "activité_principale",
        );
      },
      id: "ActivitéPrincipale-AZ",
    },
    {
      nom: "Trier de Z à A",
      sort() {
        selectedDossiers = sortDossiersByColumnAlphabetically(
          selectedDossiers,
          "activité_principale",
        ).reverse();
      },
      id: "ActivitéPrincipale-ZA",
    },
  ];

  const nomProjetSorts = [
    {
      nom: "Trier de A à Z",
      sort() {
        selectedDossiers = sortDossiersByColumnAlphabetically(
          selectedDossiers,
          "nom",
        );
      },
      id: "NomProjet-AZ",
    },
    {
      nom: "Trier de Z à A",
      sort() {
        selectedDossiers = sortDossiersByColumnAlphabetically(
          selectedDossiers,
          "nom",
        ).reverse();
      },
      id: "NomProjet-ZA",
    },
  ];

  const localisationSorts = [
    {
      nom: "Trier de A à Z",
      sort() {
        selectedDossiers = sortDossiersByColumnAlphabetically(
          selectedDossiers,
          "localisation",
        );
      },
      id: "Localisation-AZ",
    },
    {
      nom: "Trier de Z à A",
      sort() {
        selectedDossiers = sortDossiersByColumnAlphabetically(
          selectedDossiers,
          "localisation",
        ).reverse();
      },
      id: "Localisation-ZA",
    },
  ];

  const porteurDeProjetSorts = [
    {
      nom: "Trier de A à Z",
      sort() {
        selectedDossiers = sortDossiersByColumnAlphabetically(
          selectedDossiers,
          "porteur de projet",
        );
      },
      id: "PorteurDeProjet-AZ",
    },
    {
      nom: "Trier de Z à A",
      sort() {
        selectedDossiers = sortDossiersByColumnAlphabetically(
          selectedDossiers,
          "porteur de projet",
        ).reverse();
      },
      id: "PorteurDeProjet-ZA",
    },
  ];

  const priorisationPhaseProchaineActionSorts = [
    {
      nom: "Prioriser",
      sort() {
        selectedDossiers = sortDossiersByPhaseProchaineAction(selectedDossiers);
      },
      id: "Priorisation-PhaseAction",
    },
  ];

  const sorts: TableSort[] = [
    ...activitePrincipaleSorts,
    ...nomProjetSorts,
    ...localisationSorts,
    ...porteurDeProjetSorts,
    ...priorisationPhaseProchaineActionSorts,
  ];

  // This line must be tolerant of selectedSortId being undefined or anything else
  let selectedSort: TableSort | undefined = $state(
    sorts.find((t) => t.id === selectedSortId) || priorisationPhaseProchaineActionSorts[0],
  );

  type FilterKey =
    | "phase"
    | "prochaine action attendue de"
    | "texte"
    | "suivis"
    | "instructeurs"
    | "activité principale";
  const allFilters = new SvelteMap<FilterKey, (d: DossierSummary) => boolean>();

  function filterDossiers() {
    let newSelectedDossiers = dossiers;

    for (const filter of allFilters.values()) {
      newSelectedDossiers = newSelectedDossiers.filter(filter);
    }

    selectedDossiers = newSelectedDossiers;

    if (selectedSort) {
      selectedSort.sort();
    }
  }

  function sendEvenementRechercherUnDossier() {
    const filtres: EvenementRechercheDossiersDetails["filtres"] = {
      suiviPar: {
        nombreSéléctionnées: selectedInstructeurs.has(AUCUN_INSTRUCTEUR)
          ? selectedInstructeurs.size - 1
          : selectedInstructeurs.size,
        // do not count “(aucun instructeur)”
        nombreTotal: instructeursOptions.size - 1,
        inclusSoiMême: selectedInstructeurs.has(email),
      },
      sansInstructeurice: selectedInstructeurs.has(AUCUN_INSTRUCTEUR),
      phases: [...selectedPhases],
      prochaineActionAttenduePar: [...selectedProchainesActionsAttenduesPar],
      activitésPrincipales: [...selectedActivitesPrincipales],
    };

    if (textToSearch) {
      filtres.texte = textToSearch;
    }

    _sendEvenementRechercherUnDossier({ filtres, nombreRésultats: selectedDossiers.length });
  }

  const phaseOptions: Set<DossierPhase> = new SvelteSet([...phases]);

  let selectedPhases: Set<DossierPhase> = $state(
    untrack(() =>
      selectedFilters.phases
        ? new SvelteSet(selectedFilters.phases)
        : new SvelteSet(["Accompagnement amont", "Étude recevabilité DDEP", "Instruction"]),
    ),
  );

  //$inspect(selectedPhases)

  function makeTagPhaseOnClick(phase: DossierPhase) {
    return () => {
      console.log("click on phase", phase);

      if (selectedPhases.has(phase)) {
        selectedPhases.delete(phase);
      } else {
        selectedPhases.add(phase);
      }

      //selectedPhases = selectedPhases; // re-render

      filterDossiers();
      sendEvenementRechercherUnDossier();
    };
  }

  allFilters.set("phase", (dossier) => {
    return selectedPhases.has(dossier.phase);
  });

  const PROCHAINE_ACTION_ATTENDUE_PAR_VIDE = "(vide)" as const;
  const prochainesActionsAttenduesParOptions = new SvelteSet([
    ...prochaineActionAttenduePar,
    PROCHAINE_ACTION_ATTENDUE_PAR_VIDE,
  ]);

  // @ts-ignore
  let selectedProchainesActionsAttenduesPar: Set<
    DossierProchaineActionAttenduePar | typeof PROCHAINE_ACTION_ATTENDUE_PAR_VIDE
  > = $state(
    untrack(() =>
      selectedFilters["prochaine action attendue de"]
        ? new SvelteSet(selectedFilters["prochaine action attendue de"])
        : new SvelteSet(prochainesActionsAttenduesParOptions),
    ),
  );

  allFilters.set("prochaine action attendue de", (dossier) => {
    if (
      !dossier.prochaine_action_attendue_par ||
      !prochainesActionsAttenduesParOptions.has(
        dossier.prochaine_action_attendue_par as DossierProchaineActionAttenduePar,
      )
    ) {
      return selectedProchainesActionsAttenduesPar.has(PROCHAINE_ACTION_ATTENDUE_PAR_VIDE);
    }

    return selectedProchainesActionsAttenduesPar.has(
      dossier.prochaine_action_attendue_par as DossierProchaineActionAttenduePar,
    );
  });

  function filterByProchainesActionsAttenduesPar(
    _selectedProchainesActionsAttenduesPar: Set<
      DossierProchaineActionAttenduePar | typeof PROCHAINE_ACTION_ATTENDUE_PAR_VIDE
    >,
  ) {
    selectedProchainesActionsAttenduesPar = new SvelteSet(
      _selectedProchainesActionsAttenduesPar,
    );

    filterDossiers();
    sendEvenementRechercherUnDossier();
  }

  let unselectedProchainesActionsAttenduesPar = $derived(
    prochainesActionsAttenduesParOptions.difference(selectedProchainesActionsAttenduesPar),
  );

  let textToSearch = $state(untrack(() => selectedFilters.texte));

  function addTextFilter(_textToSearch: string) {
    textToSearch = _textToSearch.trim();
    allFilters.set("texte", createTextFilter(textToSearch, dossiers));
  }

  function filterByText(_textToSearch: string) {
    addTextFilter(_textToSearch);

    filterDossiers();
    sendEvenementRechercherUnDossier();
  }

  function onDeleteTextFilter(e: Event) {
    e.preventDefault();

    allFilters.delete("texte");

    textToSearch = "";
    filterDossiers();
  }

  const AUCUN_INSTRUCTEUR = "(aucun instructeur)" as const;
  const instructeurEmailOptions = $derived(
    (relationSuivis && Array.from(relationSuivis.keys()).sort()) || [],
  );

  const instructeursOptions: Set<NonNullable<Personne["email"]> | typeof AUCUN_INSTRUCTEUR> =
    $derived(new SvelteSet([email, AUCUN_INSTRUCTEUR, ...instructeurEmailOptions]));

  //$inspect('')

  let selectedInstructeurs: Set<NonNullable<Personne["email"]> | typeof AUCUN_INSTRUCTEUR> =
    $state(
      untrack(
        () =>
          new SvelteSet(
            selectedFilters.instructeurs
              ? selectedFilters.instructeurs
              : instructeursOptions,
          ),
      ),
    );

  $inspect("instructeursSélectionnés", selectedInstructeurs);

  allFilters.set("instructeurs", (dossier) => {
    if (!relationSuivis) return true;

    if (
      selectedInstructeurs.has(AUCUN_INSTRUCTEUR) &&
      dossierIdsFollowedByNoInstructeur &&
      dossierIdsFollowedByNoInstructeur.has(dossier.id)
    ) {
      return true;
    }

    for (const instructeurEmail of selectedInstructeurs) {
      const dossiersIdsSuivisParCetInstructeur = relationSuivis.get(instructeurEmail);
      if (dossiersIdsSuivisParCetInstructeur && dossiersIdsSuivisParCetInstructeur.has(dossier.id))
        return true;
    }

    return false;
  });

  function filterByInstructeurs(
    _selectedInstructeurs: Set<NonNullable<Personne["email"]> | typeof AUCUN_INSTRUCTEUR>,
  ) {
    selectedInstructeurs = new SvelteSet(_selectedInstructeurs);

    filterDossiers();
    sendEvenementRechercherUnDossier();
  }

  function filterFollowedByMe() {
    filterByInstructeurs(new Set([email]));
    sendEvenement({ type: "afficherLesDossiersSuivis" });
  }

  let unselectedInstructeurs = $derived(
    instructeursOptions.difference(selectedInstructeurs),
  );

  const AUCUNE_ACTIVITE_PRINCIPALE = "(aucune activité principale)" as const;
  // @ts-ignore
  const activitesPrincipalesOptions = $derived(
    new SvelteSet([AUCUNE_ACTIVITE_PRINCIPALE, ...activitesPrincipales]),
  );

  // @ts-ignore
  let selectedActivitesPrincipales: Set<
    DossierDemarcheNumerique88444["Activité principale"] | typeof AUCUNE_ACTIVITE_PRINCIPALE
  > = $state(
    untrack(
      () =>
        new SvelteSet(
          selectedFilters.activitésPrincipales
            ? selectedFilters.activitésPrincipales
            : activitesPrincipalesOptions,
        ),
    ),
  );

  allFilters.set("activité principale", (dossier) => {
    if (
      !dossier.activité_principale ||
      !activitesPrincipalesOptions.has(dossier.activité_principale)
    )
      return selectedActivitesPrincipales.has(AUCUNE_ACTIVITE_PRINCIPALE);

    return selectedActivitesPrincipales.has(dossier.activité_principale);
  });

  function filterByActivitePrincipale(
    _selectedActivitesPrincipales: Set<DossierDemarcheNumerique88444["Activité principale"]>,
  ) {
    selectedActivitesPrincipales = new Set(_selectedActivitesPrincipales);

    filterDossiers();
    sendEvenementRechercherUnDossier();
  }

  let unselectedActivitesPrincipales = $derived(
    activitesPrincipalesOptions.difference(selectedActivitesPrincipales),
  );

  $effect(() => {
    rememberSortFilters(selectedSort, {
      phases: selectedPhases,
      "prochaine action attendue de": selectedProchainesActionsAttenduesPar,
      instructeurs: selectedInstructeurs,
      activitésPrincipales: selectedActivitesPrincipales,
      texte: textToSearch,
    });
  });

  // Pagination of the suivi table
  type PageSelector = () => void;

  const DOSSIERS_PER_PAGE = 20;

  // page number matching the displayed one, so starting at 1
  let selectedPageNumber: number = $state(1);

  let pageSelectors: [undefined, ...rest: PageSelector[]] | undefined = $derived.by(
    () => {
      if (selectedDossiers.length >= DOSSIERS_PER_PAGE * 2 + 1) {
        const pageCount = Math.ceil(selectedDossiers.length / DOSSIERS_PER_PAGE);

        return [
          undefined,
          ...[...Array(pageCount).keys()].map((i) => () => {
            console.log("sélection de la page", i + 1);
            selectedPageNumber = i + 1;
          }),
        ];
      }

      return undefined;
    },
  );

  $effect(() => {
    if (pageSelectors) selectedPageNumber = 1;
  });

  let displayedDossiers: typeof selectedDossiers = $derived.by(() => {
    if (!pageSelectors) return selectedDossiers;
    else {
      return selectedDossiers.slice(
        DOSSIERS_PER_PAGE * (selectedPageNumber - 1),
        DOSSIERS_PER_PAGE * selectedPageNumber,
      );
    }
  });

  //$inspect('dossiersAffichés', dossiersAffichés)

  // filtering with the initial filters
  onMount(async () => {
    if (textToSearch) {
      addTextFilter(textToSearch);
    }

    filterDossiers();
  });

  function currentInstructeurFollowsDossier(id: Dossier["id"]) {
    return instructeurFollowsDossier(email, id);
  }

  function currentInstructeurLeavesDossier(id: Dossier["id"]) {
    return instructeurLeavesDossier(email, id);
  }
</script>

<svelte:head>
  <title>Suivi instruction — Pitchou</title>
</svelte:head>

<div class="fr-grid-row fr-mt-4w fr-grid-row--center">
  <div class="fr-col">
    <h1>
      Tableau de suivi instruction <abbr title="Demandes de Dérogation Espèces Protégées">DDEP</abbr
      >
    </h1>

    {#if dossiers.length >= 1}
      <BarreRecherche
        title="Rechercher par texte libre"
        updateTextSearch={filterByText}
      />

      <div class="fr-mb-2w">
        <strong>Filtrer par phase</strong>
        {#each phaseOptions as phase}
          <TagPhase
            {phase}
            classes={["fr-mr-1w"]}
            onClick={makeTagPhaseOnClick(phase)}
            ariaPressed={selectedPhases.has(phase)}
          ></TagPhase>
        {/each}
      </div>

      <div class="filters">
        <FiltreParmiOptions
          title="Filtrer par activité principale"
          options={activitesPrincipalesOptions}
          selectedOptions={selectedActivitesPrincipales}
          updateSelectedOptions={filterByActivitePrincipale}
        />
        <FiltreParmiOptions
          title="Filtrer par prochaine action attendue par"
          options={prochainesActionsAttenduesParOptions}
          selectedOptions={selectedProchainesActionsAttenduesPar}
          updateSelectedOptions={filterByProchainesActionsAttenduesPar}
        />
        {#if instructeursOptions && instructeursOptions.size >= 2}
          <FiltreParmiOptions
            title="Filtrer par instructeur suivant le dossier"
            options={instructeursOptions}
            selectedOptions={selectedInstructeurs}
            updateSelectedOptions={filterByInstructeurs}
          />
        {/if}
      </div>

      <section class="active-filters fr-mb-1w">
        <div class="fr-mb-1w">
          <span>Dossiers suivis par&nbsp;:</span>
          {#if unselectedInstructeurs.size === 0}
            <strong>Toustes</strong>
          {:else if unselectedInstructeurs.size === 1 && unselectedInstructeurs.has(AUCUN_INSTRUCTEUR)}
            <strong>Au moins un.e instructeur.rice</strong>
          {:else if unselectedInstructeurs.size <= 2}
            <strong>Toustes sauf</strong>
            {#each [...unselectedInstructeurs] as instructeur}
              <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                {instructeur}
                {#if instructeur === email}(moi){/if}
              </span>
            {/each}
          {:else}
            {#each [...selectedInstructeurs] as instructeur}
              <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                {instructeur}
                {#if instructeur === email}(moi){/if}
              </span>
            {/each}
          {/if}

          {#if selectedInstructeurs.size !== 1 || !selectedInstructeurs.has(email)}
            <button
              class="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-todo-line"
              onclick={filterFollowedByMe}
            >
              Suivi par moi
            </button>
          {/if}
        </div>

        <div class="fr-mb-1w">
          <span>Prochaine action attendue par&nbsp;:</span>
          {#if unselectedProchainesActionsAttenduesPar.size === 0}
            <strong>Toutes options</strong>
          {:else if unselectedProchainesActionsAttenduesPar.size <= 2}
            <strong>Toutes options sauf</strong>
            {#each [...unselectedProchainesActionsAttenduesPar] as prochaineActionAttenduePar}
              <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                {prochaineActionAttenduePar}
              </span>
            {/each}
          {:else}
            {#each [...selectedProchainesActionsAttenduesPar] as prochaineActionAttenduePar}
              <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                {prochaineActionAttenduePar}
              </span>
            {/each}
          {/if}
        </div>

        <div class="fr-mb-1w">
          <span>Activités principales&nbsp;:</span>
          {#if unselectedActivitesPrincipales.size === 0}
            <strong>Toutes</strong>
          {:else if unselectedActivitesPrincipales.size <= 4}
            <strong>Toutes sauf</strong>
            {#each [...unselectedActivitesPrincipales] as activitePrincipale}
              <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                {activitePrincipale}
              </span>
            {/each}
          {:else}
            {#each [...selectedActivitesPrincipales] as activitePrincipale}
              <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                {activitePrincipale}
              </span>
            {/each}
          {/if}
        </div>

        {#if textToSearch}
          <div class="fr-mb-1w">
            <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">Texte cherché : {textToSearch}</span
            >
            <button onclick={onDeleteTextFilter}>✖</button>
          </div>
        {/if}
      </section>

      <h2 class="fr-mt-2w">
        {selectedDossiers.length}<small>/{dossiers.length}</small> dossiers sélectionnés
      </h2>

      <div class="fr-table fr-table--bordered">
        <table class="fr-mb-2w">
          <thead>
            <tr>
              <th>Voir le dossier</th>
              <th>
                Localisation
                <TrisDeTh sorts={localisationSorts} bind:selectedSort />
              </th>
              <th>
                Activité principale
                <TrisDeTh sorts={activitePrincipaleSorts} bind:selectedSort />
              </th>
              <th>
                Porteur de projet
                <TrisDeTh sorts={porteurDeProjetSorts} bind:selectedSort />
              </th>
              <th>
                Nom du projet
                <TrisDeTh sorts={nomProjetSorts} bind:selectedSort />
              </th>
              <th>Enjeux</th>
              <th>Rattaché au régime AE</th>
              <th>
                Phase<br />
                <br />
                Prochaine action attendue de
                <TrisDeTh
                  sorts={priorisationPhaseProchaineActionSorts}
                  bind:selectedSort
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {#each displayedDossiers as dossier (dossier)}
              {@const {
                id,
                nom,
                communes,
                départements,
                régions,
                activité_principale,
                rattaché_au_régime_ae,
                enjeu,
                commentaire_libre,
                phase,
                prochaine_action_attendue_par,
              } = dossier}
              <tr>
                <td>
                  <a
                    class="fr-btn view-dossier fr-btn--sm fr-btn--icon-left fr-icon-eye-line fr-mb-1w"
                    href={`/dossier/${id}`}>Voir le dossier</a
                  >

                  {#if commentaire_libre && commentaire_libre.trim().length >= 1}
                    {@const dsfrModaleId = `dsfr-modale-${id}`}
                    <ModalButton id={dsfrModaleId}>
                      {#snippet openButton()}
                        <button
                          class="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-chat-3-line"
                          data-fr-opened="false"
                          aria-controls={dsfrModaleId}
                        >
                          Commentaire
                        </button>
                      {/snippet}
                      {#snippet content()}
                        <header class="modal-title">
                          <h1 class="fr-modal__title">
                            Commentaire dossier {nom}
                          </h1>
                          <h2 class="fr-modal__title">
                            {formatPorteurDeProjet(dossier)}
                            &nbsp;-&nbsp;
                            {formatLocalisation({ communes, départements, régions })}
                          </h2>
                        </header>

                        <div class="modal-content">
                          {commentaire_libre}
                        </div>
                      {/snippet}
                    </ModalButton>
                  {/if}

                  {#if dossierIdsFollowedByCurrentInstructeur.has(id)}
                    <button
                      onclick={() => currentInstructeurLeavesDossier(id)}
                      class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-star-fill fr-btn--icon-left"
                      >Ne plus suivre</button
                    >
                  {:else}
                    <button
                      onclick={() => currentInstructeurFollowsDossier(id)}
                      class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-star-line fr-btn--icon-left"
                      >Suivre</button
                    >
                  {/if}
                </td>
                <td>{formatLocalisation({ communes, départements, régions })}</td>
                <td>{activité_principale || ""}</td>
                <td>{formatPorteurDeProjet(dossier)}</td>
                <td>{nom || ""}</td>
                <td>
                  {#if enjeu}
                    <p class="fr-badge fr-badge--pink-macaron fr-badge--sm">Dossier à enjeu</p>
                  {/if}
                </td>
                <td>
                  {rattaché_au_régime_ae === null
                    ? "Non renseigné"
                    : rattaché_au_régime_ae
                      ? "oui"
                      : "non"}
                </td>
                <td>
                  <TagPhase {phase} size="SM"></TagPhase>
                  <IndicateurDelaiPhase {dossier}></IndicateurDelaiPhase>
                  {#if prochaine_action_attendue_par}
                    <p class="fr-tag fr-tag--sm fr-mt-1w">{prochaine_action_attendue_par}</p>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>

        {#if pageSelectors}
          <Pagination pageSelectors={pageSelectors} currentPage={pageSelectors[selectedPageNumber]}
          ></Pagination>
        {/if}
      </div>
    {:else}
      <div class="fr-mb-5w">
        Il n'y a pas encore de dossiers associés à votre groupe instructeurs.
        <br />
        Vous pouvez
        <a href={`${originDemarcheNumerique}/commencer/derogation-especes-protegees`}
          >créer des dossiers sur Démarche Numérique</a
        >. Et répondre un département correspondant à votre département ou région à la question
        "Dans quel département se localise majoritairement votre projet ?"
        <br />
        Le dossier sera alors visible ici après 10-15 minutes d'attente maximum
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  td,
  th {
    vertical-align: top;
  }

  th {
    min-width: 6rem;
  }

  h2 small {
    font-size: 0.7em;
    color: var(--text-mention-grey);
  }

  .filters {
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .active-filters {
    margin-bottom: 0.5rem;
  }

  .view-dossier {
    white-space: pre;
  }

  .modal-title {
    h1 {
      margin-bottom: 0.8rem;
    }
    h2 {
      margin-bottom: 0.6rem;
      font-size: 1.1rem;
    }
  }

  .modal-content {
    white-space: preserve;
  }
</style>
