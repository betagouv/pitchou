<script lang="ts">
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import CopyIconButton from "../CopyIconButton.svelte";
  import { entrepriseCreationDate, entrepriseStatus, hasDossierMandataire } from "./porteur.ts";

  type Props = {
    dossier: DossierFull;
  };

  let { dossier }: Props = $props();

  const NOT_PROVIDED = "Non renseigné";

  const isPersonneMorale = $derived(Boolean(dossier.demandeur_personne_morale_siret));
  const hasMandataire = $derived(hasDossierMandataire(dossier));
  const statutAdministratif = $derived(entrepriseStatus(dossier));
  const formattedCreationDate = $derived(entrepriseCreationDate(dossier));

  // "Dordogne, Nouvelle Aquitaine" line under the postal address.
  const entrepriseTerritoire = $derived(
    [dossier.demandeur_personne_morale_department, dossier.demandeur_personne_morale_region]
      .filter(Boolean)
      .join(", "),
  );

  function fullName(
    firstNames: string | null | undefined,
    lastName: string | null | undefined,
  ): string {
    return [firstNames, lastName].filter(Boolean).join(" ") || NOT_PROVIDED;
  }
</script>

{#snippet row(label: string, value: string | null | undefined)}
  <dt class="text-[color:var(--text-mention-grey)]">{label}</dt>
  <dd class="fr-m-0 font-medium [word-break:break-word]">{value || NOT_PROVIDED}</dd>
{/snippet}

{#snippet mail(email: string | null | undefined)}
  {#if email}
    <p class="fr-m-0 flex items-center gap-2">
      <span
        class="fr-icon-mail-line fr-icon--sm text-[color:var(--text-mention-grey)]"
        aria-hidden="true"
      ></span>
      <a class="fr-link" href={`mailto:${email}`}>{email}</a>
    </p>
  {/if}
{/snippet}

{#snippet phone(number: string | null | undefined)}
  {#if number}
    <p class="fr-m-0 flex items-center gap-2">
      <span
        class="fr-icon-phone-line fr-icon--sm text-[color:var(--text-mention-grey)]"
        aria-hidden="true"
      ></span>
      {number}
    </p>
  {/if}
{/snippet}

<div class="flex flex-col gap-6">
  {#if isPersonneMorale}
    <section>
      <h4 class="fr-text--md fr-mb-1w font-bold">L’entreprise</h4>
      <dl class="fr-m-0 grid grid-cols-[max-content_1fr] gap-x-8 gap-y-1">
        {@render row("Dénomination", dossier.demandeur_personne_morale_legal_name)}
        {@render row("SIRET", dossier.demandeur_personne_morale_siret)}
        {@render row("Forme juridique", dossier.demandeur_personne_morale_legal_form)}
        {@render row("Libellé NAF", dossier.demandeur_personne_morale_naf_label)}
        {@render row("État administratif", statutAdministratif)}
        {@render row("Date de création", formattedCreationDate)}
        <dt class="text-[color:var(--text-mention-grey)]">
          Adresse
          {#if dossier.demandeur_address}
            <CopyIconButton textToCopy={dossier.demandeur_address} label="Copier" />
          {/if}
        </dt>
        <dd class="fr-m-0 font-medium [white-space:pre-line] [word-break:break-word]">
          {dossier.demandeur_address || NOT_PROVIDED}{entrepriseTerritoire
            ? `\n${entrepriseTerritoire}`
            : ""}
        </dd>
      </dl>
    </section>

    <section>
      <h4 class="fr-text--md fr-mb-1w font-bold">Le représentant</h4>
      <p class="fr-m-0">
        {fullName(dossier.representative_first_names, dossier.representative_last_name)}
      </p>
      {#if dossier.representative_role}<p class="fr-m-0 italic">
          {dossier.representative_role}
        </p>{/if}
      {@render phone(dossier.representative_phone)}
      {@render mail(dossier.representative_email)}
    </section>

    <section>
      <h4 class="fr-text--md fr-mb-1w font-bold">Le demandeur</h4>
      <p class="fr-m-0">{fullName(dossier.deposant_first_names, dossier.deposant_last_name)}</p>
      {@render mail(dossier.deposant_email)}
    </section>
  {:else}
    <section>
      <h4 class="fr-text--md fr-mb-1w font-bold">Le demandeur</h4>
      <p class="fr-badge fr-badge--info fr-badge--no-icon fr-mb-1w">Personne physique</p>
      <p class="fr-m-0">
        {fullName(
          dossier.demandeur_personne_physique_first_names,
          dossier.demandeur_personne_physique_last_name,
        )}
      </p>
      {#if dossier.demandeur_personne_physique_role}<p class="fr-m-0 italic">
          {dossier.demandeur_personne_physique_role}
        </p>{/if}
      {#if dossier.demandeur_personne_physique_address}<p
          class="fr-m-0 [white-space:pre-line] [word-break:break-word]"
        >
          {dossier.demandeur_personne_physique_address}
        </p>{/if}
      {@render phone(dossier.demandeur_personne_physique_phone)}
      {@render mail(dossier.demandeur_personne_physique_email ?? dossier.deposant_email)}
    </section>
  {/if}

  {#if hasMandataire}
    <section>
      <h4 class="fr-text--md fr-mb-1w font-bold">Le mandataire</h4>
      <p class="fr-m-0">{fullName(dossier.mandataire_first_names, dossier.mandataire_last_name)}</p>
      {@render mail(dossier.mandataire_email)}
    </section>
  {/if}
</div>
