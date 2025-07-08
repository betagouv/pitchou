<script>
    import { format, parse } from "date-fns";

    export let YYYYMMDD = "yyyy-MM-dd";
    /** @type {Date | null | undefined} */
    export let date = undefined

    /** @type {string | null | undefined} */
    let internal;

    const input = (/** @type {Date | null | undefined} */ x) => (internal = x && format(x, YYYYMMDD));
    const output = (/** @type {string | null | undefined} */ x) => (date = typeof x === 'string' ? parse(x, YYYYMMDD, new Date()) : undefined);

    $: input(date);
    $: output(internal);
</script>

<input type="date" class="fr-input" bind:value={internal} />

<style lang="scss">
input{
    padding-right: 0.4rem;
    padding-left: 0.5rem;
}

</style>