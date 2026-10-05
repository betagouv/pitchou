<script lang="ts">
  import "./UsersTable/styles.css";
  import UserRow from "./UsersTable/UserRow.svelte";
  import { type User } from "./model.ts";
  import { USERS_PER_PAGE as perPage } from "./list.ts";
  import UsersPagination from "$lib/components/Pagination.svelte";
  let {
    title,
    active,
    users,
    filtered,
    page,
    onPageChange,
    onSelect,
  }: {
    title: string;
    active: boolean;
    users: User[];
    filtered: boolean;
    page: number;
    onPageChange: (page: number) => void;
    onSelect: (id: number) => void;
  } = $props();
  const pages = $derived(Math.max(1, Math.ceil(users.length / perPage)));
  const currentPage = $derived(Math.min(page, pages));
  const start = $derived((currentPage - 1) * perPage);
  const visible = $derived(users.slice(start, start + perPage));
</script>

<section aria-label={title} class="users-section">
  <header class="section-header">
    <span class="status-dot" class:active aria-hidden="true"></span>
    <h2>{title}</h2>
    <span class="count">{users.length}</span>
    {#if pages > 1}
      <div class="header-pagination">
        <UsersPagination
          current={currentPage}
          total={pages}
          label={`Pages des utilisateurs ${title.toLowerCase()}`}
          compact
          onChange={onPageChange}
        />
      </div>
    {/if}
  </header>
  {#if users.length}
    <div class="table-scroll">
      <table>
        <caption class="sr-only">Utilisateurs {title.toLowerCase()}</caption>
        <colgroup
          ><col style="width: 32%" /><col style="width: 30%" /><col style="width: 20%" /><col
            style="width: 18%"
          /></colgroup
        >
        <thead
          ><tr
            ><th scope="col">Compte</th><th scope="col">Groupes actifs</th><th scope="col"
              >Profils d'accès</th
            ><th scope="col">Dernière connexion</th></tr
          ></thead
        >
        <tbody>
          {#each visible as user (user.id)}
            <UserRow {user} {onSelect} />
          {/each}
        </tbody>
      </table>
    </div>
    {#if pages > 1}
      <div class="pagination">
        <span>{start + 1}–{Math.min(start + perPage, users.length)} sur {users.length}</span>
        <UsersPagination
          current={currentPage}
          total={pages}
          label={`Pagination des utilisateurs ${title.toLowerCase()}`}
          onChange={onPageChange}
        />
      </div>
    {/if}
  {:else}<p class="empty">
      {filtered
        ? "Aucun utilisateur ne correspond à votre recherche."
        : active
          ? "Aucun utilisateur actif."
          : "Aucun compte désactivé."}
    </p>{/if}
</section>
