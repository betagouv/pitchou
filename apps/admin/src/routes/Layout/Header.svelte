<script lang="ts">
  import { page } from "$app/state";

  import { pageHeader } from "$lib/pageHeader.svelte.ts";
  import { pageInfoFor } from "./nav.ts";

  type Props = {
    sidebarCollapsed: boolean;
    onMobileMenuClick: () => void;
    onSidebarToggle: () => void;
  };

  let { sidebarCollapsed, onMobileMenuClick, onSidebarToggle }: Props = $props();

  const info = $derived(pageInfoFor(page.url.pathname));
  // A page may register a data-dependent title (e.g. the dossier name).
  const title = $derived(pageHeader.title ?? info.title);
</script>

<div class="fr-skiplinks">
  <nav aria-label="Accès rapide" class="fr-container">
    <ul class="fr-skiplinks__list">
      <li>
        <a class="fr-link" href="#main">Contenu</a>
      </li>
    </ul>
  </nav>
</div>

<!-- Topbar of the admin shell: it owns the page h1 (title comes from nav.ts). -->
<header class="sticky top-0 z-30 bg-[var(--background-default-grey)]">
  <!-- The border is inside the h-14 box, like the sidebar rows, so both bars align. -->
  <div
    class="flex h-14 items-center gap-2 border-b border-solid border-[color:var(--border-default-grey)] px-4"
  >
    <button
      type="button"
      class="rounded-md p-1.5 text-[color:var(--text-mention-grey)] transition-colors hover:bg-[var(--background-default-grey-hover)] hover:text-[color:var(--text-title-grey)] lg:hidden"
      aria-label="Ouvrir le menu"
      aria-controls="admin-mobile-sidebar"
      onclick={onMobileMenuClick}
    >
      <span class="fr-icon-menu-fill" aria-hidden="true"></span>
    </button>

    <button
      type="button"
      class="hidden rounded-md p-1.5 text-[color:var(--text-mention-grey)] transition-colors hover:bg-[var(--background-default-grey-hover)] hover:text-[color:var(--text-title-grey)] lg:inline-flex"
      aria-label={sidebarCollapsed ? "Déployer le menu" : "Réduire le menu"}
      aria-controls="admin-sidebar"
      aria-expanded={!sidebarCollapsed}
      onclick={onSidebarToggle}
    >
      <span class="fr-icon-menu-fill" aria-hidden="true"></span>
    </button>

    {#if info.backHref}
      <a
        href={info.backHref}
        class="fr-raw-link rounded-md p-1.5 text-[color:var(--text-mention-grey)] no-underline transition-colors hover:bg-[var(--background-default-grey-hover)] hover:text-[color:var(--text-title-grey)]"
        title="Retour"
      >
        <span class="fr-icon-arrow-left-s-line" aria-hidden="true"></span>
        <span class="sr-only">Retour</span>
      </a>
    {/if}

    <h1 class="my-0 truncate text-lg font-semibold">{title}</h1>

    {#if pageHeader.action}
      <button
        type="button"
        class="ml-auto rounded-md p-1.5 text-[color:var(--text-mention-grey)] transition-colors hover:bg-[var(--background-default-grey-hover)] hover:text-[color:var(--text-title-grey)]"
        title={pageHeader.action.label}
        onclick={pageHeader.action.onClick}
      >
        <span class={pageHeader.action.icon ?? "fr-icon-add-line"} aria-hidden="true"></span>
        <span class="sr-only">{pageHeader.action.label}</span>
      </button>
    {/if}
  </div>
</header>
