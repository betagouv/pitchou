<script lang="ts">
  import { page } from "$app/state";

  import { pageHeader } from "$lib/pageHeader.svelte.ts";
  import { pageInfoFor } from "./nav.ts";

  type Props = {
    onMenuClick: () => void;
  };

  let { onMenuClick }: Props = $props();

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
<header class="sticky top-0 z-30 border-b border-solid border-gray-200 bg-white">
  <div class="flex h-14 items-center gap-2 px-4">
    <button
      type="button"
      class="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 lg:hidden"
      aria-label="Ouvrir le menu"
      onclick={onMenuClick}
    >
      <span class="fr-icon-menu-fill" aria-hidden="true"></span>
    </button>

    {#if info.backHref}
      <a
        href={info.backHref}
        class="fr-raw-link rounded-md p-1.5 text-gray-500 no-underline transition-colors hover:bg-gray-100 hover:text-gray-900"
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
        class="ml-auto rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
        title={pageHeader.action.label}
        onclick={pageHeader.action.onClick}
      >
        <span class="fr-icon-add-line" aria-hidden="true"></span>
        <span class="sr-only">{pageHeader.action.label}</span>
      </button>
    {/if}
  </div>
</header>
