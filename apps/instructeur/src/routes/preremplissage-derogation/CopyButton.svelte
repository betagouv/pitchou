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

<button
  class="{classname} relative z-[1] [font-size:inherit] [font-family:inherit] before:content-[''] before:z-[-1] before:absolute before:inset-0 before:bg-[#444] before:origin-right before:scale-x-0 before:[transition:transform_0.4s_ease-in-out] [&.animate]:text-white [&.animate]:before:origin-left [&.animate]:before:scale-x-100"
  bind:this={copyButton}
  onclick={onClick}
>
  {initialLabel}
</button>
