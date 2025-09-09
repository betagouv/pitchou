<script>
    //@ts-check

    /** @import { DossierRésumé } from "../../../types/API_Pitchou.js"; */
    /** @import { ComponentProps } from 'svelte' */
    /** @import { LigneDossierBFC } from "../../actions/importDossierBFC.js" */

    import { SvelteMap } from "svelte/reactivity";
    import { text } from "d3-fetch";
    import Squelette from "../Squelette.svelte";
    import {
        getODSTableRawContent,
        sheetRawContentToObjects,
        isRowNotEmpty,
    } from "@odfjs/odfjs";
    import { créerDossierDepuisLigne } from "../../actions/importDossierBFC.js";

    /**
     * @typedef {Object} Props
     * @property {ComponentProps<typeof Squelette>['email']} [email]
     * @property {DossierRésumé[]} [dossiers]
     */

    /** @type {Props} */
    let { email = undefined, dossiers = [] } = $props();

    // Pré-calcul: ensemble des noms présents en base (lookup O(1))
    const nomsEnBDD = $derived(new Set(dossiers.map((d) => d.nom)));

    const nomToDossierId = $derived(
        new Map(dossiers.map((d) => [d.nom, d.id])),
    );

    /** @type {LigneDossierBFC[]} */
    let lignesTableauImport = $state([]);
    /** @type {LigneDossierBFC[]} */
    let lignesFiltréesTableauImport = $state([]);
    /** @type {DossierRésumé[]} */
    let dossiersDéjàEnBDD = $state([]);

    /** @type {Map<any,string>} */
    let ligneToLienPréremplissage = $state(new SvelteMap());

    /**@type {number | undefined}*/
    let pourcentageDeDossierCrééEnBDD = $state();

    /**@type {boolean}*/
    let afficherTousLesDossiers = $state(false);

    const lignesAffichéesTableauImport = $derived(
        afficherTousLesDossiers
            ? lignesTableauImport
            : lignesFiltréesTableauImport,
    );

    let nombreDossiersDéjàImportés = $derived(dossiersDéjàEnBDD.length);
    let nombreDossiersAImporter = $derived(
        lignesTableauImport.length - nombreDossiersDéjàImportés,
    );

    /**
     * Vérifie si un dossier spécifique à importer existe déjà dans la base de données.
     * La recherche s'effectue en comparant le nom du projet (champ 'nom' de la table 'dossier').
     * @param {LigneDossierBFC} LigneDossierBFC
     * @returns {boolean}
     */
    function ligneDossierEnBDD(LigneDossierBFC) {
        return nomsEnBDD.has(LigneDossierBFC["OBJET"]);
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
                lignesFiltréesTableauImport = lignes.filter(
                    (ligne) => !ligneDossierEnBDD(ligne),
                );
                dossiersDéjàEnBDD = lignes.filter((ligne) =>
                    ligneDossierEnBDD(ligne),
                );

                const totalDossiers = lignes.length;
                pourcentageDeDossierCrééEnBDD =
                    totalDossiers > 0
                        ? (dossiersDéjàEnBDD.length / totalDossiers) * 100
                        : 0;
            } catch (error) {
                console.error(
                    `Une erreur est survenue pendant la lecture du fichier : ${error}`,
                );
            }
        }
    }

    /**
     * @param {LigneDossierBFC} LigneDossierBFC
     */
    async function handleCréerLienPréRemplissage(LigneDossierBFC) {
        const dossier = await créerDossierDepuisLigne(LigneDossierBFC);
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

            ligneToLienPréremplissage.set(LigneDossierBFC, lien);
            ligneToLienPréremplissage = ligneToLienPréremplissage;
        } catch (error) {
            throw new Error(
                `Une erreur est survenue lors de la récupération du lien de préremplissage : ${error}`,
            );
        }
    }
</script>

<Squelette {email} nav={true}>
    <h1>Import de dossiers historiques Bougogne-Franche-Comté</h1>

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

        <div class="fr-table">
            <div class="fr-table__wrapper">
                <div class="fr-table__container">
                    <div class="fr-table__content">
                        <table class="tableau-dossier-a-creer">
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
                                {#each lignesAffichéesTableauImport as LigneDossierBFC}
                                    <tr data-row-key="1">
                                        <td>{LigneDossierBFC["OBJET"]}</td>
                                        <td>
                                            <!-- Alerter si le département ne fait pas partie de ceux pris en charge par la DREAL BFC. 
                                             TODO : il faut que cette vérification se fasse après avoir transformé les valeurs des colonnes du tableau pour le dossier Pitchou. 
                                             Plus précisément, il faut vérifier la réponse que l'on donne à la question "Dans quel département se localise majoritairement votre projet ?"-->
                                            {#if String(LigneDossierBFC["Département"] ?? "")
                                                .split("-")
                                                .some((dep) => dep.trim() && !["21", "25", "39", "58", "70", "71", "89", "90"].includes(dep.trim()))}
                                                <span
                                                    class="fr-badge fr-badge--error"
                                                    >{LigneDossierBFC[
                                                        "Département"
                                                    ]}</span
                                                >
                                            {:else}
                                                {LigneDossierBFC["Département"]}
                                            {/if}
                                        </td>
                                        <td class="commentaire"
                                            >{LigneDossierBFC[
                                                "Description avancement dossier avec dates"
                                            ]}</td
                                        >
                                        <td>
                                            {#if ligneDossierEnBDD(LigneDossierBFC)}
                                                <p
                                                    class="fr-badge fr-badge--success"
                                                >
                                                    En base de données
                                                </p>
                                                <a
                                                    href={`/dossier/${nomToDossierId.get(LigneDossierBFC["OBJET"])}`}
                                                    target="_blank"
                                                    class="fr-btn fr-btn--secondary fr-ml-2w"
                                                >
                                                    Ouvrir dossier
                                                </a>
                                            {:else if ligneToLienPréremplissage.get(LigneDossierBFC)}
                                                <a
                                                    href={ligneToLienPréremplissage.get(
                                                        LigneDossierBFC,
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
                                                            LigneDossierBFC,
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
    h2{
        margin-bottom: 1rem;
    }

    .fr-toggle label::before{
        max-width: 5rem;
    }

    .progression{
        display: flex;
        flex-direction: row;
        align-items: center;

        .fr-progress-bar{
            flex:1;

            height: 1.5rem;
            margin-left: 1rem;
            border-radius: 8px;
            overflow: hidden;

            background: var(--background-alt-grey);
            
        }
    }

    .commentaire {
        white-space: pre;
        min-width: 30rem;
    }
    .tableau-dossier-a-creer {
        th,
        td:not(:last-of-type) {
            max-width: 13rem;
            max-height: 2rem;
            overflow: auto;
        }
    }
</style>
