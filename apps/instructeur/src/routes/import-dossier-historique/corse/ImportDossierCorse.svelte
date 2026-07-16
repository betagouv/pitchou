<script lang="ts">
  import type { DossierAvecAlertes } from "../importDossierUtils.ts";
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type { LigneDossierCorse } from "./importDossierCorse.ts";
  import type { SchemaDemarcheSimplifiee } from "@pitchou/types/demarche-numerique/schema.ts";
  import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";

  import { extractFirstMail } from "../importDossierUtils.ts";
  import DeplierReplier from "$lib/components/common/DeplierReplier.svelte";
  import { SvelteMap } from "svelte/reactivity";
  import { text } from "d3-fetch";
  import { getODSTableRawContent, sheetRawContentToObjects, isRowNotEmpty } from "@odfjs/odfjs";
  import Pagination from "$lib/components/DSFR/Pagination.svelte";
  import {
    creerDossierDepuisLigne,
    creerNomPourDossier,
    ligneDossierEnBDD,
  } from "./importDossierCorse.ts";
  import BoutonModale from "$lib/components/DSFR/BoutonModale.svelte";

  const NOM_FEUILLE_TABLEAU_SUIVI = "Instruction";
  const NOM_FEUILLE_CORRESPONDANCE_INITIALS_MAILS_INSTRUCTRICES = "Instructeur DREAL";
  const DREAL = "Corse";

  type Props = {
    dossiers?: DossierSummary[];
    schema: SchemaDemarcheSimplifiee | undefined;
  };

  let { dossiers = [], schema }: Props = $props();

  const nomsEnBDD = $derived(new Set(dossiers.map((d) => d.nom)));

  const nomToDossierId = $derived(new Map(dossiers.map((d) => [d.nom, d.id])));

  const nomToHistoriqueIdentifiantDemandeOnagre = $derived(
    new Map(dossiers.map((d) => [d.nom, d.historique_identifiant_demande_onagre])),
  );

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
  let lignesTableauImport: LigneDossierCorse[] = $state([]);
  let lignesFiltreesTableauImport: LigneDossierCorse[] = $state([]);
  let dossiersDejaEnBDD: DossierSummary[] = $state([]);
  let ligneVersDossierAvecAlertes: Map<LigneDossierCorse, DossierAvecAlertes> = new SvelteMap();
  let emailsParInitials: Map<string, string> = $state(new SvelteMap());

  let ligneToLienPreremplissage: Map<any, string> = $state(new SvelteMap());

  let pourcentageDeDossierCreeEnBDD: number | undefined = $state();

  let afficherTousLesDossiers: boolean = $state(false);

  let loadingChargementDuFichier: Promise<void[]> = $state(Promise.resolve([]));

  let nombreDossiersAvecAlertes: number | undefined = $derived(
    Array.from(ligneVersDossierAvecAlertes).filter(
      (ligneEtDossierAvecAlertes) =>
        ligneEtDossierAvecAlertes[1].alertes && ligneEtDossierAvecAlertes[1].alertes.length >= 1,
    ).length,
  );

  let nombreDossiersDejaImportes = $derived(dossiersDejaEnBDD.length);
  let nombreDossiersAImporter = $derived(lignesTableauImport.length - nombreDossiersDejaImportes);

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

        const rawDataTableauSuivi = rawData.get(NOM_FEUILLE_TABLEAU_SUIVI);

        if (!rawDataTableauSuivi) {
          throw new TypeError(
            `Erreur dans la récupération de la feuille ${NOM_FEUILLE_TABLEAU_SUIVI}. Assurez-vous que cette feuille existe bien dans votre tableur ods.`,
          );
        }

        const rawDataEmailsParInitials = rawData.get(
          NOM_FEUILLE_CORRESPONDANCE_INITIALS_MAILS_INSTRUCTRICES,
        );

        if (!rawDataEmailsParInitials) {
          throw new TypeError(
            `Erreur dans la récupération de la feuille ${NOM_FEUILLE_CORRESPONDANCE_INITIALS_MAILS_INSTRUCTRICES}. Assurez-vous que cette feuille existe bien dans votre tableur ods.`,
          );
        }

        emailsParInitials = new SvelteMap(
          rawDataEmailsParInitials
            .map((row: { value: any }[]): [string, string] | null => {
              const initials = row?.[0]?.value;
              const email = extractFirstMail(row[1]?.value ?? "");
              if (row.length >= 1 && initials && email) {
                return [initials, email];
              }
              return null;
            })
            .filter((entry): entry is [string, string] => entry !== null),
        );

        const lignes = [
          ...sheetRawContentToObjects(rawDataTableauSuivi.filter(isRowNotEmpty)).values(),
        ];

        lignesTableauImport = lignes;

        lignesFiltreesTableauImport = lignes.filter(
          (ligne) => !ligneDossierEnBDD(ligne, nomsEnBDD, nomToHistoriqueIdentifiantDemandeOnagre),
        );
        dossiersDejaEnBDD = lignes.filter((ligne) =>
          ligneDossierEnBDD(ligne, nomsEnBDD, nomToHistoriqueIdentifiantDemandeOnagre),
        );

        const totalDossiers = lignes.length;
        pourcentageDeDossierCreeEnBDD =
          totalDossiers > 0 ? (dossiersDejaEnBDD.length / totalDossiers) * 100 : 0;

        // Visualize at once all the alerts of all the lines when the "creerDossierDepuisLigne" function is applied to the line
        loadingChargementDuFichier = Promise.all(
          lignesTableauImport.map(async (ligne) => {
            const dossier = await creerDossierDepuisLigne(
              ligne,
              emailsParInitials,
              activitesPrincipales88444,
            );
            ligneVersDossierAvecAlertes.set(ligne, dossier);
          }),
        );
      } catch (error) {
        console.error(`Une erreur est survenue pendant la lecture du fichier : ${error}`);
      }
    }
  }

  async function handleCreerLienPreRemplissage(LigneDossierCorse: LigneDossierCorse) {
    const dossier = ligneVersDossierAvecAlertes.get(LigneDossierCorse);

    if (!dossier) {
      // Should never happen
      console.warn(`La ligne n'existe pas : ${ligneDossierEnBDD}`);
      return;
    }

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

      ligneToLienPreremplissage.set(LigneDossierCorse, lien);
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
  <title>{DREAL} — Import de dossiers — Pitchou</title>
</svelte:head>

<h1>Import de dossiers historiques {DREAL}</h1>

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
{:else}
  <h2>
    {#if afficherTousLesDossiers}
      Tous les dossiers du fichier chargé ({lignesTableauImport.length})
    {:else}
      Dossiers restants à importer ({nombreDossiersAImporter} / {lignesTableauImport.length})
    {/if}
  </h2>
  <p>Nombre de dossiers avec des alertes : {nombreDossiersAvecAlertes}</p>

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
  {#await loadingChargementDuFichier}
    <p class="fr-mt-4w">Préparation du fichier en cours…</p>
  {:then}
    <div class="fr-table">
      <div class="fr-table__wrapper">
        <div class="fr-table__container">
          <div class="fr-table__content">
            <table class="tableau-dossier-a-creer">
              <thead>
                <tr>
                  <th> Nom du projet </th>
                  <th> Détails </th>
                  <th> Actions </th>
                </tr>
              </thead>
              <tbody>
                {#each lignesAfficheesTableauImport as ligneAfficheeTableauImport, index}
                  {@const dossierEtAlertes = ligneVersDossierAvecAlertes.get(
                    ligneAfficheeTableauImport,
                  )}
                  {@const alertesDuDossier = dossierEtAlertes?.alertes}
                  <tr
                    data-row-key={index}
                    data-testid={alertesDuDossier && alertesDuDossier.length >= 1
                      ? undefined
                      : "dossier-sans-alerte(s)"}
                  >
                    <td>{creerNomPourDossier(ligneAfficheeTableauImport)}</td>
                    <td>
                      <BoutonModale id={`dsfr-modale-${index}`}>
                        {#snippet boutonOuvrir()}
                          {#if alertesDuDossier && alertesDuDossier.length >= 1}
                            <button
                              type="button"
                              class="fr-btn fr-btn--sm fr-btn--icon-left fr-icon-warning-line"
                              data-fr-opened="false"
                              aria-controls={`dsfr-modale-${index}`}
                            >
                              {`Voir les alertes (${alertesDuDossier.length})`}
                            </button>
                          {:else}
                            <button
                              type="button"
                              class="fr-btn fr-btn--sm fr-btn--secondary"
                              data-fr-opened="false"
                              aria-controls={`dsfr-modale-${index}`}
                            >
                              {`Voir les détails`}
                            </button>
                          {/if}
                        {/snippet}
                        {#snippet contenu()}
                          {#if alertesDuDossier && alertesDuDossier.length >= 1}
                            <h3 class="fr-mb-2w">Liste des alertes&nbsp;:&nbsp;</h3>
                            <ul>
                              {#each alertesDuDossier ?? [] as alerte}
                                <li>
                                  <p
                                    class="fr-badge {alerte.type === 'avertissement'
                                      ? 'fr-badge--warning'
                                      : 'fr-badge--error'}"
                                  >
                                    {alerte.type}
                                  </p>
                                  &nbsp;:&nbsp;{alerte.message}
                                </li>
                              {/each}
                            </ul>
                          {/if}
                          <DeplierReplier open={alertesDuDossier && alertesDuDossier.length === 0}>
                            {#snippet summary()}
                              <h3>Données du dossier pour le pré-remplissage&nbsp;:</h3>
                            {/snippet}
                            {#snippet content()}
                              <ul>
                                {#each Object.entries(dossierEtAlertes ?? {}) as [clefDossierEtAlertes, valeurDossierEtAlertes]}
                                  {#if clefDossierEtAlertes !== "alertes"}
                                    {#if clefDossierEtAlertes === "NE PAS MODIFIER - Données techniques associées à votre dossier"}
                                      {@const donneesSupplementaires = Object.entries(
                                        JSON.parse(valeurDossierEtAlertes as string),
                                      )}
                                      {#each donneesSupplementaires as [clefDonneesSupplementaire, valeurDonneesSupplementaire]}
                                        {#if clefDonneesSupplementaire === "dossier"}
                                          {@const donneesDossierDesDonneesSupplementaires =
                                            Object.entries(valeurDonneesSupplementaire as object)}
                                          {#each donneesDossierDesDonneesSupplementaires as donneeDossierDesDonneesSupplementaires}
                                            <li>
                                              <strong
                                                >{`${donneeDossierDesDonneesSupplementaires[0]} :`}</strong
                                              >
                                              {`${JSON.stringify(donneeDossierDesDonneesSupplementaires[1])}`}
                                            </li>
                                          {/each}
                                        {:else}
                                          <li>
                                            <strong>{`${clefDonneesSupplementaire} :`}</strong>
                                            {`${JSON.stringify(valeurDonneesSupplementaire)}`}
                                          </li>
                                        {/if}
                                      {/each}
                                    {:else}
                                      <li>
                                        <strong>{`${clefDossierEtAlertes} :`}</strong>
                                        {`${JSON.stringify(valeurDossierEtAlertes)}`}
                                      </li>
                                    {/if}
                                  {/if}
                                {/each}
                              </ul>
                            {/snippet}
                          </DeplierReplier>
                        {/snippet}
                      </BoutonModale>
                    </td>
                    <td>
                      {#if ligneDossierEnBDD(ligneAfficheeTableauImport, nomsEnBDD, nomToHistoriqueIdentifiantDemandeOnagre)}
                        <p class="fr-badge fr-badge--success">En base de données</p>
                        <a
                          href={`/dossier/${nomToDossierId.get(creerNomPourDossier(ligneAfficheeTableauImport))}`}
                          target="_blank"
                          class="fr-btn fr-btn--secondary fr-ml-2w"
                        >
                          Ouvrir dossier
                        </a>
                      {:else if ligneToLienPreremplissage.get(ligneAfficheeTableauImport)}
                        <a
                          href={ligneToLienPreremplissage.get(ligneAfficheeTableauImport)}
                          target="_blank"
                          class="fr-btn">Créer dossier</a
                        >
                      {:else}
                        <button
                          type="button"
                          class="fr-btn fr-btn--secondary"
                          onclick={() => handleCreerLienPreRemplissage(ligneAfficheeTableauImport)}
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
  {:catch erreurChargement}
    <p class="fr-alert fr-alert--error fr-mt-4w">
      {`Une erreur est survenue lors de la préparation du fichier : ${erreurChargement instanceof Error ? erreurChargement.message : erreurChargement}`}
    </p>
  {/await}
{/if}

<style lang="scss">
  ul {
    list-style: none;
  }
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
