<script>
    

    

    

    
    /**
     * @typedef {Object} Props
     * @property {string} [label]
     * @property {() => string} makeFilename
     * @property {string} [classname]
     * @property {string} [style]
     * @property {() => Blob | Promise<Blob>} makeFileContentBlob
     */

    /** @type {Props} */
    let {
        label = "Télécharger",
        makeFilename,
        classname = "fr-btn fr-btn--lg",
        makeFileContentBlob,
        style
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

<button class={classname} onclick={onClick} style={style}>
    {label}
</button>
