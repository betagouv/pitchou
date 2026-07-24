<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";
  import FormControle from "./FormControle.svelte";
  import ExpandCollapse from "$lib/components/common/ExpandCollapse.svelte";
  import TagResultatControle from "../../TagResultatControle.svelte";

  import { formatDateRelative, formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
  import { addControle as sendControle, updateControle, deleteControle } from "./controle.ts";
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
    due_date,
    article_number,
    avoided_surface,
    compensated_surface,
    avoided_individus,
    compensated_individus,
    avoided_nids,
    compensated_nids,
  } = $derived(prescription);

  let controles: Set<Partial<Controle>> = $derived(
    prescription.controles ? new SvelteSet(prescription.controles) : new SvelteSet(),
  );

  // $inspect('contrôles', contrôles)

  const NOT_PROVIDED = "(non renseigné)";

  let sortedControles = $derived(
    [...controles].toSorted(
      ({ controle_date: dc1 }, { controle_date: dc2 }) =>
        (dc2?.getTime() || 0) - (dc1?.getTime() || 0),
    ),
  );

  let newControle: Partial<Controle> | undefined = $state();

  function addControle() {
    newControle = {
      prescription: id,
      controle_date: new Date(),
      result: null,
      comment: null,
      post_controle_action_type: null,
      post_controle_action_date: null,
      next_due_date: null,
    };
  }

  async function createControle() {
    if (newControle) {
      controles.add(newControle);

      const controleId = await sendControle(newControle);

      if (
        newControle.result === "Conforme" && // which is compliant
        // while at least one previous contrôle was not compliant
        prescription.controles &&
        prescription.controles.length >= 2 &&
        prescription.controles.some((c) => c.result !== "Conforme")
      ) {
        sendEvenement({
          type: "retourÀLaConformité",
          // @ts-ignore
          details: { prescription: prescription.id },
        });
      }

      if (!controleId) {
        throw new Error(`contrôleId absent de la valeur de retour de 'sendControle'`);
      }

      newControle.id = controleId;

      newControle = undefined;

      sendEvenement({ type: "ajouterContrôle" });
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
    const index = prescription.controles?.indexOf(editedControle) || -1;
    if (index !== -1) {
      prescription.controles?.splice(index, 1);
    }
    editedControle = undefined;

    // @ts-ignore
    prescription.controles?.push(controleValide);

    await updateControle(controleValide);

    sendEvenement({ type: "modifierContrôle" });
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

    sendEvenement({ type: "supprimerContrôle" });
  }
</script>

<section class="prescription-viewed">
  <ExpandCollapse>
    {#snippet summary()}
      {@const lastControle = sortedControles[0]}
      <h6>
        <TagResultatControle result={lastControle?.result || NOT_PROVIDED}></TagResultatControle>
        {#if description}
          {description}
        {:else if article_number}
          Numéro article&nbsp;:&nbsp;{article_number}
        {:else}
          (Prescription non renseignée)
        {/if}
      </h6>
    {/snippet}
    {#snippet content()}
      <section>
        {#if article_number}
          <p><strong>Numéro article&nbsp;:&nbsp;</strong>{article_number}</p>
        {/if}
        <p>
          <strong>Date d'échéance&nbsp;:</strong>
          {#if due_date}
            <time datetime={due_date?.toISOString()}>{formatDateRelative(due_date)}</time>
          {:else}
            {NOT_PROVIDED}
          {/if}
        </p>

        {#if avoided_surface || compensated_surface || avoided_individus || compensated_individus || avoided_nids || compensated_nids}
          <p class="impacts-quantified">
            {#if avoided_surface}<span
                ><strong>Surface évitée&nbsp;:</strong> {avoided_surface}m²</span
              >{/if}
            {#if compensated_surface}<span
                ><strong>Surface compensée&nbsp;:</strong> {compensated_surface}m²</span
              >{/if}
            {#if avoided_individus}<span
                ><strong>Individus évités&nbsp;:</strong> {avoided_individus}</span
              >{/if}
            {#if compensated_individus}<span
                ><strong>Individus compensés&nbsp;:</strong> {compensated_individus}</span
              >{/if}
            {#if avoided_nids}<span><strong>Nids évités&nbsp;:</strong> {avoided_nids}</span>{/if}
            {#if compensated_nids}<span
                ><strong>Nids compensés&nbsp;:</strong> {compensated_nids}</span
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

              <FormControle controle={editedControle} onValidate={validateControleModifications}>
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
                  Contrôle du <time datetime={controle.controle_date?.toISOString()}
                    >{formatDateAbsolute(controle.controle_date)}</time
                  >
                  <TagResultatControle result={controle.result || NOT_PROVIDED}
                  ></TagResultatControle>
                  <button
                    class="controles fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-pencil-line"
                    onclick={() => editControle(controle)}
                  >
                    Modifier
                  </button>
                </h6>
                <strong>Commentaire&nbsp;:</strong>
                {controle.comment}<br />
                <strong>Action suite au contrôle&nbsp;:</strong>
                {controle.post_controle_action_type}<br />
                <strong>Date action suite au contrôle&nbsp;:</strong>
                <time datetime={controle.post_controle_action_date?.toISOString()}
                  >{formatDateRelative(controle.post_controle_action_date)}</time
                >
                <br />
                <strong>Date prochaine échéance&nbsp;:</strong>
                <time datetime={controle.next_due_date?.toISOString()}
                  >{formatDateRelative(controle.next_due_date)}</time
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
