<script>
    // @ts-check
    import clsx from 'clsx';

    /** @import  { TriTableauSuiviDDEP } from '../../types/interfaceUtilisateur.ts' */

    /** @type {TriTableauSuiviDDEP[]} */
    export let tris

    /** @type {TriTableauSuiviDDEP | undefined} */
    export let triSélectionné = undefined

    /** @type {(tri: TriTableauSuiviDDEP) => void} */
    const sélectionnerTri = (tri) => { 
        triSélectionné = tri
        tri.trier()
    }
</script>

<ul class="fr-mt-1w">
    {#each tris as tri}
        <li class="fr-mb-1v">
            <button 
                class={clsx(['fr-pt-1v', 'fr-pb-1v', {"sélectionné": triSélectionné === tri}])} 
                type="button" 
                on:click={() => { sélectionnerTri(tri) }}
            >
                {tri["nom"]}

                {#if tri === triSélectionné}
                    <span class="fr-icon-check-line" aria-hidden="true"></span>
                {/if}
            </button>
        </li>
    {/each}
</ul>

<style lang="scss">

    ul {
        list-style: none;
        pointer-events: auto;
        padding: 0;

        li {
            padding: 0;
            display: flex;
            list-style: none;
        }
    }

    button {
        color: var(--text-mention-grey);
        text-align: left;
        background-color: var(--background-overlap-grey);

        &:hover{
            background-color: var(--background-overlap-grey-hover);
        } 
        &:active{
            background-color:var(--background-overlap-grey-active);
        } 

        box-shadow: inset 0 1px 0 0 var(--border-open-blue-france);

        &.sélectionné { 
            color: var(--text-active-grey);
        }
    }
</style>
