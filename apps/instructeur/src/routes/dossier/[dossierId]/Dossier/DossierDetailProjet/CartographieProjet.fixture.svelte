<script lang="ts">
  import type { GeoJSONFeatureCollection } from "@pitchou/types/API_Pitchou.ts";

  let { featureCollection }: { featureCollection: GeoJSONFeatureCollection } = $props();
</script>

<output aria-label="Cartographie de test">{JSON.stringify(featureCollection)}</output>
