<script lang="ts">
  let {
    targets,
    value = $bindable(),
    disabled = false,
  }: {
    targets: { table_name: string; column_name: string; data_type: string }[];
    value: string;
    disabled?: boolean;
  } = $props();
  let open = $state(false);
  let active = $state(-1);
  let root = $state<HTMLDivElement>();
  let input = $state<HTMLInputElement>();
  let matches = $derived(
    targets
      .filter((target) =>
        `${target.table_name}.${target.column_name}`.toLowerCase().includes(value.toLowerCase()),
      )
      .slice(0, 30),
  );

  function choose(index: number) {
    const target = matches[index];
    if (!target) return;
    value = `${target.table_name}.${target.column_name}`;
    open = false;
    active = -1;
    input?.focus();
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      if (open) event.stopPropagation();
      open = false;
      active = -1;
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      open = true;
      active =
        event.key === "ArrowDown"
          ? Math.min(active + 1, matches.length - 1)
          : active < 0
            ? matches.length - 1
            : Math.max(active - 1, 0);
    } else if (event.key === "Enter" && open && active >= 0) {
      event.preventDefault();
      choose(active);
    } else if (event.key === "Tab") {
      open = false;
      active = -1;
    }
  }

  $effect(() => {
    if (open && active >= 0) {
      root?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
    }
  });
</script>

<svelte:window
  onpointerdown={(event) => {
    if (!root?.contains(event.target as Node)) {
      open = false;
      active = -1;
    }
  }}
/>
<div class="onagre-field onagre-target" bind:this={root}>
  <label for="mapping-target">Destination dans Pitchou</label>
  <input
    id="mapping-target"
    class="fr-input"
    name="target"
    bind:value
    bind:this={input}
    {disabled}
    maxlength="20000"
    autocomplete="off"
    role="combobox"
    aria-expanded={open}
    aria-controls="target-suggestions"
    aria-autocomplete="list"
    aria-activedescendant={open && active >= 0 ? `target-option-${active}` : undefined}
    aria-describedby="target-hint"
    placeholder="Ex. dossier.name, commentaire, donnée source conservée"
    oninput={() => {
      open = true;
      active = -1;
    }}
    onclick={() => {
      open = true;
      active = -1;
    }}
    onkeydown={onKeydown}
    onblur={() => {
      open = false;
      active = -1;
    }}
  />
  {#if open}
    <div
      id="target-suggestions"
      role="listbox"
      aria-label="Champs Pitchou"
      class="onagre-suggestions"
    >
      {#each matches as target, i}
        <button
          type="button"
          role="option"
          id={`target-option-${i}`}
          data-index={i}
          aria-selected={active === i}
          tabindex="-1"
          onpointerdown={(event) => event.preventDefault()}
          onclick={() => choose(i)}
        >
          <span>{target.table_name}.{target.column_name}</span>
          <span class="onagre-context">{target.data_type}</span>
        </button>
      {:else}
        <div class="onagre-empty" role="option" aria-selected="false" aria-disabled="true">
          Aucun champ correspondant. Votre texte sera conservé.
        </div>
      {/each}
    </div>
  {/if}
  <span id="target-hint" class="onagre-context"
    >Choisissez un champ ou saisissez une destination libre.</span
  >
</div>
