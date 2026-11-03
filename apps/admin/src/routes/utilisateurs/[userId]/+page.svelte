<script lang="ts">
  import { goto } from "$app/navigation";
  import UserEditor from "../UserEditor.svelte";
  import type { PageData } from "./$types";
  let { data }: { data: PageData } = $props();
</script>

{#key data.current?.id ?? "nouveau"}
  <UserEditor current={data.current} groups={data.groups} onClose={() => goto(data.returnTo)} />
{/key}
