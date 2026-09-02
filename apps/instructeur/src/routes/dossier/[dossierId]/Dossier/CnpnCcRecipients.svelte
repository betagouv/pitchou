<script lang="ts">
  let {
    emails,
    onRemove,
  }: {
    emails: string[];
    onRemove: (email: string) => void;
  } = $props();
</script>

{#if emails.length > 0}
  <ul class="flex list-none flex-wrap gap-2 fr-mt-2w fr-mb-0 fr-pl-0" aria-live="polite">
    {#each emails as email (email)}
      <li
        class="flex items-center gap-2 rounded bg-[var(--background-contrast-blue-france)] fr-py-1v fr-pl-2w fr-pr-1v"
      >
        <span class="[overflow-wrap:anywhere]">{email}</span>
        <button
          type="button"
          class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-close-line"
          title={`Retirer ${email}`}
          aria-label={`Retirer ${email} des personnes en copie`}
          onclick={() => onRemove(email)}
        ></button>
      </li>
    {/each}
  </ul>
{/if}
