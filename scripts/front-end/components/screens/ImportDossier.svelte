<script>
    //@ts-check
    import { text } from "d3-fetch";
    import Squelette from "../Squelette.svelte";
    import {
        getODSTableRawContent,
        sheetRawContentToObjects,
        isRowNotEmpty,
    } from "@odfjs/odfjs";
    import { créerDossierDepuisLigne } from "../../actions/import-dossier.js";

    /** @import { DossierRésumé } from "../../../types/API_Pitchou.js"; */
    /** @import { ComponentProps } from 'svelte' */
    /** @import { DossierDemarcheSimplifiee88444 } from "../../../types/démarches-simplifiées/DémarcheSimplifiée88444" */

    /** @typedef {{
         "Date de sollicitation": Date;
        ORIGINE: string;
        OBJET: string;
        "N° Dossier DEROG": number;
        ÉCHÉANCE: string;
        "POUR\nATTRIBUTION": string;
        OBSERVATIONS: string;
        PETITIONNAIRE: string;
        "Catégorie du demandeur": string;
        "Nom contact – mail": string;
        "Année de première sollicitation": number;
        Communes: string;
        Département: number | string;
        Thématique: string;
        "Procédure associée": string;
        "Etapes du projet": string;
        "Stade de l’avis": string;
        "Description avancement dossier avec dates": string;
        "Avis SBEP": string;
        "Date de rendu de l’avis/envoi réponse": Date;
        "Sollicitation OFB pour avis": string;
        DEP: string;
        "Date de dépôt DEP": string;
        "Saisine CSRPN/CNPN": string;
        "Date saisine CSRPN/CNPN": string;
        "Nom de l’expert désigné (pour le CSRPN)": string;
        "N° de l’avis Onagre ou interne": string;
        "Avis CSRPN/CNPN": string;
        "Date avis CSRPN/CNPN": string;
        "Dérogation accordée": string;
        "Date AP": string;
        }} Ligne */

    /** @type {ComponentProps<Squelette>['email']} */
    export let email = undefined;

    /** @type {Ligne[] | undefined} */
    let lignesTableauImport = undefined;

    /** @type {Map<any,string>} */
    let ligneToLienPréremplissage = new Map();

    /** @type {DossierRésumé[]} */
    export let dossiers = [];

    /**
     * Vérifie si un dossier spécifique à importer existe déjà dans la base de données.
     * La recherche s'effectue en comparant le nom du projet (champ 'nom' de la table 'dossier').
     * @param {Ligne} ligne
     * @returns {boolean}
     */
    function ligneDossierEnBDD(ligne) {
        return dossiers.some((dossier) => dossier.nom === ligne["OBJET"]);
    }

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

                const rawDataTableauSuivi = rawData.get("tableau_suivi");

                if (!rawDataTableauSuivi) {
                    throw new TypeError(
                        `Erreur dans la récupération de la page "tableau_suivi". Assurez-vous que cette page existe bien dans votre tableur ods.`,
                    );
                }
                const lignes = [
                    ...sheetRawContentToObjects(
                        rawDataTableauSuivi.filter(isRowNotEmpty),
                    ).values(),
                ];

                lignesTableauImport = lignes;
            } catch (error) {
                console.error(
                    `Une erreur est survenue pendant la lecture du fichier : ${error}`,
                );
            }
        }
    }

    /**
     * @param {Ligne} ligne
     */
    async function handleCréerLienPréRemplissage(ligne) {
        /** @type {Partial<DossierDemarcheSimplifiee88444>} */
        const dossier = await créerDossierDepuisLigne(ligne);
        console.log(
            { dossier },
            "après avoir cliqué sur Préparer préremplissage",
        );
        try {
            const lien = await text("/lien-preremplissage", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(dossier),
            });

            ligneToLienPréremplissage.set(ligne, lien);
            ligneToLienPréremplissage = ligneToLienPréremplissage;
        } catch (error) {
            throw new Error(
                `Une erreur est survenue lors de la récupération du lien de préremplissage : ${error}`,
            );
        }
    }
</script>

<Squelette {email} nav={true}>
    <h1>Import de dossier</h1>
    <div class="fr-notice fr-notice--warning">
        <div class="fr-container">
            <div class="fr-notice__body">
                <p>
                    <span class="fr-notice__title"
                        >Attention : vous devez appartenir au groupe des
                        instructeur·ices DREAL Bretagne.</span
                    >
                </p>
            </div>
        </div>
    </div>
    <div class="fr-upload-group">
        <label class="fr-label" for="file-upload">
            Ajouter un fichier
            <span class="fr-hint-text">Formats supportés : ods.</span>
        </label>
        <input
            class="fr-upload"
            aria-describedby="file-upload-messages"
            type="file"
            id="file-upload"
            name="file-upload"
            accept=".ods"
            on:change={handleFileChange}
        />
        <div
            class="fr-messages-group"
            id="file-upload-messages"
            aria-live="polite"
        ></div>
    </div>

    {#if lignesTableauImport}
        <h2>Toutes les lignes du tableau</h2>
        <div class="fr-table" id="table-0-component">
            <div class="fr-table__wrapper">
                <div class="fr-table__container">
                    <div class="fr-table__content">
                        <table id="table-0" class="tableau-dossier-a-creer">
                            <caption> Lignes du tableau </caption>
                            <thead>
                                <tr>
                                    <th> Nom du projet (OBJET) </th>
                                    <th> Département </th>
                                    <th>
                                        Commentaires sur les enjeux et la
                                        procédure
                                    </th>
                                    <th> Action </th>
                                </tr>
                            </thead>
                            <tbody>
                                {#each lignesTableauImport as ligne}
                                    <tr id="table-0-row-key-1" data-row-key="1">
                                        <td>{ligne["OBJET"]}</td>
                                        <td>
                                            <!-- Alerter si le département ne fait pas partie de ceux pris en charge par la DREAL Bretagne. -->
                                            {#if String(ligne["Département"] ?? "")
                                                .split("-")
                                                .some((dep) => dep.trim() && !["21", "25", "39", "58", "70", "71", "89", "90"].includes(dep.trim()))}
                                                <span
                                                    class="fr-badge fr-badge--error"
                                                    >{ligne[
                                                        "Département"
                                                    ]}</span
                                                >
                                            {:else}
                                                {ligne["Département"]}
                                            {/if}
                                        </td>
                                        <td
                                            >{ligne[
                                                "Description avancement dossier avec dates"
                                            ]}</td
                                        >
                                        <td>
                                            {#if ligneDossierEnBDD(ligne)}<p
                                                    class="fr-badge fr-badge--success"
                                                >
                                                    En base de données
                                                </p>{/if}
                                            {#if ligneToLienPréremplissage.get(ligne)}
                                                <a id="link-1" href={ligneToLienPréremplissage.get(
                                                                ligne,
                                                            )} target="_blank" class="fr-btn">Créer dossier</a>
                                            {:else}
                                                <button
                                                    type="button"
                                                    class="fr-btn fr-btn--secondary"
                                                    on:click={() =>
                                                        handleCréerLienPréRemplissage(
                                                            ligne,
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
    {/if}
</Squelette>

<style lang="scss">
    .tableau-dossier-a-creer {
        th,
        td:not(:last-of-type) {
            max-width: 15rem;
            max-height: 2rem;
            overflow: auto;
        }
    }
</style>
