<script lang="ts">
  import type {
    ModificationEspeceAdmin,
    PatchModificationEspece,
  } from "$lib/actions/adminEspeces.ts";
  import FieldClassification from "./FieldClassification.svelte";
  import FieldNoms from "./FieldNoms.svelte";
  import FieldStatuts from "./FieldStatuts.svelte";
  import FieldYesNo from "./FieldYesNo.svelte";
  let {
    current,
    hasReference,
    saving,
    onSave,
  }: {
    current: ModificationEspeceAdmin;
    hasReference: boolean;
    saving: boolean;
    onSave: (patch: Partial<PatchModificationEspece>) => Promise<boolean>;
  } = $props();
  function formatDate(iso: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? iso
      : date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  }
</script>

<div class="flex flex-col gap-3 [&_.field:first-child]:border-t-0 [&_.field:first-child]:pt-0!">
  <FieldClassification
    value={current.classification}
    referenceClassification={current.reference_classification}
    {hasReference}
    {saving}
    onSave={(value) => onSave({ classification: value })}
  />
  <FieldNoms
    label="Noms scientifiques"
    source="TAXREF"
    inheritId="inherit-noms-scientifiques"
    values={current.noms_scientifiques}
    referenceValues={current.reference_noms_scientifiques}
    {hasReference}
    {saving}
    onSave={(value) => onSave({ noms_scientifiques: value })}
  />
  <FieldNoms
    label="Noms vernaculaires"
    source="TAXREF"
    inheritId="inherit-noms-vernaculaires"
    values={current.noms_vernaculaires}
    referenceValues={current.reference_noms_vernaculaires}
    {hasReference}
    {saving}
    onSave={(value) => onSave({ noms_vernaculaires: value })}
  />
  <FieldStatuts
    values={current.cd_type_statuts}
    referenceValues={current.reference_cd_type_statuts}
    {hasReference}
    {saving}
    onSave={(value) => onSave({ cd_type_statuts: value })}
  />
  <FieldYesNo
    label="Espèce ministérielle"
    toggleLabel="Espèce ministérielle"
    value={current.espece_ministerielle ?? false}
    {saving}
    onSave={(value) => onSave({ espece_ministerielle: value })}
  />
  <FieldYesNo
    label="Espèce CNPN"
    toggleLabel="Espèce CNPN"
    value={current.espece_cnpn ?? false}
    {saving}
    onSave={(value) => onSave({ espece_cnpn: value })}
  />
  <FieldYesNo
    label="Exclue de la liste publique"
    toggleLabel="Exclure cette espèce"
    value={current.excluded}
    {saving}
    onSave={(value) => onSave({ excluded: value })}
  />
  {#if current.modified_by}
    <p class="m-0 text-[color:var(--text-mention-grey)] text-[0.875rem]">
      Dernière modification par {current.modified_by}{current.updated_at
        ? ` le ${formatDate(current.updated_at)}`
        : ""}
    </p>
  {/if}
</div>
