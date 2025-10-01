<script>
    //@ts-check
    import Squelette from '../Squelette.svelte'
    import Loader from '../Loader.svelte'

    /** @type {{ title?: string, html?: string }} */
    let { title = 'Accessibilité', html = '' } = $props();
</script>

<Squelette nav={false} {title}>
    <div class="fr-container fr-my-6w">
        {#if html === ''}
            <Loader></Loader>
        {:else}
            <div class="fr-content" aria-labelledby="titre-declaration" >
                {@html html}
            </div>
        {/if}
    </div>
</Squelette>


