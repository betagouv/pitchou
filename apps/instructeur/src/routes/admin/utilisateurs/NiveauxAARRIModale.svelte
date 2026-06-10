<script lang="ts">
  import BadgeNiveauAARRI from "./BadgeNiveauAARRI.svelte";

  type Props = {
    id: string;
  };

  let { id }: Props = $props();

  const titreId = $derived(`${id}-title`);
</script>

<dialog {id} class="fr-modal" aria-labelledby={titreId}>
  <div class="fr-container fr-container--fluid fr-container-md">
    <div class="fr-grid-row fr-grid-row--center">
      <div class="fr-col-12 fr-col-md-10 fr-col-lg-8">
        <div class="fr-modal__body">
          <div class="fr-modal__header">
            <button class="fr-btn--close fr-btn" title="Fermer" aria-controls={id}>Fermer</button>
          </div>
          <div class="fr-modal__content">
            <h1 id={titreId} class="fr-modal__title">Comment les niveaux AARRI sont calculés ?</h1>

            <p>
              Le niveau AARRI résume l'engagement de chaque utilisateurice sur Pitchou, des
              personnes qui découvrent l'outil jusqu'à celles qui produisent un impact concret.
              Chaque utilisateurice se voit attribuer le <strong>niveau le plus élevé</strong> qu'elle
              a atteint au cours de son utilisation.
            </p>

            <div class="niveau">
              <BadgeNiveauAARRI niveau="base" />
              <p>
                A un compte Pitchou (un code d'accès lui a été créé) mais ne s'est encore jamais
                connectée.
              </p>
            </div>

            <div class="niveau">
              <BadgeNiveauAARRI niveau="acquis" />
              <p>S'est connectée à Pitchou au moins une fois.</p>
            </div>

            <div class="niveau">
              <BadgeNiveauAARRI niveau="actif" />
              <p>
                A effectué au moins <strong>5 actions de modification</strong> (modification de dossier,
                de prescription…) au cours d'une même semaine calendaire.
              </p>
            </div>

            <div class="niveau">
              <BadgeNiveauAARRI niveau="retenu" />
              <p>
                Utilise Pitchou régulièrement : elle a validé au moins
                <strong>5 semaines</strong> sur une fenêtre glissante de
                <strong>8 semaines</strong>. Une semaine est validée lorsqu'elle compte au moins 5
                actions de consultation ou de modification.
              </p>
            </div>

            <div class="niveau">
              <BadgeNiveauAARRI niveau="impact" />
              <p>
                A produit au moins un <strong>retour à la conformité</strong> (un contrôle qui fait revenir
                un dossier en conformité). C'est le niveau le plus avancé de l'entonnoir.
              </p>
            </div>

            <p class="fr-text--sm fr-mt-3w">
              Les comptes de l'équipe Pitchou (@beta.gouv.fr) ne sont pas comptabilisés.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</dialog>

<style lang="scss">
  .niveau {
    display: grid;
    grid-template-columns: 6rem 1fr;
    align-items: baseline;
    column-gap: 0.75rem;
    margin-top: 1.5rem;

    p {
      margin-bottom: 0;
    }

    :global(.fr-badge) {
      justify-self: start;
    }
  }
</style>
