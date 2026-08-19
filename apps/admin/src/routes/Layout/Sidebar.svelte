<script lang="ts">
  import { page } from "$app/state";

  import { NAV, isNavActive } from "./nav.ts";
  import UserCard from "./UserCard.svelte";

  type Props = {
    /** Mobile overlay state; the desktop sidebar is always visible. */
    open: boolean;
    onClose: () => void;
    email?: string;
    onLogout: () => void;
  };

  let { open, onClose, email = undefined, onLogout }: Props = $props();
</script>

{#snippet content()}
  <div class="flex h-full flex-col">
    <a
      href="/"
      class="fr-raw-link flex h-14 shrink-0 items-center gap-2 border-b border-solid border-gray-200 px-5 no-underline"
      title="Accueil - Pitchou"
    >
      <span class="text-lg font-bold">Pitchou</span>
      <span
        class="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-semibold tracking-wide text-blue-800 uppercase"
      >
        Admin
      </span>
    </a>

    <nav class="flex-1 overflow-y-auto p-3" aria-label="Menu principal">
      <div class="flex flex-col gap-1">
        {#each NAV as item (item.href)}
          {@const active = isNavActive(page.url.pathname, item.href)}
          <a
            href={item.href}
            aria-current={active ? "page" : undefined}
            class="fr-raw-link flex items-center gap-3 rounded-md px-3 py-2 text-sm no-underline transition-colors {active
              ? 'bg-blue-50 font-medium text-blue-700'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
          >
            <span class="{item.icon} fr-icon--sm" aria-hidden="true"></span>
            {item.label}
          </a>
        {/each}
      </div>
    </nav>

    <div class="border-t border-solid border-gray-200 p-3">
      <UserCard {email} {onLogout} />
    </div>
  </div>
{/snippet}

<!-- Desktop sidebar -->
<aside class="hidden w-64 shrink-0 border-r border-solid border-gray-200 bg-gray-50 lg:block">
  {@render content()}
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
    class="fixed inset-y-0 left-0 z-50 w-64 border-r border-solid border-gray-200 bg-gray-50 lg:hidden"
  >
    {@render content()}
  </aside>
{/if}
