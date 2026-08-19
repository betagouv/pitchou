<script lang="ts">
  import type { ActiviteAdmin } from "$lib/actions/adminActivites.ts";
  import type { ActiviteGroup } from "./activitesModel.ts";

  type Props = {
    group: ActiviteGroup;
    activites: ActiviteAdmin[];
    onRename: (code: string, label: string) => Promise<void>;
    onReassign: (label: string, activiteCode: string) => Promise<void>;
  };

  let { group, activites, onRename, onReassign }: Props = $props();

  let editing = $state(false);
  let draftLabel = $state("");
  let busy = $state(false);

  function startEditing() {
    draftLabel = group.activite.label;
    editing = true;
  }

  async function saveLabel() {
    const label = draftLabel.trim();
    if (!label || label === group.activite.label) {
      editing = false;
      return;
    }
    busy = true;
    try {
      await onRename(group.activite.code, label);
      editing = false;
    } catch {
      // The page displays the error; the row stays in edit mode for another try.
    } finally {
      busy = false;
    }
  }

  async function moveLabel(label: string, activiteCode: string) {
    busy = true;
    try {
      await onReassign(label, activiteCode);
    } catch {
      // The page displays the error and reload keeps the select on the real activity.
    } finally {
      busy = false;
    }
  }
</script>

<tr>
  <th scope="row" class="align-top">
    {#if editing}
      <form
        class="flex items-start gap-2"
        onsubmit={(event) => {
          event.preventDefault();
          saveLabel();
        }}
      >
        <input
          class="fr-input"
          type="text"
          aria-label="Nouveau nom de l'activité"
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
      <span class="flex items-center gap-1">
        {group.activite.label}
        <button
          type="button"
          class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-pencil-line"
          title="Renommer l'activité"
          aria-label="Renommer l'activité « {group.activite.label} »"
          onclick={startEditing}
        ></button>
      </span>
      <span class="block text-xs font-normal text-gray-500">{group.activite.code}</span>
    {/if}
  </th>
  <td>
    {#if group.labels.length === 0}
      <span class="text-sm text-gray-500">Aucun libellé rattaché pour l'instant.</span>
    {:else}
      <ul class="list-none p-0 m-0 flex flex-col gap-1">
        {#each group.labels as { label, needs_review } (label)}
          <li class="flex flex-wrap items-center gap-2">
            <span>{label}</span>
            {#if needs_review}
              <span class="fr-badge fr-badge--sm fr-badge--warning">À vérifier</span>
            {/if}
            <select
              class="fr-select !w-auto !mt-0 ml-auto text-sm"
              aria-label="Déplacer « {label} » vers une autre activité"
              value={group.activite.code}
              disabled={busy}
              onchange={(event) => moveLabel(label, event.currentTarget.value)}
            >
              {#each activites as activite (activite.code)}
                <option value={activite.code}>{activite.label}</option>
              {/each}
            </select>
          </li>
        {/each}
      </ul>
    {/if}
  </td>
</tr>
