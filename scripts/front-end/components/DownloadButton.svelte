<script>
    /** @type {string} */
    export let label = "Télécharger"

    /** @type {() => string} */
    export let makeFilename

    /** @type {string} */
    export let classname = "fr-btn fr-btn--lg"

    /** @type {() => Blob | Promise<Blob>} */
    export let makeFileContentBlob

    async function onClick(){
        const link = document.createElement("a");
        link.download = makeFilename();
        link.href = URL.createObjectURL(await makeFileContentBlob());
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

</script>

<button class={classname} on:click={onClick}>
    {label}
</button>
