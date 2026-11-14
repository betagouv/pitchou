<script lang="ts">
  let {
    id,
    tabs,
    active = $bindable(0),
  }: {
    id: string;
    tabs: string[];
    active?: number;
  } = $props();
  function navigate(event: KeyboardEvent) {
    let next: number;
    if (event.key === "ArrowRight") next = (active + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (active + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    active = next;
    document.querySelector<HTMLElement>(`#${id}-tab-${next}`)?.focus();
  }
</script>

<div role="tablist" aria-label="Détail du rapprochement" class="detail-tabs">
  {#each tabs as label, index}
    <button
      type="button"
      role="tab"
      id={`${id}-tab-${index}`}
      aria-controls={`${id}-panel-${index}`}
      aria-selected={active === index}
      tabindex={active === index ? 0 : -1}
      onclick={() => (active = index)}
      onkeydown={navigate}>{label}</button
    >
  {/each}
</div>

<style>
  .detail-tabs {
    display: flex;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border-default-grey);
    margin-bottom: 1rem;
  }
  button {
    padding: 0.75rem 1rem;
    border-bottom: 3px solid transparent;
    color: var(--text-mention-grey);
  }
  button[aria-selected="true"] {
    color: var(--text-action-high-blue-france);
    border-bottom-color: var(--border-action-high-blue-france);
    font-weight: 700;
  }
</style>
