<script lang="ts">
  import Modal from "$lib/components/Modal.svelte";
  import type { ChangelogEntryAdmin } from "$lib/actions/adminChangelog.ts";
  import { formatDate, versionOf } from "./format.ts";

  // Structural subset so callers can pass either a stored entry or a live draft snapshot.
  type EntryLike = Pick<
    ChangelogEntryAdmin,
    "version_major" | "version_minor" | "version_patch" | "date" | "titre" | "published"
  >;

  let {
    entry,
    deleting,
    error,
    onCancel,
    onConfirm,
  }: {
    entry: EntryLike;
    deleting: boolean;
    error: string | null;
    onCancel: () => void;
    onConfirm: () => void;
  } = $props();
</script>

{#snippet footer()}
  <button
    type="button"
    class="fr-btn fr-btn--secondary ml-auto"
    onclick={onCancel}
    disabled={deleting}
  >
    Annuler
  </button>
  <button
    type="button"
    class="fr-btn bg-red-600 hover:bg-red-700"
    onclick={onConfirm}
    disabled={deleting}
  >
    {#if deleting}
      <span class="fr-icon-refresh-line inline-block animate-spin fr-mr-1w" aria-hidden="true"
      ></span>
      Suppression…
    {:else}
      Supprimer
    {/if}
  </button>
{/snippet}

<Modal title="Supprimer l'entrée" onClose={onCancel} {footer}>
  <div class="fr-p-3w">
    <p class="fr-mb-1w">
      {#if versionOf(entry)}
        Supprimer la version <strong>{versionOf(entry)}</strong>
        («&nbsp;{entry.titre || "Sans titre"}&nbsp;»)&nbsp;?
      {:else}
        Supprimer ce brouillon du <strong>{formatDate(entry.date)}</strong>&nbsp;?
      {/if}
    </p>
    {#if entry.published}
      <p class="fr-mb-0 text-sm text-[color:var(--text-default-grey)]">
        Elle disparaîtra immédiatement de la page publique « Nouveautés ».
      </p>
    {:else}
      <p class="fr-mb-0 text-sm text-[color:var(--text-default-grey)]">
        Cette action est définitive.
      </p>
    {/if}
    {#if error}
      <p class="fr-error-text fr-mt-2w fr-mb-0">
        Échec de la suppression : {error}
      </p>
    {/if}
  </div>
</Modal>
