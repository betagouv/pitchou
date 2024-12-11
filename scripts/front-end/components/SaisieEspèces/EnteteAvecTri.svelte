<script>
    // @ts-check

    /** @type {string} */
    export let label

    /** @type {Map<string, function>} */
    export let tris

    /** @type {string} */
    let triSélectionné = ""

    /** @type {(tri: [string, function]) => void} */
    const sélectionnerTri = (tri) => { 
        triSélectionné = tri[0]
        tri[1]()
    }
</script>

<div class="entete-avec-tri">
    <p>{label}</p>

    <ul>
        {#each /** @type {[string, function]} */[...tris] as tri}
            <li>
                <button type="button" on:click={() => { sélectionnerTri(tri) }}  class={ triSélectionné === tri[0] ? "sélectionné" : "" }>
                    {tri[0]}

                    {#if tri[0] === triSélectionné}
                        <span class="fr-icon-check-line" aria-hidden="true"></span>
                    {/if}
                </button>
            </li>
        {/each}
    </ul>
</div>

<style lang="scss">
    .entete-avec-tri {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }

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
        --idle: transparent;
        --hover: var(--background-overlap-grey-hover);
        --active: var(--background-overlap-grey-active);
        box-shadow: inset 0 1px 0 0 var(--border-open-blue-france);

        &.sélectionné { 
            color: var(--text-active-grey);
        }
    }
</style>
