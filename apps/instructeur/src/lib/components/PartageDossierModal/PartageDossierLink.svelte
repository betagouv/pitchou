<script lang="ts">
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";

  type Props = {
    dossierId: Dossier["id"];
  };

  let { dossierId }: Props = $props();

  const inputId = $derived(`partage-dossier-lien-${dossierId}`);

  // `lecture=1` so the link opens in read-only mode for everyone, including a
  // colleague of the instructing service who may edit — the point of sending it
  // is to show the dossier as the other service sees it. They keep the button to
  // switch back to edit mode; nobody else does.
  //
  // There is no secret in the link: what a recipient may see is decided by their
  // own cap, and it gives nothing to someone the dossier is not shared with.
  const link = $derived(`${location.origin}/dossier/${dossierId}?lecture=1`);

  let copied = $state(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      copied = true;
      setTimeout(() => (copied = false), 3000);
    } catch (error) {
      console.error("Failed to copy the dossier link", error);
    }
  }
</script>

<div class="fr-mt-3w">
  <p class="fr-mb-1w fr-text--sm font-bold">Lien à transmettre</p>
  <!-- A read-only input rather than a styled <code>: DSFR sizes its inputs and
       its buttons to line up side by side, and the link stays selectable.
       basis-0 because `fr-input` is width:100%, which would otherwise make the
       flex base size fill the row and push the button onto a second line. -->
  <div class="flex flex-wrap items-start gap-2">
    <label class="fr-sr-only" for={inputId}>Lien à transmettre</label>
    <input
      id={inputId}
      class="fr-input min-w-0 grow basis-0"
      type="text"
      readonly
      value={link}
      onfocus={(event) => event.currentTarget.select()}
    />
    <button type="button" class="fr-btn fr-btn--secondary flex-none" onclick={copy}>
      {copied ? "Lien copié" : "Copier le lien"}
    </button>
  </div>
  <p class="fr-mt-1w fr-mb-0 fr-text--xs text-[color:var(--text-mention-grey)]">
    Les membres des services sélectionnés y accèdent en se connectant à Pitchou. Le lien ne donne
    rien à quelqu’un d’autre.
  </p>
</div>
