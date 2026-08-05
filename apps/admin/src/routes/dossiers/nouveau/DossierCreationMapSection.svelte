<script lang="ts">
  import DossierProjectMapField from "../[dossierId]/DossierProjectMapField.svelte";
  import type { DossierCreationModel } from "./dossierCreationModel.ts";

  let { model }: { model: DossierCreationModel } = $props();
</script>

<section
  class="border-t border-[color:var(--border-default-grey)] fr-pt-4w"
  aria-labelledby="project-map-title"
>
  <h2 class="fr-h2" id="project-map-title">5. Cartographie du projet</h2>
  <DossierProjectMapField
    inputId="creation-project-map"
    value={model.projectMap}
    onChange={(value) => (model.projectMap = value)}
  />
</section>
