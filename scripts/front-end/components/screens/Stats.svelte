<script>
    //@ts-check
    import Loader from '../Loader.svelte';
    import Squelette from '../Squelette.svelte'
    import StatsContenu from '../stats/StatsContenu.svelte'

    /** @import {ComponentProps} from 'svelte' */
    /** @import {StatsPubliques} from '../../../types/API_Pitchou.ts' */

    
    /**
     * @typedef {Object} Props
     * @property {Promise<StatsPubliques>} statsP
     * @property {string | undefined} [email]
     * @property {ComponentProps<typeof Squelette>['erreurs']} erreurs
     */

    /** @type {Props} */
    let { statsP, email = undefined, erreurs } = $props();
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
</style>
