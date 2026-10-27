<script lang="ts">
  import "./GroupEditor/styles.css";
  import GroupPreviewPanel from "./GroupEditor/GroupPreview.svelte";
  import type { GroupPreview } from "@pitchou/types/groupRouting.ts";
  import { pageHeader } from "#lib/pageHeader.svelte.ts";
  import { untrack } from "svelte";
  import GroupIdentityFields from "./GroupEditor/GroupIdentityFields.svelte";
  import GroupAssignmentFields from "./GroupEditor/GroupAssignmentFields.svelte";
  import { enhance } from "$app/forms";
  import Modal from "#lib/components/Modal.svelte";
  import type { PageData } from "./$types";

  let {
    data,
    current,
    onClose,
  }: {
    data: PageData;
    current: PageData["groups"][number] | undefined;
    onClose: () => void;
  } = $props();
  let name = $state(untrack(() => current?.name ?? ""));
  let active = $state(untrack(() => current?.active ?? true));
  let rules = $state(
    untrack(() =>
      (current?.rules ?? []).map((rule) => ({
        departments: [...rule.departments],
        communes: [...rule.communes],
        activites: [...rule.activites],
      })),
    ),
  );
  let members = $state(untrack(() => [...(current?.members ?? [])]));
  let saving = $state(false);
  let message = $state("");
  const formId = $props.id();
  let preview = $state<GroupPreview | null>(null);
  let previewInput = $state("");
  const input = $derived({ id: current?.id, name, active, rules, members });
  const currentInput = $derived(JSON.stringify(input));
  const previewCurrent = $derived(preview !== null && currentInput === previewInput);
  async function showPreview() {
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
      previewInput = snapshot;
    } catch (cause) {
      message = cause instanceof Error ? cause.message : "Aperçu impossible";
    } finally {
      saving = false;
    }
  }
</script>

<Modal
  title={current ? `Modifier ${current.name}` : "Nouveau groupe"}
  size="large"
  onClose={() => {
    if (!saving) onClose();
  }}
>
  <form
    id={formId}
    method="POST"
    use:enhance={({ cancel }) => {
      if (!previewCurrent) {
        cancel();
        return;
      }
      const confirmSaved = pageHeader.beginSave("Groupe enregistré");
      saving = true;
      message = "";
      return async ({ result, update }) => {
        if (result.type === "failure") {
          saving = false;
          message = String(result.data?.message ?? "Enregistrement impossible");
          preview = null;
          return;
        }
        await update({ reset: false });
        saving = false;
        if (result.type === "success") {
          onClose();
          confirmSaved();
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
      <GroupAssignmentFields {data} {formId} bind:rules bind:members />
    </fieldset>
    {#if previewCurrent && preview}<GroupPreviewPanel {preview} />{/if}
  </form>

  {#snippet footer()}
    <div class="w-full">
      {#if message}<p class="fr-alert fr-alert--error fr-alert--sm fr-mb-2w" role="alert">
          {message}
        </p>{/if}
      <div class="flex w-full flex-wrap items-center justify-end gap-2">
        <button class="fr-btn fr-btn--secondary" type="button" disabled={saving} onclick={onClose}>
          Annuler
        </button>
        <button
          class="fr-btn fr-btn--secondary"
          type="button"
          disabled={saving || !name.trim()}
          onclick={showPreview}>Vérifier les affectations</button
        >
        <button class="fr-btn" type="submit" form={formId} disabled={saving || !previewCurrent}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  {/snippet}
</Modal>
