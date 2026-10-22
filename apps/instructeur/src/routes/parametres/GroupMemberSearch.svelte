<script lang="ts">
  let {
    id,
    controls,
    value = $bindable(""),
    onChange,
  }: {
    id: string;
    controls: string;
    value?: string;
    onChange: () => void;
  } = $props();
  let input: HTMLInputElement;

  function clear() {
    value = "";
    onChange();
    input.focus();
  }
</script>

<div
  class="member-search flex h-11 w-full items-center gap-2 rounded-lg border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] pl-3 pr-1 sm:w-72"
>
  <span
    class="fr-icon-search-line fr-icon--sm shrink-0 text-[var(--text-mention-grey)]"
    aria-hidden="true"
  ></span>
  <label class="fr-sr-only" for={id}>Rechercher un membre</label>
  <input
    bind:this={input}
    bind:value
    {id}
    type="text"
    role="searchbox"
    class="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-default-grey)]"
    placeholder="Rechercher un membre…"
    aria-controls={controls}
    autocomplete="off"
    data-form-type="other"
    data-1p-ignore
    data-lpignore="true"
    oninput={onChange}
    onkeydown={(event) => {
      if (event.key === "Escape" && value) {
        event.preventDefault();
        clear();
      }
    }}
  />
  <span class="flex size-8 shrink-0">
    {#if value}
      <button
        type="button"
        aria-label="Effacer la recherche"
        title="Effacer la recherche"
        class="flex size-8 items-center justify-center rounded-md text-[var(--text-mention-grey)] hover:bg-[var(--background-contrast-grey)] hover:text-[var(--text-default-grey)]"
        onclick={clear}
      >
        <span class="fr-icon-close-line fr-icon--sm" aria-hidden="true"></span>
      </button>
    {/if}
  </span>
</div>

<style>
  .member-search:focus-within {
    outline: 2px solid var(--border-action-high-blue-france);
    outline-offset: 2px;
  }
  input {
    border: 0;
    padding: 0;
    box-shadow: none;
    outline: none;
  }
  input::placeholder {
    color: var(--text-mention-grey);
    font-style: normal;
  }
</style>
