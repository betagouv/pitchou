<script lang="ts">
  import { supprimerAvisExpert as supprimerAvisExpertServeur } from "./avisExpert.ts";
  import { refreshDossierComplet } from "$lib/dossier/dossier.ts";
  import { envoyerÉvènement } from "$lib/shared/aarri.ts";
  import AvisExpert from "./Avis/AvisExpert.svelte";
  import { differenceInDays } from "date-fns";
  import ModaleAjouterPièceJointe from "./ModaleAjouterPièceJointe.svelte";

  import type { DossierComplet, FrontEndAvisExpert } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    dossier: DossierComplet;
  };

  let { dossier }: Props = $props();

  const idModaleAjouterPieceJointeAvis = "modale-ajouter-piece-jointe-avis";

  let avisExpertTriés = $derived(
    [...dossier.avisExpert].sort((a, b) => {
      const dateA = new Date(a.date_avis ?? a.date_saisine ?? 0);
      const dateB = new Date(b.date_avis ?? b.date_saisine ?? 0);
      return differenceInDays(dateB, dateA);
    }),
  );

  async function supprimerAvisExpert(avisExpert: FrontEndAvisExpert) {
    await supprimerAvisExpertServeur(avisExpert);
    await refreshDossierComplet(dossier.id);
  }
</script>

<div class="onglet-avis">
  <div class="section-liste-avis-expert">
    <h2>Avis d'experts</h2>
    {#if avisExpertTriés.length >= 1}
      <div class="liste-avis-expert">
        {#each avisExpertTriés as avisExpert}
          <AvisExpert dossierId={dossier.id} {avisExpert} {supprimerAvisExpert} />
        {/each}
      </div>
    {:else}
      <p>
        <span class="fr-mb-3w"
          >Aucun fichier de saisine ou fichier d'avis d'expert n'est associé à ce dossier.</span
        >
      </p>
    {/if}
    <button
      type="button"
      class="fr-btn fr-mt-3w {avisExpertTriés.length === 0
        ? ''
        : 'fr-btn--secondary'} fr-btn--icon-left fr-icon-attachment-line"
      aria-controls={idModaleAjouterPieceJointeAvis}
      data-fr-opened="false"
      onclick={() =>
        envoyerÉvènement({
          type: "ouvrirModaleAjouterPieceJointe",
          détails: { dossierId: dossier.id, source: "ongletAvis" },
        })}
    >
      Ajouter un avis ou une saisine
    </button>
  </div>

  <aside class="protocole-cnpn">
    <h3 class="protocole-cnpn__titre">Vous devez saisir le CNPN ?</h3>
    <p class="protocole-cnpn__intro">Voici le protocole&nbsp;:</p>
    <ol>
      <li>Vérifier que le dossier est prêt (espèces, impacts, etc.)</li>
      <li>
        Générer les documents&nbsp;:
        <br />
        <a
          class="fr-link"
          href="https://betagouv.github.io/pitchou/instruction/document-types/modeles.html"
          target="_blank"
          rel="noopener external">Accéder aux modèles</a
        >
        <ul>
          <li>le mail s'adressant au secrétariat du CNPN</li>
          <li>la saisine du CNPN</li>
        </ul>
      </li>
      <li>
        Envoyer le mail au secrétariat du CNPN (avec toutes les PJ et précautions nécessaires)
        <br />
        <a
          class="fr-link email-cnpn"
          href="mailto:derogations-especes-protegees.et4.deb.dgaln@developpement-durable.gouv.fr"
          >derogations-especes-protegees.et4.deb.dgaln@developpement-durable.gouv.fr</a
        >
      </li>
      <li>Stocker la saisine CNPN dans cet onglet</li>
      <li>Quand vous le recevrez, stocker l'avis CNPN dans cet onglet</li>
    </ol>
    <p class="protocole-cnpn__details">
      <strong>Pour plus de détails&nbsp;: </strong>
      <a
        class="fr-link"
        href="https://betagouv.github.io/pitchou/instruction/saisine-cnpn.html"
        target="_blank"
        rel="noopener external">Consulter la documentation dédiée</a
      >
    </p>
  </aside>
</div>

<ModaleAjouterPièceJointe id={idModaleAjouterPieceJointeAvis} {dossier} source="ongletAvis" />

<style lang="scss">
  .onglet-avis {
    display: flex;
    align-items: flex-start;
    gap: 2rem;

    // On smaller screens, stack the callout below the list.
    @media (max-width: 62em) {
      flex-direction: column;
    }
  }
  .section-liste-avis-expert {
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-width: 0;
  }
  .liste-avis-expert {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .protocole-cnpn {
    flex: 0 0 30rem;
    max-width: 100%;

    &__titre {
      margin-bottom: 1rem;
    }

    &__intro {
      font-weight: 700;
      margin-bottom: 1rem;
    }

    ol {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin: 0;
    }

    ul {
      margin-top: 0.5rem;
      margin-bottom: 0;
    }

    &__details {
      margin-top: 1.5rem;
      margin-bottom: 0;
    }

    .email-cnpn {
      overflow-wrap: anywhere;
    }
  }
</style>
