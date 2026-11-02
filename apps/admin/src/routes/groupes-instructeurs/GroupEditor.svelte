<script lang="ts">
  import "./GroupEditor/styles.css";
  import GroupPreviewPanel from "./GroupEditor/GroupPreview.svelte";
  import type { GroupPreview } from "@pitchou/types/groupRouting.ts";
  import { pageHeader } from "#lib/pageHeader.svelte.ts";
  import { onDestroy, untrack } from "svelte";
  import GroupIdentityFields from "./GroupEditor/GroupIdentityFields.svelte";
  import GroupAssignmentFields from "./GroupEditor/GroupAssignmentFields.svelte";
  import { enhance } from "$app/forms";
  import EditorPage from "#lib/components/EditorPage.svelte";
  import GroupEditorActions from "./GroupEditor/GroupEditorActions.svelte";
  import { invalidateAll } from "$app/navigation";
  import GroupEditorDialog from "./GroupEditor/GroupEditorDialog.svelte";
  import type { PageData } from "./$types";

  let {
    data,
    current,
    onClose,
  }: {
    data: PageData;
    current: PageData["groups"][number] | undefined;
    onClose: () => void | Promise<void>;
  } = $props();
  let name = $state(untrack(() => current?.name ?? ""));
  let active = $state(untrack(() => current?.active ?? true));
  let rules = $state(
    untrack(() =>
      (current?.rules ?? []).map((rule) => ({
        departments: [...rule.departments],
        communes: [...rule.communes],
        activites: [...rule.activites],
        accessLevel: rule.accessLevel ?? "instruct",
      })),
    ),
  );
  let members = $state(untrack(() => [...(current?.members ?? [])]));
  let saving = $state(false);
  let mounted = true;
  let saveVersion = 0;
  onDestroy(() => {
    mounted = false;
  });
  let message = $state("");
  let rulesValid = $state(true);
  const formId = $props.id();
  let form: HTMLFormElement;
  let preview = $state<GroupPreview | null>(null);
  let previewOpen = $state(false);
  let previewInput = $state("");
  let previewStale = $state(false);
  const input = $derived({ id: current?.id, name, active, rules, members });
  const currentInput = $derived(JSON.stringify(input));
  const previewCurrent = $derived(
    rulesValid && !previewStale && preview !== null && currentInput === previewInput,
  );
  async function showPreview() {
    if (!rulesValid || !form.reportValidity()) return;
    saving = true;
    message = "";
    const snapshot = currentInput;
    try {
      const response = await fetch("/api/groupes-instructeurs/apercu", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: snapshot,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Aperçu impossible");
      preview = result;
      previewStale = false;
      previewInput = snapshot;
      previewOpen = true;
    } catch (cause) {
      message = cause instanceof Error ? cause.message : "Aperçu impossible";
    } finally {
      saving = false;
    }
  }
</script>

<EditorPage
  title={current ? current.name : "Nouveau groupe"}
  label="Modifier le groupe"
  modalOpen={previewOpen}
>
  <form
    bind:this={form}
    id={formId}
    method="POST"
    action="/groupes-instructeurs"
    use:enhance={({ cancel }) => {
      if (!previewOpen || !previewCurrent) {
        cancel();
        return;
      }
      const version = ++saveVersion;
      const isCurrent = () => mounted && version === saveVersion;
      pageHeader.clearFeedback();
      saving = true;
      message = "";
      return async ({ result }) => {
        if (!isCurrent()) return;
        try {
          if (result.type !== "success") {
            message = String(
              result.type === "failure"
                ? (result.data?.message ?? "Enregistrement impossible")
                : "Enregistrement impossible",
            );
            preview = null;
            previewOpen = false;
            return;
          }
          await invalidateAll();
          if (!isCurrent()) return;
          await onClose();
          pageHeader.showSaved("Groupe enregistré");
        } finally {
          if (isCurrent()) saving = false;
        }
      };
    }}
    class="editor group-editor"
  >
    <fieldset disabled={saving} class="editor-fields">
      {#if current}<input type="hidden" name="id" value={current.id} />{/if}
      <input type="hidden" name="rules" value={JSON.stringify(rules)} />
      <input type="hidden" name="previewToken" value={previewCurrent ? preview?.token : ""} />
      {#each members as member}<input type="hidden" name="members" value={member} />{/each}
      <GroupIdentityFields {formId} bind:name bind:active />
      <GroupAssignmentFields {data} {formId} bind:rules bind:members bind:rulesValid />
    </fieldset>
  </form>
  {#snippet footer()}
    <GroupEditorActions
      {saving}
      {message}
      {rulesValid}
      {formId}
      {previewCurrent}
      previewOpen={false}
      validName={!!name.trim()}
      {onClose}
      {showPreview}
    />
  {/snippet}
  {#snippet overlay()}
    {#if previewOpen && preview}
      <GroupEditorDialog
        title="Vérifier les affectations"
        onClose={() => {
          if (!saving) previewOpen = false;
        }}
      >
        <GroupPreviewPanel
          {preview}
          {name}
          input={previewInput}
          stale={previewStale}
          onStale={() => (previewStale = true)}
        />
        {#if !previewCurrent}
          <p class="fr-px-3w" role="status">
            L'aperçu n'est plus à jour. Revenez à l'édition pour vérifier les affectations à
            nouveau.
          </p>
        {/if}
        {#snippet footer()}
          <GroupEditorActions
            {saving}
            {message}
            {rulesValid}
            {formId}
            {previewCurrent}
            previewOpen={true}
            validName={!!name.trim()}
            onClose={() => (previewOpen = false)}
            {showPreview}
          />
        {/snippet}
      </GroupEditorDialog>
    {/if}
  {/snippet}
</EditorPage>
