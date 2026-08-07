<script lang="ts">
  import FormControle from "../FormControle.svelte";
  import TagResultatControle from "../../../TagResultatControle.svelte";
  import { formatDateAbsolute, formatDateRelative } from "$lib/dossier/displayDossier.ts";
  import type Controle from "@pitchou/types/database/public/Controle.ts";
  type Props = {
    controles: Partial<Controle>[];
    newControle?: Partial<Controle>;
    editedControle?: Partial<Controle>;
    add: () => void;
    create: () => Promise<any>;
    edit: (controle: Partial<Controle>) => void;
    validate: (controle: Partial<Controle>) => Promise<any>;
    remove: () => void;
  };
  let {
    controles,
    newControle = $bindable(),
    editedControle = $bindable(),
    add,
    create,
    edit,
    validate,
    remove,
  }: Props = $props();
  const notProvided = "(non renseigné)";
</script>

<section>
  <h6>{controles.length === 1 ? "1 contrôle" : `${controles.length} contrôles`}</h6>
  <button class="fr-btn fr-btn--icon-left fr-icon-add-line" onclick={add}
    >Ajouter un contrôle</button
  >
  {#if newControle}
    <FormControle controle={newControle} onValidate={create}>
      {#snippet buttonValidate()}<button
          type="submit"
          class="fr-btn fr-btn--icon-left fr-icon-check-line">Finir le contrôle</button
        >{/snippet}
      {#snippet buttonCancel()}<button
          type="button"
          class="fr-btn fr-btn--secondary"
          onclick={() => (newControle = undefined)}>Fermer le contrôle sans sauvegarder</button
        >{/snippet}
    </FormControle>
  {/if}
  {#each controles as controle}
    {#if controle === editedControle}
      <h6>Modification du contrôle</h6>
      <FormControle controle={editedControle} onValidate={validate}>
        {#snippet buttonCancel()}<button
            type="button"
            class="fr-btn fr-btn--secondary"
            onclick={() => (editedControle = undefined)}>Annuler</button
          >{/snippet}
        {#snippet buttonDelete()}<div class="fr-mt-4w">
            <button
              type="button"
              class="fr-btn fr-btn--secondary fr-icon-delete-line fr-btn--icon-left"
              onclick={remove}>Supprimer</button
            >
          </div>{/snippet}
      </FormControle>
    {:else}
      <section class="fr-mb-1w">
        <h6>
          Contrôle du <time datetime={controle.controle_date?.toISOString()}
            >{formatDateAbsolute(controle.controle_date)}</time
          >
          <TagResultatControle result={controle.result || notProvided} />
          <button
            class="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-pencil-line"
            onclick={() => edit(controle)}>Modifier</button
          >
        </h6>
        <strong>Commentaire&nbsp;:</strong>
        {controle.comment}<br />
        <strong>Action suite au contrôle&nbsp;:</strong>
        {controle.post_controle_action_type}<br />
        <strong>Date action suite au contrôle&nbsp;:</strong>
        <time datetime={controle.post_controle_action_date?.toISOString()}
          >{formatDateRelative(controle.post_controle_action_date)}</time
        ><br />
        <strong>Date prochaine échéance&nbsp;:</strong>
        <time datetime={controle.next_due_date?.toISOString()}
          >{formatDateRelative(controle.next_due_date)}</time
        ><br />
      </section>
    {/if}
  {/each}
</section>
