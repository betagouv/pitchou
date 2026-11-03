<script lang="ts">
  import type { PageData } from "./$types";
  import DossierAssignments from "./DossierAssignments.svelte";
  import DossierUserAccess from "./DossierUserAccess.svelte";
  import "./DossierAccess/styles.css";
  let {
    dossierId,
    assignments,
    userAccess,
    activityLabels,
    onChanged,
  }: {
    dossierId: number;
    assignments: PageData["assignments"];
    userAccess: PageData["userAccess"];
    activityLabels: Record<string, string>;
    onChanged: () => Promise<void>;
  } = $props();
</script>

<div class="dossier-access">
  <div class="access-introduction">
    <h2>Qui peut accéder à ce dossier ?</h2>
    <p>
      Gérez les accès des groupes ou accordez un accès à une personne, sans changer ses groupes.
    </p>
    <p class="access-footnote">
      Les accès se cumulent : retirer un accès laisse les autres en place. Les permissions du compte
      restent applicables.
    </p>
  </div>
  <DossierAssignments {dossierId} initial={assignments} {activityLabels} {onChanged} />
  <DossierUserAccess {dossierId} initial={userAccess} {onChanged} />
</div>
