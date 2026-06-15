<script lang="ts">
  type Props = {
    textToCopy: () => string;
    initialLabel?: string;
    labelAfterCopy?: string;
    classname: string;
  };

  let {
    textToCopy,
    initialLabel = "Copier dans le presse-papier",
    labelAfterCopy = "Copié dans le presse-papier !",
    classname,
  }: Props = $props();

  let copyButton: HTMLButtonElement;

  function onClick() {
    copyButton.classList.add("animate");
    copyButton.addEventListener("animationend", () => copyButton.classList.remove("animate"));

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

<button class={classname} bind:this={copyButton} onclick={onClick}>
  {initialLabel}
</button>

<style lang="scss">
  button {
    z-index: 1;
    position: relative;
    font-size: inherit;
    font-family: inherit;

    &::before {
      content: "";
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

    &.animate {
      color: white;
    }

    &.animate::before {
      transform-origin: center left;
      transform: scaleX(1);
    }
  }
</style>
