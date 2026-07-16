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
  import { phases as toutesLesPhases } from "$lib/dossier/affichageDossier.ts";

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

  const NOMBRE_DOSSIERS_PAR_PAGE = 10;

  type CleFiltre = "texte" | "sansInstructeurice" | "phase" | "actionInstructeur" | "nouveauté";
  const tousLesFiltres = new SvelteMap<CleFiltre, (d: DossierSummary) => boolean>();

  const dossiersFiltres = $derived.by(() => {
    let resultat = [...dossiers];

    for (const filtre of tousLesFiltres.values()) {
      resultat = resultat.filter(filtre);
    }

    return resultat;
  });

  function sendEvenementRechercherUnDossier() {
    const filtres: EvenementRechercheDossiersDetails["filtres"] = {
      sansInstructeurice: tousLesFiltres.has("sansInstructeurice"),
      nouveauté: tousLesFiltres.has("nouveauté"),
    };

    if (texteAChercher) {
      filtres.texte = texteAChercher;
    }

    if (tousLesFiltres.has("phase") && phaseSelectionnee) {
      filtres.phases = [phaseSelectionnee];
    }

    if (tousLesFiltres.has("actionInstructeur")) {
      filtres.prochaineActionAttenduePar = ["Instructeur"];
    }

    _sendEvenementRechercherUnDossier({ filtres, nombreRésultats: dossiersFiltres.length });
  }

  let numeroDeLaPageSelectionnee = $state(1);

  let statusMessage = $state("");

  let titrePageElement: HTMLHeadingElement | undefined = $state();

  /** Total number of pages */
  const nombreDePages = $derived.by(() => {
    if (dossiersFiltres.length === 0) return 1;
    return Math.ceil(dossiersFiltres.length / NOMBRE_DOSSIERS_PAR_PAGE);
  });

  /** Text to display for the page */
  const textePage = $derived.by(() => {
    if (tousLesFiltres.has("texte") && texteAChercher && texteAChercher.trim() !== "") {
      return `Résultats de recherche pour «${texteAChercher}» : Page ${numeroDeLaPageSelectionnee} sur ${nombreDePages}`;
    }
    return `Page ${numeroDeLaPageSelectionnee} sur ${nombreDePages}`;
  });

  /**
   * Updates the aria-live message with the number of filtered dossiers
   */
  function mettreAJourMessageFiltres() {
    const nombreFiltres = dossiersFiltres.length;
    const nombreTotal = dossiers.length;

    statusMessage = `${nombreFiltres} dossiers affichés sur ${nombreTotal}`;
    setTimeout(() => {
      statusMessage = "";
    }, 400);
  }

  let texteAChercher: string | undefined = $state();

  let phaseSelectionnee: DossierPhase | undefined = $state();

  const dossierIdsSuivisParInstructeurActuel = $derived(relationSuivis?.get(email) ?? new Set());

  type SelectionneurPage = () => void;
  let selectionneursPage: undefined | [undefined, ...rest: SelectionneurPage[]] = $derived.by(
    () => {
      if (dossiersFiltres.length >= NOMBRE_DOSSIERS_PAR_PAGE + 1) {
        const selectionneurs: SelectionneurPage[] = [
          ...Array.from({ length: nombreDePages }, (_v, i) => () => {
            numeroDeLaPageSelectionnee = i + 1;
            tick().then(() => titrePageElement?.focus());
          }),
        ];

        return [undefined, ...selectionneurs];
      } else {
        return undefined;
      }
    },
  );

  let dossiersAffiches: typeof dossiers = $derived.by(() => {
    // We display the dossiers sorted first by the most recent last-modification date (nouveauté)
    // then by submission date
    const dossiersTries = [...dossiersFiltres].sort((a, b) => {
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

    if (!selectionneursPage) return dossiersTries;
    else {
      return dossiersTries.slice(
        NOMBRE_DOSSIERS_PAR_PAGE * (numeroDeLaPageSelectionnee - 1),
        NOMBRE_DOSSIERS_PAR_PAGE * numeroDeLaPageSelectionnee,
      );
    }
  });

  const soumettreTextePourRecherche: EventHandler<SubmitEvent, HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!texteAChercher || texteAChercher.trim() === "") {
      tousLesFiltres.delete("texte");
    } else {
      tousLesFiltres.set("texte", createTextFilter(texteAChercher, dossiers));
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
  function reinitialiserPage() {
    numeroDeLaPageSelectionnee = 1;
    mettreAJourMessageFiltres();
  }

  function toggleFiltreSansInstructeurice() {
    if (!tousLesFiltres.has("sansInstructeurice")) {
      tousLesFiltres.set("sansInstructeurice", (dossier) => !dossierEstSuivi(dossier.id));
    } else {
      tousLesFiltres.delete("sansInstructeurice");
    }
    sendEvenementRechercherUnDossier();
    reinitialiserPage();
  }

  function toggleFiltreActionInstructeur() {
    if (!tousLesFiltres.has("actionInstructeur")) {
      tousLesFiltres.set(
        "actionInstructeur",
        (dossier) => dossier.prochaine_action_attendue_par === "Instructeur",
      );
    } else {
      tousLesFiltres.delete("actionInstructeur");
    }
    sendEvenementRechercherUnDossier();
    reinitialiserPage();
  }

  function toggleFiltreNouveaute() {
    if (!tousLesFiltres.has("nouveauté")) {
      tousLesFiltres.set(
        "nouveauté",
        (dossier) => notificationParDossier.get(dossier.id)?.vue === false,
      );
    } else {
      tousLesFiltres.delete("nouveauté");
    }
    sendEvenementRechercherUnDossier();
    reinitialiserPage();
  }

  const selectionnerPhase: ChangeEventHandler<HTMLSelectElement> = (e) => {
    e.preventDefault();
    const phase = e.currentTarget.value;
    if (phase === "") {
      tousLesFiltres.delete("phase");
    } else {
      // Select the phase
      tousLesFiltres.set("phase", (dossier) => dossier.phase === phase);
    }
    sendEvenementRechercherUnDossier();
    reinitialiserPage();
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
    <form onsubmit={soumettreTextePourRecherche}>
      <div class="fr-search-bar barre-de-recherche" role="search">
        <label class="fr-label" for="search-input">Rechercher un dossier</label>
        <input
          bind:value={texteAChercher}
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
            bind:value={phaseSelectionnee}
            onchange={selectionnerPhase}
            aria-label="Phase choisie"
            class="fr-select select-phase"
            id="select-phase"
            name="select-phase"
          >
            <option value="" selected>Toutes les phases</option>
            {#each toutesLesPhases as phase}
              <option value={phase}>{phase}</option>
            {/each}
          </select>
        </div>
        {#if afficherFiltreSansInstructeurice}
          <button
            type="button"
            class="fr-tag"
            onclick={toggleFiltreSansInstructeurice}
            aria-pressed={tousLesFiltres.has("sansInstructeurice")}
          >
            Dossier sans instructeur·ice
          </button>
        {/if}
        {#if afficherFiltreActionInstructeur}
          <button
            type="button"
            class="fr-tag"
            onclick={toggleFiltreActionInstructeur}
            aria-pressed={tousLesFiltres.has("actionInstructeur")}
          >
            Action : Instructeur·ice
          </button>
        {/if}
        <button
          type="button"
          class="fr-tag"
          onclick={toggleFiltreNouveaute}
          aria-pressed={tousLesFiltres.has("nouveauté")}
        >
          Nouveauté
        </button>
      </div>
      <p class="compteur" data-testid={"compteur-dossier"}>
        <span class="fr-text--lead">{dossiersFiltres.length}</span><span class="fr-text--lg"
          >/{dossiers.length} dossiers</span
        >
      </p>
    </div>
  </fieldset>
  <h2 bind:this={titrePageElement} tabindex="-1" class="titre-page">{textePage}</h2>
</div>
{#if dossiersAffiches.length >= 1}
  <div class="liste-des-dossiers fr-mb-2w fr-py-4w fr-px-4w fr-px-md-15w">
    <ul>
      {#each dossiersAffiches as dossier (dossier.id)}
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
  <Pagination {selectionneursPage} pageActuelle={selectionneursPage[numeroDeLaPageSelectionnee]}
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
