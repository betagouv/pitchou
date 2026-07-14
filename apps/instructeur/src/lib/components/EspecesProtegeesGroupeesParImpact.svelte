<script lang="ts">
  import type {
    ActiviteMenancante,
    DescriptionMenacesEspeces,
    QuantifiedImpact,
  } from "@pitchou/types/especes.d.ts";

  import { creerEspecesGroupeesParImpact } from "$lib/especes/creerEspecesGroupeesParImpact.ts";

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
    creerEspecesGroupeesParImpact(
      especesImpactees,
      identifiantPitchouVersActiviteEtImpactsQuantifies,
    ),
  );
</script>

{#each especesImpacteesParActivite as { activité: activite, espèces: especes, impactsQuantifiés: impactsQuantifies }}
  <section class="liste-especes">
    <h3>{activite}</h3>
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

<style lang="scss">
  .liste-especes {
    margin-top: 2rem;
    margin-bottom: 2rem;

    h3 {
      margin-bottom: 1rem;
    }
  }
</style>
