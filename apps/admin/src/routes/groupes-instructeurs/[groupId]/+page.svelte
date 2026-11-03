<script lang="ts">
  import { goto } from "$app/navigation";
  import GroupEditor from "../GroupEditor.svelte";
  import type { PageData } from "./$types";
  let { data }: { data: PageData } = $props();
</script>

{#key data.current?.id ?? "nouveau"}
  <GroupEditor {data} current={data.current} onClose={() => goto("/groupes-instructeurs")} />
{/key}
