<script lang="ts">
  import { onMount } from "svelte";
  import { store } from "#lib/state/store.svelte.ts";
  import type { EmailNotificationPreferences } from "@pitchou/types/capabilities.ts";

  const notificationOptions = [
    {
      key: "arrival",
      title: "Nouveaux dossiers dans mon groupe instructeur",
      description: "Lorsqu’un nouveau dossier arrive dans votre groupe instructeur.",
      frequency: "Un mail immédiat à chaque arrivée, même si vous ne suivez pas encore le dossier.",
    },
    {
      key: "assignment",
      title: "Attributions de dossiers",
      description: "Lorsqu'une autre personne vous attribue le suivi d'un dossier.",
      frequency: "Un mail immédiat à chaque attribution.",
    },
    {
      key: "novelty",
      title: "Nouveautés sur mes dossiers suivis",
      description: "Lorsqu'une autre personne modifie un dossier que vous suivez.",
      frequency: "Un mail par dossier à 6 h, heure de Paris, en cas de nouveauté.",
    },
  ] as const;

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

<div class="mx-auto max-w-[54rem] py-8 md:py-12">
  <header class="fr-mb-4w">
    <h1 class="fr-h2 fr-mb-1w">Paramètres</h1>
    <p class="fr-mb-0 text-[var(--text-mention-grey)]">Gérez vos préférences de notification.</p>
  </header>

  <section
    aria-labelledby="email-notifications-title"
    class="border border-[var(--border-default-grey)] bg-[var(--background-default-grey)]"
  >
    <div class="flex items-start gap-4 border-b border-[var(--border-default-grey)] p-6 md:p-8">
      <span class="fr-icon-mail-line text-[var(--text-action-high-blue-france)]" aria-hidden="true"
      ></span>
      <div>
        <h2 id="email-notifications-title" class="fr-h5 fr-mb-1w">Notifications par mail</h2>
        <p class="fr-mb-0 text-[var(--text-mention-grey)]">
          Choisissez les mails que vous souhaitez recevoir.
        </p>
      </div>
    </div>
    {#if preferences}
      <form onsubmit={save}>
        <div class="px-6 md:px-8">
          {#each notificationOptions as option}
            <fieldset
              class="m-0 min-w-0 border-0 p-0 [&+&]:border-t [&+&]:border-[var(--border-default-grey)]"
              aria-labelledby={`${option.key}-title`}
              aria-describedby={`${option.key}-description ${option.key}-frequency`}
              disabled={saving}
            >
              <div class="grid items-center gap-5 py-6 md:grid-cols-[1fr_auto] md:gap-8 md:py-8">
                <div>
                  <h3 id={`${option.key}-title`} class="fr-text--lg fr-text--bold fr-mb-1w">
                    {option.title}
                  </h3>
                  <p id={`${option.key}-description`} class="fr-text--sm fr-mb-1w">
                    {option.description}
                  </p>
                  <p
                    id={`${option.key}-frequency`}
                    class="fr-text--sm fr-mb-0 text-[var(--text-mention-grey)]"
                  >
                    {option.frequency}
                  </p>
                </div>
                <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
                  {#each [true, false] as enabled}
                    <div class="fr-radio-group">
                      <input
                        type="radio"
                        id={`${option.key}-${enabled}`}
                        name={option.key}
                        value={enabled}
                        bind:group={preferences[option.key]}
                      />
                      <label class="fr-label whitespace-nowrap" for={`${option.key}-${enabled}`}
                        >{enabled ? "Activé" : "Désactivé"}</label
                      >
                    </div>
                  {/each}
                </div>
              </div>
            </fieldset>
          {/each}
        </div>
        <div
          class="flex flex-col items-start gap-4 border-t border-[var(--border-default-grey)] p-6 md:flex-row md:items-center md:justify-between md:px-8"
        >
          <div class="min-w-0">
            {#if failure}<p class="fr-error-text fr-mb-0" role="alert">{failure}</p>{/if}
            {#if message}<p class="fr-valid-text fr-mb-0" role="status">{message}</p>{/if}
          </div>
          <button class="fr-btn shrink-0" type="submit" disabled={saving} aria-busy={saving}
            >{saving ? "Enregistrement…" : "Enregistrer"}</button
          >
        </div>
      </form>
    {:else}
      <div class="p-6 md:p-8">
        {#if failure}
          <p class="fr-error-text fr-mb-0" role="alert">{failure}</p>
        {:else}
          <p class="fr-mb-0" role="status">Chargement des paramètres…</p>
        {/if}
      </div>
    {/if}
  </section>
</div>
