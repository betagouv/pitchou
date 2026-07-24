<script lang="ts">
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import CopyIconButton from "./CopyIconButton.svelte";

  type Props = {
    dossier: DossierFull;
  };

  let { dossier }: Props = $props();

  const NOT_PROVIDED = "Non renseigné";

  const isPersonneMorale = $derived(Boolean(dossier.demandeur_personne_morale_siret));

  const hasMandataire = $derived(
    Boolean(
      dossier.mandataire_last_name || dossier.mandataire_first_names || dossier.mandataire_email,
    ),
  );

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
  <div class="fr-m-0 [&.field--large]:[grid-column:1/-1]" class:field--large={large}>
    <dt class="text-[color:var(--text-mention-grey)] text-[0.875rem] fr-mb-1v">{label}</dt>
    <dd
      class="fr-m-0 font-medium [word-break:break-word] [&.address]:[white-space:pre-line]"
      class:address={large}
    >
      {value || NOT_PROVIDED}
    </dd>
  </div>
{/snippet}

{#snippet fieldAddress(value: string | null | undefined)}
  <div class="fr-m-0 [grid-column:1/-1]">
    <div class="flex items-center gap-2 fr-mb-1v">
      <dt class="text-[color:var(--text-mention-grey)] text-[0.875rem]">Adresse</dt>
      {#if value}
        <CopyIconButton textToCopy={value} label="Copier" />
      {/if}
    </div>
    <dd class="fr-m-0 font-medium [word-break:break-word] [white-space:pre-line]">
      {value || NOT_PROVIDED}
    </dd>
  </div>
{/snippet}

{#snippet fieldMail(label: string, email: string | null | undefined)}
  <div class="fr-m-0">
    <dt class="text-[color:var(--text-mention-grey)] text-[0.875rem] fr-mb-1v">{label}</dt>
    <dd class="fr-m-0 font-medium [word-break:break-word]">
      {#if email}
        <a href={`mailto:${email}`}>{email}</a>
      {:else}
        {NOT_PROVIDED}
      {/if}
    </dd>
  </div>
{/snippet}

{#snippet identiteDemandeurCard()}
  <section
    class="h-full border border-[color:var(--border-default-grey)] rounded-[0.5rem] fr-py-5v fr-px-3w bg-[var(--background-default-grey)] [&_h3]:mt-0 [&_h3]:mx-0 [&_h3]:mb-4 [&_h3]:text-[1.125rem] [&_h3]:text-[color:var(--text-title-blue-france)]"
  >
    <h3>Identité du demandeur</h3>
    <dl class="flex flex-wrap gap-[1rem_4rem] fr-m-0">
      {@render field("Nom", dossier.deposant_last_name)}
      {@render field("Prénom", dossier.deposant_first_names)}
      {@render fieldMail("Adresse mail", dossier.deposant_email)}
    </dl>
  </section>
{/snippet}

{#snippet mandataireCard()}
  <section
    class="h-full border border-[color:var(--border-default-grey)] rounded-[0.5rem] fr-py-5v fr-px-3w bg-[var(--background-default-grey)] [&_h3]:mt-0 [&_h3]:mx-0 [&_h3]:mb-4 [&_h3]:text-[1.125rem] [&_h3]:text-[color:var(--text-title-blue-france)]"
  >
    <h3>Identité du mandataire</h3>
    <dl class="flex flex-wrap gap-[1rem_4rem] fr-m-0">
      {@render field("Nom", dossier.mandataire_last_name)}
      {@render field("Prénom", dossier.mandataire_first_names)}
      {@render fieldMail("Adresse mail", dossier.mandataire_email)}
    </dl>
  </section>
{/snippet}

<section>
  <div class="flex items-center gap-4 flex-wrap fr-mb-3w">
    <h2 class="fr-m-0">Porteur de projet</h2>
    <p class="fr-badge fr-badge--info fr-badge--no-icon">{typeDemandeur}</p>
  </div>

  {#if isPersonneMorale}
    <div class="fr-mb-3w">
      {@render identiteDemandeurCard()}
    </div>

    {#if hasMandataire}
      <div class="fr-mb-3w">
        {@render mandataireCard()}
      </div>
    {/if}

    <section
      class="h-full border border-[color:var(--border-default-grey)] rounded-[0.5rem] fr-py-5v fr-px-3w bg-[var(--background-default-grey)] fr-mb-3w [&_h3]:mt-0 [&_h3]:mx-0 [&_h3]:mb-4 [&_h3]:text-[1.125rem] [&_h3]:text-[color:var(--text-title-blue-france)]"
    >
      <h3>Entreprise</h3>
      <dl class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-[1rem_1.5rem] fr-m-0">
        {@render field("SIRET", dossier.demandeur_personne_morale_siret)}
        {@render field("Dénomination", dossier.demandeur_personne_morale_legal_name)}
        {@render field("Forme juridique", dossier.demandeur_personne_morale_legal_form)}
        {@render field("Libellé NAF", dossier.demandeur_personne_morale_naf_label)}
        {@render field("État administratif", statutAdministratif)}
        {@render field("Date de création", formattedCreationDate)}
      </dl>
    </section>

    <div class="fr-grid-row fr-grid-row--gutters">
      <div class="fr-col-12 fr-col-md-6">
        <section
          class="h-full border border-[color:var(--border-default-grey)] rounded-[0.5rem] fr-py-5v fr-px-3w bg-[var(--background-default-grey)] [&_h3]:mt-0 [&_h3]:mx-0 [&_h3]:mb-4 [&_h3]:text-[1.125rem] [&_h3]:text-[color:var(--text-title-blue-france)]"
        >
          <h3>Représentant</h3>
          <dl class="grid grid-cols-[1fr] gap-[1rem_1.5rem] fr-m-0">
            {@render field("Nom", dossier.representative_last_name)}
            {@render field("Prénom", dossier.representative_first_names)}
            {@render field("Qualité", dossier.representative_role)}
            {@render field("Téléphone", dossier.representative_phone)}
            {@render fieldMail("Adresse mail", dossier.representative_email)}
          </dl>
        </section>
      </div>

      <div class="fr-col-12 fr-col-md-6">
        <section
          class="h-full border border-[color:var(--border-default-grey)] rounded-[0.5rem] fr-py-5v fr-px-3w bg-[var(--background-default-grey)] [&_h3]:mt-0 [&_h3]:mx-0 [&_h3]:mb-4 [&_h3]:text-[1.125rem] [&_h3]:text-[color:var(--text-title-blue-france)]"
        >
          <h3>Adresse</h3>
          <dl class="grid grid-cols-[1fr] gap-[1rem_1.5rem] fr-m-0">
            {@render fieldAddress(dossier.demandeur_address)}
            {@render field("Code postal", dossier.demandeur_personne_morale_postal_code)}
            {@render field("Département", dossier.demandeur_personne_morale_department)}
            {@render field("Région", dossier.demandeur_personne_morale_region)}
          </dl>
        </section>
      </div>
    </div>
  {:else}
    <div class="fr-grid-row fr-grid-row--gutters">
      <div class="fr-col-12 fr-col-md-4">
        <section
          class="h-full border border-[color:var(--border-default-grey)] rounded-[0.5rem] fr-py-5v fr-px-3w bg-[var(--background-default-grey)] [&_h3]:mt-0 [&_h3]:mx-0 [&_h3]:mb-4 [&_h3]:text-[1.125rem] [&_h3]:text-[color:var(--text-title-blue-france)]"
        >
          <h3>Identité du demandeur</h3>
          <dl class="grid grid-cols-[1fr] gap-[1rem_1.5rem] fr-m-0">
            {@render field("Nom", dossier.demandeur_personne_physique_last_name)}
            {@render field("Prénoms", dossier.demandeur_personne_physique_first_names)}
            {@render field("Qualification", dossier.demandeur_personne_physique_role)}
            {@render fieldAddress(dossier.demandeur_personne_physique_address)}
          </dl>
        </section>
      </div>

      {#if hasMandataire}
        <div class="fr-col-12 fr-col-md-4">
          {@render mandataireCard()}
        </div>
      {/if}

      <div class="fr-col-12 fr-col-md-4">
        <section
          class="h-full border border-[color:var(--border-default-grey)] rounded-[0.5rem] fr-py-5v fr-px-3w bg-[var(--background-default-grey)] [&_h3]:mt-0 [&_h3]:mx-0 [&_h3]:mb-4 [&_h3]:text-[1.125rem] [&_h3]:text-[color:var(--text-title-blue-france)]"
        >
          <h3>Contact</h3>
          <dl class="grid grid-cols-[1fr] gap-[1rem_1.5rem] fr-m-0">
            {@render field("Téléphone", dossier.demandeur_personne_physique_phone)}
            {@render fieldMail("Adresse mail", dossier.demandeur_personne_physique_email)}
          </dl>
        </section>
      </div>
    </div>
  {/if}
</section>
