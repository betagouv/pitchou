<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";
  import PrescriptionControles from "./PrescriptionControles.svelte";
  import ExpandCollapse from "$lib/components/common/ExpandCollapse.svelte";
  import PrescriptionSummary from "./PrescriptionSummary.svelte";

  import { formatDateRelative } from "$lib/dossier/displayDossier.ts";
  import { addControle as sendControle, updateControle, deleteControle } from "../controle.ts";
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

<section
  class="fr-p-1w fr-mb-1w border-b border-[color:var(--border-default-grey)] hover:bg-[var(--background-contrast-grey)] [&_h6]:mb-[0.4rem] [&_p]:mb-[0.4rem]"
>
  <ExpandCollapse>
    {#snippet summary()}
      {@const lastControle = sortedControles[0]}
      <PrescriptionSummary {description} articleNumber={article_number} {lastControle} />
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
          <p
            class="[&_span]:inline-block [&_span]:[white-space:wrap] [&_span]:after:content-['|'] [&_span]:after:px-4 [&_span]:after:py-0 [&_span:first-child]:pl-0 [&_span:last-child]:after:content-none"
          >
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

        <PrescriptionControles
          controles={sortedControles}
          bind:newControle
          bind:editedControle
          add={addControle}
          create={createControle}
          edit={editControle}
          validate={validateControleModifications}
          remove={deleteEditedControle}
        />
      </section>
    {/snippet}
  </ExpandCollapse>
</section>
