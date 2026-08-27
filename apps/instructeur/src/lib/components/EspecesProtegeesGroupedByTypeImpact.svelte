<script lang="ts">
  import type { EspecesByTypeImpact } from "$lib/especes/especesByTypeImpact.ts";

  type Props = {
    especesParTypeImpact: EspecesByTypeImpact[];
  };

  let { especesParTypeImpact }: Props = $props();
</script>

{#each especesParTypeImpact as { typeImpact, especes, criteriaAllowed }}
  <section class="fr-mt-4w fr-mb-4w">
    <h3 class="fr-mb-2w">{typeImpact}</h3>
    <table class="fr-table">
      <thead>
        <tr>
          <th>Espèce</th>
          {#if criteriaAllowed && criteriaAllowed.length >= 1}
            {#each criteriaAllowed as nomColonne}
              <th>{nomColonne}</th>
            {/each}
          {/if}
        </tr>
      </thead>
      <tbody>
        {#each especes as { nomVernaculaire, nomScientifique, especeCNPN, especeMinisterielle, impactsValues }}
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
            {#each impactsValues as impactValue}
              <td>{impactValue}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </section>
{/each}
