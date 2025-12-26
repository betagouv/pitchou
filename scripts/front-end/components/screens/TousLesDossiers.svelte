<script>
    /** @import { DossierRésumé } from '../../../types/API_Pitchou.ts' */
	/** @import { EventHandler } from "svelte/elements" */
    /** @import { PitchouState } from '../../store.js' */
    /** @import {default as Dossier} from '../../../types/database/public/Dossier.ts' */
	import { instructeurSuitDossier, instructeurLaisseDossier } from "../../actions/suiviDossier"
    import Squelette from "../Squelette.svelte"
    import CarteDossier from "../CarteDossier.svelte"
    import Pagination from '../DSFR/Pagination.svelte'
	import { créerFiltreTexte } from "../../filtresTexte.js"
	import { SvelteMap } from "svelte/reactivity"

    /**
    * @typedef {Object} Props
    * @property {string} [email]
    * @property {DossierRésumé[]} dossiers
    * @property {PitchouState['relationSuivis']} [relationSuivis]
    * @property {PitchouState['erreurs']} [erreurs]
    */
    /** @type {Props} */
    let { 
            email = '',
            dossiers,
            relationSuivis,
            erreurs = new Set(),
        } = $props();

    const NOMBRE_DOSSIERS_PAR_PAGE = 10

    /** @type {Map<'texte' | 'sansInstructeurice', (d: DossierRésumé) => boolean>} */
    const tousLesFiltres = new SvelteMap()

    const dossiersFiltrés = $derived.by(() => {
    let resultat = [...dossiers];
    
    for(const filtre of tousLesFiltres.values()){
        resultat = resultat.filter(filtre)
    }
    
    return resultat;
})

    let numéroDeLaPageSélectionnée = $state(1)

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
        const data = new FormData(e.currentTarget)
        const texteÀChercher = data.get("texte-de-recherche")?.valueOf();

        if (typeof texteÀChercher === 'string') {
            tousLesFiltres.set('texte', créerFiltreTexte(texteÀChercher, dossiers))
        }
        e.currentTarget.reset()
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

    function toggleFiltreSansInstructeurice() {
        if (!tousLesFiltres.has('sansInstructeurice')) {
            tousLesFiltres.set('sansInstructeurice', (dossier) => !dossierEstSuivi(dossier.id))
        } else {
            tousLesFiltres.delete('sansInstructeurice')
        }
        // Réinitialiser la page à 1 quand on change le filtre
        numéroDeLaPageSélectionnée = 1
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

<Squelette {email} {erreurs} title="Tous les dossiers">
    <div class="en-tête">
        <div class="titre-et-barre-de-recherche">
            <h1>Tous les dossiers</h1>
            <form onsubmit="{soumettreTextePourRecherche}">
                <div class="fr-search-bar barre-de-recherche" role="search">
                    <label class="fr-label" for="search-input">Rechercher un dossier</label>
                    <input name="texte-de-recherche" class="fr-input" aria-describedby="search-input-messages" placeholder="Rechercher" id="search-input" type="search">
                    <div class="fr-messages-group" id="search-input-messages" aria-live="polite">
                </div>
                <button title="Rechercher un dossier" type="submit" class="fr-btn">Rechercher un dossier</button>
                </div>
            </form>
        </div>
        <div>
            <button 
                type="button"
                class="fr-tag"
                onclick={toggleFiltreSansInstructeurice}
                aria-pressed={tousLesFiltres.has('sansInstructeurice')}
            >
                Dossier sans instructeur·ice
            </button>
            <span class="compteur-dossiers">{dossiersFiltrés.length}/{dossiers.length} dossiers</span>
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
</Squelette>

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
        margin-bottom: 2rem;
        .titre-et-barre-de-recherche {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            @media (max-width: 768px) {
                flex-direction: column;
                justify-content: stretch;
            }
        }
    }

    .barre-de-recherche {
        min-width: 28rem;
    }

    .compteur-dossiers {
        color: var(--text-mention-grey);
        font-size: 0.875rem;
        font-weight: 400;
    }
</style>