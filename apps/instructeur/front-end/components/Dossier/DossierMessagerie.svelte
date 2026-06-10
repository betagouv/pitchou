<script lang="ts">
  import { originDémarcheNumérique } from "@pitchou/common/constantes.ts";

  import { formatDateRelative, formatDateAbsolue } from "../../affichageDossier.ts";

  import type { DossierComplet } from "@pitchou/types/API_Pitchou.ts";
  import type Message from "@pitchou/types/database/public/Message.ts";

  type Props = {
    dossier: DossierComplet;
    messages?: Partial<Message>[];
  };

  let { dossier, messages = [] }: Props = $props();

  const numdos = $derived(dossier.number_demarches_simplifiées);
  const numéro_démarche = $derived(dossier.numéro_démarche);

  let messagesTriés = $derived(
    messages.toSorted(
      // @ts-ignore
      ({ date: date1 }, { date: date2 }) => new Date(date2).getTime() - new Date(date1).getTime(),
    ),
  );
</script>

<div class="row">
  <h2>Échanges avec le pétitionnaire</h2>

  <a
    class="fr-btn fr-mb-w"
    target="_blank"
    href={`${originDémarcheNumérique}/procedures/${numéro_démarche}/dossiers/${numdos}/messagerie`}
  >
    Répondre sur Démarche Numérique
  </a>
</div>

<article class="messages fr-mt-2w fr-mb-4w">
  {#each messagesTriés as { contenu, date, email_expéditeur }}
    {@const accordionId = `accordion-content-${Math.random().toString(36).slice(2)}`}
    <section class="fr-accordion">
      <h3 class="fr-accordion__title">
        <button
          class="fr-accordion__btn"
          aria-expanded={email_expéditeur !== "contact@demarches-simplifiees.fr"}
          aria-controls={accordionId}
        >
          <span>{email_expéditeur}</span>
          <span title={formatDateAbsolue(date)}>{formatDateRelative(date)}</span>
        </button>
      </h3>
      <div class="contenu-message fr-collapse" id={accordionId}>
        <!--
                Avertissement : Source de problèmes de sécurité potentiels
                Actuellement, les contenus viennent de Démarche Numérique et on
                leur fait confiance pour assainir le HTML, mais
            -->
        {@html contenu}
      </div>
    </section>
  {/each}
</article>

<style lang="scss">
  .row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;

    margin-bottom: 2rem;

    h2 {
      margin-bottom: 0;
    }
  }

  section {
    margin-bottom: 3rem;
  }

  article.messages {
    list-style: none;
    margin: 0;
    padding: 0;

    button.fr-accordion__btn {
      justify-content: space-between;

      span {
        flex: 1;
        display: block;
      }
    }

    .contenu-message {
      white-space: pre-line;
    }
  }
</style>
