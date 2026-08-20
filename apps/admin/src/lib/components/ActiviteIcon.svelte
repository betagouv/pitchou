<script lang="ts">
  import { activiteIconUrl } from "@pitchou/ui/activites/activiteIcon.ts";

  type Props = {
    /** Referentiel code of the dossier's activity (`dossier.activite_code`). */
    activiteCode: string | null | undefined;
    /** Display name of that activity, used as the accessible label and tooltip. */
    activiteLabel: string | null | undefined;
    /** Tailwind size classes of the icon square. */
    size?: string;
  };

  let { activiteCode, activiteLabel, size = "size-12" }: Props = $props();

  const src = $derived(activiteIconUrl(activiteCode));
  const label = $derived(activiteLabel || "Activité principale non renseignée");
</script>

<span class="block {size} shrink-0" title={label}>
  <img {src} alt="" class="size-full select-none" draggable="false" />
  <span class="fr-sr-only">{label}</span>
</span>
