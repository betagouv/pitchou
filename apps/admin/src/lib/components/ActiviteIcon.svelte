<script lang="ts">
  import { activiteIconUrl } from "$lib/activiteIcon.ts";

  type Props = {
    mainActivite: string | null | undefined;
    /** Tailwind size classes of the icon square. */
    size?: string;
  };

  let { mainActivite, size = "size-12" }: Props = $props();

  const src = $derived(activiteIconUrl(mainActivite));
  const label = $derived(mainActivite || "Activité principale non renseignée");
</script>

<span class="block {size} shrink-0" title={label}>
  <img {src} alt="" class="size-full select-none" draggable="false" />
  <span class="fr-sr-only">{label}</span>
</span>
