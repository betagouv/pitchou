<script>
	import TagPhase from "./TagPhase.svelte"

</script>
<div class="carte fr-p-2w">
    <div class="en-tête">
        <p>Lotissement Pocomitis Le Moussot IMMORCORPORATION</p>
    </div>

    <div class="contenu">
        <TagPhase phase={'Accompagnement amont'} />
        <div>
            <span class="fr-icon-user-fill fr-icon--sm" aria-hidden="true">
                Instructeur.ice
            </span>
        </div>
        <div>
            <span class="fr-icon-calendar-event-line fr-icon--sm" aria-hidden="true">
                17/08/2024
            </span>
        </div>
    </div>
</div>

<style>
    .carte {
        background: var(--background-default-grey);
        border-radius: 0.25rem;
    }

    .en-tête {
        display: flex;
        flex-direction: row;
    }

    .contenu {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
</style>