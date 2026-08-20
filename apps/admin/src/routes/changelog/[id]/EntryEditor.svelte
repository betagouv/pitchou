<script lang="ts">
  import RichTextEditor from "$lib/components/RichTextEditor.svelte";
  import { uploadChangelogMedia, type ChangelogEntryPayload } from "$lib/actions/adminChangelog.ts";
  import EntryFields from "./EntryFields.svelte";
  import PublishBlockedModal from "./PublishBlockedModal.svelte";
  import SaveStatus from "./SaveStatus.svelte";
  import type { Autosave } from "./autosave.svelte.ts";
  import type { EntryModel } from "./entryModel.svelte.ts";

  let {
    model,
    autosave,
    entryId,
  }: {
    model: EntryModel;
    autosave: Autosave<ChangelogEntryPayload>;
    entryId: number;
  } = $props();

  let publishBlockedOpen = $state(false);

  function togglePublished() {
    if (model.published) {
      model.published = false;
    } else if (!model.canPublish) {
      publishBlockedOpen = true;
    } else {
      model.published = true;
    }
  }
</script>

{#snippet saveStatus()}
  <SaveStatus state={autosave.state} error={autosave.error} />
{/snippet}

<div class="flex min-h-0 flex-1 flex-col">
  <EntryFields
    bind:titre={model.titre}
    bind:versionMajor={model.versionMajor}
    bind:versionMinor={model.versionMinor}
    bind:versionPatch={model.versionPatch}
    bind:date={model.date}
    published={model.published}
    onToggleStatus={togglePublished}
  />

  <div class="fr-input-group flex min-h-0 flex-1 flex-col fr-mb-0">
    <span class="fr-label fr-mb-1w shrink-0">Contenu</span>
    <RichTextEditor
      bind:html={model.contenu}
      toolbarEnd={saveStatus}
      uploadMedia={(file) => uploadChangelogMedia(entryId, file)}
    />
  </div>
</div>

{#if publishBlockedOpen}
  <PublishBlockedModal
    titreOk={model.titre.trim() !== ""}
    versionOk={model.versionComplete}
    onClose={() => (publishBlockedOpen = false)}
  />
{/if}
