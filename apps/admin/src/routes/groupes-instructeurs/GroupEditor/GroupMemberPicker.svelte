<script lang="ts">
  import type { PageData } from "../$types";
  import { tick } from "svelte";
  import SelectedEntries from "#lib/components/SelectedEntries.svelte";
  let {
    users,
    search = $bindable(""),
    members = $bindable<number[]>([]),
    memberPage = $bindable(1),
  }: { users: PageData["users"]; search: string; members: number[]; memberPage: number } = $props();
  const searchId = $props.id();
  let searchInput: HTMLInputElement;
  const selectedUsers = $derived(users.filter((user) => members.includes(user.id)));
  const availableUsers = $derived(users.filter((user) => !members.includes(user.id)));
  const visibleUsers = $derived(
    availableUsers.filter((user) =>
      (user.email ?? `Compte ${user.id}`).toLowerCase().includes(search.toLowerCase()),
    ),
  );
  const membersPerPage = 10;
  const memberPageCount = $derived(Math.max(1, Math.ceil(visibleUsers.length / membersPerPage)));
  const currentMemberPage = $derived(Math.min(memberPage, memberPageCount));
  const memberPageStart = $derived((currentMemberPage - 1) * membersPerPage);
  const pagedUsers = $derived(
    visibleUsers.slice(memberPageStart, memberPageStart + membersPerPage),
  );
  async function changeMember(id: number, include: boolean) {
    members = include ? [...new Set([...members, id])] : members.filter((value) => value !== id);
    memberPage = Math.min(memberPage, Math.max(1, Math.ceil(visibleUsers.length / membersPerPage)));
    await tick();
    searchInput?.focus();
  }
</script>

<SelectedEntries
  heading="Membres sélectionnés"
  items={selectedUsers.map((user) => ({
    id: user.id,
    label: user.email ?? `Compte ${user.id}`,
    status: user.active ? undefined : "Désactivé",
  }))}
  emptyText="Aucun membre sélectionné. Ajoutez une personne dans la liste ci-dessous."
  onRemove={(id) => changeMember(id, false)}
/>
<section aria-label="Membres disponibles">
  <h3 class="fr-text--md fr-mt-3w fr-mb-1w">Ajouter des membres</h3>
  <label class="fr-label" for={searchId}>Rechercher un membre</label>
  <input
    id={searchId}
    class="fr-input"
    type="search"
    bind:this={searchInput}
    bind:value={search}
    oninput={() => (memberPage = 1)}
  />
  <div class="selection-toolbar">
    <span
      >{members.length} membre{members.length === 1 ? "" : "s"} sélectionné{members.length === 1
        ? ""
        : "s"}</span
    >
  </div>
  <div class="member-list">
    {#each pagedUsers as user (user.id)}
      <label class="choice">
        <input
          type="checkbox"
          value={user.id}
          checked={false}
          onchange={() => changeMember(user.id, true)}
          aria-label={user.email ?? `Compte ${user.id}`}
        />
        <span class="member-email">{user.email ?? `Compte ${user.id}`}</span>
        {#if !user.active}<span class="hint">Désactivé</span>{/if}
      </label>
    {:else}<p class="empty">
        {availableUsers.length === 0
          ? "Tous les utilisateurs sont sélectionnés."
          : "Aucun utilisateur trouvé."}
      </p>{/each}
  </div>
  {#if visibleUsers.length > membersPerPage}
    <nav class="member-pagination" aria-label="Pagination des membres">
      <span aria-live="polite">
        {memberPageStart + 1} à {Math.min(memberPageStart + membersPerPage, visibleUsers.length)} sur
        {visibleUsers.length}
      </span>
      <div>
        <button
          type="button"
          aria-label="Page précédente des membres"
          disabled={currentMemberPage === 1}
          onclick={() => (memberPage = currentMemberPage - 1)}
        >
          <span class="fr-icon-arrow-left-s-line" aria-hidden="true"></span>
        </button>
        <span>Page {currentMemberPage} / {memberPageCount}</span>
        <button
          type="button"
          aria-label="Page suivante des membres"
          disabled={currentMemberPage === memberPageCount}
          onclick={() => (memberPage = currentMemberPage + 1)}
        >
          <span class="fr-icon-arrow-right-s-line" aria-hidden="true"></span>
        </button>
      </div>
    </nav>
  {/if}
</section>
