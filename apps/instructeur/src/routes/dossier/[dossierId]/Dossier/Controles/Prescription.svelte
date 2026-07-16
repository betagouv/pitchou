<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";
  import FormControle from "./FormControle.svelte";
  import ExpandCollapse from "$lib/components/common/ExpandCollapse.svelte";
  import TagResultatControle from "../../TagResultatControle.svelte";

  import { formatDateRelative, formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
  import {
    addControle as sendControle,
    updateControle,
    deleteControle,
  } from "./controle.ts";
  import { sendEvenement } from "$lib/shared/aarri.ts";

  import type { FrontEndPrescription } from "@pitchou/types/API_Pitchou.ts";
  import type Controle from "@pitchou/types/database/public/Controle.ts";

  type Props = {
    prescription: Partial<FrontEndPrescription>;
    refreshDossierFull: () => Promise<any>;
  };

  let { prescription, refreshDossierFull }: Props = $props();

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

  const NOT_PROVIDED = "(non renseigné)";

  let sortedControles = $derived(
    [...controles].toSorted(
      ({ date_contrôle: dc1 }, { date_contrôle: dc2 }) =>
        (dc2?.getTime() || 0) - (dc1?.getTime() || 0),
    ),
  );

  let newControle: Partial<Controle> | undefined = $state();

  function addControle() {
    newControle = {
      prescription: id,
      date_contrôle: new Date(),
      résultat: null,
      commentaire: null,
      type_action_suite_contrôle: null,
      date_action_suite_contrôle: null,
      date_prochaine_échéance: null,
    };
  }

  async function createControle() {
    if (newControle) {
      controles.add(newControle);

      const controleId = await sendControle(newControle);

      if (
        newControle.résultat === "Conforme" && // which is compliant
        // while at least one previous contrôle was not compliant
        prescription.contrôles &&
        prescription.contrôles.length >= 2 &&
        prescription.contrôles.some((c) => c.résultat !== "Conforme")
      ) {
        sendEvenement({
          type: "retourÀLaConformité",
          // @ts-ignore
          détails: { prescription: prescription.id },
        });
      }

      if (!controleId) {
        throw new Error(`contrôleId absent de la valeur de retour de 'sendControle'`);
      }

      newControle.id = controleId;

      newControle = undefined;

      sendEvenement({ type: "ajouterControle" });
    }
  }

  // do not create a proxy so that === comparisons can be made
  // https://svelte.dev/docs/svelte/runtime-warnings#Client-warnings-state_proxy_equality_mismatch
  let editedControle: Partial<Controle> | undefined = $state.raw();

  function editControle(controle: Partial<Controle>) {
    editedControle = controle;
  }

  async function validateControleModifications(controleValide: Partial<Controle>) {
    if (!editedControle) throw new TypeError(`pas de contrôle en modificaion`);

    // replace editedControle with controleValide in the array of contrôles
    // @ts-ignore
    const index = prescription.contrôles?.indexOf(editedControle) || -1;
    if (index !== -1) {
      prescription.contrôles?.splice(index, 1);
    }
    editedControle = undefined;

    // @ts-ignore
    prescription.contrôles?.push(controleValide);

    await updateControle(controleValide);

    sendEvenement({ type: "modifierControle" });
  }

  async function deleteEditedControle() {
    if (!editedControle) throw new TypeError(`pas de contrôle en modificaion`);

    controles.delete(editedControle);

    const id = editedControle.id;
    editedControle = undefined;

    if (!id) {
      throw new TypeError(`il manque un id au contrôle en modificaion`);
    }

    await deleteControle(id);

    refreshDossierFull();

    sendEvenement({ type: "supprimerControle" });
  }
</script>

<section class="prescription-viewed">
  <ExpandCollapse>
    {#snippet summary()}
      {@const lastControle = sortedControles[0]}
      <h6>
        <TagResultatControle résultatControle={lastControle?.résultat || NOT_PROVIDED}
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
            {NOT_PROVIDED}
          {/if}
        </p>

        {#if surface_évitée || surface_compensée || individus_évités || surface_compensée || nids_évités || nids_compensés}
          <p class="impacts-quantified">
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

        <section class="controles">
          <h6>
            {#if controles.size === 1}1 contrôle{:else}{controles.size} contrôles
            {/if}
          </h6>

          <button class="fr-btn fr-btn--icon-left fr-icon-add-line" onclick={addControle}>
            Ajouter un contrôle
          </button>

          {#if newControle}
            <FormControle controle={newControle} onValidate={createControle}>
              {#snippet buttonValidate()}
                <button type="submit" class="fr-btn fr-btn--icon-left fr-icon-check-line">
                  Finir le contrôle
                </button>
              {/snippet}
              {#snippet buttonCancel()}
                <button
                  type="button"
                  class="fr-btn fr-btn--secondary"
                  onclick={() => (newControle = undefined)}
                >
                  Fermer le contrôle sans sauvegarder
                </button>
              {/snippet}
            </FormControle>
          {/if}

          {#each sortedControles as controle}
            {#if controle === editedControle}
              <h6>Modification du contrôle</h6>

              <FormControle
                controle={editedControle}
                onValidate={validateControleModifications}
              >
                {#snippet buttonCancel()}
                  <button
                    type="button"
                    class="fr-btn fr-btn--secondary"
                    onclick={() => (editedControle = undefined)}
                  >
                    Annuler
                  </button>
                {/snippet}
                {#snippet buttonDelete()}
                  <div class="button-delete">
                    <button
                      type="button"
                      class="fr-btn fr-btn--secondary fr-icon-delete-line fr-btn--icon-left"
                      onclick={deleteEditedControle}
                    >
                      Supprimer
                    </button>
                  </div>
                {/snippet}
              </FormControle>
            {:else}
              <section class="controle">
                <h6>
                  Controle du <time datetime={controle.date_contrôle?.toISOString()}
                    >{formatDateAbsolute(controle.date_contrôle)}</time
                  >
                  <TagResultatControle résultatControle={controle.résultat || NOT_PROVIDED}
                  ></TagResultatControle>
                  <button
                    class="controles fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-pencil-line"
                    onclick={() => editControle(controle)}
                  >
                    Modifier
                  </button>
                </h6>
                <strong>Commentaire&nbsp;:</strong>
                {controle.commentaire}<br />
                <strong>Action suite au contrôle&nbsp;:</strong>
                {controle.type_action_suite_contrôle}<br />
                <strong>Date action suite au contrôle&nbsp;:</strong>
                <time datetime={controle.date_action_suite_contrôle?.toISOString()}
                  >{formatDateRelative(controle.date_action_suite_contrôle)}</time
                >
                <br />
                <strong>Date prochaine échéance&nbsp;:</strong>
                <time datetime={controle.date_prochaine_échéance?.toISOString()}
                  >{formatDateRelative(controle.date_prochaine_échéance)}</time
                >
                <br />
              </section>
            {/if}
          {/each}
        </section>
      </section>
    {/snippet}
  </ExpandCollapse>
</section>

<style lang="scss">
  .prescription-viewed {
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

    .impacts-quantified {
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

    section.controles {
      section.controle {
        margin-bottom: 0.5rem;
      }

      .button-delete {
        margin-top: 2rem;
      }
    }
  }
</style>
