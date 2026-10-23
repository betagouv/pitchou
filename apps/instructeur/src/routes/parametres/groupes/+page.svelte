<script lang="ts">
  import type { PageData } from "./$types";
  import GroupMembershipSettings from "../GroupMembershipSettings.svelte";
  let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Mes groupes - Paramètres - Pitchou</title></svelte:head>

<GroupMembershipSettings userId={data.userId} />
