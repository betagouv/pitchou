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

    /** @type {string | undefined} */
    let texteÀChercher = $state()

    /** @type {HTMLDivElement | undefined} */
    let compteurDossiersElement = $state()

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
            const nombreDePages = Math.ceil(dossiersFiltrés.length/NOMBRE_DOSSIERS_PAR_PAGE)

            /** @type {SelectionneurPage[]} */
            const sélectionneurs = [...Array.from({ length: nombreDePages }, (_v,i) => () => {
                numéroDeLaPageSélectionnée = i+1
                window.scrollTo(0,0)
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
            if (dossiersFiltrés.length > 0 && compteurDossiersElement) {
                compteurDossiersElement.focus()
            }
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
                <div class="fr-messages-group" id="search-input-messages" aria-live="polite">
            </div>
            <button title="Rechercher un dossier" type="submit" class="fr-btn">Rechercher un dossier</button>
            </div>
        </form>
    </div>
    <div class="filtres-et-compteur-dossiers">
        <div class="filtres">
            <span class="fr-h4 texte-filtrer">Filtrer...</span>
        <div class="fr-select-group div-select-phase">
            <select aria-label="Phase" class="fr-select select-phase" aria-describedby="select-hint-messages" id="select-hint" name="select-hint" bind:value="{phaseSélectionnée}" onchange="{sélectionnerPhase}">
                <option value="" selected aria-label={'Sélectionner une phase'}>par phase</option>
                {#each toutesLesPhases as phase}
                    <option value={phase}>{phase}</option>
                {/each}
            </select>
            <div class="fr-messages-group" id="select-hint-messages" aria-live="polite">
            </div>
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
        <div bind:this={compteurDossiersElement} tabindex="-1">
        <span class="fr-text--lead">{dossiersFiltrés.length}</span><span class="fr-text--lg">/{dossiers.length} dossiers</span>
        </div>
    </div>
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
    h1 {
        margin-bottom: 0;
    }
    .liste-des-dossiers {
        background: var(--background-contrast-grey);
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
        margin-bottom: 1rem;
        margin-top: 2rem;
        gap: 2rem;

        .titre-et-barre-de-recherche {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            @media (max-width: 768px) {
                flex-direction: column;
                justify-content: stretch;
                align-items: start;
            }
        }

        .filtres-et-compteur-dossiers {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;

            @media (max-width: 768px) {
                flex-direction: column;
                align-items: start;
            }

            .filtres {
                display: flex;
                flex-direction: row;
                gap: 1rem;
                align-items: center;
                .texte-filtrer {
                    margin: 0;
                }

                @media (max-width: 768px) {
                    flex-direction: column;
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

    .div-select-phase {
        margin-bottom: unset;
        box-shadow: inset 0 0 0 1px var(--border-default-grey);
        .select-phase {
            background-color: unset;
            box-shadow: unset;
        }
    }
</style>

