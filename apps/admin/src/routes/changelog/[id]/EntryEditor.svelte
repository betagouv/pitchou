<script lang="ts">
  import { pageHeader } from "$lib/pageHeader.svelte.ts";
  import RichTextEditor from "$lib/components/RichTextEditor.svelte";
  import { uploadChangelogMedia, type ChangelogEntryPayload } from "$lib/actions/adminChangelog.ts";
  import EntryFields from "./EntryFields.svelte";
  import PublishBlockedModal from "./PublishBlockedModal.svelte";
  import type { Autosave } from "./autosave.svelte.ts";
  import type { EntryModel } from "./entryModel.svelte.ts";

  let {
    model,
    autosave,
    entryId,
    readOnly = false,
  }: {
    model: EntryModel;
    autosave: Autosave<ChangelogEntryPayload>;
    entryId: number;
    readOnly?: boolean;
  } = $props();

  let publishBlockedOpen = $state(false);

  $effect(() => {
    if (autosave.state === "saved") pageHeader.showSaved("Enregistré");
    else if (autosave.state === "pending" || autosave.state === "saving") pageHeader.showSaving();
    else if (autosave.state === "error") pageHeader.clearFeedback();
  });

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

<div class="flex min-h-0 flex-1 flex-col gap-4">
  <fieldset disabled={readOnly} class="admin-panel">
    <legend class="px-1 text-sm font-semibold">Informations de publication</legend>
    <EntryFields
      bind:titre={model.titre}
      bind:versionMajor={model.versionMajor}
      bind:versionMinor={model.versionMinor}
      bind:versionPatch={model.versionPatch}
      bind:date={model.date}
      published={model.published}
      onToggleStatus={togglePublished}
    />
  </fieldset>

  <div class="admin-panel flex min-h-0 flex-1 flex-col">
    <h2>Contenu de la note</h2>
    <RichTextEditor
      {readOnly}
      bind:html={model.contenu}
      uploadMedia={(file) => uploadChangelogMedia(entryId, file)}
    />
    {#if autosave.state === "error"}
      <p class="fr-error-text fr-mb-0" role="alert">
        Échec de l'enregistrement : {autosave.error}
      </p>
    {/if}
  </div>
</div>

{#if publishBlockedOpen}
  <PublishBlockedModal
    titreOk={model.titre.trim() !== ""}
    versionOk={model.versionComplete}
    onClose={() => (publishBlockedOpen = false)}
  />
{/if}
