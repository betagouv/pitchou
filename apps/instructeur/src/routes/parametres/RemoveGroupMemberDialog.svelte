<script lang="ts">
  import { onMount } from "svelte";
  import type { GroupMember, MembershipGroup } from "@pitchou/types/groupMembership.ts";
  import type { UserId } from "@pitchou/types/permissions.ts";
  import { changeMembership } from "./membershipRequest.ts";

  let {
    group,
    member,
    userId,
    onClose,
    onRemoved,
  }: {
    group: MembershipGroup;
    member: GroupMember;
    userId: UserId;
    onClose: () => void;
    onRemoved: () => Promise<void>;
  } = $props();
  let dialog: HTMLDialogElement;
  let saving = $state(false);
  let failure = $state("");
  const self = $derived(member.id === userId);
  const lastActive = $derived(
    member.active && !group.members.some((other) => other.id !== member.id && other.active),
  );
  onMount(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => previous?.focus();
  });
  async function remove() {
    saving = true;
    failure = "";
    try {
      await changeMembership(group.id, "DELETE", { userId: member.id });
      await onRemoved();
    } catch (cause) {
      failure = cause instanceof Error ? cause.message : "Impossible de retirer ce membre.";
    } finally {
      saving = false;
    }
  }
</script>

<dialog
  bind:this={dialog}
  aria-labelledby="remove-member-title"
  oncancel={(event) => {
    event.preventDefault();
    if (!saving) onClose();
  }}
>
  <header>
    <h2 id="remove-member-title" class="fr-h5 m-0!">
      {self ? "Quitter ce groupe ?" : "Retirer ce membre ?"}
    </h2>
  </header>
  <div class="content">
    <p>
      {self ? "Vous allez quitter" : `${member.email ?? "Ce membre"} va quitter`} le groupe
      <strong>{group.name}</strong>.
    </p>
    <p>
      Les accès aux dossiers accordés par ce groupe seront retirés. Les autres groupes et le compte
      Pitchou seront conservés.
    </p>
    {#if lastActive}<p class="warning">
        Ce groupe n'aura plus de membre actif. Seul un administrateur pourra y ajouter quelqu'un.
      </p>{/if}
    {#if failure}<p role="alert" class="fr-error-text">{failure}</p>{/if}
  </div>
  <footer>
    <button class="fr-btn fr-btn--secondary" onclick={onClose} disabled={saving}>Annuler</button>
    <button class="fr-btn" onclick={remove} disabled={saving} aria-busy={saving}
      >{saving ? "Retrait…" : self ? "Quitter le groupe" : "Confirmer le retrait"}</button
    >
  </footer>
</dialog>

<style>
  dialog {
    inset: 0;
    margin: auto;
    height: fit-content;
    width: min(36rem, calc(100vw - 2rem));
    max-height: calc(100dvh - 2rem);
    padding: 0;
    color: var(--text-default-grey);
    background: var(--background-default-grey);
    border: 1px solid var(--border-default-grey);
    border-radius: 0.75rem;
    box-shadow: 0 16px 48px #0006;
  }
  dialog[open] {
    display: flex;
    flex-direction: column;
  }
  dialog::backdrop {
    background: #0009;
  }
  header,
  footer {
    padding: 1.5rem;
    flex-shrink: 0;
  }
  header {
    border-bottom: 1px solid var(--border-default-grey);
  }
  .content {
    padding: 1.5rem;
    overflow-y: auto;
    min-height: 0;
  }
  .content > :last-child {
    margin-bottom: 0;
  }
  footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.75rem;
    border-top: 1px solid var(--border-default-grey);
  }
  .warning {
    border-left: 3px solid var(--border-default-warning);
    padding-left: 1rem;
  }
</style>
