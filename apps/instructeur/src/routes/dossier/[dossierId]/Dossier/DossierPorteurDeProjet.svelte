<script lang="ts">
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import CopyIconButton from "./CopyIconButton.svelte";

  type Props = {
    dossier: DossierFull;
  };

  let { dossier }: Props = $props();

  const NON_RENSEIGNE = "Non renseigné";

  const estPersonneMorale = $derived(Boolean(dossier.demandeur_personne_morale_siret));

  const typeDemandeur = $derived(estPersonneMorale ? "Personne morale" : "Personne physique");

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

  const dateCreationFormatee = $derived.by(() => {
    const date = dossier.demandeur_personne_morale_creation_date;
    if (!date) {
      return null;
    }
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("fr-FR");
  });
</script>

{#snippet champ(label: string, value: string | null | undefined, large = false)}
  <div class="champ" class:champ--large={large}>
    <dt>{label}</dt>
    <dd class:adresse={large}>{value || NON_RENSEIGNE}</dd>
  </div>
{/snippet}

{#snippet champAdresse(value: string | null | undefined)}
  <div class="champ champ--large">
    <div class="champ-entete">
      <dt>Adresse</dt>
      {#if value}
        <CopyIconButton textToCopy={value} label="Copier" />
      {/if}
    </div>
    <dd class="adresse">{value || NON_RENSEIGNE}</dd>
  </div>
{/snippet}

{#snippet champMail(label: string, email: string | null | undefined)}
  <div class="champ">
    <dt>{label}</dt>
    <dd>
      {#if email}
        <a href={`mailto:${email}`}>{email}</a>
      {:else}
        {NON_RENSEIGNE}
      {/if}
    </dd>
  </div>
{/snippet}

{#snippet carteDeposant()}
  <section class="carte">
    <h3>Personne ayant déposé le dossier</h3>
    <dl class="grille grille--étroite">
      {@render champ("Nom", dossier.déposant_nom)}
      {@render champ("Prénom", dossier.déposant_prénoms)}
      {@render champMail("Adresse mail", dossier.déposant_email)}
    </dl>
  </section>
{/snippet}

<section class="porteur-de-projet">
  <div class="entete">
    <h2>Porteur de projet</h2>
    <p class="fr-badge fr-badge--info fr-badge--no-icon">{typeDemandeur}</p>
  </div>

  {#if estPersonneMorale}
    <section class="carte fr-mb-3w">
      <h3>Entreprise</h3>
      <dl class="grille">
        {@render champ("SIRET", dossier.demandeur_personne_morale_siret)}
        {@render champ("Dénomination", dossier.demandeur_personne_morale_raison_sociale)}
        {@render champ("Forme juridique", dossier.demandeur_personne_morale_legal_form)}
        {@render champ("Libellé NAF", dossier.demandeur_personne_morale_naf_label)}
        {@render champ("État administratif", statutAdministratif)}
        {@render champ("Date de création", dateCreationFormatee)}
      </dl>
    </section>

    <div class="fr-grid-row fr-grid-row--gutters">
      <div class="fr-col-12 fr-col-md-4">
        <section class="carte">
          <h3>Adresse</h3>
          <dl class="grille grille--étroite">
            {@render champAdresse(dossier.demandeur_adresse)}
            {@render champ("Code postal", dossier.demandeur_personne_morale_postal_code)}
            {@render champ("Département", dossier.demandeur_personne_morale_department)}
            {@render champ("Région", dossier.demandeur_personne_morale_region)}
          </dl>
        </section>
      </div>

      <div class="fr-col-12 fr-col-md-4">
        <section class="carte">
          <h3>Représentant</h3>
          <dl class="grille grille--étroite">
            {@render champ("Nom", dossier.representative_nom)}
            {@render champ("Prénom", dossier.representative_prénoms)}
            {@render champ("Qualité", dossier.representative_role)}
            {@render champ("Téléphone", dossier.representative_phone)}
            {@render champMail("Adresse mail", dossier.representative_email)}
          </dl>
        </section>
      </div>

      <div class="fr-col-12 fr-col-md-4">
        {@render carteDeposant()}
      </div>
    </div>
  {:else}
    <div class="fr-grid-row fr-grid-row--gutters">
      <div class="fr-col-12 fr-col-md-4">
        <section class="carte">
          <h3>Identité du demandeur</h3>
          <dl class="grille grille--étroite">
            {@render champ("Nom", dossier.demandeur_personne_physique_nom)}
            {@render champ("Prénoms", dossier.demandeur_personne_physique_prénoms)}
            {@render champ("Qualification", dossier.demandeur_personne_physique_role)}
            {@render champAdresse(dossier.demandeur_personne_physique_address)}
          </dl>
        </section>
      </div>

      <div class="fr-col-12 fr-col-md-4">
        <section class="carte">
          <h3>Contact</h3>
          <dl class="grille grille--étroite">
            {@render champ("Téléphone", dossier.demandeur_personne_physique_phone)}
            {@render champMail("Adresse mail", dossier.demandeur_personne_physique_email)}
          </dl>
        </section>
      </div>

      <div class="fr-col-12 fr-col-md-4">
        {@render carteDeposant()}
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

  .entete {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;

    h2 {
      margin: 0;
    }
  }

  .carte {
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

  .grille {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem 1.5rem;
    margin: 0;

    &.grille--étroite {
      grid-template-columns: 1fr;
    }
  }

  .champ {
    margin: 0;

    &.champ--large {
      grid-column: 1 / -1;
    }

    dt {
      color: var(--text-mention-grey);
      font-size: 0.875rem;
      margin-bottom: 0.25rem;
    }

    .champ-entete {
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

      &.adresse {
        white-space: pre-line;
      }
    }
  }
</style>
