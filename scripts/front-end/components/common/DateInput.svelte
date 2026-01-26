<script>
    import { run } from 'svelte/legacy';

    import { format, parse } from "date-fns";
	import toJSONPerserveDate from '../../../commun/DateToJSON'

    
    /**
     * @typedef {Object} Props
     * @property {string} [YYYYMMDD]
     * @property {Date | null | undefined} [date]
     */

    /** @type {Props} */
    let { YYYYMMDD = "yyyy-MM-dd", date = $bindable(undefined) } = $props();

    /** @type {string | null | undefined} */
    let internal = $state();

    const input = (/** @type {Date | null | undefined} */ x) => (internal = x && format(x, YYYYMMDD));
    const output = (/** @type {string | null | undefined} */ x) => {
        date = typeof x === 'string' ? parse(x, YYYYMMDD, new Date()) : undefined;
        if (date) {
            Object.defineProperty(date, 'toJSON', {value: toJSONPerserveDate})
        }
        return date
    }

    run(() => {
        input(date);
    });
    run(() => {
        output(internal);
    });
</script>

<input type="date" class="fr-input" bind:value={internal} />

<style lang="scss">
input{
    padding-right: 0.4rem;
    padding-left: 0.5rem;
}

</style>