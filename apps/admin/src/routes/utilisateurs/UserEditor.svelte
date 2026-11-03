<script lang="ts">
  import "./UserEditor/styles.css";
  import { onDestroy, tick, untrack } from "svelte";
  import { enhance } from "$app/forms";
  import EditorPage from "#lib/components/EditorPage.svelte";
  import { invalidateAll } from "$app/navigation";
  import { pageHeader } from "#lib/pageHeader.svelte.ts";
  import { userName, type User } from "./model.ts";
  import type { PageData } from "./$types";
  import UserAccountFields from "./UserEditor/UserAccountFields.svelte";
  import UserPermissionFields from "./UserEditor/UserPermissionFields.svelte";
  import UserGroupPicker from "./UserGroupPicker.svelte";
  import UserEditorTabs from "./UserEditor/UserEditorTabs.svelte";

  let {
    current,
    groups,
    onClose,
  }: {
    current: User | undefined;
    groups: PageData["groups"];
    onClose: () => void | Promise<void>;
  } = $props();
  const formId = $props.id();
  let email = $state(untrack(() => current?.email ?? ""));
  let active = $state(untrack(() => current?.active ?? true));
  let bundles = $state<string[]>(untrack(() => [...(current?.bundles ?? [])]));
  let groupIds = $state<string[]>(untrack(() => current?.groupes.map((group) => group.id) ?? []));
  let saving = $state(false);
  let mounted = true;
  let saveVersion = 0;
  onDestroy(() => {
    mounted = false;
  });
  let message = $state("");
  let tab = $state("account");

  async function showInvalidField(event: Event) {
    const input = event.target as HTMLInputElement;
    if (tab === "account" || !input.closest('[data-user-tab="account"]')) return;
    event.preventDefault();
    tab = "account";
    await tick();
    input.reportValidity();
  }
</script>

<EditorPage
  title={current ? userName(current) : "Préparer un compte"}
  label={current ? "Modifier l'utilisateur" : "Préparer un compte"}
>
  <form
    id={formId}
    method="POST"
    action="/utilisateurs"
    autocomplete="off"
    oninvalidcapture={showInvalidField}
    use:enhance={() => {
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
            return;
          }
          if (result.type === "success") {
            await invalidateAll();
            if (!isCurrent()) return;
            await onClose();
            pageHeader.showSaved("Utilisateur enregistré");
          }
        } finally {
          if (isCurrent()) saving = false;
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
      <UserEditorTabs id={formId} bind:selected={tab} groupCount={groupIds.length} />
      <div
        class="tab-panel"
        role="tabpanel"
        id={`${formId}-panel-account`}
        aria-labelledby={`${formId}-tab-account`}
        data-user-tab="account"
        hidden={tab !== "account"}
      >
        <UserAccountFields {current} {formId} bind:email bind:active bind:bundles />
      </div>
      <div
        class="tab-panel"
        role="tabpanel"
        id={`${formId}-panel-groups`}
        aria-labelledby={`${formId}-tab-groups`}
        hidden={tab !== "groups"}
      >
        <section aria-label="Groupes de l'utilisateur">
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
        </section>
      </div>
      <div
        class="tab-panel"
        role="tabpanel"
        id={`${formId}-panel-permissions`}
        aria-labelledby={`${formId}-tab-permissions`}
        hidden={tab !== "permissions"}
      >
        <UserPermissionFields {current} {formId} {active} {bundles} {saving} />
      </div>
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
</EditorPage>
