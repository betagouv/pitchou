<script>
    /** @import { DossierRésumé } from '../../../types/API_Pitchou.ts' */
    import Squelette from "../Squelette.svelte"
    import CarteDossier from "../CarteDossier.svelte"
    import Pagination from '../DSFR/Pagination.svelte'

    /**
    * @typedef {Object} Props
    * @property {string | undefined} [email]
    * @property {DossierRésumé[]} dossiers
    */
    /** @type {Props} */
    let { 
            email = undefined,
            dossiers,
        } = $props();

    const NOMBRE_DOSSIERS_PAR_PAGE = 10

    let numéroDeLaPageSélectionnée = $state(1)

    /** @typedef {() => void} SelectionneurPage */
    /** @type {undefined | [undefined, ...rest: SelectionneurPage[]]} */
    let selectionneursPage = $derived.by(() => {
        if (dossiers.length >= NOMBRE_DOSSIERS_PAR_PAGE + 1) {
            const nombreDePages = Math.ceil(dossiers.length/NOMBRE_DOSSIERS_PAR_PAGE)

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
        const dossiersTriés = [...dossiers].sort((a,b) => {
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
</script>

<Squelette {email} title="Tous les dossiers">
    <h1>Tous les dossiers</h1>
    <div class="liste-des-dossiers fr-mb-2w fr-py-4w fr-px-15w">
        <ul>
            {#each dossiersAffichés as dossier}
                <li>
                    <CarteDossier {dossier} />
                </li>   
            {/each}
        </ul>
    </div>
    {#if selectionneursPage}
        <Pagination {selectionneursPage} pageActuelle={selectionneursPage[numéroDeLaPageSélectionnée]}></Pagination>
    {/if}
</Squelette>

<style>
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
</style>