<script lang="ts">
  type Props = {
    icon: string;
    label: string;
    value: string;
    file?: {
      url: string | undefined;
      downloadLabel: string;
      emptyLabel: string;
    };
  };

  let { icon, label, value, file }: Props = $props();
</script>

<li
  class="flex items-center gap-3 border-b border-solid border-[color:var(--border-default-grey)] fr-py-1w"
>
  <span
    class="{icon} fr-icon--sm flex-none text-[color:var(--text-action-high-blue-france)]"
    aria-hidden="true"
  ></span>
  <div class="min-w-0 flex-1">
    <span class="fr-hint-text block">{label}</span>
    <strong class="block">{value}</strong>
    {#if file && !file.url}
      <span class="fr-hint-text">{file.emptyLabel}</span>
    {/if}
  </div>
  {#if file?.url}
    <a
      class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-btn--icon-left fr-icon-download-line flex-none"
      href={file.url}
      data-sveltekit-reload
      aria-label={file.downloadLabel}
    >
      Télécharger
    </a>
  {/if}
</li>
