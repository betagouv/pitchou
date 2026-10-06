<script lang="ts">
  import "./GroupEditor/styles.css";
  import { pageHeader } from "$lib/pageHeader.svelte.ts";
  import { untrack } from "svelte";
  import GroupIdentityFields from "./GroupEditor/GroupIdentityFields.svelte";
  import GroupAssignmentFields from "./GroupEditor/GroupAssignmentFields.svelte";
  import { enhance } from "$app/forms";
  import Modal from "$lib/components/Modal.svelte";
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
  let departments = $state(untrack(() => [...(current?.departments ?? [])]));
  let members = $state(untrack(() => [...(current?.members ?? [])]));
  let saving = $state(false);
  let message = $state("");
  const formId = $props.id();
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
    use:enhance={() => {
      const confirmSaved = pageHeader.beginSave("Groupe enregistré");
      saving = true;
      message = "";
      return async ({ result, update }) => {
        if (result.type === "failure") {
          saving = false;
          message = String(result.data?.message ?? "Enregistrement impossible");
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
      {#each departments as department}<input
          type="hidden"
          name="departments"
          value={department}
        />{/each}
      {#each members as member}<input type="hidden" name="members" value={member} />{/each}
      <GroupIdentityFields {formId} bind:name bind:active />
      <GroupAssignmentFields {data} {formId} bind:departments bind:members />
    </fieldset>
  </form>

  {#snippet footer()}
    <div class="w-full">
      {#if message}<p class="fr-alert fr-alert--error fr-alert--sm fr-mb-2w" role="alert">
          {message}
        </p>{/if}
      <div class="flex w-full items-center justify-end gap-2">
        <button class="fr-btn fr-btn--secondary" type="button" disabled={saving} onclick={onClose}>
          Annuler
        </button>
        <button class="fr-btn" type="submit" form={formId} disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  {/snippet}
</Modal>
