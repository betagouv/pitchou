<script>
    /** @import {Snippet} from 'svelte' */
    /**
     * @typedef {Object} Props
     * @property {Snippet} [boutonOuvrir]
     * @property {Snippet} contenu
     * @property {string} id
     */
    /** @type {Props} */
    let { 
        boutonOuvrir,
        contenu,
        id
     } = $props();


</script>

{#if boutonOuvrir}
    {@render boutonOuvrir()}
{:else}
    <button class="fr-btn" data-fr-opened="false" aria-controls={id}>
        Ouvrir
    </button>
{/if}

<dialog aria-labelledby="fr-modal-title-modal-1" id={id} class="fr-modal">
    <div class="fr-container fr-container--fluid fr-container-md">
        <div class="fr-grid-row fr-grid-row--center">
            <div class="fr-col-12 fr-col-md-8 fr-col-lg-8">
                <div class="fr-modal__body">
                    <div class="fr-modal__header">
                        <button class="fr-btn--close fr-btn" title="Fermer la fenêtre modale" aria-controls={id}>Fermer</button>
                    </div>
                    <div class="fr-modal__content">
                        {@render contenu()}
                    </div>
                </div>
            </div>
        </div>
    </div>
</dialog>