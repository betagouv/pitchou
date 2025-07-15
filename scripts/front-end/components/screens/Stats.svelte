<script>
    //@ts-check
    import Loader from '../Loader.svelte';
    import Squelette from '../Squelette.svelte'
    import StatsContenu from '../stats/StatsContenu.svelte'

    /** @import {ComponentProps} from 'svelte' */
    /** @import {StatsPubliques} from '../../../types/API_Pitchou.ts' */
    
    /** @type {Promise<StatsPubliques>} */
    export let statsP

    /** @type {string | undefined} */
    export let email = undefined

    /** @type {ComponentProps<Squelette>['erreurs']} */
    export let erreurs;
</script>

<Squelette {email} nav={false} {erreurs} >
    {#await statsP} 
        <Loader></Loader>
    {:then stats}
        <StatsContenu {stats} />
    {:catch error}
        <div class="fr-alert fr-alert--error fr-mb-3w">
            <h3 class="fr-alert__title">Une erreur est survenue lors du chargement des statistiques :</h3>
            <p>{error.message}</p>
        </div>
    {/await}
</Squelette>

<style lang="scss">
    .fr-card {
        border: 1px solid var(--border-default-grey);
        border-radius: 8px;
        padding: 1.5rem;
    }
    .stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 1rem;
        background-color: var(--background-alt-grey);
        border-radius: 6px;
    }
    .stat-number {
        font-size: 2rem;
        font-weight: bold;
        color: var(--text-default-info);
        display: block;
    }
    .stat-label {
        font-size: 0.875rem;
        color: var(--text-mention-grey);
        margin-top: 0.25rem;
    }
    .stat-item.total-stat {
        background-color: var(--background-action-high-blue-france);
        color: white;
    }
    .stat-item.total-stat .stat-number {
        color: white;
    }
    .stat-item.total-stat .stat-label {
        color: white;
    }
    .progress-stats-wrapper {
        width: 100%;
        margin: 2rem 0 1rem 0;
    }
    .progress-labels {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }
    .progress-label {
        display: flex;
        flex-direction: column;
        align-items: center;
        font-size: 1rem;
    }
    .progress-label--left .stat-number {
        color: var(--text-default-info);
    }
    .progress-label--right .stat-number {
        color: var(--text-mention-grey);
    }
    .progress-total {
        text-align: center;
        margin-top: 0.5rem;
    }
</style>
