<script lang="ts">
  import { describeEcheance, type EcheanceUrgency } from "$lib/dossier/echeance.ts";

  type Props = {
    /** Date of the dossier's next échéance; nothing is rendered when it is unknown */
    dueDate: Date | string | null | undefined;
  };

  let { dueDate }: Props = $props();

  const badgeByUrgency: Record<EcheanceUrgency, string> = {
    info: "fr-badge--info",
    warning: "fr-badge--warning",
    error: "fr-badge--error",
  };

  const echeance = $derived(describeEcheance(dueDate));
</script>

{#if echeance}
  <p class="fr-badge fr-badge--sm fr-badge--no-icon {badgeByUrgency[echeance.urgency]}">
    {echeance.label}
  </p>
{/if}
