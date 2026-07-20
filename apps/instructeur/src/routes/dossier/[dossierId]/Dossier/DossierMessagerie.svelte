<script lang="ts">
  import { originDemarcheNumerique } from "@pitchou/common/constants.ts";

  import { formatDateRelative, formatDateAbsolute } from "$lib/dossier/displayDossier.ts";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type Message from "@pitchou/types/database/public/Message.ts";

  type Props = {
    dossier: DossierFull;
    messages?: Partial<Message>[];
  };

  let { dossier, messages = [] }: Props = $props();

  const numdos = $derived(dossier.demarche_numerique_number);
  const demarcheNumber = $derived(dossier.demarche_number);

  let sortedMessages = $derived(
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
    href={`${originDemarcheNumerique}/procedures/${demarcheNumber}/dossiers/${numdos}/messagerie`}
  >
    Répondre sur Démarche Numérique
  </a>
</div>

<article class="messages fr-mt-2w fr-mb-4w">
  {#each sortedMessages as { content, date, sender_email }}
    {@const accordionId = `accordion-content-${Math.random().toString(36).slice(2)}`}
    <section class="fr-accordion">
      <h3 class="fr-accordion__title">
        <button
          class="fr-accordion__btn"
          aria-expanded={sender_email !== "contact@demarches-simplifiees.fr"}
          aria-controls={accordionId}
        >
          <span>{sender_email}</span>
          <span title={formatDateAbsolute(date)}>{formatDateRelative(date)}</span>
        </button>
      </h3>
      <div class="content-message fr-collapse" id={accordionId}>
        <!--
                Avertissement : Source de problèmes de sécurité potentiels
                Actuellement, les contenus viennent de Démarche Numérique et on
                leur fait confiance pour assainir le HTML, mais
            -->
        {@html content}
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

    .content-message {
      white-space: pre-line;
    }
  }
</style>
