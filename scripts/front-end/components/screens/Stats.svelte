<script lang="ts">
    //@ts-check
    import Squelette from '../Squelette.svelte'

    /** @type {string | undefined} */
    export let email = undefined

</script>

<Squelette {email} nav={false}>
    <h1>Pitchou - Statistiques publiques</h1>
</Squelette>

<style lang="scss">

</style>
