<script lang="ts">
  import { formatLocalisation, formatPorteurDeProjet } from "$lib/dossier/displayDossier.ts";
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  type Props = {
    dossier: DossierFull;
    demandeurEmail: string | null | undefined;
    showDeposeur: boolean;
    deposeurMailto?: string;
    deposeurName: string;
  };
  let { dossier, demandeurEmail, showDeposeur, deposeurMailto, deposeurName }: Props = $props();
</script>

<section class="flex-[2]">
  <div class="flex items-center gap-2 mb-2">
    <span
      class="fr-icon-map-pin-2-fill fr-icon--sm flex-none text-[color:var(--text-mention-grey)]"
      aria-hidden="true"
    ></span>
    {formatLocalisation(dossier)}
  </div>
  <div class="flex items-center gap-2 mb-2">
    <span
      class="fr-icon-user-fill fr-icon--sm flex-none text-[color:var(--text-mention-grey)]"
      aria-hidden="true"
    ></span>
    <span>
      Porteur de projet&nbsp;:&nbsp;
      {#if demandeurEmail}<a
          href={`mailto:${demandeurEmail}`}
          target="_blank"
          rel="noopener noreferrer">{formatPorteurDeProjet(dossier)}</a
        >{:else}{formatPorteurDeProjet(dossier)}{/if}
    </span>
  </div>
  {#if showDeposeur}
    <div class="flex items-center gap-2 mb-2">
      <span
        class="fr-icon-user-fill fr-icon--sm flex-none text-[color:var(--text-mention-grey)]"
        aria-hidden="true"
      ></span>
      <span>
        Personne qui dépose le dossier (demandeur/mandataire)&nbsp;:&nbsp;
        {#if deposeurMailto}<a href={deposeurMailto} target="_blank" rel="noopener noreferrer"
            >{deposeurName}</a
          >{:else}{deposeurName}{/if}
      </span>
    </div>
  {/if}
  <div class="flex items-center gap-2 mb-0">
    <span
      class="fr-icon-briefcase-fill fr-icon--sm flex-none text-[color:var(--text-mention-grey)]"
      aria-hidden="true"
    ></span>
    {dossier.activite_label ?? dossier.main_activite}
  </div>
</section>
