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

    /** @type {HTMLHeadingElement | undefined} */
    let refTitreH1 = $state()

    /** @typedef {() => void} SelectionneurPage */
    /** @type {undefined | [undefined, ...rest: SelectionneurPage[]]} */
    let selectionneursPage = $derived.by(() => {
        if (dossiers.length >= NOMBRE_DOSSIERS_PAR_PAGE + 1) {
            const nombreDePages = Math.ceil(dossiers.length/NOMBRE_DOSSIERS_PAR_PAGE)

            /** @type {SelectionneurPage[]} */
            const sélectionneurs = [...Array.from({ length: nombreDePages }, (_v,i) => () => {
                numéroDeLaPageSélectionnée = i+1
                if (refTitreH1) {
                    refTitreH1.scrollIntoView()
                }
            })]
            return [undefined, ...sélectionneurs]
        } else {
            return undefined
        }
    })

    /** @type {typeof dossiers} */
    let dossiersAffichés = $derived.by(() => {
        if(!selectionneursPage)
            return dossiers
        else{
            return dossiers.slice(
                NOMBRE_DOSSIERS_PAR_PAGE*(numéroDeLaPageSélectionnée-1),
                NOMBRE_DOSSIERS_PAR_PAGE*numéroDeLaPageSélectionnée
            )
        }
    })  
</script>

<Squelette {email}>
    <h1 bind:this={refTitreH1} >Mes dossiers</h1>
    <div class="liste-des-dossiers fr-mb-2w fr-p-1w">
        {#each dossiersAffichés as dossier}
            <ul>
                <li><CarteDossier {dossier} /></li>
            </ul>
        {/each}
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
    }

    li:not(:last-child) {
      margin-bottom: 1rem;
    }
</style>