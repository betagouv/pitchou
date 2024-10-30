<script>
    // @ts-check

    /* @type {string} */
    export let label

    /* @type {Map<string, function>} */
    export let tris

    const trisAffichés = [...tris]

    let estDéplié = false
</script>

<details class="dropdown-tri" bind:open={estDéplié}>
    <summary>
        {label} 
        <span class="fr-icon-arrow-down-s-line" aria-hidden="true"></span>
    </summary>

    <ul>
        {#each trisAffichés as tri}
            <li>
                <button on:click={(e) => {
                    e.preventDefault()
                    estDéplié = false
                    tri[1]()
                }}>{tri[0]}</button>
            </li>
        {/each}
    </ul>
</details>

<style lang="scss">
    details {
        align-self: end;
        position: relative;
        display: inline;
        margin: 0;
        z-index: 1;

        summary {
            white-space: nowrap;
        }
        
        summary::-webkit-details-marker,
        summary::marker {
            display: none; 
            content: "";
        }

        ul {
            position: absolute;
            list-style: none;
            width: 7rem;
            pointer-events: auto;
            padding: 0;
            margin-bottom: 2rem;
            background-color: var(--background-overlap-grey);
            --idle: transparent;
            --hover: var(--background-overlap-grey-hover);
            --active: var(--background-overlap-grey-active);
            box-shadow: inset 0 1px 0 0 var(--border-open-blue-france);

            li {
                padding: 0;
                display: flex;
                list-style: none;
            }
        }

        button {
            padding: 0.5rem;
            display: block;
            width: 100%;
            text-align: left;
        }
    }
</style>
