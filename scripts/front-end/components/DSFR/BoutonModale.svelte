<script>
    export let id;

</script>

<button class="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-chat-3-line" data-fr-opened="false" aria-controls={id}>
    <slot name="contenu-bouton">Ouvrir</slot>
</button>

<dialog aria-labelledby="fr-modal-title-modal-1" id={id} class="fr-modal">
    <div class="fr-container fr-container--fluid fr-container-md">
        <div class="fr-grid-row fr-grid-row--center">
            <div class="fr-col-12 fr-col-md-8 fr-col-lg-8">
                <div class="fr-modal__body">
                    <div class="fr-modal__header">
                        <button class="fr-btn--close fr-btn" title="Fermer la fenêtre modale" aria-controls={id}>Fermer</button>
                    </div>
                    <div class="fr-modal__content">
                        <slot name="titre-modale"></slot>
                        <slot name="contenu-modale"></slot>
                    </div>
                </div>
            </div>
        </div>
    </div>
</dialog>