<script>
    // @ts-check

    /** @type {Set<{nom: string, tri: function}>} */
    export let tris

    /** @type {{nom: string, tri: function}|undefined} */
    export let triSélectionné = undefined

    /** @type {(tri: {nom: string, tri: function}) => void} */
    const sélectionnerTri = (tri) => { 
        triSélectionné = tri
        tri["tri"]()
    }
</script>

<ul>
    {#each [...tris] as tri}
        <li>
            <button type="button" on:click={() => { sélectionnerTri(tri) }}  class={ triSélectionné === tri ? "sélectionné" : "" }>
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
        margin-top: 0.25rem;

        li {
            padding: 0;
            display: flex;
            list-style: none;
        }
    }

    button {
        color: var(--text-mention-grey);
        padding: 0.5rem;
        text-align: left;
        margin-bottom: 0.25rem;
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
