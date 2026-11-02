<script lang="ts">
  import type { GroupMember, MembershipGroup } from "@pitchou/types/groupMembership.ts";
  import type { UserId } from "@pitchou/types/permissions.ts";
  import RemoveGroupMemberDialog from "./RemoveGroupMemberDialog.svelte";
  import GroupMemberCombobox from "./GroupMemberCombobox.svelte";
  import GroupMemberSearch from "./GroupMemberSearch.svelte";
  import { changeMembership } from "./membershipRequest.ts";

  let {
    group,
    userId,
    onChanged,
  }: { group: MembershipGroup; userId: UserId; onChanged: () => Promise<void> } = $props();
  let email = $state("");
  let query = $state("");
  let page = $state(1);
  let saving = $state(false);
  let message = $state("");
  let failure = $state("");
  let removing = $state<GroupMember>();
  $effect(() => {
    if (!message) return;
    const timer = setTimeout(() => (message = ""), 5000);
    return () => clearTimeout(timer);
  });
  const filtered = $derived(
    group.members.filter((member) =>
      [member.email, member.first_names, member.last_name]
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(query.trim().toLocaleLowerCase("fr")),
    ),
  );
  const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / 10)));
  const currentPage = $derived(Math.min(page, totalPages));
  const members = $derived(filtered.slice((currentPage - 1) * 10, currentPage * 10));

  async function add(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    failure = "";
    message = "";
    try {
      await changeMembership(group.id, "POST", { email });
      email = "";
      await onChanged();
      message = "Membre ajouté";
    } catch (cause) {
      failure = cause instanceof Error ? cause.message : "Impossible d'ajouter ce membre.";
    } finally {
      saving = false;
    }
  }
</script>

<section
  aria-label={group.name}
  class="rounded-xl border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] p-5 md:p-6"
>
  <div class="flex flex-wrap items-center gap-3 mb-5">
    <h3 class="fr-h6 m-0!">{group.name}</h3>
    <span class="rounded-md bg-[var(--background-contrast-grey)] px-2 py-1 text-sm"
      >{group.members.length} membre{group.members.length > 1 ? "s" : ""}</span
    >
    <span role="status" class="sm:ml-auto">
      {#if message}
        <span
          class="inline-flex items-center gap-1.5 rounded-md bg-[var(--background-contrast-success)] px-2 py-1 text-sm text-[var(--text-default-success)]"
        >
          <span class="fr-icon-success-line fr-icon--sm" aria-hidden="true"></span>
          {message}
        </span>
      {/if}
    </span>
  </div>
  <form
    onsubmit={add}
    class="rounded-lg border border-[var(--border-default-grey)] bg-[var(--background-alt-grey)] p-4 mb-5"
  >
    <label class="fr-label" for={`email-${group.id}`}
      >Ajouter un membre par adresse professionnelle</label
    >
    <p class="fr-hint-text mt-1 mb-3" id={`email-help-${group.id}`}>
      Cette personne peut déjà utiliser Pitchou ou se connecter plus tard avec ProConnect. Aucun
      mail d'invitation n'est envoyé.
    </p>
    <div class="flex flex-col sm:flex-row gap-3">
      <GroupMemberCombobox
        id={`email-${group.id}`}
        groupId={group.id}
        describedBy={`email-help-${group.id}`}
        bind:value={email}
        disabled={saving}
      />
      <button
        class="fr-btn fr-icon-add-line fr-btn--icon-left shrink-0"
        disabled={saving}
        aria-busy={saving}>{saving ? "Ajout…" : "Ajouter"}</button
      >
    </div>
  </form>
  {#if failure}<p class="fr-error-text mb-4!" role="alert">{failure}</p>{/if}
  <div class="overflow-hidden rounded-lg border border-[var(--border-default-grey)]">
    <div
      class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default-grey)] bg-[var(--background-alt-grey)] p-4"
    >
      <h4 class="m-0! text-base! font-bold">Membres du groupe</h4>
      <GroupMemberSearch
        id={`search-${group.id}`}
        controls={`members-${group.id}`}
        bind:value={query}
        onChange={() => (page = 1)}
      />
    </div>
    <ul id={`members-${group.id}`} class="list-none p-0! m-0!">
      {#each members as member (member.id)}
        <li
          class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default-grey)] p-4 last:border-b-0"
        >
          <div class="min-w-0 flex-1 [overflow-wrap:anywhere]">
            <p class="m-0! font-bold">
              {[member.first_names, member.last_name].filter(Boolean).join(" ") ||
                member.email ||
                "Compte sans adresse e-mail"}{member.id === userId ? " (vous)" : ""}
            </p>
            {#if member.first_names || member.last_name}<p
                class="text-sm m-0! text-[var(--text-mention-grey)]"
              >
                {member.email ?? "Sans adresse e-mail"}
              </p>{/if}
            {#if !member.active}<span class="text-sm text-[var(--text-mention-grey)]"
                >Compte désactivé</span
              >{/if}
          </div>
          <button
            class="fr-btn fr-btn--tertiary fr-btn--sm"
            aria-label={member.id === userId
              ? "Quitter le groupe"
              : `Retirer ${member.email ?? "ce membre"}`}
            onclick={() => (removing = member)}
            disabled={saving}>{member.id === userId ? "Quitter le groupe" : "Retirer"}</button
          >
        </li>
      {:else}
        <li class="p-4 text-[var(--text-mention-grey)]">
          Aucun membre ne correspond à votre recherche.
        </li>
      {/each}
    </ul>
    {#if totalPages > 1}
      <nav
        class="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-default-grey)] p-4"
        aria-label={`Pagination des membres de ${group.name}`}
      >
        <button
          class="fr-btn fr-btn--tertiary fr-btn--sm"
          disabled={currentPage === 1}
          onclick={() => (page = currentPage - 1)}>Précédent</button
        >
        <span class="text-sm">Page {currentPage} sur {totalPages}</span>
        <button
          class="fr-btn fr-btn--tertiary fr-btn--sm"
          disabled={currentPage === totalPages}
          onclick={() => (page = currentPage + 1)}>Suivant</button
        >
      </nav>
    {/if}
  </div>
  {#if removing}
    <RemoveGroupMemberDialog
      {group}
      member={removing}
      {userId}
      onClose={() => (removing = undefined)}
      onRemoved={async () => {
        const self = removing?.id === userId;
        if (self) window.location.assign("/parametres/groupes");
        else {
          await onChanged();
          removing = undefined;
          failure = "";
          message = "Membre retiré";
        }
      }}
    />
  {/if}
</section>
