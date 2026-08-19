<script lang="ts">
  import { activiteIconUrl } from "$lib/dossier/activiteIcon.ts";

  type Props = {
    mainActivite: string | null | undefined;
  };

  let { mainActivite }: Props = $props();

  const src = $derived(activiteIconUrl(mainActivite));
  const label = $derived(mainActivite || "Activité principale non renseignée");
</script>

<span class="block size-12 shrink-0" title={label}>
  <img {src} alt="" class="size-full select-none" draggable="false" />
  <span class="fr-sr-only">{label}</span>
</span>
