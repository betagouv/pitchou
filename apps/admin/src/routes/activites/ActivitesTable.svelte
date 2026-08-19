<script lang="ts">
  import type { ActiviteAdmin } from "$lib/actions/adminActivites.ts";
  import type { ActiviteGroup } from "./activitesModel.ts";
  import ActiviteTableRow from "./ActiviteTableRow.svelte";

  type Props = {
    groups: ActiviteGroup[];
    activites: ActiviteAdmin[];
    onRename: (code: string, label: string) => Promise<void>;
    onReassign: (label: string, activiteCode: string) => Promise<void>;
  };

  let { groups, activites, onRename, onReassign }: Props = $props();
</script>

<div class="fr-table fr-table--bordered overflow-x-auto">
  <table class="w-full min-w-[48rem]">
    <colgroup>
      <col class="w-[22rem]" />
      <col />
    </colgroup>
    <thead>
      <tr>
        <th scope="col">Activité Pitchou</th>
        <th scope="col">Libellés regroupés sous cette activité</th>
      </tr>
    </thead>
    <tbody>
      {#each groups as group (group.activite.code)}
        <ActiviteTableRow {group} {activites} {onRename} {onReassign} />
      {/each}
    </tbody>
  </table>
</div>
