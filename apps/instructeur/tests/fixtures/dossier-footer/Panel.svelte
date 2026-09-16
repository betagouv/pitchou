<script>
  const id = $props.id();
  let draft = $state("");
</script>

<div class="fixture-content">
  <label for="{id}-draft">Draft</label>
  <input id="{id}-draft" bind:value={draft} />
  <button class="fr-btn" data-fr-opened="false" aria-controls="{id}-modal"> Open dialog </button>
  <dialog id="{id}-modal" class="fr-modal" aria-labelledby="{id}-title">
    <div class="fr-container fr-container--fluid fr-container-md">
      <div class="fr-grid-row fr-grid-row--center">
        <div class="fr-col-12 fr-col-md-6">
          <div class="fr-modal__body">
            <div class="fr-modal__header">
              <button class="fr-btn--close fr-btn" aria-controls="{id}-modal">Close</button>
            </div>
            <div class="fr-modal__content">
              <h2 id="{id}-title" class="fr-modal__title">Test dialog</h2>
              <p>The overlay must cover both the panel and the footer.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </dialog>
</div>
