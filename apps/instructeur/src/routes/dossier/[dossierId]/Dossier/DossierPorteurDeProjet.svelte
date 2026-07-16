<script lang="ts">
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import CopyIconButton from "./CopyIconButton.svelte";

  type Props = {
    dossier: DossierFull;
  };

  let { dossier }: Props = $props();

  const NOT_PROVIDED = "Non renseigné";

  const isPersonneMorale = $derived(Boolean(dossier.demandeur_personne_morale_siret));

  const typeDemandeur = $derived(isPersonneMorale ? "Personne morale" : "Personne physique");

  // "Actif" / "Ferme" as provided by Démarche Numérique, displayed like DN.
  const statutAdministratif = $derived.by(() => {
    switch (dossier.demandeur_personne_morale_admin_status) {
      case "Actif":
        return "En activité";
      case "Ferme":
        return "Fermé";
      default:
        return null;
    }
  });

  const formattedCreationDate = $derived.by(() => {
    const date = dossier.demandeur_personne_morale_creation_date;
    if (!date) {
      return null;
    }
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("fr-FR");
  });
</script>

{#snippet field(label: string, value: string | null | undefined, large = false)}
  <div class="field" class:field--large={large}>
    <dt>{label}</dt>
    <dd class:address={large}>{value || NOT_PROVIDED}</dd>
  </div>
{/snippet}

{#snippet fieldAddress(value: string | null | undefined)}
  <div class="field field--large">
    <div class="field-header">
      <dt>Adresse</dt>
      {#if value}
        <CopyIconButton textToCopy={value} label="Copier" />
      {/if}
    </div>
    <dd class="address">{value || NOT_PROVIDED}</dd>
  </div>
{/snippet}

{#snippet fieldMail(label: string, email: string | null | undefined)}
  <div class="field">
    <dt>{label}</dt>
    <dd>
      {#if email}
        <a href={`mailto:${email}`}>{email}</a>
      {:else}
        {NOT_PROVIDED}
      {/if}
    </dd>
  </div>
{/snippet}

{#snippet cardDeposant()}
  <section class="card">
    <h3>Personne ayant déposé le dossier</h3>
    <dl class="grid grid--narrow">
      {@render field("Nom", dossier.déposant_nom)}
      {@render field("Prénom", dossier.déposant_prénoms)}
      {@render fieldMail("Adresse mail", dossier.déposant_email)}
    </dl>
  </section>
{/snippet}

<section class="porteur-de-projet">
  <div class="header">
    <h2>Porteur de projet</h2>
    <p class="fr-badge fr-badge--info fr-badge--no-icon">{typeDemandeur}</p>
  </div>

  {#if isPersonneMorale}
    <section class="card fr-mb-3w">
      <h3>Entreprise</h3>
      <dl class="grid">
        {@render field("SIRET", dossier.demandeur_personne_morale_siret)}
        {@render field("Dénomination", dossier.demandeur_personne_morale_raison_sociale)}
        {@render field("Forme juridique", dossier.demandeur_personne_morale_legal_form)}
        {@render field("Libellé NAF", dossier.demandeur_personne_morale_naf_label)}
        {@render field("État administratif", statutAdministratif)}
        {@render field("Date de création", formattedCreationDate)}
      </dl>
    </section>

    <div class="fr-grid-row fr-grid-row--gutters">
      <div class="fr-col-12 fr-col-md-4">
        <section class="card">
          <h3>Adresse</h3>
          <dl class="grid grid--narrow">
            {@render fieldAddress(dossier.demandeur_adresse)}
            {@render field("Code postal", dossier.demandeur_personne_morale_postal_code)}
            {@render field("Département", dossier.demandeur_personne_morale_department)}
            {@render field("Région", dossier.demandeur_personne_morale_region)}
          </dl>
        </section>
      </div>

      <div class="fr-col-12 fr-col-md-4">
        <section class="card">
          <h3>Représentant</h3>
          <dl class="grid grid--narrow">
            {@render field("Nom", dossier.representative_nom)}
            {@render field("Prénom", dossier.representative_prénoms)}
            {@render field("Qualité", dossier.representative_role)}
            {@render field("Téléphone", dossier.representative_phone)}
            {@render fieldMail("Adresse mail", dossier.representative_email)}
          </dl>
        </section>
      </div>

      <div class="fr-col-12 fr-col-md-4">
        {@render cardDeposant()}
      </div>
    </div>
  {:else}
    <div class="fr-grid-row fr-grid-row--gutters">
      <div class="fr-col-12 fr-col-md-4">
        <section class="card">
          <h3>Identité du demandeur</h3>
          <dl class="grid grid--narrow">
            {@render field("Nom", dossier.demandeur_personne_physique_nom)}
            {@render field("Prénoms", dossier.demandeur_personne_physique_prénoms)}
            {@render field("Qualification", dossier.demandeur_personne_physique_role)}
            {@render fieldAddress(dossier.demandeur_personne_physique_address)}
          </dl>
        </section>
      </div>

      <div class="fr-col-12 fr-col-md-4">
        <section class="card">
          <h3>Contact</h3>
          <dl class="grid grid--narrow">
            {@render field("Téléphone", dossier.demandeur_personne_physique_phone)}
            {@render fieldMail("Adresse mail", dossier.demandeur_personne_physique_email)}
          </dl>
        </section>
      </div>

      <div class="fr-col-12 fr-col-md-4">
        {@render cardDeposant()}
      </div>
    </div>
  {/if}
</section>

<style lang="scss">
  .porteur-de-projet {
    h2 {
      margin-top: 2rem;
    }
  }

  .header {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;

    h2 {
      margin: 0;
    }
  }

  .card {
    height: 100%;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.5rem;
    padding: 1.25rem 1.5rem;
    background-color: var(--background-default-grey);

    h3 {
      margin: 0 0 1rem;
      font-size: 1.125rem;
      color: var(--text-title-blue-france);
    }
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem 1.5rem;
    margin: 0;

    &.grid--narrow {
      grid-template-columns: 1fr;
    }
  }

  .field {
    margin: 0;

    &.field--large {
      grid-column: 1 / -1;
    }

    dt {
      color: var(--text-mention-grey);
      font-size: 0.875rem;
      margin-bottom: 0.25rem;
    }

    .field-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;

      dt {
        margin-bottom: 0;
      }
    }

    dd {
      margin: 0;
      font-weight: 500;
      word-break: break-word;

      &.address {
        white-space: pre-line;
      }
    }
  }
</style>
