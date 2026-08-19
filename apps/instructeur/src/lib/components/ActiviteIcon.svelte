<script lang="ts">
  import { activiteIcon } from "$lib/dossier/activiteIcon.ts";

  type Props = {
    mainActivite: string | null | undefined;
  };

  let { mainActivite }: Props = $props();

  const activite = $derived(activiteIcon(mainActivite));
  const label = $derived(mainActivite || "Activité principale non renseignée");
</script>

<span
  class="flex size-10 shrink-0 items-center justify-center rounded-full"
  style:background-color={`var(--background-contrast-${activite.family})`}
  style:color={`var(--text-label-${activite.family})`}
  title={label}
>
  <span class="{activite.icon} fr-icon--sm" aria-hidden="true"></span>
  <span class="fr-sr-only">{label}</span>
</span>
