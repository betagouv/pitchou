<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { SvelteSet, SvelteMap } from "svelte/reactivity";

  import FiltreParmiOptions from "./FiltreParmiOptions.svelte";
  import BarreRecherche from "./BarreRecherche.svelte";
  import TrisDeTh from "./TrisDeTh.svelte";
  import TagPhase from "$lib/components/TagPhase.svelte";
  import BoutonModale from "$lib/components/DSFR/BoutonModale.svelte";
  import Pagination from "$lib/components/DSFR/Pagination.svelte";
  import IndicateurDelaiPhase from "./IndicateurDelaiPhase.svelte";
  import {
    formatLocalisation,
    formatPorteurDeProjet,
    phases,
    prochaineActionAttenduePar,
  } from "$lib/dossier/affichageDossier.ts";
  import { createTextFilter } from "$lib/dossier/filtresTexte.ts";
  import {
    sortDossiersByColumnAlphabetically,
    sortDossiersByPhaseProchaineAction,
  } from "./triDossiers.ts";
  import { instructeurLeavesDossier, instructeurFollowsDossier } from "$lib/dossier/suiviDossier.ts";
  import { originDemarcheNumerique } from "@pitchou/common/constantes.ts";
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
    triIdSélectionné?: TableSort["id"] | undefined;
    filtresSélectionnés?: Partial<FiltersLocalStorage>;
    rememberTriFiltres: any;
  };

  let {
    email,
    dossiers = [],
    relationSuivis,
    activitésPrincipales: activitesPrincipales = [],
    triIdSélectionné: triIdSelectionne = undefined,
    filtresSélectionnés: filtresSelectionnes = {},
    rememberTriFiltres,
  }: Props = $props();

  //$inspect('dossiers', dossiers)
  //$inspect('filtresSélectionnés', filtresSélectionnés)
  $inspect("relationSuivis", relationSuivis);

  let dossiersIdSuivisParAucunInstructeur = $derived.by(() => {
    if (!relationSuivis) {
      return new SvelteSet();
    }

    // start with all the ids
    let dossierIdsSansSuivi = new Set(dossiers.map((d) => d.id));

    // remove the ids followed by at least one instructeur.rice
    for (const dossierIds of relationSuivis.values()) {
      dossierIdsSansSuivi = dossierIdsSansSuivi.difference(dossierIds);
    }

    return new SvelteSet(dossierIdsSansSuivi);
  });

  let dossiersSelectionnes: DossierSummary[] = $state([]);

  //$inspect('dossiersSelectionnés', dossiersSelectionnés)

  $effect(() => {
    console.log("relationSuivis effect", relationSuivis);
  });

  let dossierIdsSuivisParInstructeurActuel: Set<Dossier["id"]> = $derived(
    relationSuivis?.get(email) || new SvelteSet(),
  );

  $inspect("dossierIdsSuivisParInstructeurActuel", dossierIdsSuivisParInstructeurActuel);

  const trisActivitePrincipale = [
    {
      nom: "Trier de A à Z",
      trier() {
        dossiersSelectionnes = sortDossiersByColumnAlphabetically(
          dossiersSelectionnes,
          "activité_principale",
        );
      },
      id: "ActivitéPrincipale-AZ",
    },
    {
      nom: "Trier de Z à A",
      trier() {
        dossiersSelectionnes = sortDossiersByColumnAlphabetically(
          dossiersSelectionnes,
          "activité_principale",
        ).reverse();
      },
      id: "ActivitéPrincipale-ZA",
    },
  ];

  const trisNomProjet = [
    {
      nom: "Trier de A à Z",
      trier() {
        dossiersSelectionnes = sortDossiersByColumnAlphabetically(
          dossiersSelectionnes,
          "nom",
        );
      },
      id: "NomProjet-AZ",
    },
    {
      nom: "Trier de Z à A",
      trier() {
        dossiersSelectionnes = sortDossiersByColumnAlphabetically(
          dossiersSelectionnes,
          "nom",
        ).reverse();
      },
      id: "NomProjet-ZA",
    },
  ];

  const trisLocalisation = [
    {
      nom: "Trier de A à Z",
      trier() {
        dossiersSelectionnes = sortDossiersByColumnAlphabetically(
          dossiersSelectionnes,
          "localisation",
        );
      },
      id: "Localisation-AZ",
    },
    {
      nom: "Trier de Z à A",
      trier() {
        dossiersSelectionnes = sortDossiersByColumnAlphabetically(
          dossiersSelectionnes,
          "localisation",
        ).reverse();
      },
      id: "Localisation-ZA",
    },
  ];

  const trisPorteurDeProjet = [
    {
      nom: "Trier de A à Z",
      trier() {
        dossiersSelectionnes = sortDossiersByColumnAlphabetically(
          dossiersSelectionnes,
          "porteur de projet",
        );
      },
      id: "PorteurDeProjet-AZ",
    },
    {
      nom: "Trier de Z à A",
      trier() {
        dossiersSelectionnes = sortDossiersByColumnAlphabetically(
          dossiersSelectionnes,
          "porteur de projet",
        ).reverse();
      },
      id: "PorteurDeProjet-ZA",
    },
  ];

  const triPriorisationPhaseProchaineAction = [
    {
      nom: "Prioriser",
      trier() {
        dossiersSelectionnes = sortDossiersByPhaseProchaineAction(dossiersSelectionnes);
      },
      id: "Priorisation-PhaseAction",
    },
  ];

  const tris: TableSort[] = [
    ...trisActivitePrincipale,
    ...trisNomProjet,
    ...trisLocalisation,
    ...trisPorteurDeProjet,
    ...triPriorisationPhaseProchaineAction,
  ];

  // This line must be tolerant of triIdSélectionné being undefined or anything else
  let triSelectionne: TableSort | undefined = $state(
    tris.find((t) => t.id === triIdSelectionne) || triPriorisationPhaseProchaineAction[0],
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
    let nouveauxDossiersSelectionnes = dossiers;

    for (const filter of allFilters.values()) {
      nouveauxDossiersSelectionnes = nouveauxDossiersSelectionnes.filter(filter);
    }

    dossiersSelectionnes = nouveauxDossiersSelectionnes;

    if (triSelectionne) {
      triSelectionne.trier();
    }
  }

  function sendEvenementRechercherUnDossier() {
    const filtres: EvenementRechercheDossiersDetails["filtres"] = {
      suiviPar: {
        nombreSéléctionnées: instructeursSelectionnes.has(AUCUN_INSTRUCTEUR)
          ? instructeursSelectionnes.size - 1
          : instructeursSelectionnes.size,
        // do not count “(aucun instructeur)”
        nombreTotal: instructeursOptions.size - 1,
        inclusSoiMême: instructeursSelectionnes.has(email),
      },
      sansInstructeurice: instructeursSelectionnes.has(AUCUN_INSTRUCTEUR),
      phases: [...phasesSelectionnees],
      prochaineActionAttenduePar: [...prochainesActionsAttenduesParSelectionnes],
      activitésPrincipales: [...activitesPrincipalesSelectionnees],
    };

    if (textToSearch) {
      filtres.texte = textToSearch;
    }

    _sendEvenementRechercherUnDossier({ filtres, nombreRésultats: dossiersSelectionnes.length });
  }

  const phaseOptions: Set<DossierPhase> = new SvelteSet([...phases]);

  let phasesSelectionnees: Set<DossierPhase> = $state(
    untrack(() =>
      filtresSelectionnes.phases
        ? new SvelteSet(filtresSelectionnes.phases)
        : new SvelteSet(["Accompagnement amont", "Étude recevabilité DDEP", "Instruction"]),
    ),
  );

  //$inspect(phasesSélectionnées)

  function makeTagPhaseOnClick(phase: DossierPhase) {
    return () => {
      console.log("click on phase", phase);

      if (phasesSelectionnees.has(phase)) {
        phasesSelectionnees.delete(phase);
      } else {
        phasesSelectionnees.add(phase);
      }

      //phasesSélectionnées = phasesSélectionnées; // re-render

      filterDossiers();
      sendEvenementRechercherUnDossier();
    };
  }

  allFilters.set("phase", (dossier) => {
    return phasesSelectionnees.has(dossier.phase);
  });

  const PROCHAINE_ACTION_ATTENDUE_PAR_VIDE = "(vide)" as const;
  const prochainesActionsAttenduesParOptions = new SvelteSet([
    ...prochaineActionAttenduePar,
    PROCHAINE_ACTION_ATTENDUE_PAR_VIDE,
  ]);

  // @ts-ignore
  let prochainesActionsAttenduesParSelectionnes: Set<
    DossierProchaineActionAttenduePar | typeof PROCHAINE_ACTION_ATTENDUE_PAR_VIDE
  > = $state(
    untrack(() =>
      filtresSelectionnes["prochaine action attendue de"]
        ? new SvelteSet(filtresSelectionnes["prochaine action attendue de"])
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
      return prochainesActionsAttenduesParSelectionnes.has(PROCHAINE_ACTION_ATTENDUE_PAR_VIDE);
    }

    return prochainesActionsAttenduesParSelectionnes.has(
      dossier.prochaine_action_attendue_par as DossierProchaineActionAttenduePar,
    );
  });

  function filterByProchainesActionsAttenduesPar(
    _prochainesActionsAttenduesParSelectionnes: Set<
      DossierProchaineActionAttenduePar | typeof PROCHAINE_ACTION_ATTENDUE_PAR_VIDE
    >,
  ) {
    prochainesActionsAttenduesParSelectionnes = new SvelteSet(
      _prochainesActionsAttenduesParSelectionnes,
    );

    filterDossiers();
    sendEvenementRechercherUnDossier();
  }

  let prochainesActionsAttenduesParNonSelectionnes = $derived(
    prochainesActionsAttenduesParOptions.difference(prochainesActionsAttenduesParSelectionnes),
  );

  let textToSearch = $state(untrack(() => filtresSelectionnes.texte));

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

  let instructeursSelectionnes: Set<NonNullable<Personne["email"]> | typeof AUCUN_INSTRUCTEUR> =
    $state(
      untrack(
        () =>
          new SvelteSet(
            filtresSelectionnes.instructeurs
              ? filtresSelectionnes.instructeurs
              : instructeursOptions,
          ),
      ),
    );

  $inspect("instructeursSélectionnés", instructeursSelectionnes);

  allFilters.set("instructeurs", (dossier) => {
    if (!relationSuivis) return true;

    if (
      instructeursSelectionnes.has(AUCUN_INSTRUCTEUR) &&
      dossiersIdSuivisParAucunInstructeur &&
      dossiersIdSuivisParAucunInstructeur.has(dossier.id)
    ) {
      return true;
    }

    for (const instructeurEmail of instructeursSelectionnes) {
      const dossiersIdsSuivisParCetInstructeur = relationSuivis.get(instructeurEmail);
      if (dossiersIdsSuivisParCetInstructeur && dossiersIdsSuivisParCetInstructeur.has(dossier.id))
        return true;
    }

    return false;
  });

  function filterByInstructeurs(
    _instructeursSelectionnees: Set<NonNullable<Personne["email"]> | typeof AUCUN_INSTRUCTEUR>,
  ) {
    instructeursSelectionnes = new SvelteSet(_instructeursSelectionnees);

    filterDossiers();
    sendEvenementRechercherUnDossier();
  }

  function filterFollowedByMe() {
    filterByInstructeurs(new Set([email]));
    sendEvenement({ type: "afficherLesDossiersSuivis" });
  }

  let instructeursNonSelectionnes = $derived(
    instructeursOptions.difference(instructeursSelectionnes),
  );

  const AUCUNE_ACTIVITE_PRINCIPALE = "(aucune activité principale)" as const;
  // @ts-ignore
  const activitesPrincipalesOptions = $derived(
    new SvelteSet([AUCUNE_ACTIVITE_PRINCIPALE, ...activitesPrincipales]),
  );

  // @ts-ignore
  let activitesPrincipalesSelectionnees: Set<
    DossierDemarcheNumerique88444["Activité principale"] | typeof AUCUNE_ACTIVITE_PRINCIPALE
  > = $state(
    untrack(
      () =>
        new SvelteSet(
          filtresSelectionnes.activitésPrincipales
            ? filtresSelectionnes.activitésPrincipales
            : activitesPrincipalesOptions,
        ),
    ),
  );

  allFilters.set("activité principale", (dossier) => {
    if (
      !dossier.activité_principale ||
      !activitesPrincipalesOptions.has(dossier.activité_principale)
    )
      return activitesPrincipalesSelectionnees.has(AUCUNE_ACTIVITE_PRINCIPALE);

    return activitesPrincipalesSelectionnees.has(dossier.activité_principale);
  });

  function filterByActivitePrincipale(
    _activitesPrincipalesSelectionnees: Set<DossierDemarcheNumerique88444["Activité principale"]>,
  ) {
    activitesPrincipalesSelectionnees = new Set(_activitesPrincipalesSelectionnees);

    filterDossiers();
    sendEvenementRechercherUnDossier();
  }

  let activitesPrincipalesNonSelectionnees = $derived(
    activitesPrincipalesOptions.difference(activitesPrincipalesSelectionnees),
  );

  $effect(() => {
    rememberTriFiltres(triSelectionne, {
      phases: phasesSelectionnees,
      "prochaine action attendue de": prochainesActionsAttenduesParSelectionnes,
      instructeurs: instructeursSelectionnes,
      activitésPrincipales: activitesPrincipalesSelectionnees,
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
      if (dossiersSelectionnes.length >= DOSSIERS_PER_PAGE * 2 + 1) {
        const pageCount = Math.ceil(dossiersSelectionnes.length / DOSSIERS_PER_PAGE);

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

  let displayedDossiers: typeof dossiersSelectionnes = $derived.by(() => {
    if (!pageSelectors) return dossiersSelectionnes;
    else {
      return dossiersSelectionnes.slice(
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

  function instructeurActuelSuitDossier(id: Dossier["id"]) {
    return instructeurFollowsDossier(email, id);
  }

  function instructeurActuelLaisseDossier(id: Dossier["id"]) {
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
        titre="Rechercher par texte libre"
        mettreÀJourTexteRecherche={filterByText}
      />

      <div class="fr-mb-2w">
        <strong>Filtrer par phase</strong>
        {#each phaseOptions as phase}
          <TagPhase
            {phase}
            classes={["fr-mr-1w"]}
            onClick={makeTagPhaseOnClick(phase)}
            ariaPressed={phasesSelectionnees.has(phase)}
          ></TagPhase>
        {/each}
      </div>

      <div class="filtres">
        <FiltreParmiOptions
          titre="Filtrer par activité principale"
          options={activitesPrincipalesOptions}
          optionsSélectionnées={activitesPrincipalesSelectionnees}
          mettreÀJourOptionsSélectionnées={filterByActivitePrincipale}
        />
        <FiltreParmiOptions
          titre="Filtrer par prochaine action attendue par"
          options={prochainesActionsAttenduesParOptions}
          optionsSélectionnées={prochainesActionsAttenduesParSelectionnes}
          mettreÀJourOptionsSélectionnées={filterByProchainesActionsAttenduesPar}
        />
        {#if instructeursOptions && instructeursOptions.size >= 2}
          <FiltreParmiOptions
            titre="Filtrer par instructeur suivant le dossier"
            options={instructeursOptions}
            optionsSélectionnées={instructeursSelectionnes}
            mettreÀJourOptionsSélectionnées={filterByInstructeurs}
          />
        {/if}
      </div>

      <section class="filtres-actifs fr-mb-1w">
        <div class="fr-mb-1w">
          <span>Dossiers suivis par&nbsp;:</span>
          {#if instructeursNonSelectionnes.size === 0}
            <strong>Toustes</strong>
          {:else if instructeursNonSelectionnes.size === 1 && instructeursNonSelectionnes.has(AUCUN_INSTRUCTEUR)}
            <strong>Au moins un.e instructeur.rice</strong>
          {:else if instructeursNonSelectionnes.size <= 2}
            <strong>Toustes sauf</strong>
            {#each [...instructeursNonSelectionnes] as instructeur}
              <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                {instructeur}
                {#if instructeur === email}(moi){/if}
              </span>
            {/each}
          {:else}
            {#each [...instructeursSelectionnes] as instructeur}
              <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                {instructeur}
                {#if instructeur === email}(moi){/if}
              </span>
            {/each}
          {/if}

          {#if instructeursSelectionnes.size !== 1 || !instructeursSelectionnes.has(email)}
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
          {#if prochainesActionsAttenduesParNonSelectionnes.size === 0}
            <strong>Toutes options</strong>
          {:else if prochainesActionsAttenduesParNonSelectionnes.size <= 2}
            <strong>Toutes options sauf</strong>
            {#each [...prochainesActionsAttenduesParNonSelectionnes] as prochaineActionAttenduePar}
              <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                {prochaineActionAttenduePar}
              </span>
            {/each}
          {:else}
            {#each [...prochainesActionsAttenduesParSelectionnes] as prochaineActionAttenduePar}
              <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                {prochaineActionAttenduePar}
              </span>
            {/each}
          {/if}
        </div>

        <div class="fr-mb-1w">
          <span>Activités principales&nbsp;:</span>
          {#if activitesPrincipalesNonSelectionnees.size === 0}
            <strong>Toutes</strong>
          {:else if activitesPrincipalesNonSelectionnees.size <= 4}
            <strong>Toutes sauf</strong>
            {#each [...activitesPrincipalesNonSelectionnees] as activitePrincipale}
              <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                {activitePrincipale}
              </span>
            {/each}
          {:else}
            {#each [...activitesPrincipalesSelectionnees] as activitePrincipale}
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
        {dossiersSelectionnes.length}<small>/{dossiers.length}</small> dossiers sélectionnés
      </h2>

      <div class="fr-table fr-table--bordered">
        <table class="fr-mb-2w">
          <thead>
            <tr>
              <th>Voir le dossier</th>
              <th>
                Localisation
                <TrisDeTh tris={trisLocalisation} bind:triSélectionné={triSelectionne} />
              </th>
              <th>
                Activité principale
                <TrisDeTh tris={trisActivitePrincipale} bind:triSélectionné={triSelectionne} />
              </th>
              <th>
                Porteur de projet
                <TrisDeTh tris={trisPorteurDeProjet} bind:triSélectionné={triSelectionne} />
              </th>
              <th>
                Nom du projet
                <TrisDeTh tris={trisNomProjet} bind:triSélectionné={triSelectionne} />
              </th>
              <th>Enjeux</th>
              <th>Rattaché au régime AE</th>
              <th>
                Phase<br />
                <br />
                Prochaine action attendue de
                <TrisDeTh
                  tris={triPriorisationPhaseProchaineAction}
                  bind:triSélectionné={triSelectionne}
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
                    class="fr-btn voir-le-dossier fr-btn--sm fr-btn--icon-left fr-icon-eye-line fr-mb-1w"
                    href={`/dossier/${id}`}>Voir le dossier</a
                  >

                  {#if commentaire_libre && commentaire_libre.trim().length >= 1}
                    {@const dsfrModaleId = `dsfr-modale-${id}`}
                    <BoutonModale id={dsfrModaleId}>
                      {#snippet boutonOuvrir()}
                        <button
                          class="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-chat-3-line"
                          data-fr-opened="false"
                          aria-controls={dsfrModaleId}
                        >
                          Commentaire
                        </button>
                      {/snippet}
                      {#snippet contenu()}
                        <header class="titre-modale">
                          <h1 class="fr-modal__title">
                            Commentaire dossier {nom}
                          </h1>
                          <h2 class="fr-modal__title">
                            {formatPorteurDeProjet(dossier)}
                            &nbsp;-&nbsp;
                            {formatLocalisation({ communes, départements, régions })}
                          </h2>
                        </header>

                        <div class="contenu-modale">
                          {commentaire_libre}
                        </div>
                      {/snippet}
                    </BoutonModale>
                  {/if}

                  {#if dossierIdsSuivisParInstructeurActuel.has(id)}
                    <button
                      onclick={() => instructeurActuelLaisseDossier(id)}
                      class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-star-fill fr-btn--icon-left"
                      >Ne plus suivre</button
                    >
                  {:else}
                    <button
                      onclick={() => instructeurActuelSuitDossier(id)}
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
                  <TagPhase {phase} taille="SM"></TagPhase>
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

  .filtres {
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .filtres-actifs {
    margin-bottom: 0.5rem;
  }

  .voir-le-dossier {
    white-space: pre;
  }

  .titre-modale {
    h1 {
      margin-bottom: 0.8rem;
    }
    h2 {
      margin-bottom: 0.6rem;
      font-size: 1.1rem;
    }
  }

  .contenu-modale {
    white-space: preserve;
  }
</style>
