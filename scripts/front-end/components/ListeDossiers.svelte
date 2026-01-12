<script>
    /** @import { DossierRésumé, DossierPhase } from '../../types/API_Pitchou.ts' */
	/** @import { ChangeEventHandler, EventHandler } from "svelte/elements" */
    /** @import { PitchouState } from '../store.js' */
    /** @import { default as Dossier } from '../../types/database/public/Dossier.ts' */
	import { instructeurSuitDossier, instructeurLaisseDossier } from "../actions/suiviDossier"
    import CarteDossier from "./CarteDossier.svelte"
    import Pagination from './DSFR/Pagination.svelte'
	import { créerFiltreTexte } from "../filtresTexte.js"
	import { SvelteMap } from "svelte/reactivity"
	import { tick } from "svelte"

    /**
    * @typedef {Object} Props
    * @property {string} titre
    * @property {string} [email]
    * @property {DossierRésumé[]} dossiers
    * @property {PitchouState['relationSuivis']} [relationSuivis]
    * @property {boolean} [afficherFiltreSansInstructeurice]
    * @property {boolean} [afficherFiltreActionInstructeur]
    */
    /** @type {Props} */
    let { 
            titre,
            email = '',
            dossiers,
            relationSuivis,
            afficherFiltreSansInstructeurice = false,
            afficherFiltreActionInstructeur = false
        } = $props();

    const NOMBRE_DOSSIERS_PAR_PAGE = 10

    /** @type {Map<'texte' | 'sansInstructeurice' | 'phase' | 'actionInstructeur', (d: DossierRésumé) => boolean>} */
    const tousLesFiltres = new SvelteMap()

    const dossiersFiltrés = $derived.by(() => {
    let resultat = [...dossiers];
    
    for(const filtre of tousLesFiltres.values()){
        resultat = resultat.filter(filtre)
    }
    
    return resultat;
})

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
        setTimeout(() => { statusMessage = ''}, 100)
    }

    /** @type {string | undefined} */
    let texteÀChercher = $state()

    /** @type {DossierPhase | undefined} */
    let phaseSélectionnée = $state()

    /** @type {DossierPhase[]} */
    const toutesLesPhases = [
        "Accompagnement amont",
        "Étude recevabilité DDEP",
        "Instruction",
        "Contrôle",
        "Classé sans suite",
        "Obligations terminées"
    ]

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
        // On affiche les dossiers triés par date de dépôt la plus récente
        const dossiersTriés = [...dossiersFiltrés].sort((a,b) => {
            const dateA = a.date_dépôt ?? new Date(0);
            const dateB = b.date_dépôt ?? new Date(0);
            return dateA < dateB ? 1 : -1;
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
        }
        if (texteÀChercher && texteÀChercher.trim() !== '') {
            tousLesFiltres.set('texte', créerFiltreTexte(texteÀChercher, dossiers))
        }

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
        réinitialiserPage()
    }

    function toggleFiltreActionInstructeur() {
        if (!tousLesFiltres.has('actionInstructeur')) {
            tousLesFiltres.set('actionInstructeur', (dossier) => dossier.prochaine_action_attendue_par === 'Instructeur')
        } else {
            tousLesFiltres.delete('actionInstructeur')
        }
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
                <div class="fr-select-group">
                    <label class="fr-label" for="select-phase"> Filtrer par phase </label>
                    <select aria-label="Phase choisie" class="fr-select select-phase" id="select-phase" name="select-phase" bind:value="{phaseSélectionnée}" onchange="{sélectionnerPhase}">
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
            </div>
            <p>
                <span class="fr-text--lead">{dossiersFiltrés.length}</span><span class="fr-text--lg">/{dossiers.length} dossiers</span>
            </p>
        </div>
    </fieldset>
    <h2 bind:this={titrePageElement} tabindex="-1" class="titre-page">{textePage}</h2>
</div>
{#if dossiersAffichés.length >= 1}
    <div class="liste-des-dossiers fr-mb-2w fr-py-4w fr-px-4w fr-px-md-15w">
        <ul>
            {#each dossiersAffichés as dossier}
                <li>
                    <CarteDossier {dossier} {instructeurActuelSuitDossier} {instructeurActuelLaisseDossier} dossierSuiviParInstructeurActuel={dossierIdsSuivisParInstructeurActuel?.has(dossier.id)} />
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
        margin-top: 2rem;

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

        .filtres-et-compteur-dossiers {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;

            @media (max-width: 768px) {
                flex-direction: column;
                align-items: center;
                gap: 1rem;
            }

            .filtres {
                display: flex;
                flex-direction: row;
                gap: 1rem;
                align-items: center;

                @media (max-width: 768px) {
                    flex-direction: column;
                    gap: 0;
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
    }

    .titre-page:focus {
        outline: 2px solid var(--bf500);
        outline-offset: 2px;
    }
</style>

