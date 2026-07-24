<script lang="ts">
  import { onMount } from "svelte";

  import type { AccountMenuProps } from "./index.ts";

  let { email, onLogout, align = "end", links }: AccountMenuProps = $props();

  const panelId = $derived(`account-menu-panel-${align}`);

  let ouvert = $state(false);
  let containerEl: HTMLElement | undefined = $state();

  function toggle() {
    ouvert = !ouvert;
  }

  function close() {
    ouvert = false;
  }

  function onWindowClick(event: MouseEvent) {
    if (ouvert && containerEl && !containerEl.contains(event.target as Node)) {
      close();
    }
  }

  function onWindowKeydown(event: KeyboardEvent) {
    if (ouvert && event.key === "Escape") {
      close();
    }
  }

  function deconnecter() {
    close();
    onLogout?.();
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
  <button
    type="button"
    class="fr-btn fr-btn--tertiary-no-outline fr-icon-account-circle-line fr-btn--icon-left {ouvert
      ? 'bg-[var(--background-action-low-blue-france)]'
      : ''}"
    aria-expanded={ouvert}
    aria-controls={panelId}
    onclick={toggle}
  >
    Mon espace
    <span
      class="fr-icon--sm fr-ml-1v"
      class:fr-icon-arrow-up-s-line={ouvert}
      class:fr-icon-arrow-down-s-line={!ouvert}
      aria-hidden="true"
    ></span>
  </button>

  {#if ouvert}
    <div
      class="absolute top-[calc(100%+0.25rem)] z-[100] min-w-[18rem] fr-p-2w bg-[var(--background-default-grey)] border border-[color:var(--border-default-grey)] shadow-[var(--raised-shadow,0_4px_12px_rgba(0,0,0,0.16))] {align ===
      'start'
        ? 'left-0 right-auto'
        : 'right-0'}"
      id={panelId}
    >
      {#if email}
        <p
          class="fr-mt-0 fr-mx-0 fr-mb-2w fr-pb-2w fr-text--bold [overflow-wrap:anywhere] border-b border-b-[color:var(--border-default-grey)]"
        >
          {email}
        </p>
      {/if}
      {#each links ?? [] as link}
        <a
          href={link.href}
          class={`fr-btn fr-btn--tertiary ${link.icon ?? ""} fr-btn--icon-left w-full justify-start [&+&]:mt-2`}
          onclick={close}
        >
          {link.label}
        </a>
      {/each}
      <button
        type="button"
        class="fr-btn fr-btn--tertiary fr-btn--icon-left w-full justify-start [&+&]:mt-2"
        class:fr-icon-moon-line={theme !== "dark"}
        class:fr-icon-sun-line={theme === "dark"}
        onclick={toggleTheme}
      >
        {theme === "dark" ? "Thème clair" : "Thème sombre"}
      </button>
      {#if onLogout}
        <button
          type="button"
          class="fr-btn fr-btn--tertiary fr-icon-logout-box-r-line fr-btn--icon-left w-full justify-start [&+&]:mt-2"
          onclick={deconnecter}
        >
          Se déconnecter
        </button>
      {/if}
    </div>
  {/if}
</div>
