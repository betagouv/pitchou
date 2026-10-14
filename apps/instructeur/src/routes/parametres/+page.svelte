<script lang="ts">
  import { onMount } from "svelte";
  import { store } from "$lib/state/store.svelte.ts";
  import type { EmailNotificationPreferences } from "@pitchou/types/capabilities.ts";

  let preferences = $state<EmailNotificationPreferences>();
  let saving = $state(false);
  let message = $state("");
  let failure = $state("");

  onMount(async () => {
    try {
      preferences = await store.capabilities.getEmailNotificationPreferences?.();
    } catch {
      failure = "Impossible de charger vos paramètres. Rechargez la page pour réessayer.";
    }
  });

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!preferences || !store.capabilities.updateEmailNotificationPreferences) return;
    saving = true;
    message = "";
    failure = "";
    try {
      preferences = await store.capabilities.updateEmailNotificationPreferences({ ...preferences });
      message = "Vos paramètres ont été enregistrés.";
    } catch {
      failure = "Impossible d'enregistrer vos paramètres. Réessayez.";
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head><title>Paramètres - Pitchou</title></svelte:head>

<h1>Paramètres</h1>
<h2>Notifications par mail</h2>
<p>Choisissez les notifications que vous souhaitez recevoir par mail.</p>
{#if failure}<p class="fr-error-text" role="alert">{failure}</p>{/if}
{#if message}<p class="fr-valid-text" role="status">{message}</p>{/if}
{#if preferences}
  <form onsubmit={save}>
    <fieldset class="fr-fieldset" disabled={saving}>
      <legend class="fr-fieldset__legend"
        >Nouveaux dossiers attribués pour suivi par une autre personne</legend
      >
      <p class="fr-hint-text">Un mail immédiat à chaque nouvelle attribution.</p>
      {#each [true, false] as enabled}
        <div class="fr-radio-group">
          <input
            type="radio"
            id={`assignment-${enabled}`}
            name="assignment"
            value={enabled}
            bind:group={preferences.assignment}
          />
          <label class="fr-label" for={`assignment-${enabled}`}
            >{enabled ? "Activé" : "Désactivé"}</label
          >
        </div>
      {/each}
    </fieldset>
    <fieldset class="fr-fieldset" disabled={saving}>
      <legend class="fr-fieldset__legend"
        >Nouveautés sur mes dossiers suivis, effectuées par une autre personne</legend
      >
      <p class="fr-hint-text">Un mail par dossier à 6 h, heure de Paris, en cas de nouveauté.</p>
      {#each [true, false] as enabled}
        <div class="fr-radio-group">
          <input
            type="radio"
            id={`novelty-${enabled}`}
            name="novelty"
            value={enabled}
            bind:group={preferences.novelty}
          />
          <label class="fr-label" for={`novelty-${enabled}`}
            >{enabled ? "Activé" : "Désactivé"}</label
          >
        </div>
      {/each}
    </fieldset>
    <button class="fr-btn" type="submit" disabled={saving}
      >{saving ? "Enregistrement…" : "Enregistrer"}</button
    >
  </form>
{:else if !failure}
  <p role="status">Chargement des paramètres…</p>
{/if}
