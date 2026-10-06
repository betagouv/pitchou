<script lang="ts">
  import { page } from "$app/state";
  import { afterNavigate, beforeNavigate } from "$app/navigation";
  import { onDestroy } from "svelte";

  import { pageHeader } from "$lib/pageHeader.svelte.ts";
  import { pageInfoFor } from "./nav.ts";
  import HeaderDownloadMenu from "./HeaderDownloadMenu.svelte";

  type Props = {
    sidebarCollapsed: boolean;
    onMobileMenuClick: () => void;
    onSidebarToggle: () => void;
  };

  let { sidebarCollapsed, onMobileMenuClick, onSidebarToggle }: Props = $props();

  const info = $derived(pageInfoFor(page.url.pathname));
  // A page may register a data-dependent title (e.g. the dossier name).
  const title = $derived(pageHeader.title ?? info.title);

  beforeNavigate(({ from, to }) => {
    if (from?.url.pathname !== to?.url.pathname) pageHeader.clearFeedback();
  });
  afterNavigate(({ from, to }) => {
    if (from && from.url.pathname !== to?.url.pathname) pageHeader.clearFeedback();
  });
  onDestroy(() => pageHeader.clearFeedback());
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

    <h1 class="my-0 min-w-0 flex-1 truncate text-lg font-semibold">{title}</h1>

    <div class="save-feedback" role="status" aria-live="polite" aria-atomic="true">
      {#if pageHeader.feedback?.kind === "success"}
        <p class="fr-badge fr-badge--success fr-badge--sm fr-mb-0">
          {pageHeader.feedback.message}
        </p>
      {:else if pageHeader.feedback?.kind === "saving"}
        <p class="fr-text--sm fr-mb-0 text-[color:var(--text-mention-grey)]">
          <span
            class="fr-icon-refresh-line fr-icon--sm inline-block animate-spin"
            aria-hidden="true"
          ></span>
          {pageHeader.feedback.message}
        </p>
      {/if}
    </div>

    {#if pageHeader.downloads.length}
      <HeaderDownloadMenu items={pageHeader.downloads} />
    {/if}
    {#if pageHeader.help}
      <button
        type="button"
        class="shrink-0 rounded-md p-1.5 text-[color:var(--text-mention-grey)] hover:bg-[var(--background-default-grey-hover)] hover:text-[color:var(--text-title-grey)]"
        title={pageHeader.help.label}
        aria-label={pageHeader.help.label}
        onclick={pageHeader.help.onClick}
      >
        <span class="fr-icon-question-line" aria-hidden="true"></span>
      </button>
    {/if}
    {#if pageHeader.action}
      <button
        type="button"
        class="shrink-0 rounded-md p-1.5 text-[color:var(--text-mention-grey)] transition-colors enabled:hover:bg-[var(--background-default-grey-hover)] enabled:hover:text-[color:var(--text-title-grey)] disabled:cursor-wait disabled:opacity-50"
        title={pageHeader.action.label}
        disabled={pageHeader.action.disabled}
        onclick={pageHeader.action.onClick}
      >
        <span class={pageHeader.action.icon ?? "fr-icon-add-line"} aria-hidden="true"></span>
        <span class="sr-only">{pageHeader.action.label}</span>
      </button>
    {/if}
  </div>
</header>

<style>
  .save-feedback {
    flex-shrink: 0;
    max-width: 45%;
  }

  .save-feedback p {
    white-space: normal;
  }

  @media (max-width: 575px) {
    .save-feedback {
      max-width: 8rem;
    }
  }
</style>
