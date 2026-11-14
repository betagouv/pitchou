<script lang="ts">
  let {
    tab = $bindable("formulation"),
    count,
    onChange,
  }: {
    tab?: string;
    count: number;
    onChange: () => void;
  } = $props();
  const tabs = ["formulation", "demandes"] as const;
  function select(value: string) {
    tab = value;
    onChange();
  }
  function navigate(event: KeyboardEvent, index: number) {
    let next: number;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") next = 1 - index;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 1;
    else return;
    event.preventDefault();
    select(tabs[next]);
    document.querySelector<HTMLElement>(`#comment-tab-${tabs[next]}`)?.focus();
  }
</script>

<div class="comment-tabs" role="tablist" aria-label="Revue de la formulation">
  {#each tabs as value, index}
    <button
      type="button"
      role="tab"
      id={`comment-tab-${value}`}
      aria-controls={`comment-panel-${value}`}
      aria-selected={tab === value}
      tabindex={tab === value ? 0 : -1}
      onclick={() => select(value)}
      onkeydown={(event) => navigate(event, index)}
      >{value === "formulation"
        ? "Formulation"
        : `Demandes concernées (${count.toLocaleString("fr-FR")})`}</button
    >
  {/each}
</div>
