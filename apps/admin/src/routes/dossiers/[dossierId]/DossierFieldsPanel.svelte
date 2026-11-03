<script lang="ts">
  import { can } from "#lib/access.svelte.ts";
  import Loader from "@pitchou/ui/Loader.svelte";
  import type { AdminDossierDetail } from "#lib/actions/adminDossiers.ts";
  import type { ActiviteReferentielAdmin } from "#lib/actions/adminActivites.ts";
  import { activiteFormContext } from "#lib/activiteReferentiel.ts";
  import DossierAdminForm from "./DossierAdminForm.svelte";
  import DossierNativeIntakeForm from "./DossierNativeIntakeForm.svelte";
  import DossierDetailHeader from "./DossierDetailHeader.svelte";
  import DossierDeleteSection from "./DossierDeleteSection.svelte";

  let {
    detail,
    referentiel,
    referentielError,
    formId,
    saving = $bindable(false),
    onChanged,
  }: {
    detail: AdminDossierDetail;
    referentiel: ActiviteReferentielAdmin | null;
    referentielError: string | null;
    formId: string;
    saving: boolean;
    onChanged: (updated?: AdminDossierDetail) => Promise<void>;
  } = $props();
  const { activites, activiteEntries, codeByLabel } = $derived(activiteFormContext(referentiel));
</script>

<div class="admin-stack">
  <DossierDetailHeader {detail} />
  {#if detail.source === "demarche_numerique"}
    <div class="fr-alert fr-alert--info my-0">
      <p>
        Ce dossier est synchronisé depuis Démarches Numériques et affiché en lecture seule. Les
        champs propres à Pitchou restent modifiables depuis l'application instructeurs.
      </p>
    </div>
  {:else if detail.source === "unknown"}
    <div class="fr-alert fr-alert--warning my-0">
      <p>La source de ce dossier est inconnue. Il est affiché en lecture seule.</p>
    </div>
  {/if}
  {#if referentielError}
    <div class="fr-alert fr-alert--warning my-0" role="alert">
      <p>
        Le référentiel des activités n'a pas pu être chargé : {referentielError}
        Le champ « Activité principale » peut être incomplet.
      </p>
    </div>
  {/if}
  {#if !referentiel && !referentielError}
    <Loader />
  {:else if detail.source !== "pitchou" || !can("admin:dossiers:update")}
    <DossierAdminForm
      {detail}
      {activites}
      {activiteEntries}
      activiteCodeByLabel={codeByLabel}
      {formId}
      onSavingChange={(value) => (saving = value)}
      onSaved={onChanged}
      onFilesChanged={onChanged}
    />
  {:else}
    <DossierNativeIntakeForm
      {detail}
      {activites}
      {activiteEntries}
      activiteCodeByLabel={codeByLabel}
      {formId}
      onSavingChange={(value) => (saving = value)}
      onSaved={onChanged}
      onFilesChanged={onChanged}
    />
  {/if}
  {#if detail.source === "pitchou" && can("admin:dossiers:delete")}
    <DossierDeleteSection dossierId={detail.dossier.id} />
  {/if}
</div>
