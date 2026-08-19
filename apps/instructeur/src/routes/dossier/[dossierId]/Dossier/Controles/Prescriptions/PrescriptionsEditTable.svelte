<script lang="ts">
  import DateInput from "$lib/components/DateInput.svelte";
  import type { FrontEndPrescription } from "@pitchou/types/API_Pitchou.ts";
  type Column = { key: keyof FrontEndPrescription; label: string };
  type Props = {
    prescriptions: Partial<FrontEndPrescription>[];
    columns: readonly Column[];
    save: (prescription: Partial<FrontEndPrescription>) => void;
    remove: (prescription: Partial<FrontEndPrescription>) => void;
    add: () => void;
    finish: () => void;
  };
  let { prescriptions, columns, save, remove, add, finish }: Props = $props();
</script>

<table
  class="[&_.prescription>*]:mx-[2px] [&_.prescription>*:nth-child(1)]:w-20 [&_.prescription>*:nth-child(2)]:w-80 [&_.prescription>*:nth-child(3)]:w-44 [&_.prescription>*:nth-child(n+4)]:w-24 [&_thead>tr>*]:mx-[2px] [&_thead>tr>*:nth-child(1)]:w-20 [&_thead>tr>*:nth-child(2)]:w-80 [&_thead>tr>*:nth-child(3)]:w-44 [&_thead>tr>*:nth-child(n+4)]:w-24"
>
  <thead
    ><tr
      ><th>Numéro article</th><th>Description</th><th>Date échéance</th>{#each columns as column}<th
          >{column.label}</th
        >{/each}<th>Supprimer</th></tr
    ></thead
  >
  <tbody>
    {#each prescriptions as prescription}
      <tr
        class="prescription"
        onfocusout={(event) => {
          if (!(event.target as HTMLElement)?.classList.contains("button-delete"))
            save(prescription);
        }}
      >
        <td><input class="fr-input" bind:value={prescription.article_number} /></td>
        <td><input class="fr-input" bind:value={prescription.description} /></td>
        <td><DateInput bind:date={prescription.due_date} /></td>
        {#each columns as column}<td
            ><input
              class="fr-input"
              type="number"
              min="0"
              bind:value={prescription[column.key]}
            /></td
          >{/each}
        <td
          ><button
            class="button-delete fr-btn fr-btn--sm fr-icon-delete-line fr-btn--icon-left fr-btn--secondary"
            onclick={() => remove(prescription)}>Supprimer</button
          ></td
        >
      </tr>
    {/each}
    <tr
      ><td colspan={columns.length + 4} class="fr-pt-1w"
        ><button class="fr-btn fr-btn--icon-left fr-icon-add-line" onclick={add}
          >Ajouter une prescription</button
        ></td
      ></tr
    >
  </tbody>
</table>
<button
  class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-eye-line fr-mt-3w"
  onclick={finish}>Modifications terminées</button
>
