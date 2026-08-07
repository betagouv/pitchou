<script lang="ts">
  type GeneratedDocument = { name: string; url: string; text: Promise<string> };
  type Props = { documents: GeneratedDocument[] };
  let { documents }: Props = $props();
</script>

{#each documents as document}
  <div class="fr-mb-3w">
    <a class="fr-link fr-link--download" download={document.name} href={document.url}
      >Télécharger {document.name}</a
    >
    <details class="[cursor:initial]">
      <summary class="cursor-pointer">Voir le texte brut</summary>
      {#await document.text}
        (... en chargement ...)
      {:then text}
        <div class="[white-space:preserve] fr-p-2w bg-[var(--background-contrast-grey)]">
          {text}
        </div>
      {/await}
    </details>
  </div>
{/each}
