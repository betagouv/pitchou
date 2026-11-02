<script lang="ts">
  import { can } from "#lib/access.svelte.ts";
  import type { AccessLevel } from "@pitchou/types/groupRouting.ts";
  import type { PageData } from "../$types";
  import AccessLevelChoice from "../DossierAccess/AccessLevelChoice.svelte";

  let {
    grant,
    disabled,
    onSave,
  }: {
    grant: PageData["userAccess"]["grants"][number];
    disabled: boolean;
    onSave: (userId: number, accessLevel: AccessLevel | null) => Promise<void>;
  } = $props();
  let editing = $state(false);
  let draft = $state<AccessLevel>("read");
  let message = $state("");
  const person = $derived(grant.email ?? `Compte ${grant.user_id}`);
  const grantedLabel = $derived(grant.access_level === "read" ? "Lecture complète" : "Instruction");
  const effectiveLabels: Record<string, string> = {
    complet: "Instruction",
    lecture_complete: "Lecture complète",
    lecture: "Lecture restreinte",
  };
  const effectiveLabel = $derived(effectiveLabels[grant.effective_access ?? ""] ?? "Aucun accès");
  function edit() {
    draft = grant.access_level;
    message = "";
    editing = true;
  }
  async function save(accessLevel: AccessLevel | null) {
    if (disabled || !can("groups:manage")) return;
    message = "";
    try {
      await onSave(grant.user_id, accessLevel);
      editing = false;
    } catch (cause) {
      message = cause instanceof Error ? cause.message : "Modification d'accès impossible";
    }
  }
</script>

<article class="access-row" aria-label={`Accès de ${person}`}>
  <div class="person-summary">
    <div>
      <div class="access-row-heading">
        <h3>{person}</h3>
        <span class="access-badge">{grantedLabel}</span>
        {#if !grant.active}<span class="access-badge access-badge-muted">Compte inactif</span>{/if}
      </div>
      {#if effectiveLabel !== grantedLabel}
        <p class="access-meta">
          Accès effectif : {effectiveLabel}. Il dépend des groupes et des permissions du compte.
        </p>
      {/if}
    </div>
    {#if can("groups:manage") && !editing}
      <button
        type="button"
        class="fr-btn fr-btn--tertiary fr-btn--sm"
        {disabled}
        aria-label={`Modifier l'accès de ${person}`}
        onclick={edit}>Modifier</button
      >
    {/if}
  </div>
  {#if can("groups:manage") && editing}
    <form
      class="access-editor"
      aria-label={`Modifier l'accès de ${person}`}
      onsubmit={(event) => {
        event.preventDefault();
        void save(draft);
      }}
    >
      <fieldset {disabled}>
        <AccessLevelChoice
          name={`user-access-${grant.user_id}`}
          label={`Niveau d'accès de ${person}`}
          bind:value={draft}
          {disabled}
        />
        {#if !grant.active}
          <p class="access-meta">
            Ce compte est inactif. Il ne pourra pas accéder au dossier tant qu'il ne sera pas
            réactivé.
          </p>
        {/if}
        {#if message}<p class="fr-alert fr-alert--error" role="alert">{message}</p>{/if}
        <div class="access-actions">
          <button class="fr-btn fr-btn--sm" type="submit">Enregistrer</button>
          <button
            class="fr-btn fr-btn--tertiary fr-btn--sm"
            type="button"
            onclick={() => {
              editing = false;
              message = "";
            }}>Annuler</button
          >
        </div>
        <div class="access-details">
          <p class="access-meta" id={`revoke-user-${grant.user_id}`}>
            Retirer cet accès individuel ne retire pas les accès accordés par les groupes.
          </p>
          <button
            type="button"
            class="fr-btn fr-btn--tertiary fr-btn--sm"
            aria-label={`Révoquer l'accès individuel de ${person}`}
            aria-describedby={`revoke-user-${grant.user_id}`}
            onclick={() => save(null)}>Révoquer l'accès individuel</button
          >
        </div>
      </fieldset>
    </form>
  {/if}
</article>

<style>
  .person-summary {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 1rem;
  }
  .person-summary > div {
    min-width: 0;
  }
  h3 {
    margin: 0;
    font-size: 1rem;
    overflow-wrap: anywhere;
  }
  @media (max-width: 36rem) {
    .person-summary {
      flex-wrap: wrap;
    }
  }
</style>
