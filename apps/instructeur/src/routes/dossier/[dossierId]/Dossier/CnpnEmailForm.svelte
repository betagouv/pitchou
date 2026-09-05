<script lang="ts">
  import CnpnAttachmentPicker from "./CnpnAttachmentPicker.svelte";
  import CnpnCcPicker from "./CnpnCcPicker.svelte";
  import type { PieceJointeGroup } from "./piecesJointes.ts";
  import type File from "@pitchou/types/database/public/File.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";

  const CNPN_EMAIL = "derogations-especes-protegees.et4.deb.dgaln@developpement-durable.gouv.fr";

  let {
    dossierId,
    isTestEnvironment,
    groups,
    submitted,
    EmailRichTextEditorComponent,
    subject = $bindable(),
    recipient = $bindable(),
    ccEmails = $bindable(),
    htmlBody = $bindable(),
    selectedIds,
    onSelectedIdsChange,
  }: {
    dossierId: Dossier["id"];
    isTestEnvironment: boolean;
    groups: PieceJointeGroup[];
    submitted: boolean;
    EmailRichTextEditorComponent:
      typeof import("$lib/components/EmailRichTextEditor.svelte").default | undefined;
    subject: string;
    recipient: string;
    ccEmails: string[];
    htmlBody: string;
    selectedIds: File["id"][];
    onSelectedIdsChange: (ids: File["id"][]) => void;
  } = $props();
</script>

<fieldset class="min-w-0 border-0 fr-p-0" disabled={submitted} inert={submitted}>
  <div class="fr-input-group">
    <span class="fr-label" id="cnpn-email-to-label">Destinataire</span>
    <div
      class="flex items-center gap-3 rounded border-l-4 border-[color:var(--border-action-high-blue-france)] bg-[var(--background-alt-blue-france)] fr-p-2w"
      role="group"
      aria-labelledby="cnpn-email-to-label"
    >
      <span
        class="fr-icon-mail-line flex-none text-[color:var(--text-action-high-blue-france)]"
        aria-hidden="true"
      ></span>
      <span class="min-w-0 flex-1 [overflow-wrap:anywhere]">{CNPN_EMAIL}</span>
      <span class="fr-badge fr-badge--sm fr-badge--blue-ecume flex-none">Adresse fixe</span>
    </div>
    {#if isTestEnvironment}
      <div class="fr-alert fr-alert--warning fr-mt-2w">
        <h3 class="fr-alert__title">Environnement de test</h3>
        <p>
          Le mail sera envoyé à l'adresse ci-dessous plutôt qu'au secrétariat du CNPN. Votre adresse
          est utilisée par défaut, mais vous pouvez la modifier pour vos tests.
        </p>
        <label class="fr-label fr-mt-2w" for="cnpn-email-test-recipient">
          Destinataire de test
        </label>
        <input
          class="fr-input"
          id="cnpn-email-test-recipient"
          type="email"
          required
          bind:value={recipient}
        />
      </div>
    {/if}
  </div>

  <p class="fr-info-text fr-mt-n1w fr-mb-3w">Un accusé de lecture du mail vous sera communiqué.</p>

  <CnpnCcPicker {dossierId} bind:selectedEmails={ccEmails} />

  <div class="fr-input-group">
    <label class="fr-label" for="cnpn-email-subject">Objet</label>
    <input class="fr-input" id="cnpn-email-subject" maxlength="255" required bind:value={subject} />
  </div>

  <CnpnAttachmentPicker {groups} {selectedIds} {onSelectedIdsChange} />

  <div class="fr-input-group fr-mt-3w">
    <span class="fr-label">
      Corps du mail
      <span class="fr-hint-text">Vous pouvez modifier et compléter le contenu proposé.</span>
    </span>
    {#if EmailRichTextEditorComponent}
      <EmailRichTextEditorComponent bind:html={htmlBody} />
    {:else}
      <div role="status" aria-live="polite">
        <p class="fr-sr-only">Chargement de l'éditeur...</p>
        <div
          class="overflow-hidden rounded-lg border border-solid border-[var(--border-default-grey)]"
          aria-hidden="true"
        >
          <div class="h-12 animate-pulse bg-[var(--background-contrast-grey)]"></div>
          <div class="h-64 animate-pulse bg-white fr-p-2w">
            <div class="h-4 w-2/3 rounded bg-[var(--background-contrast-grey)] fr-mb-2w"></div>
            <div class="h-4 w-full rounded bg-[var(--background-contrast-grey)] fr-mb-1w"></div>
            <div class="h-4 w-5/6 rounded bg-[var(--background-contrast-grey)]"></div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</fieldset>
