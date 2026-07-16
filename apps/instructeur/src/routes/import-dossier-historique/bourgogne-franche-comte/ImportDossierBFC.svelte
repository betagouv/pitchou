<script lang="ts">
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type { LigneDossierBFC } from "./importDossierBFC.ts";
  import type { SchemaDemarcheSimplifiee } from "@pitchou/types/demarche-numerique/schema.ts";
  import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";

  import { SvelteMap } from "svelte/reactivity";
  import { text } from "d3-fetch";
  import { getODSTableRawContent, sheetRawContentToObjects, isRowNotEmpty } from "@odfjs/odfjs";

  import Pagination from "$lib/components/DSFR/Pagination.svelte";

  import { creerDossierDepuisLigne, creerNomPourDossier } from "./importDossierBFC.ts";
  import BoutonModale from "$lib/components/DSFR/BoutonModale.svelte";

  type Props = {
    dossiers?: DossierSummary[];
    schema: SchemaDemarcheSimplifiee | undefined;
  };

  let { dossiers = [], schema }: Props = $props();

  // Pre-computation: set of names present in the database (O(1) lookup)
  const nomsEnBDD = $derived(new Set(dossiers.map((d) => d.nom)));

  const nomToDossierId = $derived(new Map(dossiers.map((d) => [d.nom, d.id])));

  // @ts-ignore
  const activitesPrincipales88444: Set<DossierDemarcheNumerique88444["Activite principale"]> =
    $derived(
      schema
        ? new Set(
            schema.revision.champDescriptors.find((c) => c.label === "Activité principale")
              ?.options,
          )
        : new Set(),
    );
  let lignesTableauImport: LigneDossierBFC[] = $state([]);
  let lignesFiltreesTableauImport: LigneDossierBFC[] = $state([]);
  let dossiersDejaEnBDD: DossierSummary[] = $state([]);

  let ligneToLienPreremplissage: Map<any, string> = $state(new SvelteMap());

  let pourcentageDeDossierCreeEnBDD: number | undefined = $state();

  let afficherTousLesDossiers: boolean = $state(false);

  let nombreDossiersDejaImportes = $derived(dossiersDejaEnBDD.length);
  let nombreDossiersAImporter = $derived(lignesTableauImport.length - nombreDossiersDejaImportes);

  /**
   * Checks whether a specific dossier to import already exists in the database.
   * The search is performed by comparing the project name (the 'nom' field of the 'dossier' table).
   */
  function ligneDossierEnBDD(LigneDossierBFC: LigneDossierBFC): boolean {
    return nomsEnBDD.has(creerNomPourDossier(LigneDossierBFC));
  }

  async function handleFileChange(event: Event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement && target && target.files && target.files[0])) {
      console.error("Le champ de fichier est introuvable ou ne contient aucun fichier.");
      return;
    }
    const files: FileList | null =
      target instanceof HTMLInputElement && target && target?.files ? target?.files : null;

    const file = files && files[0];

    if (file) {
      try {
        const fichierImport = await file.arrayBuffer();
        const rawData = await getODSTableRawContent(fichierImport);

        const rawDataTableauSuivi = rawData.get("tableau_suivi");

        if (!rawDataTableauSuivi) {
          throw new TypeError(
            `Erreur dans la récupération de la page "tableau_suivi". Assurez-vous que cette page existe bien dans votre tableur ods.`,
          );
        }
        const lignes = [
          ...sheetRawContentToObjects(rawDataTableauSuivi.filter(isRowNotEmpty)).values(),
        ];

        lignesTableauImport = lignes;
        lignesFiltreesTableauImport = lignes.filter((ligne) => !ligneDossierEnBDD(ligne));
        dossiersDejaEnBDD = lignes.filter((ligne) => ligneDossierEnBDD(ligne));

        const totalDossiers = lignes.length;
        pourcentageDeDossierCreeEnBDD =
          totalDossiers > 0 ? (dossiersDejaEnBDD.length / totalDossiers) * 100 : 0;
      } catch (error) {
        console.error(`Une erreur est survenue pendant la lecture du fichier : ${error}`);
      }
    }
  }

  async function handleCreerLienPreRemplissage(LigneDossierBFC: LigneDossierBFC) {
    const dossier = await creerDossierDepuisLigne(LigneDossierBFC, activitesPrincipales88444);

    console.log(
      { dossier },
      dossier["NE PAS MODIFIER - Données techniques associées à votre dossier"],
      "après avoir cliqué sur Préparer préremplissage",
    );
    try {
      const lien = await text("/lien-preremplissage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(dossier),
      });

      ligneToLienPreremplissage.set(LigneDossierBFC, lien);
      ligneToLienPreremplissage = ligneToLienPreremplissage;
    } catch (error) {
      throw new Error(
        `Une erreur est survenue lors de la récupération du lien de préremplissage : ${error}`,
      );
    }
  }

  // Pagination of the tracking table
  type SelectionneurPage = () => void;

  const NOMBRE_DOSSIERS_PAR_PAGE = 20;

  // page number matching the one displayed, therefore starting at 1
  let numeroPageSelectionnee: number = $state(1);

  let selectionneursPage: [undefined, ...rest: SelectionneurPage[]] | undefined = $derived.by(
    () => {
      if (lignesTableauImport.length >= NOMBRE_DOSSIERS_PAR_PAGE * 2 + 1) {
        const nombreDePages = Math.ceil(lignesTableauImport.length / NOMBRE_DOSSIERS_PAR_PAGE);

        return [
          undefined,
          ...[...Array(nombreDePages).keys()].map((i) => () => {
            //console.log('sélection de la page', i+1)
            numeroPageSelectionnee = i + 1;
          }),
        ];
      }

      return undefined;
    },
  );

  $effect(() => {
    if (selectionneursPage) numeroPageSelectionnee = 1;
  });

  let lignesAfficheesTableauImport: typeof lignesTableauImport = $derived.by(() => {
    const lignesAAfficher = afficherTousLesDossiers
      ? lignesTableauImport
      : lignesFiltreesTableauImport;

    if (!selectionneursPage) return lignesAAfficher;
    else {
      return lignesAAfficher.slice(
        NOMBRE_DOSSIERS_PAR_PAGE * (numeroPageSelectionnee - 1),
        NOMBRE_DOSSIERS_PAR_PAGE * numeroPageSelectionnee,
      );
    }
  });
</script>

<svelte:head>
  <title>Bourgogne-Franche-Comté — Import de dossiers — Pitchou</title>
</svelte:head>

<h1>Import de dossiers historiques Bourgogne-Franche-Comté</h1>

{#if !lignesTableauImport || lignesTableauImport.length === 0}
  <div class="fr-upload-group fr-mb-4w">
    <label class="fr-label" for="file-upload">
      Charger un fichier de suivi
      <span class="fr-hint-text">Formats supportés : .ods</span>
    </label>
    <input
      class="fr-upload"
      aria-describedby="file-upload-messages"
      type="file"
      id="file-upload"
      name="file-upload"
      accept=".ods"
      onchange={handleFileChange}
    />
    <div class="fr-messages-group" id="file-upload-messages" aria-live="polite"></div>
  </div>
{/if}

{#if lignesTableauImport.length >= 1}
  <h2>
    {#if afficherTousLesDossiers}
      Tous les dossiers du fichier chargé ({lignesTableauImport.length})
    {:else}
      Dossiers restants à importer ({nombreDossiersAImporter} / {lignesTableauImport.length})
    {/if}
  </h2>

  <div class="fr-toggle">
    <input
      type="checkbox"
      class="fr-toggle__input"
      id="toggle"
      aria-describedby="toggle-messages"
      bind:checked={afficherTousLesDossiers}
    />
    <label
      class="fr-toggle__label"
      for="toggle"
      data-fr-checked-label="Activé"
      data-fr-unchecked-label="Désactivé"
    >
      Afficher tous les dossiers
    </label>
    <div class="fr-messages-group" id="toggle-messages" aria-live="polite"></div>
  </div>

  <div class="progression">
    <div>{nombreDossiersAImporter} / {lignesTableauImport.length}</div>

    <div
      class="fr-progress-bar"
      title={`${nombreDossiersAImporter} / ${lignesTableauImport.length}`}
    >
      <div
        style="width: {pourcentageDeDossierCreeEnBDD}%; background: var(--background-action-high-blue-france); height: 100%; display: inline-block;"
      ></div>
    </div>
  </div>

  <div class="fr-table">
    <div class="fr-table__wrapper">
      <div class="fr-table__container">
        <div class="fr-table__content">
          <table class="tableau-dossier-a-creer">
            <thead>
              <tr>
                <th> Nom du projet (OBJET) </th>
                <th> Détails </th>
                <th> Actions </th>
              </tr>
            </thead>
            <tbody>
              {#each lignesAfficheesTableauImport as LigneDossierBFC, index}
                <tr data-row-key="1">
                  <td>{creerNomPourDossier(LigneDossierBFC)}</td>
                  <td>
                    <BoutonModale id={`dsfr-modale-${index}`}>
                      {#snippet boutonOuvrir()}
                        <button type="button">Voir les détails</button>
                      {/snippet}
                      {#snippet contenu()}
                        <div>{JSON.stringify(LigneDossierBFC)}</div>
                      {/snippet}
                    </BoutonModale>
                  </td>
                  <td>
                    {#if ligneDossierEnBDD(LigneDossierBFC)}
                      <p class="fr-badge fr-badge--success">En base de données</p>
                      <a
                        href={`/dossier/${nomToDossierId.get(creerNomPourDossier(LigneDossierBFC))}`}
                        target="_blank"
                        class="fr-btn fr-btn--secondary fr-ml-2w"
                      >
                        Ouvrir dossier
                      </a>
                    {:else if ligneToLienPreremplissage.get(LigneDossierBFC)}
                      <a
                        href={ligneToLienPreremplissage.get(LigneDossierBFC)}
                        target="_blank"
                        class="fr-btn">Créer dossier</a
                      >
                    {:else}
                      <button
                        type="button"
                        class="fr-btn fr-btn--secondary"
                        onclick={() => handleCreerLienPreRemplissage(LigneDossierBFC)}
                        >Préparer préremplissage</button
                      >
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  {#if selectionneursPage}
    <Pagination pageSelectors={selectionneursPage} currentPage={selectionneursPage[numeroPageSelectionnee]}
    ></Pagination>
  {/if}
{/if}

<style lang="scss">
  h2 {
    margin-bottom: 1rem;
  }

  .fr-toggle label::before {
    max-width: 5rem;
  }

  .progression {
    display: flex;
    flex-direction: row;
    align-items: center;

    .fr-progress-bar {
      flex: 1;

      height: 1.5rem;
      margin-left: 1rem;
      border-radius: 8px;
      overflow: hidden;

      background: var(--background-alt-grey);
    }
  }

  .tableau-dossier-a-creer {
    th,
    td:not(:last-of-type) {
      max-height: 2rem;
      overflow: auto;
    }
  }
</style>
