<script lang="ts">
  import type { DossierCnpnEmailSentEvent } from "@pitchou/types/API_Pitchou.ts";
  import { formatDateAbsolute } from "#lib/dossier/displayDossier.ts";
  import { FRANCE_TRANSFERT_URL } from "@pitchou/common/emailSize.ts";
  let { event }: { event: DossierCnpnEmailSentEvent } = $props();
</script>

<section
  class="fr-p-2w fr-mb-3w rounded border border-solid border-[color:var(--border-default-grey)]"
  aria-label="Suivi du dernier mail CNPN"
>
  <h3 class="fr-h6 fr-mb-1w">Dernier mail de saisine CNPN</h3>
  <p class="fr-mb-1w">{event.subject}</p>
  {#if event.delivery_failed_at && !event.delivered_at && !event.opened_at}
    <div class="fr-alert fr-alert--error fr-my-2w" role="alert">
      <p>Le mail de saisine n'a pas été distribué au CNPN.</p>
      <p>{event.delivery_failure_reason ?? "Motif non communiqué par Brevo"}</p>
      <p>
        Si le mail est trop volumineux, déposez les fichiers sur
        <a href={FRANCE_TRANSFERT_URL} target="_blank" rel="noopener noreferrer">France Transfert</a
        >, ajoutez le lien au corps du mail et retirez ces pièces jointes avant de le renvoyer.
      </p>
    </div>
  {/if}
  <dl class="fr-m-0">
    <dt class="fr-hint-text">Date d’envoi du mail via Pitchou</dt>
    <dd class="fr-ml-0 fr-mb-1w">{formatDateAbsolute(event.sent_at)}</dd>
    <dt class="fr-hint-text">Distribution au destinataire</dt>
    <dd class="fr-ml-0 fr-mb-1w">
      {event.delivered_at
        ? formatDateAbsolute(event.delivered_at)
        : event.opened_at
          ? "Ouverture détectée"
          : "Distribution non confirmée"}
    </dd>
    <dt class="fr-hint-text">Ouverture du mail de saisine</dt>
    <dd class="fr-ml-0">
      {event.opened_at ? formatDateAbsolute(event.opened_at) : "Aucune ouverture détectée"}
    </dd>
  </dl>
  <p class="fr-hint-text fr-mt-1w fr-mb-0">
    L'absence de détection ne signifie pas que le mail n'a pas été lu. Retrouvez les envois
    précédents dans l'historique du dossier.
  </p>
</section>
