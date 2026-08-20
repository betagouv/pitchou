<script lang="ts">
  import type { ActiviteWithLabels, GroupeSection } from "./activitesModel.ts";
  import ActiviteCard from "./ActiviteCard.svelte";

  type Props = {
    section: GroupeSection;
    onSelect: (item: ActiviteWithLabels) => void;
    onRenameGroupe: (code: string, label: string) => Promise<void>;
  };

  let { section, onSelect, onRenameGroupe }: Props = $props();

  let editing = $state(false);
  let draftLabel = $state("");
  let busy = $state(false);

  function startEditing() {
    draftLabel = section.groupe.label;
    editing = true;
  }

  async function saveLabel() {
    const label = draftLabel.trim();
    if (!label || label === section.groupe.label) {
      editing = false;
      return;
    }
    busy = true;
    try {
      await onRenameGroupe(section.groupe.code, label);
      editing = false;
    } catch {
      // The page displays the error; the header stays in edit mode for another try.
    } finally {
      busy = false;
    }
  }
</script>

<section
  class="overflow-hidden rounded-xl border border-gray-200"
  aria-label="Groupe {section.groupe.label}"
>
  <header
    class="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3"
    style="background-color: {section.groupe.color}"
  >
    {#if editing}
      <form
        class="flex grow flex-wrap items-center gap-2"
        onsubmit={(event) => {
          event.preventDefault();
          saveLabel();
        }}
      >
        <input
          class="fr-input max-w-[24rem]"
          type="text"
          aria-label="Nouveau nom du groupe"
          bind:value={draftLabel}
        />
        <button type="submit" class="fr-btn fr-btn--sm" disabled={busy}>Enregistrer</button>
        <button
          type="button"
          class="fr-btn fr-btn--sm fr-btn--secondary"
          onclick={() => (editing = false)}
        >
          Annuler
        </button>
      </form>
    {:else}
      <h2 class="fr-h6 !m-0">{section.groupe.label}</h2>
      <button
        type="button"
        class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-pencil-line"
        title="Renommer le groupe"
        aria-label="Renommer le groupe « {section.groupe.label} »"
        onclick={startEditing}
      ></button>
      <span class="ml-auto text-sm text-gray-700">
        {section.activites.length}
        {section.activites.length > 1 ? "activités" : "activité"}
      </span>
    {/if}
  </header>

  <div
    class="grid gap-4 p-4 md:grid-cols-2"
    style="background-color: color-mix(in srgb, {section.groupe.color} 25%, white)"
  >
    {#if section.activites.length === 0}
      <p class="!m-0 text-sm italic text-gray-600">Aucune activité dans ce groupe.</p>
    {/if}
    {#each section.activites as item (item.activite.code)}
      <ActiviteCard {item} color={section.groupe.color} {onSelect} />
    {/each}
  </div>
</section>
