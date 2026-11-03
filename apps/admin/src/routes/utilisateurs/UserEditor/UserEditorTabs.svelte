<script lang="ts">
  let {
    id,
    selected = $bindable("account"),
    groupCount,
  }: { id: string; selected: string; groupCount: number } = $props();
  const tabs = [
    { key: "account", label: "Compte et profils" },
    { key: "groups", label: "Groupes" },
    { key: "permissions", label: "Permissions personnalisées" },
  ];
  let list: HTMLDivElement;
  function move(event: KeyboardEvent, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    selected = tabs[next].key;
    list.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }
</script>

<div
  class="user-tabs admin-page-tabs"
  role="tablist"
  aria-label="Paramètres de l'utilisateur"
  bind:this={list}
>
  {#each tabs as tab, index}
    <button
      type="button"
      role="tab"
      id={`${id}-tab-${tab.key}`}
      aria-selected={selected === tab.key}
      aria-controls={`${id}-panel-${tab.key}`}
      tabindex={selected === tab.key ? 0 : -1}
      onclick={() => (selected = tab.key)}
      onkeydown={(event) => move(event, index)}
    >
      {tab.label}
      {#if tab.key === "groups"}<span aria-hidden="true">{groupCount}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .user-tabs {
    display: flex;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border-default-grey);
  }
  button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-bottom: 3px solid transparent;
    color: var(--text-mention-grey);
    font-size: 0.875rem;
    font-weight: 600;
  }
  button[aria-selected="true"] {
    color: var(--text-action-high-blue-france);
    border-bottom-color: var(--border-action-high-blue-france);
  }
  span {
    padding: 0 0.375rem;
    border-radius: 0.25rem;
    background: var(--background-contrast-grey);
    font-size: 0.75rem;
  }
  @media (max-width: 575px) {
    button {
      padding: 0.75rem 0.5rem;
    }
  }
</style>
