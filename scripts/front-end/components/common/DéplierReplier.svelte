<script>

/** @type {boolean}*/
export let open = false



</script>

<details {open}>
    <summary>
        <slot name="summary"></slot>
    </summary>
    <slot name="content"></slot>
</details>

<style lang="scss">
details{

    summary{
        &::marker{
            content: "";
        }

        &::after{
            content: "Déplier ⮞";
        }
    }
}

// ⮟

</style>