<script lang="ts">
  import { findAddressCoordinates } from "./projectMapAddress.ts";
  import type { Position } from "./projectMapGeometry.ts";
  import ProjectMapAddressSearch from "./ProjectMapAddressSearch.svelte";
  let {
    onFound,
    onError,
  }: { onFound: (position: Position) => void; onError: (caught: unknown) => void } = $props();
  let address = $state("");
  async function search() {
    if (!address.trim()) return;
    try {
      onFound(await findAddressCoordinates(address));
    } catch (caught) {
      onError(caught);
    }
  }
</script>

<ProjectMapAddressSearch bind:address onSearch={search} />
