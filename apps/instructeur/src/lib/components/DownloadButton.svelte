<script lang="ts">
  type Props = {
    label?: string;
    makeFilename: () => string;
    classname?: string;
    style?: string;
    makeFileContentBlob: () => Blob | Promise<Blob>;
  };

  let {
    label = "Télécharger",
    makeFilename,
    classname = "fr-btn fr-btn--lg",
    makeFileContentBlob,
    style,
  }: Props = $props();

  async function onClick() {
    const link = document.createElement("a");
    link.download = makeFilename();
    link.href = URL.createObjectURL(await makeFileContentBlob());
    document.body.append(link);
    link.click();
    link.remove();
  }
</script>

<button class={classname} onclick={onClick} {style}>
  {label}
</button>
