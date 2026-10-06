<script lang="ts">
  import type { PageData } from "../$types";
  let {
    visibleUsers,
    members = $bindable<number[]>([]),
    memberPage = $bindable(1),
  }: { visibleUsers: PageData["users"]; members: number[]; memberPage: number } = $props();
  const membersPerPage = 10;
  const memberPageCount = $derived(Math.max(1, Math.ceil(visibleUsers.length / membersPerPage)));
  const currentMemberPage = $derived(Math.min(memberPage, memberPageCount));
  const memberPageStart = $derived((currentMemberPage - 1) * membersPerPage);
  const pagedUsers = $derived(
    visibleUsers.slice(memberPageStart, memberPageStart + membersPerPage),
  );
</script>

<div class="selection-toolbar">
  <span
    >{members.length} membre{members.length === 1 ? "" : "s"} sélectionné{members.length === 1
      ? ""
      : "s"}</span
  >
</div>
<div class="member-list">
  {#each pagedUsers as user (user.id)}
    <label class="choice" class:selected={members.includes(user.id)}>
      <input
        type="checkbox"
        value={user.id}
        checked={members.includes(user.id)}
        onchange={(event) => {
          members = event.currentTarget.checked
            ? [...new Set([...members, user.id])]
            : members.filter((id) => id !== user.id);
        }}
        aria-label={user.email ?? `Compte ${user.id}`}
      />
      <span class="member-email">{user.email ?? `Compte ${user.id}`}</span>
      {#if !user.active}<span class="hint">Désactivé</span>{/if}
    </label>
  {:else}<p class="empty">Aucun utilisateur trouvé.</p>{/each}
</div>
{#if visibleUsers.length > membersPerPage}
  <nav class="member-pagination" aria-label="Pagination des membres">
    <span aria-live="polite">
      {memberPageStart + 1} à {Math.min(memberPageStart + membersPerPage, visibleUsers.length)} sur {visibleUsers.length}
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
