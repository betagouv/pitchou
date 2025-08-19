<script>
    

    

    

    
    /**
     * @typedef {Object} Props
     * @property {string} [label]
     * @property {() => string} makeFilename
     * @property {string} [classname]
     * @property {() => Blob | Promise<Blob>} makeFileContentBlob
     */

    /** @type {Props} */
    let {
        label = "Télécharger",
        makeFilename,
        classname = "fr-btn fr-btn--lg",
        makeFileContentBlob
    } = $props();

    async function onClick(){
        const link = document.createElement("a");
        link.download = makeFilename();
        link.href = URL.createObjectURL(await makeFileContentBlob());
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

</script>

<button class={classname} onclick={onClick}>
    {label}
</button>
