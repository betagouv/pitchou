<script lang="ts">
  import { tick } from "svelte";
  import { can } from "#lib/access.svelte.ts";
  import { pageHeader } from "#lib/pageHeader.svelte.ts";
  import type { AdminDossierDetail } from "#lib/actions/adminDossiers.ts";
  import { updateDossierPorteur } from "#lib/actions/adminPorteur.ts";
  import { organisationErrors, organisationForm, organisationPayload } from "../organisation.ts";
  import { legalSiretError } from "../nouveau/dossierCreationModel.ts";
  import OrganisationFields from "../OrganisationFields.svelte";

  let {
    detail,
    onSaved,
  }: {
    detail: AdminDossierDetail;
    onSaved: (updated: AdminDossierDetail) => Promise<void> | void;
  } = $props();
  // svelte-ignore state_referenced_locally
  let organisation = $state(
    organisationForm(
      detail.porteur_de_projet?.type === "organisation" ? detail.porteur_de_projet : null,
    ),
  );
  let type = $state<"organisation" | "personne_morale">("organisation");
  let siret = $state("");
  let saving = $state(false);
  let showErrors = $state(false);
  let saveError = $state<string | null>(null);
  const siretError = $derived(showErrors ? legalSiretError(siret) : null);

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (saving || !can("admin:dossiers:update")) return;
    showErrors = true;
    saveError = null;
    const field =
      type === "organisation"
        ? Object.keys(organisationErrors(organisation))[0]
        : legalSiretError(siret)
          ? "siret"
          : undefined;
    if (field) {
      await tick();
      document.querySelector<HTMLElement>(`#onagre-porteur-${field}`)?.focus();
      return;
    }
    saving = true;
    const confirmSaved = pageHeader.beginSave("Porteur de projet enregistré");
    try {
      const updated = await updateDossierPorteur(
        detail.dossier.id,
        type === "organisation"
          ? { type, ...organisationPayload(organisation) }
          : { type, siret: siret.replaceAll(" ", "") },
      );
      await onSaved(updated);
      confirmSaved();
    } catch (error) {
      saveError = error instanceof Error ? error.message : String(error);
    } finally {
      saving = false;
    }
  }
</script>

<form
  class="dossier-form"
  onsubmit={save}
  novalidate
  aria-label="Vérifier le porteur de projet Onagre"
>
  <h2>Porteur de projet</h2>
  <fieldset disabled={saving} class="fr-fieldset">
    <legend class="fr-fieldset__legend">Identification du porteur de projet</legend>
    <div class="fr-radio-group fr-fieldset__element">
      <input id="onagre-porteur-organisation" type="radio" value="organisation" bind:group={type} />
      <label class="fr-label" for="onagre-porteur-organisation"
        >Organisation sans SIRET confirmé</label
      >
    </div>
    <div class="fr-radio-group fr-fieldset__element">
      <input
        id="onagre-porteur-establishment"
        type="radio"
        value="personne_morale"
        bind:group={type}
      />
      <label class="fr-label" for="onagre-porteur-establishment">Personne morale avec SIRET</label>
    </div>
  </fieldset>
  {#if type === "organisation"}
    <OrganisationFields {organisation} {showErrors} disabled={saving} idPrefix="onagre-porteur" />
  {:else}
    <div class="fr-input-group" class:fr-input-group--error={siretError}>
      <label class="fr-label" for="onagre-porteur-siret"
        >Numéro de SIRET *<span class="fr-hint-text">14 chiffres</span></label
      >
      <input
        id="onagre-porteur-siret"
        class="fr-input"
        inputmode="numeric"
        disabled={saving}
        bind:value={siret}
        aria-invalid={siretError ? true : undefined}
        aria-describedby={siretError ? "onagre-porteur-siret-error" : undefined}
      />
      {#if siretError}<p class="fr-error-text" id="onagre-porteur-siret-error">{siretError}</p>{/if}
    </div>
  {/if}
  {#if saveError}<div class="fr-alert fr-alert--error fr-alert--sm" role="alert">
      <p>{saveError}</p>
    </div>{/if}
  <button type="submit" class="fr-btn" disabled={saving}
    >{saving ? "Enregistrement…" : "Enregistrer le porteur de projet"}</button
  >
</form>
