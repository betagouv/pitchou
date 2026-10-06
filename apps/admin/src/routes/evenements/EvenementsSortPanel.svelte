<script lang="ts">
  import type { EvenementSortKey, EvenementSortOrder } from "$lib/actions/adminEvenements.ts";
  let {
    selectedSort,
    sortOrder,
    onChange,
  }: {
    selectedSort: EvenementSortKey;
    sortOrder: EvenementSortOrder;
    onChange: (sort: EvenementSortKey, order: EvenementSortOrder) => void;
  } = $props();
  const options: { key: EvenementSortKey; label: string }[] = [
    { key: "date", label: "Date" },
    { key: "email", label: "Utilisateur" },
    { key: "evenement", label: "Évènement" },
  ];
</script>

<fieldset id="sort-panel">
  <legend>Trier les évènements</legend>
  <div class="flex flex-wrap gap-2">
    {#each options as option}
      {@const active = selectedSort === option.key}
      <button
        type="button"
        class="inline-flex items-center gap-2"
        aria-pressed={active}
        title={active ? "Inverser le sens du tri" : `Trier par ${option.label.toLowerCase()}`}
        onclick={() =>
          onChange(
            option.key,
            active
              ? sortOrder === "asc"
                ? "desc"
                : "asc"
              : option.key === "date"
                ? "desc"
                : "asc",
          )}
      >
        {option.label}
        {#if active}<span
            class="fr-icon--sm {sortOrder === 'asc'
              ? 'fr-icon-arrow-up-line'
              : 'fr-icon-arrow-down-line'}"
            aria-hidden="true"
          ></span>{/if}
      </button>
    {/each}
  </div>
</fieldset>
