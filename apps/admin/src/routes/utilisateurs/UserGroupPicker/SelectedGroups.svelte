<script lang="ts">
  import type { PageData } from "../$types";
  import SelectedEntries from "#lib/components/SelectedEntries.svelte";
  let {
    groups,
    onRemove,
  }: {
    groups: NonNullable<PageData["groups"]>;
    onRemove: (id: string) => void;
  } = $props();
</script>

<SelectedEntries
  heading="Groupes sélectionnés"
  items={groups.map((group) => ({
    id: group.id,
    label: group.name,
    status: group.active ? undefined : "Groupe archivé",
  }))}
  emptyText="Aucun groupe sélectionné. Ajoutez un groupe dans la liste ci-dessous."
  {onRemove}
/>
