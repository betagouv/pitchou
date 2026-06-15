<script lang="ts">
  import { onMount } from "svelte";

  import { store } from "../store.svelte.ts";

  type Props = {
    email: string;
    onLogout: () => void;
    /** Côté d'ouverture du panneau sous le bouton */
    align?: "start" | "end";
  };

  let { email, onLogout, align = "end" }: Props = $props();

  const estAdmin = $derived(Boolean(store.identité?.estAdmin));

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
    onLogout();
  }

  // Thème clair / sombre via le système DSFR (data-fr-scheme piloté, data-fr-theme observé)
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
    // DSFR observe data-fr-scheme, applique data-fr-theme et persiste le choix
    root.setAttribute("data-fr-scheme", next);
  }
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<div class="account-menu" bind:this={containerEl}>
  <button
    type="button"
    class="fr-btn fr-btn--tertiary-no-outline fr-icon-account-circle-line fr-btn--icon-left account-menu__btn"
    class:account-menu__btn--ouvert={ouvert}
    aria-expanded={ouvert}
    aria-controls={panelId}
    onclick={toggle}
  >
    Mon espace
    <span
      class="fr-icon--sm account-menu__chevron"
      class:fr-icon-arrow-up-s-line={ouvert}
      class:fr-icon-arrow-down-s-line={!ouvert}
      aria-hidden="true"
    ></span>
  </button>

  {#if ouvert}
    <div
      class="account-menu__panel"
      class:account-menu__panel--start={align === "start"}
      id={panelId}
    >
      <p class="account-menu__email">{email}</p>
      {#if estAdmin}
        <a
          href="/admin/utilisateurs"
          class="fr-btn fr-btn--tertiary fr-icon-team-line fr-btn--icon-left account-menu__action"
          onclick={close}
        >
          Admin - Utilisateurs
        </a>
        <a
          href="/admin/especes-protegees"
          class="fr-btn fr-btn--tertiary fr-icon-seedling-line fr-btn--icon-left account-menu__action"
          onclick={close}
        >
          Admin - Espèces
        </a>
      {/if}
      <button
        type="button"
        class="fr-btn fr-btn--tertiary fr-btn--icon-left account-menu__action"
        class:fr-icon-moon-line={theme !== "dark"}
        class:fr-icon-sun-line={theme === "dark"}
        onclick={toggleTheme}
      >
        {theme === "dark" ? "Thème clair" : "Thème sombre"}
      </button>
      <button
        type="button"
        class="fr-btn fr-btn--tertiary fr-icon-logout-box-r-line fr-btn--icon-left account-menu__action"
        onclick={deconnecter}
      >
        Se déconnecter
      </button>
    </div>
  {/if}
</div>

<style lang="scss">
  .account-menu {
    position: relative;
  }

  .account-menu__btn--ouvert {
    background-color: var(--background-action-low-blue-france);
  }

  .account-menu__chevron {
    margin-left: 0.25rem;
  }

  .account-menu__panel {
    position: absolute;
    top: calc(100% + 0.25rem);
    right: 0;
    z-index: 100;
    min-width: 18rem;
    padding: 1rem;
    background-color: var(--background-default-grey);
    border: 1px solid var(--border-default-grey);
    box-shadow: var(--raised-shadow, 0 4px 12px rgba(0, 0, 0, 0.16));
  }

  .account-menu__panel--start {
    right: auto;
    left: 0;
  }

  .account-menu__email {
    margin: 0 0 1rem;
    padding-bottom: 1rem;
    font-weight: 700;
    overflow-wrap: anywhere;
    border-bottom: 1px solid var(--border-default-grey);
  }

  .account-menu__action {
    width: 100%;
    justify-content: flex-start;

    & + & {
      margin-top: 0.5rem;
    }
  }
</style>
