<script lang="ts">
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type { FieldChange } from "@pitchou/types/notification.ts";
  import type { Involvement } from "@pitchou/types/dossierActeur.ts";
  import DossierActeurs from "./DossierActeurs.svelte";
  import PorteurDeProjetDetails from "./PorteurDeProjetDetails.svelte";
  import ProjectField from "./ProjectField.svelte";

  let {
    dossier,
    modifiedFields = new Map(),
  }: { dossier: DossierFull; modifiedFields?: Map<string, FieldChange> } = $props();
  // A porteur personne physique is the bénéficiaire Démarche Numérique: its block shows
  // the changes of that involvement.
  const porteurInvolvements = $derived<Involvement[]>(
    dossier.porteur_de_projet?.type === "personne_physique"
      ? ["beneficiaire_demarche_numerique"]
      : [],
  );
  // Changes recorded by the former identities, before the acteurs.
  const legacyFields = ["Entreprise", "Demandeur", "Mandataire", "Représentant de l'entreprise"];
  const legacyChanges = $derived(
    [...modifiedFields.values()].filter(
      ({ field }) => legacyFields.includes(field) || /^(demandeur|representant)\./u.test(field),
    ),
  );
</script>

<div class="flex flex-col gap-6">
  <PorteurDeProjetDetails
    dossierId={dossier.id}
    porteur={dossier.porteur_de_projet}
    {modifiedFields}
  />

  <DossierActeurs
    dossierId={dossier.id}
    acteurs={dossier.acteurs ?? []}
    {modifiedFields}
    {porteurInvolvements}
  />

  {#if legacyChanges.length}
    <section aria-label="Modifications antérieures">
      <h4 class="dossier-review-left fr-text--md fr-mb-1w font-bold">Modifications antérieures</h4>
      {#each legacyChanges as change (change.field)}
        <ProjectField
          dossierId={dossier.id}
          label={change.label}
          value={legacyFields.includes(change.field)
            ? "Le détail du champ modifié n'a pas été enregistré dans cet ancien historique."
            : "Cette information est désormais présentée par les acteurs du dossier."}
          {change}
        />
      {/each}
    </section>
  {/if}
</div>
