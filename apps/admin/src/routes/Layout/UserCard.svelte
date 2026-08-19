<script lang="ts">
  type Props = {
    email?: string;
    onLogout: () => void;
  };

  let { email = "", onLogout }: Props = $props();

  let open = $state(false);

  const initials = $derived(email.slice(0, 2).toUpperCase());

  const itemClass =
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100";
</script>

<div class="relative">
  {#if open}
    <button
      type="button"
      class="fixed inset-0 z-30 cursor-default"
      aria-label="Fermer le menu utilisateur"
      onclick={() => (open = false)}
    ></button>
    <div
      class="absolute right-0 bottom-full left-0 z-40 mb-2 rounded-lg border border-solid border-gray-200 bg-white p-1 shadow-lg"
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
      <button type="button" class={itemClass} onclick={onLogout}>
        <span class="fr-icon-logout-box-r-line fr-icon--sm" aria-hidden="true"></span>
        Déconnexion
      </button>
    </div>
  {/if}

  <button
    type="button"
    class="relative z-40 flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-gray-100"
    aria-expanded={open}
    onclick={() => (open = !open)}
  >
    <span
      class="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800"
    >
      {initials}
    </span>
    <span class="min-w-0 flex-1 truncate text-sm text-gray-700">{email}</span>
    <span class="fr-icon-arrow-up-s-line fr-icon--sm shrink-0 text-gray-400" aria-hidden="true"
    ></span>
  </button>
</div>
