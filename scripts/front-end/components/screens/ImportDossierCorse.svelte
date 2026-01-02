<script>
    /** @import { DossierAvecAlertes } from "../../actions/importDossierUtils.js" */
    /** @import { DossierRésumé } from "../../../types/API_Pitchou.js"; */
    /** @import { ComponentProps } from 'svelte' */
    /** @import { LigneDossierCorse } from "../../actions/importDossierCorse.js" */
    /** @import { SchemaDémarcheSimplifiée } from "../../../types/démarche-numérique/schema.js"; */
    /** @import { DossierDemarcheNumerique88444 } from "../../../types/démarche-numérique/Démarche88444.js" */

    import DéplierReplier from '../common/DéplierReplier.svelte'
    import { SvelteMap } from "svelte/reactivity";
    import { text } from "d3-fetch";
    import {
        getODSTableRawContent,
        sheetRawContentToObjects,
        isRowNotEmpty,
    } from "@odfjs/odfjs";
    import Squelette from "../Squelette.svelte";
    import Pagination from "../DSFR/Pagination.svelte";
    import {
        créerDossierDepuisLigne,
        créerNomPourDossier,
        ligneDossierEnBDD
    } from "../../actions/importDossierCorse.js";
    import BoutonModale from "../DSFR/BoutonModale.svelte";

    const NOM_FEUILLE_TABLEAU_SUIVI = "TDB";
    const DREAL = "Corse";

    /**
     * @typedef {Object} Props
     * @property {ComponentProps<typeof Squelette>['email']} [email]
     * @property {DossierRésumé[]} [dossiers]
     * @property {SchemaDémarcheSimplifiée | undefined} schema
     */

    /** @type {Props} */
    let { email = undefined, dossiers = [], schema } = $props();

    const nomsEnBDD = $derived(new Set(dossiers.map((d) => d.nom)));

    const nomToDossierId = $derived(
        new Map(dossiers.map((d) => [d.nom, d.id])),
    );

    const nomToHistoriqueIdentifiantDemandeOnagre = $derived(
        new Map(
            dossiers.map((d) => [
                d.nom,
                d.historique_identifiant_demande_onagre,
            ]),
        ),
    );

    /** @type {Set<DossierDemarcheNumerique88444['Activité principale']>} } */
    // @ts-ignore
    const activitésPrincipales88444 = $derived(
        schema
            ? new Set(
                  schema.revision.champDescriptors.find(
                      (c) => c.label === "Activité principale",
                  )?.options,
              )
            : new Set(),
    );
    /** @type {LigneDossierCorse[]} */
    let lignesTableauImport = $state([]);
    /** @type {LigneDossierCorse[]} */
    let lignesFiltréesTableauImport = $state([]);
    /** @type {DossierRésumé[]} */
    let dossiersDéjàEnBDD = $state([]);
    /** @type {Map<LigneDossierCorse, DossierAvecAlertes>}*/
    let ligneVersDossierAvecAlertes = new SvelteMap()

    /** @type {Map<any,string>} */
    let ligneToLienPréremplissage = $state(new SvelteMap());

    /**@type {number | undefined}*/
    let pourcentageDeDossierCrééEnBDD = $state();

    /**@type {boolean}*/
    let afficherTousLesDossiers = $state(false);

    /** @type {Promise<void[]>} */
    let loadingChargementDuFichier = $state(Promise.resolve([]));

    /**@type {number | undefined}*/
    let nombreDossiersAvecAlertes = $derived(Array.from(ligneVersDossierAvecAlertes).filter((ligneEtDossierAvecAlertes) => ligneEtDossierAvecAlertes[1].alertes && ligneEtDossierAvecAlertes[1].alertes.length >= 1).length)

    let nombreDossiersDéjàImportés = $derived(dossiersDéjàEnBDD.length);
    let nombreDossiersAImporter = $derived(
        lignesTableauImport.length - nombreDossiersDéjàImportés,
    );

    /**
     * @param {Event} event
     */
    async function handleFileChange(event) {
        const target = event.target;
        if (
            !(
                target instanceof HTMLInputElement &&
                target &&
                target.files &&
                target.files[0]
            )
        ) {
            console.error(
                "Le champ de fichier est introuvable ou ne contient aucun fichier.",
            );
            return;
        }
        /** @type {FileList | null} */
        const files =
            target instanceof HTMLInputElement && target && target?.files
                ? target?.files
                : null;

        const file = files && files[0];

        if (file) {
            try {
                const fichierImport = await file.arrayBuffer();
                const rawData = await getODSTableRawContent(fichierImport);

                const rawDataTableauSuivi = rawData.get(
                    NOM_FEUILLE_TABLEAU_SUIVI,
                );

                if (!rawDataTableauSuivi) {
                    throw new TypeError(
                        `Erreur dans la récupération de la feuille ${NOM_FEUILLE_TABLEAU_SUIVI}. Assurez-vous que cette feuille existe bien dans votre tableur ods.`,
                    );
                }
                const lignes = [
                    ...sheetRawContentToObjects(
                        rawDataTableauSuivi.filter(isRowNotEmpty),
                    ).values(),
                ];

                lignesTableauImport = lignes;
                lignesFiltréesTableauImport = lignes.filter(
                    (ligne) => !ligneDossierEnBDD(ligne, nomsEnBDD, nomToHistoriqueIdentifiantDemandeOnagre),
                );
                dossiersDéjàEnBDD = lignes.filter((ligne) =>
                    ligneDossierEnBDD(ligne, nomsEnBDD, nomToHistoriqueIdentifiantDemandeOnagre),
                );

                const totalDossiers = lignes.length;
                pourcentageDeDossierCrééEnBDD =
                    totalDossiers > 0
                        ? (dossiersDéjàEnBDD.length / totalDossiers) * 100
                        : 0;


                // Visualiser en une fois toutes les alertes de toutes les lignes lorsqu'on applique à la ligne la fonction "créerDossierDepuisLigne"
                loadingChargementDuFichier = Promise.all(
                    lignesTableauImport.map(async (ligne) => {
                        const dossier = await créerDossierDepuisLigne(ligne, activitésPrincipales88444)
                        ligneVersDossierAvecAlertes.set(ligne, dossier)
                    })
                )
            
            } catch (error) {
                console.error(
                    `Une erreur est survenue pendant la lecture du fichier : ${error}`,
                );
            } 
        }
    }

    /**
     * @param {LigneDossierCorse} LigneDossierCorse
     */
    async function handleCréerLienPréRemplissage(LigneDossierCorse) {
        const dossier = ligneVersDossierAvecAlertes.get(LigneDossierCorse)

        if (!dossier) {
            // Ne doit jamais arriver
            console.warn(`La ligne n'existe pas : ${ligneDossierEnBDD}`)
            return;
        }

        console.log(
            { dossier },
            dossier[
                "NE PAS MODIFIER - Données techniques associées à votre dossier"
            ],
            "après avoir cliqué sur Préparer préremplissage",
        );
        try {
            const lien = await text("/lien-preremplissage", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(dossier),
            });

            ligneToLienPréremplissage.set(LigneDossierCorse, lien);
            ligneToLienPréremplissage = ligneToLienPréremplissage;
        } catch (error) {
            throw new Error(
                `Une erreur est survenue lors de la récupération du lien de préremplissage : ${error}`,
            );
        }
    }

    // Pagination du tableau de suivi
    /** @typedef {() => void} SelectionneurPage */

    const NOMBRE_DOSSIERS_PAR_PAGE = 20;

    // numéro de page qui correspond à celui affiché, donc commençant à 1
    /** @type {number} */
    let numéroPageSelectionnée = $state(1);

    /** @type {[undefined, ...rest: SelectionneurPage[]] | undefined} */
    let selectionneursPage = $derived.by(() => {
        if (lignesTableauImport.length >= NOMBRE_DOSSIERS_PAR_PAGE * 2 + 1) {
            const nombreDePages = Math.ceil(
                lignesTableauImport.length / NOMBRE_DOSSIERS_PAR_PAGE,
            );

            return [
                undefined,
                ...[...Array(nombreDePages).keys()].map((i) => () => {
                    //console.log('sélection de la page', i+1)
                    numéroPageSelectionnée = i + 1;
                }),
            ];
        }

        return undefined;
    });

    $effect(() => {
        if (selectionneursPage) numéroPageSelectionnée = 1;
    });

    /** @type {typeof lignesTableauImport} */
    let lignesAffichéesTableauImport = $derived.by(() => {
        const lignesÀAfficher = afficherTousLesDossiers
            ? lignesTableauImport
            : lignesFiltréesTableauImport;

        if (!selectionneursPage) return lignesÀAfficher;
        else {
            return lignesÀAfficher.slice(
                NOMBRE_DOSSIERS_PAR_PAGE * (numéroPageSelectionnée - 1),
                NOMBRE_DOSSIERS_PAR_PAGE * numéroPageSelectionnée,
            );
        }
    });
</script>

<Squelette {email} nav={true} title={`${DREAL} — Import de dossiers`}>
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
            <div
                class="fr-messages-group"
                id="file-upload-messages"
                aria-live="polite"
            ></div>
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
            <div
                class="fr-messages-group"
                id="toggle-messages"
                aria-live="polite"
            ></div>
        </div>

        <div class="progression">
            <div>{nombreDossiersAImporter} / {lignesTableauImport.length}</div>

            <div
                class="fr-progress-bar"
                title={`${nombreDossiersAImporter} / ${lignesTableauImport.length}`}
            >
                <div
                    style="width: {pourcentageDeDossierCrééEnBDD}%; background: var(--background-action-high-blue-france); height: 100%; display: inline-block;"
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
                                    {#each lignesAffichéesTableauImport as ligneAffichéeTableauImport, index}
                                    {@const dossierEtAlertes = ligneVersDossierAvecAlertes.get(ligneAffichéeTableauImport)}
                                    {@const alertesDuDossier = dossierEtAlertes?.alertes}
                                        <tr data-row-key={index} data-testid={alertesDuDossier && alertesDuDossier.length >= 1 ? undefined : 'dossier-sans-alerte(s)'}>
                                            <td>{créerNomPourDossier(ligneAffichéeTableauImport)}</td>
                                            <td>
                                                <BoutonModale id={`dsfr-modale-${index}`} >
                                                    {#snippet boutonOuvrir()}
                                                        {#if alertesDuDossier && alertesDuDossier.length >= 1}
                                                            <button type="button" class="fr-btn fr-btn--sm fr-btn--icon-left fr-icon-warning-line" data-fr-opened="false" aria-controls={`dsfr-modale-${index}`}>
                                                                {`Voir les alertes (${alertesDuDossier.length})`}
                                                            </button >
                                                        {:else}
                                                            <button type="button" class="fr-btn fr-btn--sm fr-btn--secondary" data-fr-opened="false" aria-controls={`dsfr-modale-${index}`}>
                                                                {`Voir les détails`}
                                                            </button >                                                    
                                                        {/if}
                                                    {/snippet}
                                                    {#snippet contenu()}
                                                        {#if alertesDuDossier && alertesDuDossier.length >=1}
                                                            <h3 class="fr-mb-2w">Liste des alertes&nbsp;:&nbsp; </h3>
                                                            <ul>
                                                                {#each alertesDuDossier ?? [] as alerte}
                                                                    <li><p class="fr-badge {alerte.type==='avertissement' ? 'fr-badge--warning' : 'fr-badge--error'}">{alerte.type}</p>&nbsp;:&nbsp;{alerte.message}</li>
                                                                {/each}
                                                            </ul>
                                                        {/if}
                                                        <DéplierReplier open={alertesDuDossier && alertesDuDossier.length === 0}>
                                                            {#snippet summary()}
                                                                <h3>Données du dossier pour le pré-remplissage&nbsp;: </h3>
                                                            {/snippet}
                                                            {#snippet content()}
                                                                <ul>
                                                                    {#each Object.entries(dossierEtAlertes ?? {}) as [clefDossierEtAlertes, valeurDossierEtAlertes] }
                                                                        {#if clefDossierEtAlertes !== 'alertes'}
                                                                            {#if clefDossierEtAlertes === 'NE PAS MODIFIER - Données techniques associées à votre dossier'}
                                                                                {@const donnéesSupplémentaires =  Object.entries(JSON.parse(/** @type {string} */ (valeurDossierEtAlertes))) }
                                                                                {#each donnéesSupplémentaires as [clefDonnéesSupplémentaire, valeurDonnéesSupplémentaire]}
                                                                                    {#if clefDonnéesSupplémentaire === 'dossier'}
                                                                                        {@const donnéesDossierDesDonnéesSupplémentaires =  Object.entries(valeurDonnéesSupplémentaire)}
                                                                                        {#each donnéesDossierDesDonnéesSupplémentaires as donnéeDossierDesDonnéesSupplémentaires}
                                                                                            <li>
                                                                                                <strong>{`${donnéeDossierDesDonnéesSupplémentaires[0]} :`}</strong> {`${JSON.stringify(donnéeDossierDesDonnéesSupplémentaires[1])}`}
                                                                                            </li>
                                                                                        {/each}
                                                                                    {:else}
                                                                                        <li>
                                                                                            <strong>{`${clefDonnéesSupplémentaire} :`}</strong> {`${JSON.stringify(valeurDonnéesSupplémentaire)}`}
                                                                                        </li>
                                                                                    {/if}
                                                                                {/each}
                                                                            {:else}
                                                                                <li>
                                                                                    <strong>{`${clefDossierEtAlertes} :`}</strong> {`${JSON.stringify(valeurDossierEtAlertes)}`}
                                                                                </li>
                                                                            {/if}
                                                                        {/if}
                                                                    {/each}
                                                                </ul>
                                                            {/snippet}
                                                        </DéplierReplier>
                                                    {/snippet}
                                                </BoutonModale>
                                            </td>
                                            <td>
                                                {#if ligneDossierEnBDD(ligneAffichéeTableauImport, nomsEnBDD, nomToHistoriqueIdentifiantDemandeOnagre)}
                                                    <p
                                                        class="fr-badge fr-badge--success"
                                                    >
                                                        En base de données
                                                    </p>
                                                    <a
                                                        href={`/dossier/${nomToDossierId.get(créerNomPourDossier(ligneAffichéeTableauImport))}`}
                                                        target="_blank"
                                                        class="fr-btn fr-btn--secondary fr-ml-2w"
                                                    >
                                                        Ouvrir dossier
                                                    </a>
                                                {:else if ligneToLienPréremplissage.get(ligneAffichéeTableauImport)}
                                                    <a
                                                        href={ligneToLienPréremplissage.get(
                                                            ligneAffichéeTableauImport,
                                                        )}
                                                        target="_blank"
                                                        class="fr-btn"
                                                        >Créer dossier</a
                                                    >
                                                {:else}
                                                    <button
                                                        type="button"
                                                        class="fr-btn fr-btn--secondary"
                                                        onclick={() =>
                                                            handleCréerLienPréRemplissage(
                                                                ligneAffichéeTableauImport,
                                                            )}
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
                <Pagination
                    {selectionneursPage}
                    pageActuelle={selectionneursPage[numéroPageSelectionnée]}
                ></Pagination>
            {/if}
        {:catch erreurChargement}
            <p class="fr-alert fr-alert--error fr-mt-4w">
                {`Une erreur est survenue lors de la préparation du fichier : ${erreurChargement instanceof Error ? erreurChargement.message : erreurChargement}`}
            </p>
        {/await}
    {/if}
</Squelette>

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
