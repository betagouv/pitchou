<script lang="ts">
  import Select from "../Select.svelte";
  import type { StatutListeRouge } from "@pitchou/types/especes.d.ts";
  import {
    LIBELLES_STATUT_LISTE_ROUGE,
    STATUTS_LISTE_ROUGE,
  } from "@pitchou/common/especes/listeRouge.ts";

  let {
    value,
    onChange,
  }: {
    value: StatutListeRouge | "";
    onChange: (value: StatutListeRouge | "") => void;
  } = $props();
  const id = $props.id();
  const options = [
    { value: "" as const, label: "Tous les statuts UICN" },
    ...STATUTS_LISTE_ROUGE.map((statut) => ({
      value: statut,
      label: LIBELLES_STATUT_LISTE_ROUGE[statut],
    })),
  ];
</script>

<div
  class="flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:flex-[0_0_18rem] [&_.fr-label]:mb-0 [&_.fr-label]:max-[768px]:flex-none"
>
  <label class="fr-label" for={id}>Statut UICN</label>
  <Select {id} class="flex-auto" ariaLabel="Statut UICN choisi" {options} {value} {onChange} />
</div>
