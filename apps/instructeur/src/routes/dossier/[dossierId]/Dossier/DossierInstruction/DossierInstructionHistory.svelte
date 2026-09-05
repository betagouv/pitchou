<script lang="ts">
  import TagPhase from "$lib/components/TagPhase.svelte";
  import DateInput from "../../DateInput.svelte";
  import { formatDateAbsolute, formatDateRelative } from "$lib/dossier/displayDossier.ts";
  import { attachmentDetails } from "./fieldValues.ts";
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type Personne from "@pitchou/types/database/public/Personne.ts";
  type Props = {
    dossier: DossierFull;
    history: DossierFull["evenementsPhase"];
    followers: NonNullable<Personne["email"]>[];
    followed?: boolean;
    start?: Date | null;
    end?: Date | null;
    dismiss: () => void;
    follow: () => void;
    leave: () => void;
  };
  let {
    dossier,
    history,
    followers,
    followed,
    start = $bindable(),
    end = $bindable(),
    dismiss,
    follow,
    leave,
  }: Props = $props();

  const timeline = $derived(
    [
      ...history.map((event) => ({ type: "phase" as const, date: event.timestamp, event })),
      ...(dossier.cnpnEmailSentEvents ?? []).map((event) => ({
        type: "cnpn-email" as const,
        date: event.sent_at,
        event,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  );
</script>

<section class="fr-mb-4w flex-[3]">
  <h2>Historique</h2>
  <ol class="list-none fr-mt-0 fr-pl-0">
    {#each timeline as item}
      {#if item.type === "phase"}
        <li>
          <TagPhase phase={item.event.phase} /> -
          <span title={formatDateAbsolute(item.event.timestamp)}
            >{formatDateRelative(item.event.timestamp)}</span
          >
        </li>
      {:else}
        <li class="fr-mb-1w">
          <span class="fr-icon-mail-line fr-icon--sm" aria-hidden="true"></span>
          <strong>Mail de saisine du CNPN envoyé</strong> -
          <span title={formatDateAbsolute(new Date(item.event.sent_at))}
            >{formatDateRelative(new Date(item.event.sent_at))}</span
          >
          <span class="fr-hint-text block fr-ml-3w">
            {item.event.subject}
            {#if item.event.attachment_names.length > 0}
              · {item.event.attachment_names.length} pièce{item.event.attachment_names.length > 1
                ? "s"
                : ""} jointe{item.event.attachment_names.length > 1 ? "s" : ""}
            {/if}
          </span>
          {#if item.event.delivered_at}
            <span class="fr-text--sm fr-mb-0 block fr-ml-3w">
              <span class="fr-icon-checkbox-circle-line fr-icon--sm" aria-hidden="true"></span>
              Distribué au destinataire
              <span title={formatDateAbsolute(new Date(item.event.delivered_at))}>
                {formatDateRelative(new Date(item.event.delivered_at))}
              </span>
            </span>
          {/if}
          {#if item.event.opened_at}
            <span class="fr-text--sm fr-mb-0 block fr-ml-3w">
              <span class="fr-icon-eye-line fr-icon--sm" aria-hidden="true"></span>
              Ouverture détectée
              <span title={formatDateAbsolute(new Date(item.event.opened_at))}>
                {formatDateRelative(new Date(item.event.opened_at))}
              </span>
            </span>
          {/if}
        </li>
      {/if}
    {/each}
    <li>
      <TagPhase phase="Accompagnement amont" /> - <strong>Dépôt dossier</strong> -
      <span title={formatDateAbsolute(dossier.depot_date)}
        >{formatDateRelative(dossier.depot_date)}</span
      >
    </li>
  </ol>
  <h2 class="fr-mt-3w">Personnes qui suivent ce dossier</h2>
  {#if followers.length}<ul class="list-none fr-mt-0 fr-pl-0">
      {#each followers as follower}<li id={follower}>{follower}</li>{/each}
    </ul>{:else}
    <div class="flex flex-col">
      <span>Personne ne suit ce dossier pour l'instant.</span
      >{#if typeof followed === "boolean"}<button
          onclick={followed ? leave : follow}
          class="fr-btn fr-btn--secondary fr-btn--sm {followed
            ? 'fr-icon-star-fill'
            : 'fr-icon-star-line'} fr-btn--icon-left"
          >{followed ? "Ne plus suivre" : "Suivre"}</button
        >{/if}
    </div>
  {/if}
  <h2 class="fr-mt-3w">Dates de consultation du public ou enquête publique</h2>
  <div class="fr-input-group" onfocusin={dismiss}>
    <label class="fr-label" for="public_consultation_start_date"
      ><strong>Date de début</strong></label
    ><DateInput id="public_consultation_start_date" label="Date de début" bind:date={start} />
  </div>
  <div class="fr-input-group" onfocusin={dismiss}>
    <label class="fr-label" for="public_consultation_end_date"><strong>Date de fin</strong></label
    ><DateInput id="public_consultation_end_date" label="Date de fin" bind:date={end} />
  </div>
  <h2 class="fr-mt-3w">Autres pièces jointes</h2>
  {#if dossier.otherAttachments.length === 0}<p>
      Aucune autre pièce jointe n'est associée à ce dossier.
    </p>{:else}
    <ul class="list-none fr-mt-0 fr-pl-0 flex flex-col gap-2">
      {#each dossier.otherAttachments as attachment}<li>
          <a
            class="fr-link fr-link--download"
            href={attachment.fichier_url}
            title={attachment.fichier_description?.name ?? attachment.type}
            data-sveltekit-reload
            >{attachment.fichier_description?.name ?? attachment.type}<span class="fr-link__detail"
              >{attachment.type} - {attachmentDetails(attachment)}</span
            ></a
          >
        </li>{/each}
    </ul>
  {/if}
</section>
