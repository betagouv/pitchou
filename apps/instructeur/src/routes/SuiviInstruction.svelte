<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { SvelteSet, SvelteMap } from "svelte/reactivity";

  import Squelette from "$lib/components/Squelette.svelte";
  import FiltreParmiOptions from "./FiltreParmiOptions.svelte";
  import BarreRecherche from "./BarreRecherche.svelte";
  import TrisDeTh from "./TrisDeTh.svelte";
  import TagPhase from "$lib/components/TagPhase.svelte";
  import TagEnjeu from "./TagEnjeu.svelte";
  import BoutonModale from "$lib/components/DSFR/BoutonModale.svelte";
  import Pagination from "$lib/components/DSFR/Pagination.svelte";
  import IndicateurDélaiPhase from "./IndicateurDélaiPhase.svelte";
  import {
    formatLocalisation,
    formatPorteurDeProjet,
    phases,
    prochaineActionAttenduePar,
  } from "$lib/dossier/affichageDossier.ts";
  import { créerFiltreTexte } from "$lib/dossier/filtresTexte.ts";
  import {
    trierDossiersParOrdreAlphabétiqueColonne,
    trierDossiersParPhaseProchaineAction,
  } from "./triDossiers.ts";
  import { instructeurLaisseDossier, instructeurSuitDossier } from "$lib/dossier/suiviDossier.ts";
  import { originDémarcheNumérique } from "@pitchou/common/constantes.ts";
  import {
    envoyerÉvènement,
    envoyerÉvènementRechercherUnDossier as _envoyerÉvènementRechercherUnDossier,
  } from "$lib/shared/aarri.ts";

  import type { ComponentProps } from "svelte";
  import type { DossierDemarcheNumerique88444 } from "@pitchou/types/démarche-numérique/Démarche88444.ts";
  import type {
    DossierRésumé,
    DossierPhase,
    DossierProchaineActionAttenduePar,
  } from "@pitchou/types/API_Pitchou.ts";
  import type { PitchouState } from "$lib/state/store.svelte.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";
  import type Personne from "@pitchou/types/database/public/Personne.ts";
  import type { FiltresLocalStorage, TriTableau } from "@pitchou/types/interfaceUtilisateur.ts";
  import type { ÉvènementRechercheDossiersDétails } from "@pitchou/types/évènement.d.ts";

  type Props = {
    email: NonNullable<ComponentProps<typeof Squelette>["email"]>;
    erreurs: ComponentProps<typeof Squelette>["erreurs"];
    résultatsSynchronisationDS88444: ComponentProps<
      typeof Squelette
    >["résultatsSynchronisationDS88444"];
    dossiers?: DossierRésumé[];
    relationSuivis: PitchouState["relationSuivis"];
    activitésPrincipales?: string[] | undefined;
    triIdSélectionné?: TriTableau["id"] | undefined;
    filtresSélectionnés?: Partial<FiltresLocalStorage>;
    rememberTriFiltres: any;
  };

  let {
    email,
    erreurs,
    résultatsSynchronisationDS88444,
    dossiers = [],
    relationSuivis,
    activitésPrincipales = [],
    triIdSélectionné = undefined,
    filtresSélectionnés = {},
    rememberTriFiltres,
  }: Props = $props();

  //$inspect('dossiers', dossiers)
  //$inspect('filtresSélectionnés', filtresSélectionnés)
  $inspect("relationSuivis", relationSuivis);

  let dossiersIdSuivisParAucunInstructeur = $derived.by(() => {
    if (!relationSuivis) {
      return new SvelteSet();
    }

    // démarrer avec tous les ids
    let dossierIdsSansSuivi = new Set(dossiers.map((d) => d.id));

    // retirer les ids suivis par au moins un.e instructeur.rice
    for (const dossierIds of relationSuivis.values()) {
      dossierIdsSansSuivi = dossierIdsSansSuivi.difference(dossierIds);
    }

    return new SvelteSet(dossierIdsSansSuivi);
  });

  let dossiersSelectionnés: DossierRésumé[] = $state([]);

  //$inspect('dossiersSelectionnés', dossiersSelectionnés)

  $effect(() => {
    console.log("relationSuivis effect", relationSuivis);
  });

  let dossierIdsSuivisParInstructeurActuel: Set<Dossier["id"]> = $derived(
    relationSuivis?.get(email) || new SvelteSet(),
  );

  $inspect("dossierIdsSuivisParInstructeurActuel", dossierIdsSuivisParInstructeurActuel);

  const trisActivitéPrincipale = [
    {
      nom: "Trier de A à Z",
      trier() {
        dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(
          dossiersSelectionnés,
          "activité_principale",
        );
      },
      id: "ActivitéPrincipale-AZ",
    },
    {
      nom: "Trier de Z à A",
      trier() {
        dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(
          dossiersSelectionnés,
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
        dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(
          dossiersSelectionnés,
          "nom",
        );
      },
      id: "NomProjet-AZ",
    },
    {
      nom: "Trier de Z à A",
      trier() {
        dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(
          dossiersSelectionnés,
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
        dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(
          dossiersSelectionnés,
          "localisation",
        );
      },
      id: "Localisation-AZ",
    },
    {
      nom: "Trier de Z à A",
      trier() {
        dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(
          dossiersSelectionnés,
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
        dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(
          dossiersSelectionnés,
          "porteur de projet",
        );
      },
      id: "PorteurDeProjet-AZ",
    },
    {
      nom: "Trier de Z à A",
      trier() {
        dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(
          dossiersSelectionnés,
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
        dossiersSelectionnés = trierDossiersParPhaseProchaineAction(dossiersSelectionnés);
      },
      id: "Priorisation-PhaseAction",
    },
  ];

  const tris: TriTableau[] = [
    ...trisActivitéPrincipale,
    ...trisNomProjet,
    ...trisLocalisation,
    ...trisPorteurDeProjet,
    ...triPriorisationPhaseProchaineAction,
  ];

  // Cette ligne doit être tolérante à ce que triIdSélectionné soit undefined ou n'importe quoi
  let triSélectionné: TriTableau | undefined = $state(
    tris.find((t) => t.id === triIdSélectionné) || triPriorisationPhaseProchaineAction[0],
  );

  type CléFiltre =
    | "phase"
    | "prochaine action attendue de"
    | "texte"
    | "suivis"
    | "instructeurs"
    | "activité principale";
  const tousLesFiltres = new SvelteMap<CléFiltre, (d: DossierRésumé) => boolean>();

  function filtrerDossiers() {
    let nouveauxDossiersSélectionnés = dossiers;

    for (const filtre of tousLesFiltres.values()) {
      nouveauxDossiersSélectionnés = nouveauxDossiersSélectionnés.filter(filtre);
    }

    dossiersSelectionnés = nouveauxDossiersSélectionnés;

    if (triSélectionné) {
      triSélectionné.trier();
    }
  }

  function envoyerÉvènementRechercherUnDossier() {
    const filtres: ÉvènementRechercheDossiersDétails["filtres"] = {
      suiviPar: {
        nombreSéléctionnées: instructeursSélectionnés.has(AUCUN_INSTRUCTEUR)
          ? instructeursSélectionnés.size - 1
          : instructeursSélectionnés.size,
        // ne pas compter “(aucun instructeur)”
        nombreTotal: instructeursOptions.size - 1,
        inclusSoiMême: instructeursSélectionnés.has(email),
      },
      sansInstructeurice: instructeursSélectionnés.has(AUCUN_INSTRUCTEUR),
      phases: [...phasesSélectionnées],
      prochaineActionAttenduePar: [...prochainesActionsAttenduesParSélectionnés],
      activitésPrincipales: [...activitésPrincipalesSélectionnées],
    };

    if (texteÀChercher) {
      filtres.texte = texteÀChercher;
    }

    _envoyerÉvènementRechercherUnDossier({ filtres, nombreRésultats: dossiersSelectionnés.length });
  }

  const phaseOptions: Set<DossierPhase> = new SvelteSet([...phases]);

  let phasesSélectionnées: Set<DossierPhase> = $state(
    untrack(() =>
      filtresSélectionnés.phases
        ? new SvelteSet(filtresSélectionnés.phases)
        : new SvelteSet(["Accompagnement amont", "Étude recevabilité DDEP", "Instruction"]),
    ),
  );

  //$inspect(phasesSélectionnées)

  function makeTagPhaseOnClick(phase: DossierPhase) {
    return () => {
      console.log("click on phase", phase);

      if (phasesSélectionnées.has(phase)) {
        phasesSélectionnées.delete(phase);
      } else {
        phasesSélectionnées.add(phase);
      }

      //phasesSélectionnées = phasesSélectionnées; // re-render

      filtrerDossiers();
      envoyerÉvènementRechercherUnDossier();
    };
  }

  tousLesFiltres.set("phase", (dossier) => {
    return phasesSélectionnées.has(dossier.phase);
  });

  const PROCHAINE_ACTION_ATTENDUE_PAR_VIDE = "(vide)" as const;
  const prochainesActionsAttenduesParOptions = new SvelteSet([
    ...prochaineActionAttenduePar,
    PROCHAINE_ACTION_ATTENDUE_PAR_VIDE,
  ]);

  // @ts-ignore
  let prochainesActionsAttenduesParSélectionnés: Set<
    DossierProchaineActionAttenduePar | typeof PROCHAINE_ACTION_ATTENDUE_PAR_VIDE
  > = $state(
    untrack(() =>
      filtresSélectionnés["prochaine action attendue de"]
        ? new SvelteSet(filtresSélectionnés["prochaine action attendue de"])
        : new SvelteSet(prochainesActionsAttenduesParOptions),
    ),
  );

  tousLesFiltres.set("prochaine action attendue de", (dossier) => {
    if (
      !dossier.prochaine_action_attendue_par ||
      !prochainesActionsAttenduesParOptions.has(
        dossier.prochaine_action_attendue_par as DossierProchaineActionAttenduePar,
      )
    ) {
      return prochainesActionsAttenduesParSélectionnés.has(PROCHAINE_ACTION_ATTENDUE_PAR_VIDE);
    }

    return prochainesActionsAttenduesParSélectionnés.has(
      dossier.prochaine_action_attendue_par as DossierProchaineActionAttenduePar,
    );
  });

  function filtrerParProchainesActionsAttenduesPar(
    _prochainesActionsAttenduesParSélectionnés: Set<
      DossierProchaineActionAttenduePar | typeof PROCHAINE_ACTION_ATTENDUE_PAR_VIDE
    >,
  ) {
    prochainesActionsAttenduesParSélectionnés = new SvelteSet(
      _prochainesActionsAttenduesParSélectionnés,
    );

    filtrerDossiers();
    envoyerÉvènementRechercherUnDossier();
  }

  let prochainesActionsAttenduesParNonSélectionnés = $derived(
    prochainesActionsAttenduesParOptions.difference(prochainesActionsAttenduesParSélectionnés),
  );

  let texteÀChercher = $state(untrack(() => filtresSélectionnés.texte));

  function ajouterFiltreTexte(_texteÀChercher: string) {
    texteÀChercher = _texteÀChercher.trim();
    tousLesFiltres.set("texte", créerFiltreTexte(texteÀChercher, dossiers));
  }

  function filtrerParTexte(_texteÀChercher: string) {
    ajouterFiltreTexte(_texteÀChercher);

    filtrerDossiers();
    envoyerÉvènementRechercherUnDossier();
  }

  function onSupprimerFiltreTexte(e: Event) {
    e.preventDefault();

    tousLesFiltres.delete("texte");

    texteÀChercher = "";
    filtrerDossiers();
  }

  const AUCUN_INSTRUCTEUR = "(aucun instructeur)" as const;
  const instructeurEmailOptions = $derived(
    (relationSuivis && Array.from(relationSuivis.keys()).sort()) || [],
  );

  const instructeursOptions: Set<NonNullable<Personne["email"]> | typeof AUCUN_INSTRUCTEUR> =
    $derived(new SvelteSet([email, AUCUN_INSTRUCTEUR, ...instructeurEmailOptions]));

  //$inspect('')

  let instructeursSélectionnés: Set<NonNullable<Personne["email"]> | typeof AUCUN_INSTRUCTEUR> =
    $state(
      untrack(
        () =>
          new SvelteSet(
            filtresSélectionnés.instructeurs
              ? filtresSélectionnés.instructeurs
              : instructeursOptions,
          ),
      ),
    );

  $inspect("instructeursSélectionnés", instructeursSélectionnés);

  tousLesFiltres.set("instructeurs", (dossier) => {
    if (!relationSuivis) return true;

    if (
      instructeursSélectionnés.has(AUCUN_INSTRUCTEUR) &&
      dossiersIdSuivisParAucunInstructeur &&
      dossiersIdSuivisParAucunInstructeur.has(dossier.id)
    ) {
      return true;
    }

    for (const instructeurEmail of instructeursSélectionnés) {
      const dossiersIdsSuivisParCetInstructeur = relationSuivis.get(instructeurEmail);
      if (dossiersIdsSuivisParCetInstructeur && dossiersIdsSuivisParCetInstructeur.has(dossier.id))
        return true;
    }

    return false;
  });

  function filtrerParInstructeurs(
    _instructeursSélectionnées: Set<NonNullable<Personne["email"]> | typeof AUCUN_INSTRUCTEUR>,
  ) {
    instructeursSélectionnés = new SvelteSet(_instructeursSélectionnées);

    filtrerDossiers();
    envoyerÉvènementRechercherUnDossier();
  }

  function filtrerSuivisParMoi() {
    filtrerParInstructeurs(new Set([email]));
    envoyerÉvènement({ type: "afficherLesDossiersSuivis" });
  }

  let instructeursNonSélectionnés = $derived(
    instructeursOptions.difference(instructeursSélectionnés),
  );

  const AUCUNE_ACTIVITÉ_PRINCIPALE = "(aucune activité principale)" as const;
  // @ts-ignore
  const activitésPrincipalesOptions = $derived(
    new SvelteSet([AUCUNE_ACTIVITÉ_PRINCIPALE, ...activitésPrincipales]),
  );

  // @ts-ignore
  let activitésPrincipalesSélectionnées: Set<
    DossierDemarcheNumerique88444["Activité principale"] | typeof AUCUNE_ACTIVITÉ_PRINCIPALE
  > = $state(
    untrack(
      () =>
        new SvelteSet(
          filtresSélectionnés.activitésPrincipales
            ? filtresSélectionnés.activitésPrincipales
            : activitésPrincipalesOptions,
        ),
    ),
  );

  tousLesFiltres.set("activité principale", (dossier) => {
    if (
      !dossier.activité_principale ||
      !activitésPrincipalesOptions.has(dossier.activité_principale)
    )
      return activitésPrincipalesSélectionnées.has(AUCUNE_ACTIVITÉ_PRINCIPALE);

    return activitésPrincipalesSélectionnées.has(dossier.activité_principale);
  });

  function filtrerParActivitéPrincipale(
    _activitésPrincipalesSélectionnées: Set<DossierDemarcheNumerique88444["Activité principale"]>,
  ) {
    activitésPrincipalesSélectionnées = new Set(_activitésPrincipalesSélectionnées);

    filtrerDossiers();
    envoyerÉvènementRechercherUnDossier();
  }

  let activitésPrincipalesNonSélectionnées = $derived(
    activitésPrincipalesOptions.difference(activitésPrincipalesSélectionnées),
  );

  $effect(() => {
    rememberTriFiltres(triSélectionné, {
      phases: phasesSélectionnées,
      "prochaine action attendue de": prochainesActionsAttenduesParSélectionnés,
      instructeurs: instructeursSélectionnés,
      activitésPrincipales: activitésPrincipalesSélectionnées,
      texte: texteÀChercher,
    });
  });

  // Pagination du tableau de suivi
  type SelectionneurPage = () => void;

  const NOMBRE_DOSSIERS_PAR_PAGE = 20;

  // numéro de page qui correspond à celui affiché, donc commençant à 1
  let numéroPageSelectionnée: number = $state(1);

  let selectionneursPage: [undefined, ...rest: SelectionneurPage[]] | undefined = $derived.by(
    () => {
      if (dossiersSelectionnés.length >= NOMBRE_DOSSIERS_PAR_PAGE * 2 + 1) {
        const nombreDePages = Math.ceil(dossiersSelectionnés.length / NOMBRE_DOSSIERS_PAR_PAGE);

        return [
          undefined,
          ...[...Array(nombreDePages).keys()].map((i) => () => {
            console.log("sélection de la page", i + 1);
            numéroPageSelectionnée = i + 1;
          }),
        ];
      }

      return undefined;
    },
  );

  $effect(() => {
    if (selectionneursPage) numéroPageSelectionnée = 1;
  });

  let dossiersAffichés: typeof dossiersSelectionnés = $derived.by(() => {
    if (!selectionneursPage) return dossiersSelectionnés;
    else {
      return dossiersSelectionnés.slice(
        NOMBRE_DOSSIERS_PAR_PAGE * (numéroPageSelectionnée - 1),
        NOMBRE_DOSSIERS_PAR_PAGE * numéroPageSelectionnée,
      );
    }
  });

  //$inspect('dossiersAffichés', dossiersAffichés)

  // filtrage avec les filtres initiaux
  onMount(async () => {
    if (texteÀChercher) {
      ajouterFiltreTexte(texteÀChercher);
    }

    filtrerDossiers();
  });

  function instructeurActuelSuitDossier(id: Dossier["id"]) {
    return instructeurSuitDossier(email, id);
  }

  function instructeurActuelLaisseDossier(id: Dossier["id"]) {
    return instructeurLaisseDossier(email, id);
  }
</script>

<Squelette {email} {erreurs} {résultatsSynchronisationDS88444} title="Suivi instruction">
  <div class="fr-grid-row fr-mt-4w fr-grid-row--center">
    <div class="fr-col">
      <h1>
        Tableau de suivi instruction <abbr title="Demandes de Dérogation Espèces Protégées"
          >DDEP</abbr
        >
      </h1>

      {#if dossiers.length >= 1}
        <BarreRecherche
          titre="Rechercher par texte libre"
          mettreÀJourTexteRecherche={filtrerParTexte}
        />

        <div class="fr-mb-2w">
          <strong>Filtrer par phase</strong>
          {#each phaseOptions as phase}
            <TagPhase
              {phase}
              classes={["fr-mr-1w"]}
              onClick={makeTagPhaseOnClick(phase)}
              ariaPressed={phasesSélectionnées.has(phase)}
            ></TagPhase>
          {/each}
        </div>

        <div class="filtres">
          <FiltreParmiOptions
            titre="Filtrer par activité principale"
            options={activitésPrincipalesOptions}
            optionsSélectionnées={activitésPrincipalesSélectionnées}
            mettreÀJourOptionsSélectionnées={filtrerParActivitéPrincipale}
          />
          <FiltreParmiOptions
            titre="Filtrer par prochaine action attendue par"
            options={prochainesActionsAttenduesParOptions}
            optionsSélectionnées={prochainesActionsAttenduesParSélectionnés}
            mettreÀJourOptionsSélectionnées={filtrerParProchainesActionsAttenduesPar}
          />
          {#if instructeursOptions && instructeursOptions.size >= 2}
            <FiltreParmiOptions
              titre="Filtrer par instructeur suivant le dossier"
              options={instructeursOptions}
              optionsSélectionnées={instructeursSélectionnés}
              mettreÀJourOptionsSélectionnées={filtrerParInstructeurs}
            />
          {/if}
        </div>

        <section class="filtres-actifs fr-mb-1w">
          <div class="fr-mb-1w">
            <span>Dossiers suivis par&nbsp;:</span>
            {#if instructeursNonSélectionnés.size === 0}
              <strong>Toustes</strong>
            {:else if instructeursNonSélectionnés.size === 1 && instructeursNonSélectionnés.has(AUCUN_INSTRUCTEUR)}
              <strong>Au moins un.e instructeur.rice</strong>
            {:else if instructeursNonSélectionnés.size <= 2}
              <strong>Toustes sauf</strong>
              {#each [...instructeursNonSélectionnés] as instructeur}
                <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                  {instructeur}
                  {#if instructeur === email}(moi){/if}
                </span>
              {/each}
            {:else}
              {#each [...instructeursSélectionnés] as instructeur}
                <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                  {instructeur}
                  {#if instructeur === email}(moi){/if}
                </span>
              {/each}
            {/if}

            {#if instructeursSélectionnés.size !== 1 || !instructeursSélectionnés.has(email)}
              <button
                class="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-todo-line"
                onclick={filtrerSuivisParMoi}
              >
                Suivi par moi
              </button>
            {/if}
          </div>

          <div class="fr-mb-1w">
            <span>Prochaine action attendue par&nbsp;:</span>
            {#if prochainesActionsAttenduesParNonSélectionnés.size === 0}
              <strong>Toutes options</strong>
            {:else if prochainesActionsAttenduesParNonSélectionnés.size <= 2}
              <strong>Toutes options sauf</strong>
              {#each [...prochainesActionsAttenduesParNonSélectionnés] as prochaineActionAttenduePar}
                <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                  {prochaineActionAttenduePar}
                </span>
              {/each}
            {:else}
              {#each [...prochainesActionsAttenduesParSélectionnés] as prochaineActionAttenduePar}
                <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                  {prochaineActionAttenduePar}
                </span>
              {/each}
            {/if}
          </div>

          <div class="fr-mb-1w">
            <span>Activités principales&nbsp;:</span>
            {#if activitésPrincipalesNonSélectionnées.size === 0}
              <strong>Toutes</strong>
            {:else if activitésPrincipalesNonSélectionnées.size <= 4}
              <strong>Toutes sauf</strong>
              {#each [...activitésPrincipalesNonSélectionnées] as activitéPrincipale}
                <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                  {activitéPrincipale}
                </span>
              {/each}
            {:else}
              {#each [...activitésPrincipalesSélectionnées] as activitéPrincipale}
                <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                  {activitéPrincipale}
                </span>
              {/each}
            {/if}
          </div>

          {#if texteÀChercher}
            <div class="fr-mb-1w">
              <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v"
                >Texte cherché : {texteÀChercher}</span
              >
              <button onclick={onSupprimerFiltreTexte}>✖</button>
            </div>
          {/if}
        </section>

        <h2 class="fr-mt-2w">
          {dossiersSelectionnés.length}<small>/{dossiers.length}</small> dossiers sélectionnés
        </h2>

        <div class="fr-table fr-table--bordered">
          <table class="fr-mb-2w">
            <thead>
              <tr>
                <th>Voir le dossier</th>
                <th>
                  Localisation
                  <TrisDeTh tris={trisLocalisation} bind:triSélectionné />
                </th>
                <th>
                  Activité principale
                  <TrisDeTh tris={trisActivitéPrincipale} bind:triSélectionné />
                </th>
                <th>
                  Porteur de projet
                  <TrisDeTh tris={trisPorteurDeProjet} bind:triSélectionné />
                </th>
                <th>
                  Nom du projet
                  <TrisDeTh tris={trisNomProjet} bind:triSélectionné />
                </th>
                <th>Enjeux</th>
                <th>Rattaché au régime AE</th>
                <th>
                  Phase<br />
                  <br />
                  Prochaine action attendue de
                  <TrisDeTh tris={triPriorisationPhaseProchaineAction} bind:triSélectionné />
                </th>
              </tr>
            </thead>
            <tbody>
              {#each dossiersAffichés as dossier (dossier)}
                {@const {
                  id,
                  nom,
                  communes,
                  départements,
                  régions,
                  activité_principale,
                  rattaché_au_régime_ae,
                  enjeu_politique,
                  enjeu_écologique,
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
                    {#if enjeu_politique}
                      <TagEnjeu enjeu="politique" taille="SM" classes={["fr-mb-1w"]}></TagEnjeu>
                    {/if}

                    {#if enjeu_écologique}
                      <TagEnjeu enjeu="écologique" taille="SM" classes={["fr-mb-1w"]}></TagEnjeu>
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
                    <IndicateurDélaiPhase {dossier}></IndicateurDélaiPhase>
                    {#if prochaine_action_attendue_par}
                      <p class="fr-tag fr-tag--sm fr-mt-1w">{prochaine_action_attendue_par}</p>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>

          {#if selectionneursPage}
            <Pagination
              {selectionneursPage}
              pageActuelle={selectionneursPage[numéroPageSelectionnée]}
            ></Pagination>
          {/if}
        </div>
      {:else}
        <div class="fr-mb-5w">
          Il n'y a pas encore de dossiers associés à votre groupe instructeurs.
          <br />
          Vous pouvez
          <a href={`${originDémarcheNumérique}/commencer/derogation-especes-protegees`}
            >créer des dossiers sur Démarche Numérique</a
          >. Et répondre un département correspondant à votre département ou région à la question
          "Dans quel département se localise majoritairement votre projet ?"
          <br />
          Le dossier sera alors visible ici après 10-15 minutes d'attente maximum
        </div>
      {/if}
    </div>
  </div>
</Squelette>

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
