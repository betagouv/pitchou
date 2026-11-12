<script lang="ts">
  import TechnicalWorkspace from "../../onagre/TechnicalWorkspace.svelte";
  import type { PageData, ActionData } from "./$types";
  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<TechnicalWorkspace {data} {form} />
