<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  import Loader from "@pitchou/ui/Loader.svelte";
  import DatePicker from "@pitchou/ui/DatePicker.svelte";
  import { phases } from "@pitchou/common/phases.ts";

  import {
    createDossier,
    loadGroupesInstructeurs,
    AccessDeniedError,
    type AdminGroupeInstructeurs,
  } from "$lib/actions/adminDossiers.ts";

  type Etat = "chargement" | "autorise" | "refuse";
  let etat = $state<Etat>("chargement");
  let groupes = $state<AdminGroupeInstructeurs[]>([]);
  let loadError = $state<string | null>(null);

  let name = $state("");
  let depotDate = $state(new Date().toISOString().slice(0, 10));
  let phase = $state("Accompagnement amont");
  let groupeInstructeurs = $state("");
  let demandeurType = $state<"personne_physique" | "personne_morale">("personne_physique");
  let ppLastName = $state("");
  let ppFirstNames = $state("");
  let ppEmail = $state("");
  let pmSiret = $state("");
  let pmLegalName = $state("");
  let description = $state("");

  let saving = $state(false);
  let saveError = $state<string | null>(null);

  onMount(async () => {
    try {
      groupes = await loadGroupesInstructeurs();
      groupeInstructeurs = groupes[0]?.id ?? "";
      etat = "autorise";
    } catch (e) {
      if (e instanceof AccessDeniedError) {
        etat = "refuse";
      } else {
        loadError = e instanceof Error ? e.message : String(e);
        etat = "refuse";
      }
    }
  });

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!depotDate) {
      saveError = "La date de dépôt est requise.";
      return;
    }
    saving = true;
    saveError = null;
    try {
      const { id } = await createDossier({
        name: name.trim(),
        depot_date: depotDate,
        phase,
        groupe_instructeurs: groupeInstructeurs,
        demandeur_personne_physique:
          demandeurType === "personne_physique"
            ? {
                last_name: ppLastName.trim(),
                first_names: ppFirstNames.trim(),
                email: ppEmail.trim() || null,
              }
            : null,
        demandeur_personne_morale:
          demandeurType === "personne_morale"
            ? { siret: pmSiret.replaceAll(" ", ""), legal_name: pmLegalName.trim() || null }
            : null,
        columns: description.trim() ? { description: description.trim() } : undefined,
      });
      await goto(`/dossiers/${id}`);
    } catch (e) {
      saveError = e instanceof Error ? e.message : String(e);
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Administration - créer un dossier — Pitchou</title>
</svelte:head>

{#if loadError}
  <div class="fr-alert fr-alert--error fr-mb-3w" role="alert">
    <h3 class="fr-alert__title">Erreur lors du chargement</h3>
    <p>{loadError}</p>
  </div>
{:else if etat === "chargement"}
  <Loader />
{:else if etat === "refuse"}
  <div class="fr-alert fr-alert--error fr-mb-3w" role="alert">
    <h3 class="fr-alert__title">Accès réservé aux administrateurs</h3>
    <p>Cette page est réservée aux administrateurs Pitchou.</p>
  </div>
{:else}
  <a class="fr-link fr-icon-arrow-left-line fr-link--icon-left" href="/dossiers">
    Retour aux dossiers
  </a>
  <h1 class="fr-mt-2w">Créer un dossier</h1>
  <p class="fr-text-mention--grey">
    Le dossier est créé directement dans Pitchou, sans passer par Démarches Numériques. Les autres
    champs (projet, localisation, dérogation…) sont modifiables après création.
  </p>

  <form class="w-full flex flex-col gap-6" onsubmit={submit}>
    <fieldset class="fr-fieldset" aria-label="Informations générales">
      <legend class="fr-fieldset__legend fr-text--bold">Informations générales</legend>

      <div class="fr-fieldset__element">
        <div class="fr-input-group">
          <label class="fr-label" for="dossier-name">Nom du dossier</label>
          <input
            class="fr-input"
            id="dossier-name"
            type="text"
            required
            autocomplete="off"
            data-form-type="other"
            data-1p-ignore
            bind:value={name}
          />
        </div>
      </div>

      <div class="fr-fieldset__element fr-fieldset__element--inline">
        <div class="fr-input-group min-w-[14rem]">
          <label class="fr-label" for="dossier-depot-date">Date de dépôt</label>
          <DatePicker
            id="dossier-depot-date"
            label="Date de dépôt"
            value={depotDate}
            onChange={(value) => (depotDate = value ?? "")}
          />
        </div>
      </div>

      <div class="fr-fieldset__element fr-fieldset__element--inline">
        <div class="fr-select-group">
          <label class="fr-label" for="dossier-phase">Phase initiale</label>
          <select class="fr-select" id="dossier-phase" bind:value={phase}>
            {#each [...phases] as phaseOption (phaseOption)}
              <option value={phaseOption}>{phaseOption}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="fr-fieldset__element">
        <div class="fr-select-group">
          <label class="fr-label" for="dossier-groupe">
            Groupe instructeurs
            <span class="fr-hint-text">
              Le dossier ne sera visible que par les instructeurs de ce groupe.
            </span>
          </label>
          <select class="fr-select" id="dossier-groupe" required bind:value={groupeInstructeurs}>
            {#each groupes as groupe (groupe.id)}
              <option value={groupe.id}>{groupe.name}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="fr-fieldset__element">
        <div class="fr-input-group">
          <label class="fr-label" for="dossier-description">
            Description du projet <span class="fr-hint-text">Facultatif</span>
          </label>
          <textarea class="fr-input" id="dossier-description" rows="3" bind:value={description}
          ></textarea>
        </div>
      </div>
    </fieldset>

    <fieldset class="fr-fieldset" aria-label="Demandeur">
      <legend class="fr-fieldset__legend fr-text--bold">Demandeur</legend>

      <div class="fr-fieldset__element">
        <div class="fr-radio-group fr-radio-group--inline">
          <input
            type="radio"
            id="demandeur-pp"
            value="personne_physique"
            bind:group={demandeurType}
          />
          <label class="fr-label" for="demandeur-pp">Personne physique</label>
        </div>
        <div class="fr-radio-group fr-radio-group--inline">
          <input
            type="radio"
            id="demandeur-pm"
            value="personne_morale"
            bind:group={demandeurType}
          />
          <label class="fr-label" for="demandeur-pm">Personne morale</label>
        </div>
      </div>

      {#if demandeurType === "personne_physique"}
        <div class="fr-fieldset__element fr-fieldset__element--inline">
          <div class="fr-input-group">
            <label class="fr-label" for="pp-last-name">Nom</label>
            <input
              class="fr-input"
              id="pp-last-name"
              type="text"
              required
              bind:value={ppLastName}
            />
          </div>
        </div>
        <div class="fr-fieldset__element fr-fieldset__element--inline">
          <div class="fr-input-group">
            <label class="fr-label" for="pp-first-names">Prénom(s)</label>
            <input class="fr-input" id="pp-first-names" type="text" bind:value={ppFirstNames} />
          </div>
        </div>
        <div class="fr-fieldset__element">
          <div class="fr-input-group">
            <label class="fr-label" for="pp-email">
              Adresse e-mail <span class="fr-hint-text">Facultatif</span>
            </label>
            <input class="fr-input" id="pp-email" type="email" bind:value={ppEmail} />
          </div>
        </div>
      {:else}
        <div class="fr-fieldset__element fr-fieldset__element--inline">
          <div class="fr-input-group">
            <label class="fr-label" for="pm-siret">
              SIRET <span class="fr-hint-text">14 chiffres</span>
            </label>
            <input
              class="fr-input"
              id="pm-siret"
              type="text"
              required
              minlength="14"
              bind:value={pmSiret}
            />
          </div>
        </div>
        <div class="fr-fieldset__element">
          <div class="fr-input-group">
            <label class="fr-label" for="pm-legal-name">Raison sociale</label>
            <input class="fr-input" id="pm-legal-name" type="text" bind:value={pmLegalName} />
          </div>
        </div>
      {/if}
    </fieldset>

    {#if saveError}
      <div class="fr-alert fr-alert--error fr-alert--sm" role="alert">
        <p>{saveError}</p>
      </div>
    {/if}

    <div class="flex flex-row gap-4">
      <button class="fr-btn" type="submit" disabled={saving}>
        {saving ? "Création…" : "Créer le dossier"}
      </button>
      <a class="fr-btn fr-btn--secondary" href="/dossiers">Annuler</a>
    </div>
  </form>
{/if}
