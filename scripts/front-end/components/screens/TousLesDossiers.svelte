<script>
    import Squelette from "../Squelette.svelte"

    /**
    * @typedef {Object} Props
    * @property {string | undefined} [email]
    */

    /** @type {Props} */
    let { email = undefined } = $props();


</script>

<Squelette {email}>
    <div>
        coucou
    </div>
</Squelette>