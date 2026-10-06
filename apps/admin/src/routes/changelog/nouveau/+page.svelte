<script lang="ts">
  import { goto } from "$app/navigation";
  import { can } from "$lib/access.svelte.ts";
  import { createChangelogEntry } from "$lib/actions/adminChangelog.ts";
  import RichTextEditor from "$lib/components/RichTextEditor.svelte";
  import { pageHeader } from "$lib/pageHeader.svelte.ts";
  import EntryFields from "../EntryFields.svelte";
  import { EntryModel } from "../entryModel.svelte.ts";

  const model = new EntryModel();
  const today = new Date();
  model.date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  let saving = $state(false);
  let saveError = $state<string | null>(null);

  $effect(() => {
    pageHeader.setTitle("Nouvelle entrée");
    return () => pageHeader.clearTitle();
  });

  async function createDraft(event: SubmitEvent) {
    event.preventDefault();
    if (saving || !can("admin:changelog:create")) return;
    saving = true;
    saveError = null;
    pageHeader.clearFeedback();
    try {
      const id = await createChangelogEntry({ ...model.snapshot(), published: false });
      await goto(`/changelog/${id}`);
      pageHeader.showSaved("Brouillon créé");
    } catch (error) {
      saveError = error instanceof Error ? error.message : String(error);
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Nouvelle entrée du changelog - Pitchou</title>
</svelte:head>

<form onsubmit={createDraft} class="flex min-h-0 flex-1 flex-col gap-4">
  <p class="fr-mb-0">Rédigez la note, puis enregistrez le brouillon.</p>
  <fieldset disabled={saving || !can("admin:changelog:create")} class="admin-panel">
    <legend class="px-1 text-sm font-semibold">Informations du brouillon</legend>
    <EntryFields
      bind:titre={model.titre}
      bind:versionMajor={model.versionMajor}
      bind:versionMinor={model.versionMinor}
      bind:versionPatch={model.versionPatch}
      bind:date={model.date}
      published={false}
    />
  </fieldset>
  <div class="admin-panel flex min-h-0 flex-1 flex-col">
    <h2>Contenu de la note</h2>
    <RichTextEditor bind:html={model.contenu} readOnly={saving || !can("admin:changelog:create")} />
  </div>
  {#if saveError}
    <p class="fr-error-text fr-mb-0" role="alert">Échec de l'enregistrement : {saveError}</p>
  {/if}
  <div class="flex gap-3">
    <button class="fr-btn" type="submit" disabled={saving || !can("admin:changelog:create")}>
      {saving ? "Enregistrement…" : "Enregistrer le brouillon"}
    </button>
    <a class="fr-btn fr-btn--secondary" href="/changelog">Annuler</a>
  </div>
</form>
