<script>
    /** @type {() => string} */
    export let textToCopy

    /** @type {string} */
    export let initialLabel = "Copier dans le presse-papier"

    /** @type {string} */
    export let labelAfterCopy = "Copié dans le presse-papier !"

    /** @type {string} */
    export let classname

    /** @type {HTMLButtonElement} */
    let copyButton

    function onClick(){
        copyButton.classList.add("animate");
        copyButton.addEventListener("animationend", () =>
            copyButton.classList.remove("animate"),
        );

        navigator.clipboard
            .writeText(textToCopy())
            .then(() => {
                copyButton.textContent = labelAfterCopy;
            })
            .catch((error) => {
                console.error("Une erreur s'est produite lors de la copie : ", error);
            });

    }
</script>

<button 
    class={classname} 
    bind:this={copyButton} 
    on:click={onClick}
>
    {initialLabel}
</button>

<style lang="scss">
    button{
      z-index: 1;
      position: relative;
      font-size: inherit;
      font-family: inherit;

      &::before {
        content: '';
        z-index: -1;
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        background-color: #444;
        transform-origin: center right;
        transform: scaleX(0);
        transition: transform 0.4s ease-in-out;
      }

      &.animate{
        color: white;
      }

      &.animate::before {
        transform-origin: center left;
        transform: scaleX(1);
      }
    }
</style>
