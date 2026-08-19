<script lang="ts">
  import type { ChangelogEntryAdmin } from "$lib/actions/adminChangelog.ts";
  import { formatDate, formatTimestamp, versionOf } from "./format.ts";

  let {
    entry,
    onDelete,
  }: { entry: ChangelogEntryAdmin; onDelete: (entry: ChangelogEntryAdmin) => void } = $props();

  const deleteLabel = $derived(
    versionOf(entry) ? `Supprimer la version ${versionOf(entry)}` : "Supprimer le brouillon",
  );
</script>

<li
  class="group relative rounded-lg border border-solid border-gray-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md"
>
  <a href={`/changelog/${entry.id}`} class="fr-raw-link block p-4 pr-24 no-underline">
    <div class="flex flex-wrap items-center gap-3">
      {#if versionOf(entry)}
        <span class="font-semibold">Version {versionOf(entry)}</span>
      {:else}
        <span class="font-semibold text-gray-400 italic">Sans version</span>
      {/if}
      <span class="text-sm text-gray-500">{formatDate(entry.date)}</span>
      {#if entry.published}
        <span
          class="inline-flex items-center gap-1.5 rounded-full border border-solid border-green-700/40 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-800"
        >
          <span class="size-1.5 rounded-full bg-green-600" aria-hidden="true"></span>
          Publiée
        </span>
      {:else}
        <span
          class="inline-flex items-center gap-1.5 rounded-full border border-solid border-gray-300 bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
        >
          <span class="size-1.5 rounded-full bg-gray-400" aria-hidden="true"></span>
          Brouillon
        </span>
      {/if}
    </div>
    <p class="fr-mb-0 mt-1 truncate text-lg">
      {#if entry.titre}{entry.titre}{:else}<span class="text-gray-400 italic">Sans titre</span>{/if}
    </p>
    <p class="fr-mb-0 mt-1 text-sm text-gray-500">
      Modifiée le {formatTimestamp(entry.updated_at)} par {entry.updated_by}
    </p>
  </a>
  <span
    class="fr-icon-arrow-right-s-line absolute top-1/2 right-14 -translate-y-1/2 text-gray-300 transition group-hover:text-blue-500"
    aria-hidden="true"
  ></span>
  <button
    type="button"
    class="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
    title={deleteLabel}
    onclick={() => onDelete(entry)}
  >
    <span class="fr-icon-delete-line" aria-hidden="true"></span>
    <span class="sr-only">{deleteLabel}</span>
  </button>
</li>
