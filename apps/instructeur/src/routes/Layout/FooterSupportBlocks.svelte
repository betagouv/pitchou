<script lang="ts">
  type Props = {
    /** The DREAL/DDT orientation block only makes sense for signed-in instructeurs. */
    withOrientationBlock?: boolean;
  };

  let { withOrientationBlock = true }: Props = $props();
</script>

<!-- Help and orientation blocks of the footer: support contact, and the entry points
     shared with pétitionnaires (pre-filled form, species list). -->
<div class="grid gap-4 {withOrientationBlock ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}">
  <section
    class="rounded-[0.25rem] border border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)] fr-p-2w"
  >
    <h3 class="fr-text--sm fr-mb-1w">Besoin d’aide pour utiliser Pitchou ?</h3>
    <p class="fr-text--sm fr-mb-2w">
      <a class="fr-link fr-text--sm" href="mailto:support@pitchou.beta.gouv.fr">
        support@pitchou.beta.gouv.fr
      </a>
    </p>
    <a
      class="fr-btn fr-btn--secondary fr-btn--sm"
      href="https://betagouv.github.io/pitchou/"
      target="_blank"
      rel="noopener external"
      title="Documentation d’aide - nouvelle fenêtre"
    >
      Documentation d’aide
    </a>
  </section>

  {#if withOrientationBlock}
    <section
      class="rounded-[0.25rem] border border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)] fr-p-2w"
    >
      <h3 class="fr-text--sm fr-mb-2w">
        DREAL, DDT → Besoin d’orienter les pétitionnaires vers le bon formulaire&nbsp;?
      </h3>
      <a class="fr-btn fr-btn--secondary fr-btn--sm" href="/preremplissage-derogation">
        Générer un formulaire pré-rempli
      </a>
    </section>
  {/if}

  <section
    class="rounded-[0.25rem] border border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)] fr-p-2w"
  >
    <h3 class="fr-text--sm fr-mb-2w">
      Pétitionnaires → Besoin de générer une liste d’espèces protégées et les impacts
      associés&nbsp;?
    </h3>
    <a class="fr-btn fr-btn--secondary fr-btn--sm" href="/saisie-especes">
      Saisie des espèces protégées
    </a>
  </section>
</div>
