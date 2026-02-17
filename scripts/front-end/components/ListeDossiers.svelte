<script>
    /** @import { DossierRésumé, DossierPhase } from '../../types/API_Pitchou.ts' */
    /** @import { ChangeEventHandler, EventHandler } from "svelte/elements" */
    /** @import { PitchouState } from '../store.js' */
    /** @import { default as Dossier } from '../../types/database/public/Dossier.ts' */
    /** @import { ÉvènementRechercheDossiersDétails } from '../../types/évènement'; */
    import { instructeurSuitDossier, instructeurLaisseDossier } from "../actions/suiviDossier"
    import CarteDossier from "./CarteDossier.svelte"
    import Pagination from './DSFR/Pagination.svelte'
    import { créerFiltreTexte } from "../filtresTexte.js"
    import { SvelteMap } from "svelte/reactivity"
    import { tick } from "svelte"
    import { envoyerÉvènementRechercherUnDossier as _envoyerÉvènementRechercherUnDossier } from '../actions/aarri.js'
    import {phases as toutesLesPhases} from '../affichageDossier.js'

    /**
    * @typedef {Object} Props
    * @property {string} titre
    * @property {string} [email]
    * @property {DossierRésumé[]} dossiers
    * @property {PitchouState['relationSuivis']} [relationSuivis]
    * @property {boolean} [afficherFiltreSansInstructeurice]
    * @property {boolean} [afficherFiltreActionInstructeur]
    * @property {PitchouState['notificationParDossier']} [notificationParDossier]
    * @property {boolean} [activerTriDossierParNotification]
    */
    /** @type {Props} */
    let {
        titre,
        email = '',
        dossiers,
        relationSuivis,
        afficherFiltreSansInstructeurice = false,
        afficherFiltreActionInstructeur = false,
        notificationParDossier = new SvelteMap(),
        activerTriDossierParNotification = false,
    } = $props();

    const NOMBRE_DOSSIERS_PAR_PAGE = 10

    /** @type {Map<'texte' | 'sansInstructeurice' | 'phase' | 'actionInstructeur' | 'nouveauté', (d: DossierRésumé) => boolean>} */
    const tousLesFiltres = new SvelteMap()

    const dossiersFiltrés = $derived.by(() => {
        let resultat = [...dossiers];

        for(const filtre of tousLesFiltres.values()){
            resultat = resultat.filter(filtre)
        }

        return resultat;
    })

    function envoyerÉvènementRechercherUnDossier() {
        /**
         * @type {ÉvènementRechercheDossiersDétails['filtres']}
         */
        const filtres = {
            sansInstructeurice: tousLesFiltres.has('sansInstructeurice')
        }

        if (texteÀChercher) {
            filtres.texte = texteÀChercher
        }

        if (tousLesFiltres.has('phase') && phaseSélectionnée) {
            filtres.phases = [ phaseSélectionnée ]
        }

        if (tousLesFiltres.has('actionInstructeur')) {
            filtres.prochaineActionAttenduePar = [ 'Instructeur' ]
        }

        _envoyerÉvènementRechercherUnDossier({ filtres, nombreRésultats: dossiersFiltrés.length })
    }

    let numéroDeLaPageSélectionnée = $state(1)

    let statusMessage = $state('')

    /** @type {HTMLHeadingElement | undefined} */
    let titrePageElement = $state()

    /** Nombre total de pages */
    const nombreDePages = $derived.by(() => {
        if (dossiersFiltrés.length === 0) return 1
        return Math.ceil(dossiersFiltrés.length / NOMBRE_DOSSIERS_PAR_PAGE)
    })

    /** Texte à afficher pour la page */
    const textePage = $derived.by(() => {
        if (tousLesFiltres.has('texte') && texteÀChercher && texteÀChercher.trim() !== '') {
            return `Résultats de recherche pour «${texteÀChercher}» : Page ${numéroDeLaPageSélectionnée} sur ${nombreDePages}`
        }
        return `Page ${numéroDeLaPageSélectionnée} sur ${nombreDePages}`
    })

    /**
     * Met à jour le message aria-live avec le nombre de dossiers filtrés
     */
    function mettreÀJourMessageFiltres() {
        const nombreFiltrés = dossiersFiltrés.length
        const nombreTotal = dossiers.length

        statusMessage = `${nombreFiltrés} dossiers affichés sur ${nombreTotal}`
        setTimeout(() => { statusMessage = ''}, 400)
    }

    /** @type {string | undefined} */
    let texteÀChercher = $state()

    /** @type {DossierPhase | undefined} */
    let phaseSélectionnée = $state()

    const dossierIdsSuivisParInstructeurActuel = $derived(relationSuivis?.get(email))

    /** @typedef {() => void} SelectionneurPage */
    /** @type {undefined | [undefined, ...rest: SelectionneurPage[]]} */
    let selectionneursPage = $derived.by(() => {
        if (dossiersFiltrés.length >= NOMBRE_DOSSIERS_PAR_PAGE + 1) {

            /** @type {SelectionneurPage[]} */
            const sélectionneurs = [...Array.from({ length: nombreDePages }, (_v,i) => () => {
                numéroDeLaPageSélectionnée = i+1
                tick().then(() => titrePageElement?.focus())
            })]

            return [undefined, ...sélectionneurs]
        } else {
            return undefined
        }
    })

    /** @type {typeof dossiers} */
    let dossiersAffichés = $derived.by(() => {
        // On affiche les dossiers triés d'abord par date de dernière modification (nouveauté) la plus récente
        // puis par date de dépôt
        const dossiersTriés = [...dossiersFiltrés].sort((a, b) => {

            const notificationA = notificationParDossier.get(a.id)
            const notificationB = notificationParDossier.get(b.id)
            
            const dateNotificationNonVueA = notificationA?.vue === false ? notificationA.updated_at : undefined;
            const dateNotificationNonVueB = notificationB?.vue === false ? notificationB.updated_at : undefined;

            if (activerTriDossierParNotification === true) {
                if (dateNotificationNonVueA && dateNotificationNonVueB) {
                    return dateNotificationNonVueA > dateNotificationNonVueB ? -1 : 1
                } else if (dateNotificationNonVueA && dateNotificationNonVueB === undefined) {
                    return -1
                } else if (dateNotificationNonVueA === undefined && dateNotificationNonVueB) {
                    return 1
                }
            }

            return a.date_dépôt > b.date_dépôt ? -1 : 1
            
        })

        if(!selectionneursPage)
            return dossiersTriés
        else{
            return dossiersTriés.slice(
                NOMBRE_DOSSIERS_PAR_PAGE*(numéroDeLaPageSélectionnée-1),
                NOMBRE_DOSSIERS_PAR_PAGE*numéroDeLaPageSélectionnée
            )
        }
    })

    /** @type {EventHandler<SubmitEvent, HTMLFormElement>}*/
    function soumettreTextePourRecherche (e) {
        e.preventDefault()
        if (!texteÀChercher || texteÀChercher.trim() === '') {
            tousLesFiltres.delete('texte')
        } else {
            tousLesFiltres.set('texte', créerFiltreTexte(texteÀChercher, dossiers))
        }
        envoyerÉvènementRechercherUnDossier()
    }

    /**
     * Vérifie si un dossier est suivi par au moins une personne
     * @param {Dossier['id']} dossierId
     * @returns {boolean}
     */
    function dossierEstSuivi(dossierId) {
        if (!relationSuivis) return false
        for (const dossiersSuivis of relationSuivis.values()) {
            if (dossiersSuivis.has(dossierId)) {
                return true
            }
        }
        return false
    }

    /**
     * Réinitialise la page à 1 quand on change un filtre
     */
    function réinitialiserPage() {
        numéroDeLaPageSélectionnée = 1
        mettreÀJourMessageFiltres()
    }

    function toggleFiltreSansInstructeurice() {
        if (!tousLesFiltres.has('sansInstructeurice')) {
            tousLesFiltres.set('sansInstructeurice', (dossier) => !dossierEstSuivi(dossier.id))
        } else {
            tousLesFiltres.delete('sansInstructeurice')
        }
        envoyerÉvènementRechercherUnDossier()
        réinitialiserPage()
    }

    function toggleFiltreActionInstructeur() {
        if (!tousLesFiltres.has('actionInstructeur')) {
            tousLesFiltres.set('actionInstructeur', (dossier) => dossier.prochaine_action_attendue_par === 'Instructeur')
        } else {
            tousLesFiltres.delete('actionInstructeur')
        }
        envoyerÉvènementRechercherUnDossier()
        réinitialiserPage()
    }

    function toggleFiltreNouveauté() {
        if (!tousLesFiltres.has('nouveauté')) {
            tousLesFiltres.set('nouveauté', (dossier) => notificationParDossier.get(dossier.id)?.vue === false)
        } else {
            tousLesFiltres.delete('nouveauté')
        }
        envoyerÉvènementRechercherUnDossier()
        réinitialiserPage()
    }

    /**
     * @type {ChangeEventHandler<HTMLSelectElement>}
     */
    function sélectionnerPhase(e) {
        e.preventDefault()
        const phase =  e.currentTarget.value
        if (phase === "") {
            tousLesFiltres.delete('phase')
        } else {
            // Sélectionner la phase
            tousLesFiltres.set('phase', (dossier) => dossier.phase === phase)
        }
        envoyerÉvènementRechercherUnDossier()
        réinitialiserPage()
    }

    /**
     *
     * @param {Dossier['id']} id
     */
    function instructeurActuelSuitDossier(id) {
        return instructeurSuitDossier(email, id)
    }

    /**
     *
     * @param {Dossier['id']} id
     */
    function instructeurActuelLaisseDossier(id) {
        return instructeurLaisseDossier(email, id)
    }
</script>

<div class="en-tête">
    <div class="titre-et-barre-de-recherche">
        <h1>{titre}</h1>
        <form onsubmit="{soumettreTextePourRecherche}">
            <div class="fr-search-bar barre-de-recherche" role="search">
                <label class="fr-label" for="search-input">Rechercher un dossier</label>
                <input bind:value="{texteÀChercher}" name="texte-de-recherche" class="fr-input" aria-describedby="search-input-messages" placeholder="Rechercher" id="search-input" type="search">
            <button title="Rechercher un dossier" type="submit" class="fr-btn">Rechercher un dossier</button>
            </div>
        </form>
    </div>
    <div aria-live="polite" aria-atomic="true" class="fr-sr-only">
        {#if statusMessage }
            {statusMessage}
        {/if}
    </div>
    <fieldset>
        <legend class="fr-sr-only">Filtrer…</legend>
        <div class="filtres-et-compteur-dossiers">
            <div class="filtres">
                <div class="fr-select-group filtre-par-phase">
                    <label class="fr-label" for="select-phase"> Filtrer par phase </label>
                    <select bind:value={phaseSélectionnée} onchange={sélectionnerPhase} aria-label="Phase choisie" class="fr-select select-phase" id="select-phase" name="select-phase">
                        <option value="" selected>Toutes les phases</option>
                        {#each toutesLesPhases as phase}
                            <option value={phase}>{phase}</option>
                        {/each}
                    </select>
                </div>
                    {#if afficherFiltreSansInstructeurice}
                        <button
                            type="button"
                            class="fr-tag filtre-sans-instructeurice"
                            onclick={toggleFiltreSansInstructeurice}
                            aria-pressed={tousLesFiltres.has('sansInstructeurice')}
                        >
                            Dossier sans instructeur·ice
                        </button>
                    {/if}
                    {#if afficherFiltreActionInstructeur}
                        <button
                            type="button"
                            class="fr-tag"
                            onclick={toggleFiltreActionInstructeur}
                            aria-pressed={tousLesFiltres.has('actionInstructeur')}
                        >
                            Action : Instructeur·ice
                        </button>
                    {/if}
                    <button
                        type="button"
                        class="fr-tag"
                        onclick={toggleFiltreNouveauté}
                        aria-pressed={tousLesFiltres.has('nouveauté')}
                        
                    >
                        Nouveauté
                    </button>
            </div>
            <p class="compteur" aria-label='compteur de dossier'>
                <span class="fr-text--lead">{dossiersFiltrés.length}</span><span class="fr-text--lg">/{dossiers.length} dossiers</span>
            </p>
        </div>
    </fieldset>
    <h2 bind:this={titrePageElement} tabindex="-1" class="titre-page">{textePage}</h2>
</div>
{#if dossiersAffichés.length >= 1}
    <div class="liste-des-dossiers fr-mb-2w fr-py-4w fr-px-4w fr-px-md-15w">
        <ul>
            {#each dossiersAffichés as dossier (dossier.id)}
                <li>
                    <CarteDossier 
                        {dossier} 
                        {instructeurActuelSuitDossier} 
                        {instructeurActuelLaisseDossier} 
                        dossierSuiviParInstructeurActuel={dossierIdsSuivisParInstructeurActuel?.has(dossier.id)} 
                        nouveautéVueParInstructeur={notificationParDossier.get(dossier.id)?.vue}
                    />
                </li>
            {/each}
        </ul>
    </div>
{:else}
    <p>
        Aucun dossier n'a été trouvé.
    </p>
{/if}
{#if selectionneursPage}
    <Pagination {selectionneursPage} pageActuelle={selectionneursPage[numéroDeLaPageSélectionnée]}></Pagination>
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
            margin-bottom: .25rem;
        }

        .filtre-par-phase{
            margin-bottom: 0;
            @media (max-width: 768px) {
                margin-bottom: 1rem;
            }
        }

        .filtre-sans-instructeurice {
            margin-bottom: .25rem;
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
                    gap: .5rem;
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
