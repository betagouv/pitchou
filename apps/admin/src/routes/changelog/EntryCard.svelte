<script lang="ts">
  import type { ChangelogEntryAdmin } from "$lib/actions/adminChangelog.ts";
  import { formatDate, formatTimestamp, versionOf } from "./format.ts";

  let { entry }: { entry: ChangelogEntryAdmin } = $props();
</script>

<li
  class="group relative rounded-lg border border-solid border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)] shadow-sm transition hover:border-[color:var(--border-default-blue-france)] hover:shadow-md"
>
  <a href={`/changelog/${entry.id}`} class="fr-raw-link block p-4 pr-12 no-underline">
    <div class="flex flex-wrap items-center gap-3">
      {#if versionOf(entry)}
        <span class="font-semibold">Version {versionOf(entry)}</span>
      {:else}
        <span class="font-semibold text-[color:var(--text-mention-grey)] italic">Sans version</span>
      {/if}
      <span class="text-sm text-[color:var(--text-mention-grey)]">{formatDate(entry.date)}</span>
      {#if entry.published}
        <span
          class="inline-flex items-center gap-1.5 rounded-full border border-solid border-[color:color-mix(in_srgb,var(--border-plain-success)_40%,transparent)] bg-[var(--background-contrast-success)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--text-default-success)]"
        >
          <span class="size-1.5 rounded-full bg-[var(--text-default-success)]" aria-hidden="true"
          ></span>
          Publiée
        </span>
      {:else}
        <span
          class="inline-flex items-center gap-1.5 rounded-full border border-solid border-[color:var(--border-default-grey)] bg-[var(--background-contrast-grey)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--text-mention-grey)]"
        >
          <span class="size-1.5 rounded-full bg-[var(--text-mention-grey)]" aria-hidden="true"
          ></span>
          Brouillon
        </span>
      {/if}
    </div>
    <p class="fr-mb-0 mt-1 truncate text-lg">
      {#if entry.titre}{entry.titre}{:else}<span
          class="text-[color:var(--text-mention-grey)] italic">Sans titre</span
        >{/if}
    </p>
    <p class="fr-mb-0 mt-1 text-sm text-[color:var(--text-mention-grey)]">
      Modifiée le {formatTimestamp(entry.updated_at)} par {entry.updated_by}
    </p>
  </a>
  <span
    class="fr-icon-arrow-right-s-line absolute top-1/2 right-3 -translate-y-1/2 text-[color:var(--text-mention-grey)] transition group-hover:text-[color:var(--text-action-high-blue-france)]"
    aria-hidden="true"
  ></span>
</li>
