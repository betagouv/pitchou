<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";
  import FormulaireControle from "./FormulaireControle.svelte";
  import DeplierReplier from "$lib/components/common/DeplierReplier.svelte";
  import TagResultatControle from "../../TagResultatControle.svelte";

  import { formatDateRelative, formatDateAbsolue } from "$lib/dossier/affichageDossier.ts";
  import {
    ajouterControle as envoyerControle,
    modifierControle,
    supprimerControle,
  } from "./controle.ts";
  import { envoyerEvenement } from "$lib/shared/aarri.ts";

  import type { FrontEndPrescription } from "@pitchou/types/API_Pitchou.ts";
  import type Controle from "@pitchou/types/database/public/Controle.ts";

  type Props = {
    prescription: Partial<FrontEndPrescription>;
    refreshDossierComplet: () => Promise<any>;
  };

  let { prescription, refreshDossierComplet }: Props = $props();

  let {
    id,
    description,
    date_échéance,
    numéro_article,
    surface_évitée,
    surface_compensée,
    individus_évités,
    individus_compensés,
    nids_évités,
    nids_compensés,
  } = $derived(prescription);

  let controles: Set<Partial<Controle>> = $derived(
    prescription.contrôles ? new SvelteSet(prescription.contrôles) : new SvelteSet(),
  );

  // $inspect('contrôles', contrôles)

  const NON_RENSEIGNE = "(non renseigné)";

  let controlesTries = $derived(
    [...controles].toSorted(
      ({ date_contrôle: dc1 }, { date_contrôle: dc2 }) =>
        (dc2?.getTime() || 0) - (dc1?.getTime() || 0),
    ),
  );

  let controleEnCours: Partial<Controle> | undefined = $state();

  function ajouterControle() {
    controleEnCours = {
      prescription: id,
      date_contrôle: new Date(),
      résultat: null,
      commentaire: null,
      type_action_suite_contrôle: null,
      date_action_suite_contrôle: null,
      date_prochaine_échéance: null,
    };
  }

  async function creerControle() {
    if (controleEnCours) {
      controles.add(controleEnCours);

      const controleId = await envoyerControle(controleEnCours);

      if (
        controleEnCours.résultat === "Conforme" && // which is compliant
        // while at least one previous contrôle was not compliant
        prescription.contrôles &&
        prescription.contrôles.length >= 2 &&
        prescription.contrôles.some((c) => c.résultat !== "Conforme")
      ) {
        envoyerEvenement({
          type: "retourÀLaConformité",
          // @ts-ignore
          détails: { prescription: prescription.id },
        });
      }

      if (!controleId) {
        throw new Error(`contrôleId absent de la valeur de retour de 'envoyerControle'`);
      }

      controleEnCours.id = controleId;

      controleEnCours = undefined;

      envoyerEvenement({ type: "ajouterControle" });
    }
  }

  // do not create a proxy so that === comparisons can be made
  // https://svelte.dev/docs/svelte/runtime-warnings#Client-warnings-state_proxy_equality_mismatch
  let controleEnModification: Partial<Controle> | undefined = $state.raw();

  function passerControleEnModification(controle: Partial<Controle>) {
    controleEnModification = controle;
  }

  async function validerModificationsControle(controleValide: Partial<Controle>) {
    if (!controleEnModification) throw new TypeError(`pas de contrôle en modificaion`);

    // replace contrôleEnModification with contrôleValidé in the array of contrôles
    // @ts-ignore
    const index = prescription.contrôles?.indexOf(controleEnModification) || -1;
    if (index !== -1) {
      prescription.contrôles?.splice(index, 1);
    }
    controleEnModification = undefined;

    // @ts-ignore
    prescription.contrôles?.push(controleValide);

    await modifierControle(controleValide);

    envoyerEvenement({ type: "modifierControle" });
  }

  async function supprimerControleEnModification() {
    if (!controleEnModification) throw new TypeError(`pas de contrôle en modificaion`);

    controles.delete(controleEnModification);

    const id = controleEnModification.id;
    controleEnModification = undefined;

    if (!id) {
      throw new TypeError(`il manque un id au contrôle en modificaion`);
    }

    await supprimerControle(id);

    refreshDossierComplet();

    envoyerEvenement({ type: "supprimerControle" });
  }
</script>

<section class="prescription-consultée">
  <DeplierReplier>
    {#snippet summary()}
      {@const dernierControle = controlesTries[0]}
      <h6>
        <TagResultatControle résultatControle={dernierControle?.résultat || NON_RENSEIGNE}
        ></TagResultatControle>
        {#if description}
          {description}
        {:else if numéro_article}
          Numéro article&nbsp;:&nbsp;{numéro_article}
        {:else}
          (Prescription non renseignée)
        {/if}
      </h6>
    {/snippet}
    {#snippet content()}
      <section>
        {#if numéro_article}
          <p><strong>Numéro article&nbsp;:&nbsp;</strong>{numéro_article}</p>
        {/if}
        <p>
          <strong>Date d'échéance&nbsp;:</strong>
          {#if date_échéance}
            <time datetime={date_échéance?.toISOString()}>{formatDateRelative(date_échéance)}</time>
          {:else}
            {NON_RENSEIGNE}
          {/if}
        </p>

        {#if surface_évitée || surface_compensée || individus_évités || surface_compensée || nids_évités || nids_compensés}
          <p class="impacts-quantifiés">
            {#if surface_évitée}<span
                ><strong>Surface évitée&nbsp;:</strong> {surface_évitée}m²</span
              >{/if}
            {#if surface_compensée}<span
                ><strong>Surface compensée&nbsp;:</strong> {surface_compensée}m²</span
              >{/if}
            {#if individus_évités}<span
                ><strong>Individus évités&nbsp;:</strong> {individus_évités}</span
              >{/if}
            {#if individus_compensés}<span
                ><strong>Individus compensés&nbsp;:</strong> {individus_compensés}</span
              >{/if}
            {#if nids_évités}<span><strong>Nids évités&nbsp;:</strong> {nids_évités}</span>{/if}
            {#if nids_compensés}<span><strong>Nids compensés&nbsp;:</strong> {nids_compensés}</span
              >{/if}
          </p>
        {/if}

        <section class="contrôles">
          <h6>
            {#if controles.size === 1}1 contrôle{:else}{controles.size} contrôles
            {/if}
          </h6>

          <button class="fr-btn fr-btn--icon-left fr-icon-add-line" onclick={ajouterControle}>
            Ajouter un contrôle
          </button>

          {#if controleEnCours}
            <FormulaireControle contrôle={controleEnCours} onValider={creerControle}>
              {#snippet boutonValider()}
                <button type="submit" class="fr-btn fr-btn--icon-left fr-icon-check-line">
                  Finir le contrôle
                </button>
              {/snippet}
              {#snippet boutonAnnuler()}
                <button
                  type="button"
                  class="fr-btn fr-btn--secondary"
                  onclick={() => (controleEnCours = undefined)}
                >
                  Fermer le contrôle sans sauvegarder
                </button>
              {/snippet}
            </FormulaireControle>
          {/if}

          {#each controlesTries as contrôle}
            {#if contrôle === controleEnModification}
              <h6>Modification du contrôle</h6>

              <FormulaireControle
                contrôle={controleEnModification}
                onValider={validerModificationsControle}
              >
                {#snippet boutonAnnuler()}
                  <button
                    type="button"
                    class="fr-btn fr-btn--secondary"
                    onclick={() => (controleEnModification = undefined)}
                  >
                    Annuler
                  </button>
                {/snippet}
                {#snippet boutonSupprimer()}
                  <div class="bouton-supprimer">
                    <button
                      type="button"
                      class="fr-btn fr-btn--secondary fr-icon-delete-line fr-btn--icon-left"
                      onclick={supprimerControleEnModification}
                    >
                      Supprimer
                    </button>
                  </div>
                {/snippet}
              </FormulaireControle>
            {:else}
              <section class="contrôle">
                <h6>
                  Controle du <time datetime={contrôle.date_contrôle?.toISOString()}
                    >{formatDateAbsolue(contrôle.date_contrôle)}</time
                  >
                  <TagResultatControle résultatControle={contrôle.résultat || NON_RENSEIGNE}
                  ></TagResultatControle>
                  <button
                    class="contrôles fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-pencil-line"
                    onclick={() => passerControleEnModification(contrôle)}
                  >
                    Modifier
                  </button>
                </h6>
                <strong>Commentaire&nbsp;:</strong>
                {contrôle.commentaire}<br />
                <strong>Action suite au contrôle&nbsp;:</strong>
                {contrôle.type_action_suite_contrôle}<br />
                <strong>Date action suite au contrôle&nbsp;:</strong>
                <time datetime={contrôle.date_action_suite_contrôle?.toISOString()}
                  >{formatDateRelative(contrôle.date_action_suite_contrôle)}</time
                >
                <br />
                <strong>Date prochaine échéance&nbsp;:</strong>
                <time datetime={contrôle.date_prochaine_échéance?.toISOString()}
                  >{formatDateRelative(contrôle.date_prochaine_échéance)}</time
                >
                <br />
              </section>
            {/if}
          {/each}
        </section>
      </section>
    {/snippet}
  </DeplierReplier>
</section>

<style lang="scss">
  .prescription-consultée {
    --prescription-padding-top: 0.5rem;

    padding: var(--prescription-padding-top);
    margin-bottom: var(--prescription-padding-top);
    border-bottom: 1px solid var(--border-default-grey);

    &:hover {
      background-color: var(--background-contrast-grey);
    }

    h6,
    p {
      margin-bottom: 0.4rem;
    }

    .impacts-quantifiés {
      span {
        display: inline-block;
        white-space: wrap;

        &::after {
          content: "|";
          padding: 0 1rem;
        }

        &:first-child {
          padding-left: 0;
        }

        &:last-child {
          &::after {
            content: none;
          }
        }
      }
    }

    section.contrôles {
      section.contrôle {
        margin-bottom: 0.5rem;
      }

      .bouton-supprimer {
        margin-top: 2rem;
      }
    }
  }
</style>
