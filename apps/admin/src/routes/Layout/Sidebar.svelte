<script lang="ts">
  import { page } from "$app/state";

  import { NAV, isNavActive } from "./nav.ts";
  import UserCard from "./UserCard.svelte";

  type Props = {
    /** Mobile overlay state; the desktop sidebar remains visible. */
    open: boolean;
    collapsed: boolean;
    onClose: () => void;
    email?: string;
    onLogout: () => void;
  };

  let { open, collapsed, onClose, email = undefined, onLogout }: Props = $props();
</script>

{#snippet content(iconOnly: boolean)}
  <div class="flex h-full flex-col">
    <a
      href="/"
      class="fr-raw-link flex h-14 shrink-0 items-center border-b border-solid border-[color:var(--border-default-grey)] no-underline {iconOnly
        ? 'justify-center px-2'
        : 'gap-2 px-5'}"
      title="Accueil - Pitchou"
    >
      {#if iconOnly}
        <span
          class="flex size-8 items-center justify-center rounded-md bg-[var(--background-action-low-blue-france)] text-sm font-bold text-[color:var(--text-action-high-blue-france)]"
          aria-hidden="true">P</span
        >
        <span class="sr-only">Pitchou Admin</span>
      {:else}
        <span class="text-lg font-bold">Pitchou</span>
        <span
          class="rounded bg-[var(--background-action-low-blue-france)] px-1.5 py-0.5 text-xs font-semibold tracking-wide text-[color:var(--text-action-high-blue-france)] uppercase"
        >
          Admin
        </span>
      {/if}
    </a>

    <nav class="flex-1 overflow-y-auto p-3" aria-label="Menu principal">
      <div class="flex flex-col gap-1">
        {#each NAV as item (item.href)}
          {@const active = isNavActive(page.url.pathname, item.href)}
          <a
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={iconOnly ? item.label : undefined}
            class="fr-raw-link flex items-center rounded-md py-2 text-sm no-underline transition-colors {iconOnly
              ? 'justify-center px-2'
              : 'gap-3 px-3'} {active
              ? 'bg-[var(--background-action-low-blue-france)] font-medium text-[color:var(--text-action-high-blue-france)]'
              : 'text-[color:var(--text-default-grey)] hover:bg-[var(--background-alt-grey-hover)] hover:text-[color:var(--text-title-grey)]'}"
          >
            <span class="{item.icon} fr-icon--sm shrink-0" aria-hidden="true"></span>
            <span class:sr-only={iconOnly}>{item.label}</span>
          </a>
        {/each}
      </div>
    </nav>

    <div class="border-t border-solid border-[color:var(--border-default-grey)] p-3">
      <UserCard {email} {onLogout} collapsed={iconOnly} />
    </div>
  </div>
{/snippet}

<!-- Desktop sidebar -->
<aside
  id="admin-sidebar"
  class="hidden shrink-0 border-r border-solid border-[color:var(--border-default-grey)] bg-[var(--background-alt-grey)] transition-[width] duration-200 lg:block {collapsed
    ? 'w-16'
    : 'w-64'}"
>
  {@render content(collapsed)}
</aside>

<!-- Mobile overlay + panel -->
{#if open}
  <button
    type="button"
    class="fixed inset-0 z-40 cursor-default bg-black/40 lg:hidden"
    aria-label="Fermer le menu"
    onclick={onClose}
  ></button>
  <aside
    id="admin-mobile-sidebar"
    class="fixed inset-y-0 left-0 z-50 w-64 border-r border-solid border-[color:var(--border-default-grey)] bg-[var(--background-alt-grey)] lg:hidden"
  >
    {@render content(false)}
  </aside>
{/if}
