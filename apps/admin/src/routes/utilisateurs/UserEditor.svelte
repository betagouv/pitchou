<script lang="ts">
  import "./UserEditor/styles.css";
  import { untrack } from "svelte";
  import { enhance } from "$app/forms";
  import Modal from "$lib/components/Modal.svelte";
  import { pageHeader } from "$lib/pageHeader.svelte.ts";
  import { type User } from "./model.ts";
  import type { PageData } from "./$types";
  import UserAccountFields from "./UserEditor/UserAccountFields.svelte";
  import UserPermissionFields from "./UserEditor/UserPermissionFields.svelte";
  import UserGroupPicker from "./UserGroupPicker.svelte";

  let {
    current,
    groups,
    onClose,
  }: { current: User | undefined; groups: PageData["groups"]; onClose: () => void } = $props();
  const formId = $props.id();
  let email = $state(untrack(() => current?.email ?? ""));
  let active = $state(untrack(() => current?.active ?? true));
  let bundles = $state<string[]>(untrack(() => [...(current?.bundles ?? [])]));
  let groupIds = $state<string[]>(untrack(() => current?.groupes.map((group) => group.id) ?? []));
  let saving = $state(false);
  let message = $state("");
</script>

<Modal
  title={current ? "Modifier l'utilisateur" : "Préparer un compte"}
  size="large"
  onClose={() => {
    if (!saving) onClose();
  }}
>
  <form
    id={formId}
    method="POST"
    autocomplete="off"
    use:enhance={() => {
      const confirmSaved = pageHeader.beginSave("Utilisateur enregistré");
      saving = true;
      message = "";
      return async ({ result, update }) => {
        try {
          if (result.type === "failure") {
            message = String(result.data?.message ?? "Enregistrement impossible");
            return;
          }
          await update({ reset: false });
          if (result.type === "success") {
            onClose();
            confirmSaved();
          }
        } finally {
          saving = false;
        }
      };
    }}
    class="editor user-editor"
  >
    {#if current}<input type="hidden" name="id" value={current.id} />{/if}
    {#if groups !== null}
      <input type="hidden" name="updateGroups" value="true" />
      {#each groupIds as id}<input type="hidden" name="groupIds" value={id} />{/each}
    {/if}
    <fieldset disabled={saving} class="editor-fields">
      <UserAccountFields {current} {formId} bind:email bind:active bind:bundles />
      <section class="editor-section" aria-label="Groupes de l'utilisateur">
        <h3 class="section-heading">Groupes</h3>
        <div class="section-content">
          {#if groups !== null}
            <UserGroupPicker {groups} bind:selected={groupIds} />
          {:else}
            {#if current?.groupes.length}
              <div class="group-tags">
                {#each current.groupes as group}<span class="group-tag"
                    >{group.name}{#if !group.active}<span class="muted"> · Archivé</span>{/if}</span
                  >{/each}
              </div>
            {:else}<p class="help">Cet utilisateur n'appartient à aucun groupe.</p>{/if}
            <p class="help">
              La modification des groupes nécessite le droit de gérer les groupes et leurs
              départements.
            </p>
          {/if}
        </div>
      </section>
      <UserPermissionFields {current} {formId} {active} {bundles} {saving} />
    </fieldset>
  </form>
  {#snippet footer()}
    <div class="footer-content user-editor">
      {#if message}<p class="fr-error-text" role="alert">{message}</p>{/if}
      <div class="footer-actions">
        <button type="button" class="cancel" disabled={saving} onclick={onClose}>Annuler</button
        ><button type="submit" form={formId} class="save" disabled={saving}
          >{saving ? "Enregistrement…" : "Enregistrer"}</button
        >
      </div>
    </div>
  {/snippet}
</Modal>
