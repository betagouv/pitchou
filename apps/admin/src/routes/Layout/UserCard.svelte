<script lang="ts">
  import { onMount } from "svelte";

  type Props = {
    email?: string;
    onLogout: () => void;
    collapsed?: boolean;
  };

  let { email = "", onLogout, collapsed = false }: Props = $props();

  let open = $state(false);
  let containerEl: HTMLElement | undefined = $state();

  const initials = $derived(email.slice(0, 2).toUpperCase());

  const itemClass =
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[color:var(--text-default-grey)] transition-colors hover:bg-[var(--background-default-grey-hover)]";

  function onWindowClick(event: MouseEvent) {
    if (open && containerEl && !containerEl.contains(event.target as Node)) {
      open = false;
    }
  }

  function onWindowKeydown(event: KeyboardEvent) {
    if (open && event.key === "Escape") {
      open = false;
    }
  }

  // Light / dark theme through the DSFR system (data-fr-scheme is set, data-fr-theme is observed).
  let theme = $state<"light" | "dark">("light");

  onMount(() => {
    const root = document.documentElement;
    const sync = () => {
      theme = root.getAttribute("data-fr-theme") === "dark" ? "dark" : "light";
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-fr-theme"] });
    return () => observer.disconnect();
  });

  function toggleTheme() {
    const root = document.documentElement;
    const next = root.getAttribute("data-fr-theme") === "dark" ? "light" : "dark";
    // DSFR observes data-fr-scheme, applies data-fr-theme and persists the choice.
    root.setAttribute("data-fr-scheme", next);
  }
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<div class="relative" bind:this={containerEl}>
  {#if open}
    <div
      class="absolute z-40 rounded-lg border border-solid border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)] p-1 shadow-lg {collapsed
        ? 'bottom-0 left-full ml-2 w-56'
        : 'right-0 bottom-full left-0 mb-2'}"
    >
      <a
        class="fr-raw-link no-underline {itemClass}"
        href="https://github.com/betagouv/pitchou"
        target="_blank"
        rel="noopener external"
        title="Code source - nouvelle fenêtre"
      >
        <span class="fr-icon-github-line fr-icon--sm" aria-hidden="true"></span>
        Code source
      </a>
      <a class="fr-raw-link no-underline {itemClass}" href="mailto:support@pitchou.beta.gouv.fr">
        <span class="fr-icon-mail-line fr-icon--sm" aria-hidden="true"></span>
        Support
      </a>
      <button type="button" class={itemClass} onclick={toggleTheme}>
        <span
          class="fr-icon--sm"
          class:fr-icon-moon-line={theme !== "dark"}
          class:fr-icon-sun-line={theme === "dark"}
          aria-hidden="true"
        ></span>
        {theme === "dark" ? "Thème clair" : "Thème sombre"}
      </button>
      <button type="button" class={itemClass} onclick={onLogout}>
        <span class="fr-icon-logout-box-r-line fr-icon--sm" aria-hidden="true"></span>
        Déconnexion
      </button>
    </div>
  {/if}

  <button
    type="button"
    class="flex w-full items-center rounded-md py-2 text-left transition-colors hover:bg-[var(--background-alt-grey-hover)] {collapsed
      ? 'justify-center px-0'
      : 'gap-3 px-2'}"
    aria-expanded={open}
    aria-label={collapsed ? `Menu utilisateur - ${email}` : undefined}
    title={collapsed ? email : undefined}
    onclick={() => (open = !open)}
  >
    <span
      class="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--background-action-low-blue-france)] text-xs font-semibold text-[color:var(--text-action-high-blue-france)]"
    >
      {initials}
    </span>
    {#if !collapsed}
      <span class="min-w-0 flex-1 truncate text-sm text-[color:var(--text-default-grey)]"
        >{email}</span
      >
      <span
        class="fr-icon-arrow-up-s-line fr-icon--sm shrink-0 text-[color:var(--text-mention-grey)]"
        aria-hidden="true"
      ></span>
    {/if}
  </button>
</div>
