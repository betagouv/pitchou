<script lang="ts">
  import type {
    ActiviteMenancante,
    DescriptionMenacesEspeces,
    QuantifiedImpact,
  } from "@pitchou/types/especes.d.ts";

  import { createEspecesGroupedByImpact } from "$lib/especes/createEspecesGroupedByImpact.ts";

  type Props = {
    espècesImpactées: DescriptionMenacesEspeces;
    identifiantPitchouVersActivitéEtImpactsQuantifiés: Map<
      string,
      ActiviteMenancante & { impactsQuantifiés: QuantifiedImpact[] }
    >;
  };

  let {
    espècesImpactées: especesImpactees,
    identifiantPitchouVersActivitéEtImpactsQuantifiés:
      identifiantPitchouVersActiviteEtImpactsQuantifies,
  }: Props = $props();

  let especesImpacteesParActivite = $derived(
    createEspecesGroupedByImpact(
      especesImpactees,
      identifiantPitchouVersActiviteEtImpactsQuantifies,
    ),
  );
</script>

{#each especesImpacteesParActivite as { activité: activite, espèces: especes, impactsQuantifiés: impactsQuantifies }}
  <section class="fr-mt-4w fr-mb-4w">
    <h3 class="fr-mb-2w">{activite}</h3>
    <table class="fr-table">
      <thead>
        <tr>
          <th>Espèce</th>
          {#if impactsQuantifies && impactsQuantifies.length >= 1}
            {#each impactsQuantifies as nomColonne}
              <th>{nomColonne}</th>
            {/each}
          {/if}
        </tr>
      </thead>
      <tbody>
        {#each especes as { nomVernaculaire, nomScientifique, espèceCNPN: especeCNPN, espèceMinistérielle: especeMinisterielle, détails }}
          <tr>
            <td>
              {#if especeCNPN}
                <p class="fr-badge fr-badge--blue-ecume">CNPN</p>
              {/if}
              {#if especeMinisterielle}
                <p class="fr-badge fr-badge--blue-ecume">Ministère</p>
              {/if}
              {nomVernaculaire}
              (<i>{nomScientifique}</i>)
            </td>
            {#each détails as detail}
              <td>{detail}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </section>
{/each}
