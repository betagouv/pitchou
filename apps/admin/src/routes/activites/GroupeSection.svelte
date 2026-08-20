<script lang="ts">
  import type { ActiviteWithLabels, GroupeSection } from "./activitesModel.ts";
  import ActiviteCard from "./ActiviteCard.svelte";

  type Props = {
    section: GroupeSection;
    onSelect: (item: ActiviteWithLabels) => void;
    onUpdateGroupe: (code: string, label: string, color: string) => Promise<void>;
  };

  let { section, onSelect, onUpdateGroupe }: Props = $props();

  const HEX_COLOR = /^#[0-9a-f]{6}$/;

  let editing = $state(false);
  let draftLabel = $state("");
  let draftColor = $state("");
  let busy = $state(false);

  const normalizedColor = $derived(draftColor.trim().toLowerCase());
  const colorValid = $derived(HEX_COLOR.test(normalizedColor));

  function startEditing() {
    draftLabel = section.groupe.label;
    draftColor = section.groupe.color;
    editing = true;
  }

  async function saveGroupe() {
    const label = draftLabel.trim();
    if (!label || !colorValid) return;
    if (label === section.groupe.label && normalizedColor === section.groupe.color) {
      editing = false;
      return;
    }
    busy = true;
    try {
      await onUpdateGroupe(section.groupe.code, label, normalizedColor);
      editing = false;
    } catch {
      // The page displays the error; the header stays in edit mode for another try.
    } finally {
      busy = false;
    }
  }
</script>

<section
  class="overflow-hidden rounded-xl border border-[color:var(--border-default-grey)]"
  aria-label="Groupe {section.groupe.label}"
  style="--groupe-color: {section.groupe.color}"
>
  <!-- The group colors are fixed light pastels whatever the theme, so the header
       keeps fixed dark text instead of the theme text variables. -->
  <header class="flex flex-wrap items-center gap-x-3 gap-y-1 bg-[var(--groupe-color)] px-5 py-3">
    {#if editing}
      <form
        class="flex grow flex-wrap items-center gap-2"
        onsubmit={(event) => {
          event.preventDefault();
          saveGroupe();
        }}
      >
        <input
          class="fr-input max-w-[24rem]"
          type="text"
          aria-label="Nouveau nom du groupe"
          bind:value={draftLabel}
        />
        <input
          type="color"
          class="size-10 shrink-0 cursor-pointer rounded border border-solid border-[color:var(--border-default-grey)] bg-transparent p-0.5"
          aria-label="Couleur du groupe"
          value={colorValid ? normalizedColor : section.groupe.color}
          oninput={(event) => (draftColor = event.currentTarget.value)}
        />
        <input
          class="fr-input w-28"
          type="text"
          aria-label="Code hexadécimal de la couleur du groupe"
          bind:value={draftColor}
        />
        <button
          type="submit"
          class="fr-btn fr-btn--sm"
          disabled={busy || !draftLabel.trim() || !colorValid}
        >
          Enregistrer
        </button>
        <button
          type="button"
          class="fr-btn fr-btn--sm fr-btn--secondary"
          onclick={() => (editing = false)}
        >
          Annuler
        </button>
      </form>
    {:else}
      <h2 class="fr-h6 !m-0 !text-[#161616]">{section.groupe.label}</h2>
      <button
        type="button"
        class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-pencil-line !text-[#000091]"
        title="Modifier le groupe"
        aria-label="Modifier le groupe « {section.groupe.label} »"
        onclick={startEditing}
      ></button>
      <span class="ml-auto text-sm text-[#3a3a3a]">
        {section.activites.length}
        {section.activites.length > 1 ? "activités" : "activité"}
      </span>
    {/if}
  </header>

  <div
    class="grid gap-4 bg-[color-mix(in_srgb,var(--groupe-color)_25%,var(--background-default-grey))] p-4 md:grid-cols-2"
  >
    {#if section.activites.length === 0}
      <p class="!m-0 text-sm italic text-[color:var(--text-default-grey)]">
        Aucune activité dans ce groupe.
      </p>
    {/if}
    {#each section.activites as item (item.activite.code)}
      <ActiviteCard {item} color={section.groupe.color} {onSelect} />
    {/each}
  </div>
</section>
