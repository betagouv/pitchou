<script>
    // @ts-check

    /* @type {string} */
    export let label

    /* @type {Map<string, function>} */
    export let tris

    /* @type {[string, function][]} */
    const trisAffichés = [...tris]

    /* @type {[string, function]} */
    $: triSélectionné = null

    /** @param {[string, function]} tri */
    const onClick = (tri) => {
        /** @param {Event} e */
        return (e) => {
            triSélectionné = tri
            e.preventDefault()
            tri[1]()
        }
    }
</script>

<div class="entete-avec-tri">
    <p>{label}</p>
       

    <ul>
        {#each trisAffichés as tri}
            <li>
                <button on:click={onClick(tri)}  class={ triSélectionné === tri ? "sélectionné" : "" }>
                    {tri[0]}

                    {#if tri === triSélectionné}
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
